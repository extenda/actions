jest.mock('@actions/core');
jest.mock('fast-glob');
jest.mock('../src/secrets-manager/load-secrets');

const core = require('@actions/core');
const mockFs = require('mock-fs');
const fg = require('fast-glob');
const nock = require('nock');
const camelcaseKeys = require('camelcase-keys');
const { loadSecrets } = require('../src/secrets-manager/load-secrets');
const configFixtures = require('./fixtures/configs');
const { secrets } = require('./fixtures/secrets');
const action = require('../src/index');

function mockIdpTokenCall() {
  nock('https://identitytoolkit.googleapis.com')
    .post(`/v1/accounts:signInWithPassword?key=${secrets.key}`, {
      email: secrets.email,
      password: secrets.pass,
      tenantId: secrets.gipTenantId,
      returnSecureToken: true,
    })
    .reply(200, { idToken: 'mockIdToken' })
    .persist();
}

function mockExeSyncCall(id, response, dryRun = false) {
  // ignore version
  // eslint-disable-next-line no-unused-vars
  const { version, ...payload } = camelcaseKeys(configFixtures.validParsed, {
    deep: true,
  });
  const exeNock = nock('https://exe-management.retailsvc.com')
    .post('/api/v1/internal/event-sources:sync', payload)
    .query({ dryRun })
    .reply(200, response);
  return () => expect(exeNock.isDone()).toEqual(true);
}

describe('action', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(
      /(https:\/\/exe-management.retailsvc.com|https:\/\/identitytoolkit.googleapis.com)/,
    );
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
    mockIdpTokenCall();
  });

  afterEach(() => {
    mockFs.restore();
  });

  it.each([false, true])(
    'calls exe api with correct definitions dryRun=%s',
    async (dryRun) => {
      const file = 'external-events/*.yaml';
      core.getInput.mockReturnValue('serviceAcc').mockReturnValue(file);

      core.getBooleanInput.mockReturnValue(dryRun);

      fg.sync.mockReturnValue([file]);

      mockFs({ [file]: configFixtures.valid });
      loadSecrets.mockResolvedValue(secrets);

      const response = {
        report: [
          {
            id: 'iam.group-created.v1',
            success: true,
            performedAction: 'created',
          },
        ],
        success: true,
      };
      const expectExeToBeCalled = mockExeSyncCall(
        'iam.group-created.v1',
        response,
        dryRun,
      );

      expect(await action()).toBeUndefined();

      expectExeToBeCalled();
    },
  );

  it('fails, if sync process was not successful', async () => {
    const file = 'external-events/*.yaml';
    core.getInput.mockReturnValue('serviceAcc').mockReturnValue(file);

    core.getBooleanInput.mockReturnValue(false);

    fg.sync.mockReturnValue([file]);

    mockFs({ [file]: configFixtures.valid });
    loadSecrets.mockResolvedValue(secrets);

    const response = {
      report: [
        { id: 'iam.group-created.v1', success: false, error: 'test error' },
      ],
      success: false,
    };
    const expectExeToBeCalled = mockExeSyncCall(
      'iam.group-created.v1',
      response,
    );

    await expect(action()).rejects.toThrowError(
      'Sync process had some errors (see details above).',
    );

    expectExeToBeCalled();
  });
});

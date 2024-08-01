jest.mock('@actions/core');
jest.mock('fast-glob');
jest.mock('../src/secrets-manager/load-secrets');

const core = require('@actions/core');
const mockFs = require('mock-fs');
const fg = require('fast-glob');
const nock = require('nock');
const camelcaseKeys = require('camelcase-keys');
const configFixtures = require('./fixtures/configs');
const { loadSecrets } = require('../src/secrets-manager/load-secrets');
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

function mockCccSyncCall(id, response, dryRun = false) {
  // ignore version
  // eslint-disable-next-line no-unused-vars
  const { version, ...payload } = camelcaseKeys(configFixtures.validParsed, {
    deep: true,
  });
  const cccNock = nock('https://ccc-api.retailsvc.com')
    .post('/api/v1/internal/configurations:sync', payload)
    .query({ dryRun })
    .reply(200, response);
  return () => expect(cccNock.isDone()).toEqual(true);
}

describe('action', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect(
      /(https:\/\/ccc-api.retailsvc.com|https:\/\/identitytoolkit.googleapis.com)/,
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
    'calls ccc api with correct definitions dryRun=%s',
    async (dryRun) => {
      const file = 'customer-config/*.yaml';
      core.getInput.mockReturnValue('serviceAcc').mockReturnValue(file);

      core.getBooleanInput.mockReturnValue(dryRun);

      fg.sync.mockReturnValue([file]);

      mockFs({ [file]: configFixtures.valid });
      loadSecrets.mockResolvedValue(secrets);

      const response = {
        report: [
          {
            id: 'che.receipt-layout.v1',
            success: true,
            performedAction: 'created',
          },
        ],
        success: true,
      };
      const expectCccToBeCalled = mockCccSyncCall(
        'che.receipt-layout.v1',
        response,
        dryRun,
      );

      expect(await action()).toBeUndefined();

      expectCccToBeCalled();
    },
  );

  it('fails, if sync process was not successful', async () => {
    const file = 'customer-config/*.yaml';
    core.getInput.mockReturnValue('serviceAcc').mockReturnValue(file);

    core.getBooleanInput.mockReturnValue(false);

    fg.sync.mockReturnValue([file]);

    mockFs({ [file]: configFixtures.valid });
    loadSecrets.mockResolvedValue(secrets);

    const response = {
      report: [
        { id: 'che.receipt-layout.v1', success: false, error: 'test error' },
      ],
      success: false,
    };
    const expectCccToBeCalled = mockCccSyncCall(
      'che.receipt-layout.v1',
      response,
    );

    await expect(action()).rejects.toThrowError(
      'Sync process had some errors (see details above).',
    );

    expectCccToBeCalled();
  });
});

jest.mock('@actions/core');
jest.mock('request');
jest.mock('../src/roles');
jest.mock('../src/permissions');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('../../cloud-run/src/project-info');

const request = require('request');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const configureIam = require('../src/configure-iam');
const projectInfo = require('../../cloud-run/src/project-info');
const { setupPermissions, handlePermissions } = require('../src/permissions');
const { setupRoles } = require('../src/roles');

describe('Configure iam', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can check system exists', async () => {
    setupGcloud.mockResolvedValueOnce('test-project');
    projectInfo.mockReturnValueOnce({ env: 'staging' });
    const iam = {
      system: {
        id: 'test',
      },
      permissions: {
        res: [
          { get: 'test desc' },
          { create: 'test1 desc' },
        ],
      },
    };

    const checkSystem = {
      result: [
        {
          name: 'test-staging',
        },
      ],
    };
    const fullPermissions = {
      'test.res.get': 'test desc',
      'test.res.create': 'test1 desc',
    };
    const permissions = {
      res: [
        { get: 'test desc' },
        { create: 'test1 desc' },
      ],
    };
    request.mockImplementation((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(checkSystem)));
    setupPermissions.mockResolvedValueOnce(fullPermissions);

    await configureIam(iam, 'styra-token', 'extendaretail', 'https://apiurl.test.dev', 'iam-token', 'staging');

    expect(request).toHaveBeenCalledTimes(1);
    expect(setupPermissions).toHaveBeenCalledWith(
      permissions,
      'test',
    );
    expect(handlePermissions).toHaveBeenCalledWith(
      fullPermissions,
      'iam-token',
      'https://apiurl.test.dev',
    );
    expect(setupPermissions).toHaveBeenCalledTimes(1);
    expect(handlePermissions).toHaveBeenCalledTimes(1);
    expect(setupRoles).toHaveBeenCalledTimes(1);
  });

  test('it can check system doesn\'t exist', async () => {
    setupGcloud.mockResolvedValueOnce('test-project');
    projectInfo.mockReturnValueOnce({ env: 'staging' });
    const iam = {
      system: {
        id: 'test-test',
      },
    };

    const checkSystem = {
      result: [
        {
          name: 'test-wrong-staging',
        },
      ],
    };
    const fullPermissions = {
      'test.test.get': 'test desc',
      'test.test.create': 'test1 desc',
    };
    request.mockImplementation((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(checkSystem)));
    setupPermissions.mockResolvedValueOnce(fullPermissions);

    await expect(configureIam(iam, 'styra-token', 'extendaretail', 'iam-token', 'https://apiurl.test.dev', 'staging'))
      .rejects.toEqual(new Error('No system found with name: test-test-staging'));

    expect(request).toHaveBeenCalledTimes(1);
  });
});

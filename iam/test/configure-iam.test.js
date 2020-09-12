jest.mock('@actions/core');
jest.mock('request');
jest.mock('../src/roles');
jest.mock('../src/permissions');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../src/create-system');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/create-namespace');

const request = require('request');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const createNamespace = require('../../cloud-run/src/create-namespace');
const configureIam = require('../src/configure-iam');
const projectInfo = require('../../cloud-run/src/project-info');
const { setupPermissions, handlePermissions } = require('../src/permissions');
const { setupRoles } = require('../src/roles');
const setupSystem = require('../src/create-system');

describe('Configure iam', () => {
  beforeEach(() => {
    createNamespace.mockResolvedValueOnce(null);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can check system exists', async () => {
    const iam = {
      'permission-prefix': 'test',
      systems: [{
        namespace: 'test-service',
        repository: 'test-repo',
      }],
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

    await configureIam(iam, 'styra-token', 'https://extendaretail.styra.com', 'https://apiurl.test.dev', 'iam-token', 'staging', 'project-staging-321', []);

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

  test('it can create system if it doesn\'t exist', async () => {
    setupGcloud.mockResolvedValueOnce('test-project');
    projectInfo.mockReturnValueOnce({ env: 'staging' });
    const iam = {
      'permission-prefix': 'test',
      systems: [{
        namespace: 'test-service',
        repository: 'test-repo',
      }],
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
    request.mockImplementation((conf, cb) => cb(null, { statusCode: 404 },
      JSON.stringify(checkSystem)));
    setupPermissions.mockResolvedValueOnce(fullPermissions);

    await configureIam(iam, 'styra-token', 'https://extendaretail.styra.com', 'https://apiurl.test.dev', 'iam-token', 'staging', 'test-staging-123', []);
    expect(setupSystem).toHaveBeenCalledWith(
      'test-service', 'test.test-service-staging', 'staging', 'test-repo', 'styra-token', 'https://extendaretail.styra.com', [],
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
});

jest.mock('@actions/core');
jest.mock('request');
jest.mock('../src/roles');
jest.mock('../src/permissions');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../src/create-system');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/create-namespace');
jest.mock('../src/handle-repository');
jest.mock('../src/handle-owners');
jest.mock('../../cloud-run/src/kubectl-auth');

const request = require('request');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const createNamespace = require('../../cloud-run/src/create-namespace');
const configureIam = require('../src/configure-iam');
const checkRepository = require('../src/handle-repository');
const checkOwners = require('../src/handle-owners');
const projectInfo = require('../../cloud-run/src/project-info');
const { setupPermissions, handlePermissions } = require('../src/permissions');
const { setupRoles } = require('../src/roles');
const { setupSystem } = require('../src/create-system');

describe('Configure iam', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can check system exists', async () => {
    createNamespace.mockResolvedValueOnce(null);
    const iam = {
      'permission-prefix': 'test',
      services: [{
        name: 'test-service',
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

    await configureIam(iam, 'styra-token', 'https://extendaretail.styra.com', 'https://apiurl.test.dev', 'iam-token', 'staging', 'project-staging-321', [], false);

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
    createNamespace.mockResolvedValueOnce(null);

    setupGcloud.mockResolvedValueOnce('test-project');
    projectInfo.mockReturnValueOnce({ env: 'staging' });
    const iam = {
      'permission-prefix': 'test',
      services: [{
        name: 'test-service',
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

    await configureIam(iam, 'styra-token', 'https://extendaretail.styra.com', 'https://apiurl.test.dev', 'iam-token', 'staging', 'test-staging-123', [], false);
    expect(setupSystem).toHaveBeenCalledWith(
      'test-service', 'test.test-service-staging', 'staging', 'test-repo', 'styra-token', 'https://extendaretail.styra.com', [],
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it skips roles and permissions', async () => {
    createNamespace.mockResolvedValueOnce(null);

    setupGcloud.mockResolvedValueOnce('test-project');
    projectInfo.mockReturnValueOnce({ env: 'staging' });
    const iam = {
      'permission-prefix': 'test',
      services: [{
        name: 'test-service',
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

    await expect(configureIam(iam, 'styra-token', 'https://extendaretail.styra.com', 'https://apiurl.test.dev', 'iam-token', 'staging', 'test-staging-123', [], true))
      .resolves.toEqual(null);
    expect(setupSystem).toHaveBeenCalledWith(
      'test-service', 'test.test-service-staging', 'staging', 'test-repo', 'styra-token', 'https://extendaretail.styra.com', [],
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it handles owners and repository if system exists', async () => {
    createNamespace.mockResolvedValueOnce(null);

    setupGcloud.mockResolvedValueOnce('test-project');
    projectInfo.mockReturnValueOnce({ env: 'staging' });
    const iam = {
      'permission-prefix': 'test',
      services: [{
        name: 'test-service',
        repository: 'test-repo',
      }],
    };

    const checkSystem = {
      result: [
        {
          name: 'test.test-service-staging',
          id: 'existing-system',
        },
      ],
    };
    const resultBody = {
      name: 'test.test-service-staging',
      id: 'existing-system',
    };
    const fullPermissions = {
      'test.test.get': 'test desc',
      'test.test.create': 'test1 desc',
    };
    request.mockImplementation((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(checkSystem)));
    checkOwners.mockResolvedValueOnce(null);
    checkRepository.mockResolvedValueOnce(null);
    setupPermissions.mockResolvedValueOnce(fullPermissions);

    await configureIam(iam, 'styra-token', 'https://extendaretail.styra.com', 'https://apiurl.test.dev', 'iam-token', 'staging', 'test-staging-123', [], true);
    expect(setupSystem).toHaveBeenCalledTimes(0);
    expect(checkOwners).toHaveBeenCalledWith(
      'existing-system', 'styra-token', 'https://extendaretail.styra.com', [],
    );
    expect(checkRepository).toHaveBeenCalledWith(
      resultBody, 'styra-token', 'https://extendaretail.styra.com', 'test-repo',
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it wont create system if namespace doesn\'t exist', async () => {
    createNamespace.mockRejectedValueOnce(new Error(`Namespace not found, please make sure your service is setup correctly!
Visit https://github.com/extenda/tf-infra-gcp/blob/master/docs/project-config.md#services for more information`));

    setupGcloud.mockResolvedValueOnce('test-project');
    projectInfo.mockReturnValueOnce({ env: 'staging' });
    const iam = {
      'permission-prefix': 'test',
      services: [{
        name: 'test-service',
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

    await configureIam(iam, 'styra-token', 'https://extendaretail.styra.com', 'https://apiurl.test.dev', 'iam-token', 'staging', 'test-staging-123', [], false);
    expect(setupSystem).toHaveBeenCalledTimes(0);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

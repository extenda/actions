jest.mock('@actions/core');
jest.mock('../src/roles');
jest.mock('../src/permissions');

const core = require('@actions/core');

const { configureIAM } = require('../src/configure-iam');
const { setupPermissions, handlePermissions } = require('../src/permissions');
const { setupRoles } = require('../src/roles');

const iam = {
  'permission-prefix': 'test',
  services: [
    {
      name: 'test-service',
      repository: 'test-repo',
    },
  ],
  permissions: {
    res: [{ get: 'test desc' }, { create: 'test1 desc' }],
  },
  roles: [
    {
      id: 'test',
      name: 'Test',
      permissions: ['res.get'],
    },
  ],
};

describe('Configure IAM', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It updates permissions and roles', async () => {
    const fullPermissions = {
      'test.res.get': 'test desc',
      'test.res.create': 'test1 desc',
    };
    const permissions = {
      res: [{ get: 'test desc' }, { create: 'test1 desc' }],
    };
    setupPermissions.mockResolvedValueOnce(fullPermissions);

    await configureIAM(iam, 'https://apiurl.test.dev', 'iam-token', false);

    expect(setupPermissions).toHaveBeenCalledWith(permissions, 'test');
    expect(handlePermissions).toHaveBeenCalledWith(
      fullPermissions,
      'iam-token',
      'https://apiurl.test.dev',
    );
    expect(setupRoles).toHaveBeenCalledWith(
      [
        {
          id: 'test',
          name: 'Test',
          permissions: ['res.get'],
        },
      ],
      'test',
      'iam-token',
      'https://apiurl.test.dev',
      fullPermissions,
    );
  });

  test('It can skip IAM (for legacy reasons)', async () => {
    await configureIAM(iam, 'https://apiurl.test.dev', 'iam-token', true);
    expect(setupPermissions).not.toHaveBeenCalled();
  });

  test('It will print all errors at the end', async () => {
    setupPermissions.mockRejectedValueOnce(
      new Error(
        'Could not fetch permission https://apiurl.test.dev/api/v1/permissions/test.test.get. Reason: bad request 400',
      ),
    );

    await expect(
      configureIAM(iam, 'https://apiurl.test.dev', 'iam-token', false),
    ).rejects.toEqual(
      new Error('Errors occurred. Fix issues and rerun the action!'),
    );

    expect(core.error).toHaveBeenCalledTimes(1);
  });
});

jest.mock('@actions/core');
jest.mock('request');

const request = require('request');
const {
  setupRoles, getRole, createRole, updateRole, arraysEqual,
} = require('../src/roles');

describe('Setup roles and handle', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const roles = [
    {
      name: 'admin',
      desc: 'sys-id admin',
      permissions: [
        'resource.get',
        'resource.create',
      ],
    },
  ];

  test('it can setup roles for creation', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 404 }, {}));

    await setupRoles(roles, 'sys-id', 'iam-token', 'iam-url');

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it can compare roles with roles for updating', async () => {
    const getPermissions = [
      'resources.test',
      'resources.create',
    ];
    const newPermissions = [
      'resources.get',
      'resources.create',
    ];

    expect(arraysEqual(getPermissions, newPermissions)).toBeFalsy();
  });

  test('it can compare roles with roles for not updating', async () => {
    const getPermissions = [
      'resources.get',
      'resources.create',
    ];
    const newPermissions = [
      'resources.get',
      'resources.create',
    ];

    expect(arraysEqual(getPermissions, newPermissions)).toBeTruthy();
  });

  test('it gets a role that exists', async () => {
    const getRoleResponse = {
      id: 'sys-id.admin',
      name: 'sys-id admin',
      permissions: [
        'resources.get',
        'resources.create',
      ],
    };

    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(getRoleResponse)));

    await expect(getRole('iam-token', 'iam-url', 'sys-id.admin'))
      .resolves.toEqual(getRoleResponse);

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it gets a role that doesn\'t exist', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 404 },
      {}));

    await expect(getRole('iam-token', 'iam-url', 'sys-id.admin'))
      .resolves.toEqual(true);

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it fails to get a role', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 500 },
      {}));

    await expect(getRole('iam-token', 'iam-url', 'sys-id.admin'))
      .rejects.toEqual(new Error('Couldn\'t fetch role from iam-service'));

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it creates a new role', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 201 },
      {}));

    await expect(createRole('iam-token', 'sys-id.admin', 'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'], 'iam-url'))
      .resolves.toEqual('role \'sys-id.admin\' added');

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it failes to create a new role', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 500 },
      {}));

    await expect(createRole('iam-token', 'sys-id.admin', 'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'], 'iam-url'))
      .rejects.toEqual(new Error('Couldn\'t add role'));

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it updates a role', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      {}));

    await expect(updateRole('iam-token', 'sys-id.admin', 'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'], 'iam-url'))
      .resolves.toEqual('role \'sys-id.admin\' updated');

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it failes to update a role', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 500 },
      {}));

    await expect(updateRole('iam-token', 'sys-id.admin', 'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'], 'iam-url'))
      .rejects.toEqual(new Error('Couldn\'t update role'));

    expect(request).toHaveBeenCalledTimes(1);
  });
});

jest.mock('@actions/core');
jest.mock('axios');

const axios = require('axios');
const {
  setupRoles, getRole, createRole, updateRole, arraysEqual,
} = require('../src/roles');

describe('Setup roles and handle', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const roles = [
    {
      id: 'admin',
      name: 'sys-id admin',
      desc: 'sys-id admin',
      permissions: [
        'resource.get',
        'resource.create',
      ],
    },
  ];

  test('it can setup roles for creation', async () => {
    axios.mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ status: 201 });

    await setupRoles(roles, 'sys-id', 'iam-token', 'iam-url');

    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('It can setup roles for update', async () => {
    const getRoleResponse = {
      id: 'sys-id.admin',
      name: 'sys-id admin',
      permissions: [
        'resource.get',
        'resource.create',
        'resource.delete',
      ],
    };

    axios.mockResolvedValueOnce({ status: 200, data: getRoleResponse })
      .mockResolvedValueOnce({ status: 200 });

    await setupRoles(roles, 'sys-id', 'iam-token', 'iam-url');

    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('It can setup roles which are in-sync (no update)', async () => {
    const getRoleResponse = {
      id: 'sys-id.admin',
      name: 'sys-id admin',
      permissions: [
        'sys-id.resource.get',
        'sys-id.resource.create',
      ],
    };
    axios.mockResolvedValueOnce({ status: 200, data: getRoleResponse });

    await setupRoles(roles, 'sys-id', 'iam-token', 'iam-url');

    expect(axios).toHaveBeenCalledTimes(1);
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

    axios.mockResolvedValueOnce({ status: 200, data: getRoleResponse });

    await expect(getRole('iam-token', 'iam-url', 'sys-id.admin'))
      .resolves.toEqual(getRoleResponse);

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it gets a role that doesn\'t exist', async () => {
    axios.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(getRole('iam-token', 'iam-url', 'sys-id.admin'))
      .resolves.toEqual(true);

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it fails to get a role', async () => {
    axios.mockRejectedValueOnce({ message: 'Error', response: { status: 500, data: { error: 'Message' } } });

    await expect(getRole('iam-token', 'iam-url', 'sys-id.admin'))
      .rejects.toThrow('Could not fetch role from iam-service by id sys-id.admin. Request failed with code [500] and error [Message]');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it creates a new role', async () => {
    axios.mockResolvedValueOnce({ status: 200 });

    await expect(createRole(
      'iam-token',
      'sys-id.admin',
      'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'],
      'iam-url',
    ))
      .resolves.toEqual('role \'sys-id.admin\' added');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it failes to create a new role', async () => {
    axios.mockRejectedValueOnce({ message: 'Error', response: { status: 500, data: { error: 'Message' } } });

    await expect(createRole(
      'iam-token',
      'sys-id.admin',
      'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'],
      'iam-url',
    ))
      .rejects.toThrow('Couldn\'t add role \'sys-id.admin\'. Request failed with code [500] and error [Message]');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it updates a role', async () => {
    axios.mockResolvedValueOnce({ status: 200 });

    await expect(updateRole(
      'iam-token',
      'sys-id.admin',
      'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'],
      'iam-url',
    ))
      .resolves.toEqual('role \'sys-id.admin\' updated');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it failes to update a role', async () => {
    axios.mockRejectedValueOnce({ message: 'Error', response: { status: 500, data: { error: 'Message' } } });

    await expect(updateRole(
      'iam-token',
      'sys-id.admin',
      'sys-id admin',
      ['sys-id.resources.get', 'sys-id.resources-create'],
      'iam-url',
    ))
      .rejects.toThrow('Couldn\'t update role \'sys-id.admin\'. Request failed with code [500] and error [Message]');

    expect(axios).toHaveBeenCalledTimes(1);
  });
});

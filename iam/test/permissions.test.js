jest.mock('@actions/core');
jest.mock('axios');

const axios = require('axios');
const { setupPermissions, handlePermissions } = require('../src/permissions');

describe('Setup permissions and handle', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can create a map with permissions from the iam', async () => {
    const permissions = {
      resource: {
        get: 'Get resource',
        create: 'Create resource',
      },
    };

    const result = new Map();
    result.set('test.resource.get', 'Get resource');
    result.set('test.resource.create', 'Create resource');

    await expect(setupPermissions(permissions, 'test'))
      .resolves.toEqual(result);
  });

  test('it can get permissions that exists', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get resource',
    };

    axios.mockResolvedValueOnce({ status: 200, data: getSystemResult });

    const result = new Map();
    result.set('test.resource.get', 'Get resource');

    await handlePermissions(result, 'iam-token', 'api-url');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test('it can create permissions if it doesn\'t exist', async () => {
    axios.mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ status: 201 });

    const result = new Map();
    result.set('test.resource.get', 'Get resource');

    await handlePermissions(result, 'iam-token', 'api-url');

    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('it can update permissions', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get res',
    };

    axios.mockResolvedValue({ status: 200, data: getSystemResult });

    const result = new Map();
    result.set('test.resource.get', 'Get resource');

    await handlePermissions(result, 'iam-token', 'api-url');

    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('it fails update permissions', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get res',
    };

    axios.mockResolvedValueOnce({ status: 200, data: getSystemResult })
      .mockRejectedValueOnce({ message: 'Not found', response: { status: 404, data: { error: 'Message' } } });

    const result = new Map();
    result.set('test.resource.get', 'Get resource');

    await expect(handlePermissions(result, 'iam-token', 'api-url')).rejects
      .toEqual(new Error('Failed to create/update permission test.resource.get. Reason: Not found Message'));

    expect(axios).toHaveBeenCalledTimes(2);
  });
});

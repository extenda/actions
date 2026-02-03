jest.mock('@actions/core');
jest.mock('axios');

import axios from 'axios';

import { handlePermissions, setupPermissions } from '../src/permissions';

describe('Setup permissions and handle', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it can create a map with permissions from the iam', async () => {
    const permissions = {
      resource: ['get', 'create'],
    };

    const result = new Map();
    result.set('test.resource.get', { description: '' });
    result.set('test.resource.create', { description: '' });

    await expect(setupPermissions(permissions, 'test')).resolves.toEqual(
      result,
    );
  });

  test('it can create a map with permissions from the iam when aliases are in', async () => {
    const permissions = {
      resource: [
        { id: 'get', alias: 'get' },
        { id: 'create', alias: 'create' },
      ],
    };

    const result = new Map();
    result.set('test.resource.get', { alias: 'get' });
    result.set('test.resource.create', { alias: 'create' });

    await expect(setupPermissions(permissions, 'test')).resolves.toEqual(
      result,
    );
  });

  test('it can get permissions that exists', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get resource',
    };

    axios.mockResolvedValueOnce({ status: 200, data: getSystemResult });

    const result = new Map();
    result.set('test.resource.get', { description: 'Get resource' });

    await handlePermissions(result, 'iam-token', 'api-url');

    expect(axios).toHaveBeenCalledTimes(1);
  });

  test("it can create permissions if it doesn't exist", async () => {
    axios
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ status: 201 });

    const result = new Map();
    result.set('test.resource.get', { description: 'Get resource' });

    await handlePermissions(result, 'iam-token', 'api-url');

    expect(axios).toHaveBeenCalledTimes(2);
  });

  test('it can update multiple permissions', async () => {
    const getSystemResult = {
      id: 'test.resource.getN',
      description: 'Get res',
    };

    axios.mockResolvedValue({ status: 200, data: getSystemResult });

    const result = new Map();
    result.set('test.resource.get1', { description: 'Get resource' });
    result.set('test.resource.get2', { description: 'Get resource' });
    result.set('test.resource.get3', { description: 'Get resource' });
    result.set('test.resource.get4', { description: 'Get resource' });
    result.set('test.resource.get5', { description: 'Get resource' });
    result.set('test.resource.get6', { description: 'Get resource' });
    result.set('test.resource.get7', { description: 'Get resource' });
    result.set('test.resource.get8', { description: 'Get resource' });
    result.set('test.resource.get9', { description: 'Get resource' });
    result.set('test.resource.get10', { description: 'Get resource' });
    result.set('test.resource.get11', { description: 'Get resource' });
    result.set('test.resource.get12', { description: 'Get resource' });

    await handlePermissions(result, 'iam-token', 'api-url');

    expect(axios).toHaveBeenCalledTimes(24);
  });

  test('it fails update permissions', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get res',
    };

    axios
      .mockResolvedValueOnce({ status: 200, data: getSystemResult })
      .mockRejectedValueOnce({
        message: 'Not found',
        response: { status: 404, data: { error: 'Not found' } },
      });

    const result = new Map();
    result.set('test.resource.get', { description: 'Get resource' });

    await expect(
      handlePermissions(result, 'iam-token', 'api-url'),
    ).rejects.toThrow(
      'Failed to update permission test.resource.get. Request failed with code [404] and error [Not found]',
    );

    expect(axios).toHaveBeenCalledTimes(2);
  });
});

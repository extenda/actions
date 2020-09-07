jest.mock('@actions/core');
jest.mock('request');

const request = require('request');
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

    await handlePermissions(result, 'iam-token', 'api-url');

    expect(request).toHaveBeenCalledTimes(2);
  });

  test('it can get permissions that exists', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get resource',
    };
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(getSystemResult)));


    const result = new Map();
    result.set('test.resource.get', 'Get resource');


    await handlePermissions(result, 'iam-token', 'api-url');

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it can create permissions if it doeasn\'t exist', async () => {
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 404 }, {}));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 201 }, {}));

    const result = new Map();
    result.set('test.resource.get', 'Get resource');


    await handlePermissions(result, 'iam-token', 'api-url');

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it can update permissions', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get res',
    };

    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(getSystemResult)));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(getSystemResult)));

    const result = new Map();
    result.set('test.resource.get', 'Get resource');


    await handlePermissions(result, 'iam-token', 'api-url');

    expect(request).toHaveBeenCalledTimes(1);
  });

  test('it fails update permissions', async () => {
    const getSystemResult = {
      id: 'test.resource.get',
      description: 'Get res',
    };

    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      JSON.stringify(getSystemResult)));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 404 },
      JSON.stringify(getSystemResult)));

    const result = new Map();
    result.set('test.resource.get', 'Get resource');


    await handlePermissions(result, 'iam-token', 'api-url');

    expect(request).toHaveBeenCalledTimes(1);
  });
});

const mock = require('mock-fs');

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('request');
const request = require('request');
const exec = require('@actions/exec');
const setupSystem = require('../src/create-system');


const systemOwners = ['test@mail.com'];

describe('create system in styra-das', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mock.restore();
  });

  test('it can create system for staging', async () => {
    mock({});
    exec.exec.mockResolvedValueOnce(0);
    const createSystemResult = {
      result: {
        id: '3q54hw45hwrt',
        install: {
          envoy: {
            'example-app': '\'Authorization: bearer tokentoken\'',
          },
        },
      },
    };
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 201 },
      createSystemResult));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 },
      createSystemResult));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    await setupSystem('test-service', 'test.test-service-staging', 'staging', 'test-repo', 'styra-token', 'https://test.styra.com', systemOwners);

    expect(request).toHaveBeenCalledTimes(5);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-f',
      'test.test-service-staging',
    ]);
  });

  test('it can create system for prod', async () => {
    mock({});
    const createSystemResult = {
      result: {
        id: '3q54hw45hwrt',
        install: {
          envoy: {
            'example-app': '\'Authorization: bearer tokentoken\'',
          },
        },
      },
    };
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 201 },
      createSystemResult));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    exec.exec.mockResolvedValueOnce(0);
    await setupSystem('test-service', 'test.test-service-prod', 'prod', 'test-repo', 'styra-token', 'https://test.styra.com', systemOwners);
    expect(request).toHaveBeenCalledTimes(7);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-f',
      'test.test-service-prod',
    ]);
  });
});

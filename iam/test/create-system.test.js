const mock = require('mock-fs');

jest.mock('axios');
jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('request');
jest.mock('../src/handle-consumers');

const request = require('request');
const exec = require('@actions/exec');
const axios = require('axios');
const { setupSystem } = require('../src/create-system');

const systemOwners = ['test@mail.com'];
const opaConfig = `
kind: ConfigMap
apiVersion: v1
metadata:
  name: opa-envoy-config
  namespace: test-service
data:
  conf.yaml: |
    services:
      - name: styra
        url: https://test.styra.com
        credentials:
          bearer:
            token: "styra-token"
    labels:
      system-id: "system-id"
      system-type: "envoy"
    discovery:
      name: discovery
      prefix: "/systems/system-id"
      `;

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
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      createSystemResult,
    ));
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      opaConfig,
    ));
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      createSystemResult,
    ));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    axios.mockResolvedValueOnce({ status: 200 });

    await setupSystem('test-service', 'test.test-service-staging', 'staging', 'test-repo', 'styra-token', 'https://test.styra.com', systemOwners, [], 'iam-token', 'https://apiurl.test.dev');

    expect(request).toHaveBeenCalledTimes(6);
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
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      createSystemResult,
    ));
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      opaConfig,
    ));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 400 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    axios.mockResolvedValueOnce({ status: 200 });
    exec.exec.mockResolvedValueOnce(0);
    await setupSystem('test-service', 'test.test-service-prod', 'prod', 'test-repo', 'styra-token', 'https://test.styra.com', systemOwners, [], 'iam-token', 'https://apiurl.test.dev');
    expect(request).toHaveBeenCalledTimes(8);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-f',
      'test.test-service-prod',
    ]);
  });

  test('It returns if create system fails', async () => {
    mock({});
    const createSystemResult = {
      code: 'Invalid repository',
      message: 'Error message',
    };
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 400 },
      createSystemResult,
    ));
    exec.exec.mockResolvedValueOnce(0);
    await expect(
      setupSystem('test-service', 'test.test-service-prod', 'prod', 'test-repo', 'styra-token', 'https://test.styra.com', systemOwners, [], 'iam-token', 'https://apiurl.test.dev'),
    )
      .resolves.toEqual(null);
    expect(request).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledTimes(0);
  });

  test('it throws error for upload styra system mapping', async () => {
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
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      createSystemResult,
    ));
    request.mockImplementationOnce((conf, cb) => cb(
      null,
      { statusCode: 200 },
      opaConfig,
    ));

    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    request.mockImplementationOnce((conf, cb) => cb(null, { statusCode: 200 }));
    axios.mockRejectedValueOnce({ status: 500, message: 'service unavailable' });
    exec.exec.mockResolvedValueOnce(0);

    await expect(setupSystem('test-service', 'test.test-service-prod', 'prod', 'test-repo', 'styra-token', 'https://test.styra.com', systemOwners, [], 'iam-token', 'https://apiurl.test.dev'))
      .rejects
      .toEqual(new Error('Could not add mapping for \'test.test-service-prod\'. Unexpected error for iam api: service unavailable'));
    expect(axios).toHaveBeenCalledTimes(1);
  });
});

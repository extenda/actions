jest.mock('@actions/core');
jest.mock('../src/create-api-test');

const core = require('@actions/core');
const { resolve } = require('path');
const action = require('../src/index');
const { createApiTest } = require('../src/create-api-test');

describe('run action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('runs the action', async () => {
    const spy = jest.fn();
    spy.status = jest.fn();

    core.getInput
      .mockReturnValueOnce('token')
      .mockReturnValueOnce('url')
      .mockReturnValueOnce(resolve(__dirname, '../src/tests.yml'));
    createApiTest
      .mockReturnValueOnce(spy);
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(createApiTest).toHaveBeenCalledTimes(1);
    expect(createApiTest).toBeCalledWith('url', 'token');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toBeCalledWith('POST /api/v1/permissions', { code: 400 });
    expect(spy).toBeCalledWith('GET /api/v1/permissions', { body: { field: 'value' }, code: 200 });
  });

  test('runs the action with fail', async () => {
    const spy = jest.fn();
    spy.status = jest.fn().mockRejectedValue(new Error('message'));

    core.getInput
      .mockReturnValueOnce('token')
      .mockReturnValueOnce('url')
      .mockReturnValueOnce(resolve(__dirname, '../src/tests.yml'));
    createApiTest
      .mockReturnValueOnce(spy);
    await action();

    expect(core.setFailed).toBeCalledWith('message');
  });
});

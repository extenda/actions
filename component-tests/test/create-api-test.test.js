const { load: parseYaml } = require('js-yaml');
const { readFile } = require('fs').promises;
const { resolve } = require('path');
const { createApiTest } = require('../src/create-api-test');

const spy = jest.fn();
const mockCall = (method, url) => ({
  set: () => ({
    expect(res) {
      spy(method, url, res);
      return this;
    },
  }),
});
jest.mock('supertest', () => ({
  agent: () => ({
    post: (url) => mockCall('POST', url),
    get: (url) => mockCall('GET', url),
    auth: () => {},
  }),
}));

describe('createApiTest function', () => {
  test('it runs correct tests', async () => {
    const yaml = parseYaml(
      await readFile(resolve(__dirname, '../src/tests.yml')),
    );
    const test = createApiTest('', '');
    for (const [request, expected] of Object.entries(yaml)) {
      await test(request, expected);
    }
    expect(spy).toBeCalledTimes(3);
    expect(spy).toBeCalledWith('POST', '/api/v1/permissions', 400);
    expect(spy).toBeCalledWith('GET', '/api/v1/permissions', 200);
    expect(spy).toBeCalledWith('GET', '/api/v1/permissions', {
      field: 'value',
    });

    try {
      await test.status();
    } catch (e) {
      expect(e.message).toBe('Tests: 1 passed, 1 failed, 2 total');
    }
  });
});

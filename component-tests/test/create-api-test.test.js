import { readFile } from 'node:fs/promises';

import { load as parseYaml } from 'js-yaml';
import { resolve } from 'path';
import { describe, expect, test, vi } from 'vitest';

import { createApiTest } from '../src/create-api-test.js';

const spy = vi.fn();
const mockCall = (method, url) => ({
  set: () => ({
    expect(res) {
      spy(method, url, res);
      return this;
    },
  }),
});
vi.mock('supertest', () => ({
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
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith('POST', '/api/v1/permissions', 400);
    expect(spy).toHaveBeenCalledWith('GET', '/api/v1/permissions', 200);
    expect(spy).toHaveBeenCalledWith('GET', '/api/v1/permissions', {
      field: 'value',
    });

    try {
      await test.status();
    } catch (e) {
      expect(e.message).toBe('Tests: 1 passed, 1 failed, 2 total');
    }
  });
});

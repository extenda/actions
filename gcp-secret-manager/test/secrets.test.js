import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { execGcloud, withGcloud } from '../../setup-gcloud/src/index.js';
import mockSetupGcloud from '../../setup-gcloud/src/setup-gcloud.js';
import {
  loadSecretIntoEnv,
  loadSecrets,
  parseInputYaml,
} from '../src/secrets.js';

vi.mock('../../setup-gcloud/src/setup-gcloud.js');
vi.mock('@actions/core');
vi.mock('../../setup-gcloud/src/index.js');

const SECRET_JSON = JSON.stringify(
  {
    payload: {
      data: Buffer.from('test-value', 'utf-8').toString('base64'),
    },
  },
  null,
  2,
);

const orgEnv = process.env;

describe('Secrets Manager', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
    withGcloud.mockImplementation((serviceAccountKey, fn) =>
      fn('test-project'),
    );
  });

  afterEach(() => {
    process.env = orgEnv;
    vi.resetAllMocks();
  });

  test('It can parse input YAML', () => {
    const input = `
ENV_NAME: secret-name
EXPORT_AS: my-secret
`;
    const map = parseInputYaml(input);
    expect(map).toMatchObject({
      ENV_NAME: 'secret-name',
      EXPORT_AS: 'my-secret',
    });
  });

  test('It can load secrets', async () => {
    process.env.GCLOUD_INSTALLED_VERSION = '1';
    mockSetupGcloud.mockResolvedValueOnce('test-project');
    execGcloud.mockResolvedValueOnce(SECRET_JSON);
    await loadSecrets('test', { TEST_TOKEN: 'test-token' });
    expect(core.exportVariable).toHaveBeenCalledWith(
      'TEST_TOKEN',
      'test-value',
    );
  });

  describe('loadSecretIntoEnv', () => {
    test('It sets env vars from secrets', async () => {
      process.env.GCLOUD_INSTALLED_VERSION = '1';
      mockSetupGcloud.mockResolvedValueOnce('test-project');
      execGcloud.mockResolvedValueOnce(SECRET_JSON);

      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
      );
      expect(secret).toEqual('test-value');
      expect(process.env.MY_SECRET).toEqual('test-value');
      expect(execGcloud).toHaveBeenCalledWith(
        [
          'secrets',
          'versions',
          'access',
          'latest',
          '--secret=my-secret',
          '--project=test-project',
          '--format=json',
        ],
        'gcloud',
        true,
      );
    });

    test('It exports variables', async () => {
      process.env.GCLOUD_INSTALLED_VERSION = '1';
      mockSetupGcloud.mockResolvedValueOnce('test-project');
      execGcloud.mockResolvedValueOnce(SECRET_JSON);

      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
        true,
      );
      expect(secret).toEqual('test-value');
      expect(core.exportVariable).toHaveBeenCalledWith('MY_SECRET', secret);
    });

    test('It preserves set env.vars', async () => {
      mockSetupGcloud.mockResolvedValueOnce('test-project');
      execGcloud.mockResolvedValueOnce(SECRET_JSON);

      process.env.MY_SECRET = 'existing-value';
      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
      );
      expect(secret).toEqual('existing-value');
      expect(process.env.MY_SECRET).toEqual('existing-value');
    });

    test('It fails if values are not resolved', async () => {
      mockSetupGcloud.mockResolvedValueOnce('test-project');
      execGcloud.mockRejectedValueOnce(new Error('Not found'));
      await expect(
        loadSecretIntoEnv('', 'my-secret', 'MY_SECRET'),
      ).rejects.toThrow('Missing env var: MY_SECRET');
    });
  });
});

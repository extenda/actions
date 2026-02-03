import * as core from '@actions/core';

import { execGcloud as mockExecGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import mockSetupGcloud from '../../setup-gcloud/src/setup-gcloud.js';
import {
  loadSecret,
  loadSecretIntoEnv,
  loadSecrets,
  parseInputYaml,
} from '../src/secrets.js';

jest.mock('../../setup-gcloud/src/exec-gcloud');
jest.mock('../../setup-gcloud/src/setup-gcloud');

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
  });

  afterEach(() => {
    process.env = orgEnv;
    jest.resetAllMocks();
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
    mockExecGcloud
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(SECRET_JSON)
      .mockResolvedValueOnce('"test@test"');
    await loadSecrets('test', { TEST_TOKEN: 'test-token' });
    expect(process.env.TEST_TOKEN).toEqual('test-value');
    expect(mockExecGcloud).not.toHaveBeenCalledWith(
      expect.arrayContaining(['config', 'set', 'account']),
      'gcloud',
      true,
    );
  });

  test('It can load a single secret and restore account', async () => {
    process.env.GCLOUD_INSTALLED_VERSION = '1';
    mockSetupGcloud.mockResolvedValueOnce('test-project');
    mockExecGcloud
      .mockResolvedValueOnce('"test2@test"')
      .mockResolvedValueOnce(SECRET_JSON)
      .mockResolvedValueOnce('"pipeline-secret@test"')
      .mockResolvedValueOnce('');
    const secret = await loadSecret('', 'test-token');
    expect(secret).toEqual('test-value');
    expect(mockSetupGcloud).toHaveBeenCalled();
    expect(mockExecGcloud).toHaveBeenNthCalledWith(
      1,
      ['config', 'get', 'account', '--format=json'],
      'gcloud',
      true,
    );
    expect(mockExecGcloud).toHaveBeenNthCalledWith(
      2,
      [
        'secrets',
        'versions',
        'access',
        'latest',
        '--secret=test-token',
        '--project=test-project',
        '--format=json',
      ],
      'gcloud',
      true,
    );
    expect(mockExecGcloud).toHaveBeenNthCalledWith(
      3,
      ['config', 'get', 'account', '--format=json'],
      'gcloud',
      true,
    );
    expect(mockExecGcloud).toHaveBeenNthCalledWith(
      4,
      ['config', 'set', 'account', 'test2@test'],
      'gcloud',
      true,
    );
  });

  describe('loadSecretIntoEnv', () => {
    test('It sets env vars from secrets', async () => {
      process.env.GCLOUD_INSTALLED_VERSION = '1';
      mockSetupGcloud.mockResolvedValueOnce('test-project');
      mockExecGcloud
        .mockResolvedValueOnce('"test2@test"')
        .mockResolvedValueOnce(SECRET_JSON)
        .mockResolvedValueOnce('"pipeline-secret@test"')
        .mockResolvedValueOnce('');

      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
      );
      expect(secret).toEqual('test-value');
      expect(process.env.MY_SECRET).toEqual('test-value');
      expect(mockSetupGcloud).toHaveBeenCalled();
      expect(mockExecGcloud).toHaveBeenNthCalledWith(
        2,
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
      mockExecGcloud
        .mockResolvedValueOnce('"test2@test"')
        .mockResolvedValueOnce(SECRET_JSON)
        .mockResolvedValueOnce(
          JSON.stringify(
            [
              {
                account: 'test',
                status: 'ACTIVE',
              },
            ],
            null,
            2,
          ),
        );

      const exportVariable = jest.spyOn(core, 'exportVariable');
      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
        true,
      );
      expect(secret).toEqual('test-value');
      expect(exportVariable).toHaveBeenCalledWith('MY_SECRET', secret);
      exportVariable.mockReset();
    });

    test('It preserves set env.vars', async () => {
      mockSetupGcloud.mockResolvedValueOnce('test-project');
      mockExecGcloud.mockResolvedValueOnce(SECRET_JSON).mockResolvedValueOnce(
        JSON.stringify(
          [
            {
              account: 'test',
              status: 'ACTIVE',
            },
          ],
          null,
          2,
        ),
      );

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
      mockExecGcloud
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(
          JSON.stringify(
            [
              {
                account: 'test',
                status: 'ACTIVE',
              },
            ],
            null,
            2,
          ),
        );
      await expect(
        loadSecretIntoEnv('', 'my-secret', 'MY_SECRET'),
      ).rejects.toThrow('Missing env var: MY_SECRET');
    });
  });
});

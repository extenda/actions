import core from '@actions/core';

import { loadSecret } from '../../../gcp-secret-manager/src/secrets';
import { checkEnv } from '../../../utils';
import readSecret from '../../src/utils/load-credentials';

jest.mock('@actions/core');
jest.mock('../../../gcp-secret-manager/src/secrets');
jest.mock('../../../utils');

describe('readSecret', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load secret from environment variable when available', async () => {
    const envVar = 'SECRET_ENV_VAR';
    process.env[envVar] = 'secret_value';
    const secretValue = 'secret_value';

    const result = await readSecret('SA', 'test', 'secretName', envVar);

    expect(result).toBe(secretValue);
    expect(core.info).toHaveBeenCalledWith('Load secret secretName for test');
    expect(loadSecret).not.toHaveBeenCalled();
    expect(checkEnv).not.toHaveBeenCalled();
  });

  it('should load secret from Secret Manager when serviceAccountKey is provided', async () => {
    const envVar = null;
    const serviceAccountKey = 'service_account_key';
    const secretName = 'some-secret';
    const secretValue = 'secret_value';

    loadSecret.mockResolvedValue(secretValue);

    const result = await readSecret(
      serviceAccountKey,
      'test',
      secretName,
      envVar,
    );

    expect(result).toBe(secretValue);
    expect(core.info).toHaveBeenCalledWith(
      `Load secret ${secretName} for test`,
    );
    expect(loadSecret).toHaveBeenCalledWith(serviceAccountKey, secretName);
    expect(checkEnv).not.toHaveBeenCalled();
  });
});

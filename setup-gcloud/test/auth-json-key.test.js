import { describe, expect, test, vi } from 'vitest';

import {
  authenticateJsonKey,
  configureServiceAccount,
} from '../src/auth-json-key.js';
import { execGcloud } from '../src/exec-gcloud.js';

vi.mock('../src/exec-gcloud.js');

describe('auth-json-key', () => {
  test('authenticateJsonKey authenticates with service account key file', async () => {
    execGcloud.mockResolvedValueOnce('');

    await authenticateJsonKey('/tmp/key.json');

    expect(execGcloud).toHaveBeenCalledWith(
      [
        '--quiet',
        'auth',
        'activate-service-account',
        '--key-file',
        '/tmp/key.json',
      ],
      'gcloud',
      true,
    );
  });

  test('configureServiceAccount sets gcloud account', async () => {
    execGcloud.mockResolvedValueOnce('');

    await configureServiceAccount(
      'service-account@example.iam.gserviceaccount.com',
    );

    expect(execGcloud).toHaveBeenCalledWith(
      [
        'config',
        'set',
        'account',
        'service-account@example.iam.gserviceaccount.com',
      ],
      'gcloud',
      true,
    );
  });
});

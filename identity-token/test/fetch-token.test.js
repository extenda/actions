import { execGcloud } from 'setup-gcloud/src/index.js';
import { afterEach, describe, expect, test, vi } from 'vitest';

import fetchToken from '../src/fetch-token.js';

vi.mock('setup-gcloud/src/index.js');

describe('Obtain an identity token', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('Fetch token', async () => {
    const token = 'yJhbGciOiJSUzI1NiIsImtpZCI6Im';
    execGcloud.mockResolvedValueOnce(token);
    const value = await fetchToken(
      'my-sa@example.iam.gserviceaccount.com',
      'bhq-braveheart-quotes',
    );
    expect(value).toEqual(token);
    expect(execGcloud).toHaveBeenCalledWith(
      [
        'auth',
        'print-identity-token',
        '--impersonate-service-account=my-sa@example.iam.gserviceaccount.com',
        '--include-email',
        '--audiences=bhq-braveheart-quotes',
      ],
      'gcloud',
      true,
    );
  });
});

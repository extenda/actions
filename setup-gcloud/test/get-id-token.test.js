import { beforeEach, expect, test, vi } from 'vitest';

import { getCurrentAccount } from '../src/auth-gcloud.js';
import { execGcloud } from '../src/exec-gcloud.js';
import { getIdToken } from '../src/get-id-token.js';

vi.mock('../src/exec-gcloud.js');
vi.mock('../src/auth-gcloud.js');

beforeEach(() => {
  vi.resetAllMocks();
});

test('It should return the id token', async () => {
  execGcloud.mockResolvedValue('token');
  getCurrentAccount.mockReturnValueOnce({ email: 'sa' });

  const token = await getIdToken('audience');

  expect(token).toBe('token');
  expect(execGcloud).toHaveBeenCalledWith(
    [
      'auth',
      'print-identity-token',
      '--audiences=audience',
      '--impersonate-service-account=sa',
      '--include-email',
    ],
    'gcloud',
    true,
  );
});

test('It should throw if not authenticated', async () => {
  getCurrentAccount.mockReturnValueOnce(undefined);

  await expect(getIdToken('audience')).rejects.toThrow(
    'No authenticated service account',
  );
  expect(execGcloud).not.toHaveBeenCalled();
});

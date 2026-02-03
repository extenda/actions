import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('../../src/utils/gcloud-output', () =>
  vi.fn().mockImplementation(() => Promise.resolve()),
);

import checkIamSystem from '../../src/manifests/check-system.js';
import execGcloud from '../../src/utils/gcloud-output.js';

describe('Check iam bundles system', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It can check bundle exists', async () => {
    execGcloud.mockResolvedValueOnce(true);
    await checkIamSystem('systemName');
    expect(execGcloud).toHaveBeenNthCalledWith(
      1,
      ['ls', 'gs://authz-bundles/systems/systemName.tar.gz'],
      'gsutil',
      expect.anything(),
      expect.anything(),
    );
  });
});

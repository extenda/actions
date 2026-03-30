import { beforeEach, describe, expect, it, vi } from 'vitest';

import { execGcloud } from '../../../setup-gcloud/src/index.js';
import getToken from '../../src/utils/identity-token.js';

vi.mock('../../../setup-gcloud/src/index.js');

describe('getToken function', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch and return the id token', async () => {
    execGcloud.mockResolvedValue('token');
    const result = await getToken('cloud-deploy');

    expect(result).toBe('token');
    expect(execGcloud).toHaveBeenCalledWith(
      ['auth', 'print-identity-token', '--audiences=cloud-deploy'],
      'gcloud',
      true,
    );
  });
});

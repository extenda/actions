import { getIdToken } from 'setup-gcloud/src/index.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import getToken from '../../src/utils/identity-token.js';

vi.mock('../../../setup-gcloud/src/index.js');

describe('getToken function', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch and return the id token', async () => {
    getIdToken.mockResolvedValueOnce('token');
    const result = await getToken('cloud-deploy');
    expect(result).toBe('token');
  });
});

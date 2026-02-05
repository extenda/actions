import { describe, expect, it, vi } from 'vitest';
vi.mock('../../../gcp-secret-manager/src/secrets.js');

import { loadSecret } from '../../../gcp-secret-manager/src/secrets.js';
import { loadSecrets } from '../../src/secrets-manager/load-secrets.js';

describe('loadSecrets', () => {
  it('loads correct secrets', async () => {
    const secret = 'secret';
    const serviceAcc = 'serviceAccountKey';
    loadSecret.mockResolvedValue(secret);

    expect(await loadSecrets(serviceAcc)).toEqual({
      key: secret,
      email: secret,
      pass: secret,
      gipTenantId: secret,
    });
  });
});

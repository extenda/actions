jest.mock('../../../gcp-secret-manager/src/secrets');

import { loadSecret } from '../../../gcp-secret-manager/src/secrets';
import { loadSecrets } from '../../src/secrets-manager/load-secrets';

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

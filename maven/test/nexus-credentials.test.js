jest.mock('../../gcp-secret-manager/src/secrets');
import { loadSecretIntoEnv } from '../../gcp-secret-manager/src/secrets';
import setupCredentials from '../src/nexus-credentials';

test('It loads credentials for Nexus', async () => {
  loadSecretIntoEnv
    .mockResolvedValueOnce('secret1')
    .mockResolvedValueOnce('secret2');
  await setupCredentials(
    'service-account-key',
    'nexus-username',
    'nexus-password',
  );
  expect(loadSecretIntoEnv).toHaveBeenCalledTimes(2);
  expect(loadSecretIntoEnv).toHaveBeenCalledWith(
    'service-account-key',
    'nexus-username',
    'NEXUS_USERNAME',
    true,
  );
  expect(loadSecretIntoEnv).toHaveBeenCalledWith(
    'service-account-key',
    'nexus-password',
    'NEXUS_PASSWORD',
    true,
  );
});

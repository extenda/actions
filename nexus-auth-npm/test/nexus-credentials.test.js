jest.mock('../../gcp-secret-manager/src/secrets');

const mockedEnv = require('mocked-env');
const { loadSecrets } = require('../../gcp-secret-manager/src/secrets');
const { validateOrFetchNexusCredentials } = require('../src/nexus-credentials');

describe('nexus-credentials', () => {
  let envRestore;

  afterEach(() => {
    jest.resetAllMocks();
    if (envRestore) envRestore();
  });

  it('returns passed credentials', async () => {
    const res = await validateOrFetchNexusCredentials({ username: 'u', password: 'p' });

    expect(res).toEqual({ username: 'u', password: 'p' });
  });

  it('throws if credentials were not found', async () => {
    await expect(validateOrFetchNexusCredentials({}))
      .rejects.toThrow(new Error('Credentials are not found'));
  });

  it('fetches credentials if they were not provided', async () => {
    envRestore = mockedEnv({
      NEXUS_USERNAME: 'u',
      NEXUS_PASSWORD: 'p',
    });
    loadSecrets.mockResolvedValueOnce();

    const res = await validateOrFetchNexusCredentials({ serviceAccountKey: 'sac' });

    expect(loadSecrets).toBeCalledWith('sac', {
      NEXUS_USERNAME: 'nexus-username',
      NEXUS_PASSWORD: 'nexus-password',
    });
    expect(res).toEqual({ username: 'u', password: 'p' });
  });
});

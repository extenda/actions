jest.mock('@actions/core');
jest.mock('../src/nexus-credentials');
jest.mock('../src/npmrc');

const mockedEnv = require('mocked-env');
const { getInput } = require('@actions/core');
const { validateOrFetchNexusCredentials } = require('../src/nexus-credentials');
const { createNpmrcFile } = require('../src/npmrc');
const action = require('../src/index');

describe('Auth to Nexus npm registry action', () => {
  let envRestore;

  afterEach(() => {
    jest.resetAllMocks();
    if (envRestore) envRestore();
  });

  it('fetches credentials and creates .npmrc file', async () => {
    getInput.mockReturnValueOnce('nexus-username')
      .mockReturnValueOnce('nexus-password')
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('npmrc-dir');
    createNpmrcFile.mockResolvedValueOnce({});
    validateOrFetchNexusCredentials.mockResolvedValueOnce({
      username: 'nexus-username',
      password: 'nexus-password',
    });

    await action();

    expect(getInput).toHaveBeenCalledTimes(4);
    expect(validateOrFetchNexusCredentials).toHaveBeenCalledWith({
      username: 'nexus-username',
      password: 'nexus-password',
      serviceAccountKey: 'service-account-key',
    });
    expect(createNpmrcFile).toHaveBeenCalledWith({
      credentials: {
        username: 'nexus-username',
        password: 'nexus-password',
      },
      authForPublishing: false,
      outputDir: 'npmrc-dir',
    });
  });

  it('defaults to env vars and cwd', async () => {
    envRestore = mockedEnv({
      NEXUS_USERNAME: 'env-nexus-username',
      NEXUS_PASSWORD: 'env-nexus-password',
    });

    getInput.mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce(undefined);
    createNpmrcFile.mockResolvedValueOnce({});
    validateOrFetchNexusCredentials.mockResolvedValueOnce({
      username: 'env-nexus-username',
      password: 'env-nexus-password',
    });

    await action();

    expect(getInput).toHaveBeenCalledTimes(4);
    expect(validateOrFetchNexusCredentials).toHaveBeenCalledWith({
      username: 'env-nexus-username',
      password: 'env-nexus-password',
      serviceAccountKey: 'service-account-key',
    });
    expect(createNpmrcFile).toHaveBeenCalledWith({
      credentials: {
        username: 'env-nexus-username',
        password: 'env-nexus-password',
      },
      authForPublishing: false,
      outputDir: '.',
    });
  });
});

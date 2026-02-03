jest.mock('../../gcp-secret-manager/src/secrets');
import secrets from '../../gcp-secret-manager/src/secrets.js';
import creds from '../src/sonar-credentials.js';

const orgEnv = process.env;

describe('Sonar Credentials', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
    process.env['INPUT_SERVICE-ACCOUNT-KEY'] = 'json-key';
    process.env['INPUT_GITHUB-TOKEN-SECRET-NAME'] = 'github-token';
    delete process.env.GITHUB_TOKEN;
    delete process.env.SONAR_TOKEN;
  });

  afterEach(() => {
    process.env = orgEnv;
    jest.resetAllMocks();
  });

  test('It uses existing env vars', async () => {
    process.env.GITHUB_TOKEN = 'github';
    process.env.SONAR_TOKEN = 'sonar';
    secrets.loadSecretIntoEnv
      .mockResolvedValueOnce('github')
      .mockResolvedValueOnce('sonar');
    const { githubToken, sonarToken } = await creds.credentials(
      'https://sonarcloud.io',
      false,
    );
    expect(secrets.loadSecretIntoEnv).toHaveBeenCalledTimes(2);
    expect(githubToken).toEqual('github');
    expect(sonarToken).toEqual('sonar');
  });

  test('It can mix env vars and secrets', async () => {
    process.env.GITHUB_TOKEN = 'github';
    secrets.loadSecretIntoEnv
      .mockResolvedValueOnce('github')
      .mockResolvedValueOnce('sonarSecret');
    const { githubToken, sonarToken } = await creds.credentials(
      'https://sonarcloud.io',
      false,
    );
    expect(githubToken).toEqual('github');
    expect(sonarToken).toEqual('sonarSecret');
    expect(secrets.loadSecretIntoEnv).toHaveBeenCalledTimes(2);
  });

  test('It loads token from Secret Manager', async () => {
    secrets.loadSecretIntoEnv
      .mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');
    const { githubToken, sonarToken } = await creds.credentials(
      'https://sonarcloud.io',
      false,
    );
    expect(githubToken).toEqual('githubSecret');
    expect(sonarToken).toEqual('sonarSecret');
    expect(secrets.loadSecretIntoEnv.mock.calls[0][1]).toEqual('github-token');
    expect(secrets.loadSecretIntoEnv.mock.calls[1][1]).toEqual(
      'sonarcloud-token',
    );
  });

  test('It loads sonarqube-token for sonar.extenda.io', async () => {
    secrets.loadSecretIntoEnv
      .mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');
    const { sonarToken } = await creds.credentials(
      'https://sonar.extenda.io',
      false,
    );
    expect(sonarToken).toEqual('sonarSecret');
    expect(secrets.loadSecretIntoEnv.mock.calls[1][1]).toEqual(
      'sonarqube-token',
    );
  });

  test('It caches credentials', async () => {
    secrets.loadSecretIntoEnv
      .mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');
    await creds.credentials('https://sonarcloud.io', false);
    expect(secrets.loadSecretIntoEnv.mock.calls).toHaveLength(2);

    await creds.credentials('https://sonarcloud.io');
    expect(secrets.loadSecretIntoEnv.mock.calls).toHaveLength(2);
  });

  test('It can return Axios auth config', async () => {
    secrets.loadSecretIntoEnv
      .mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');

    // We call credentials like this to ensure no cache is used.
    await creds.credentials('https://sonarcloud.io', false);

    // auth always uses the cache.
    const auth = await creds.sonarAuth('https://sonarcloud.io');
    expect(auth).toMatchObject({
      password: '',
      username: 'sonarSecret',
    });
    expect(secrets.loadSecretIntoEnv.mock.calls).toHaveLength(2);
  });
});

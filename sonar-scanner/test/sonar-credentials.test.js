const secrets = require('../../gcp-secret-manager/src/secrets');

jest.mock('../../gcp-secret-manager/src/secrets');

const creds = require('../src/sonar-credentials');

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
    const { githubToken, sonarToken } = await creds.credentials('https://sonarcloud.io', false);
    expect(githubToken).toEqual('github');
    expect(sonarToken).toEqual('sonar');
    expect(secrets.loadSecret.mock.calls).toHaveLength(0);
  });

  test('It fails if env vars and service-account-key is missing', async () => {
    delete process.env['INPUT_SERVICE-ACCOUNT-KEY'];
    await expect(creds.credentials('https://sonarcloud.io', false))
      .rejects.toEqual(new Error('Missing env var: GITHUB_TOKEN'));
  });

  test('It can mix env vars and secrets', async () => {
    process.env.GITHUB_TOKEN = 'github';
    secrets.loadSecret.mockResolvedValueOnce('sonarSecret');
    const { githubToken, sonarToken } = await creds.credentials('https://sonarcloud.io', false);
    expect(githubToken).toEqual('github');
    expect(sonarToken).toEqual('sonarSecret');
    expect(secrets.loadSecret.mock.calls).toHaveLength(1);
  });

  test('It loads token from Secret Manager', async () => {
    secrets.loadSecret.mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');
    const { githubToken, sonarToken } = await creds.credentials('https://sonarcloud.io', false);
    expect(githubToken).toEqual('githubSecret');
    expect(sonarToken).toEqual('sonarSecret');
    expect(process.env.GITHUB_TOKEN).toEqual('githubSecret');
    expect(process.env.SONAR_TOKEN).toEqual('sonarSecret');
    expect(secrets.loadSecret.mock.calls[0][1]).toEqual('github-token');
    expect(secrets.loadSecret.mock.calls[1][1]).toEqual('sonarcloud-token');
  });

  test('It loads sonarqube-token for sonar.extenda.io', async () => {
    secrets.loadSecret.mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');
    const { sonarToken } = await creds.credentials('https://sonar.extenda.io', false);
    expect(sonarToken).toEqual('sonarSecret');
    expect(process.env.SONAR_TOKEN).toEqual('sonarSecret');
    expect(secrets.loadSecret.mock.calls[1][1]).toEqual('sonarqube-token');
  });

  test('It sets env vars from secrets', async () => {
    secrets.loadSecret.mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');
    await creds.credentials('https://sonarcloud.io', false);
    expect(process.env.GITHUB_TOKEN).toEqual('githubSecret');
    expect(process.env.SONAR_TOKEN).toEqual('sonarSecret');
  });

  test('It caches credentials', async () => {
    secrets.loadSecret.mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');
    await creds.credentials('https://sonarcloud.io', false);
    expect(secrets.loadSecret.mock.calls).toHaveLength(2);

    await creds.credentials('https://sonarcloud.io');
    expect(secrets.loadSecret.mock.calls).toHaveLength(2);
  });

  test('It can return Axios auth config', async () => {
    secrets.loadSecret.mockResolvedValueOnce('githubSecret')
      .mockResolvedValueOnce('sonarSecret');

    // We call credentials like this to ensure no cache is used.
    await creds.credentials('https://sonarcloud.io', false);

    // auth always uses the cache.
    const auth = await creds.sonarAuth('https://sonarcloud.io');
    expect(auth).toMatchObject({
      password: '',
      username: 'sonarSecret',
    });
    expect(secrets.loadSecret.mock.calls).toHaveLength(2);
  });
});

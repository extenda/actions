const secrets = require('../../gcp-secret-manager/src/secrets');

jest.mock('../../gcp-secret-manager/src/secrets');

const loadCredentials = require('../src/load-credentials');

const orgEnv = process.env;

describe('iam Credentials', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
    delete process.env.API_EMAIL;
    delete process.env.API_PASSWORD;
    delete process.env.API_KEY;
    delete process.env.API_TENANT;
    delete process.env.STYRA_TOKEN;
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It uses existing env vars', async () => {
    process.env.API_EMAIL_prod = 'email';
    process.env.API_PASSWORD_prod = 'password';
    process.env.API_KEY_prod = 'key';
    process.env.API_TENANT_prod = 'tenant';
    process.env.STYRA_TOKEN = 'styra-token';
    const {
      styraToken,
      iamApiEmail,
      iamApiPassword,
      iamApiKey,
      iamApiTenant,
    } = await loadCredentials('serviceAccount', 'prod');
    expect(styraToken).toEqual('styra-token');
    expect(iamApiEmail).toEqual('email');
    expect(iamApiPassword).toEqual('password');
    expect(iamApiKey).toEqual('key');
    expect(iamApiTenant).toEqual('tenant');
    expect(secrets.loadSecret.mock.calls).toHaveLength(0);
  });

  test('It can mix env vars and secrets', async () => {
    process.env.STYRA_TOKEN = 'styra-token';
    secrets.loadSecret.mockResolvedValueOnce('email');
    secrets.loadSecret.mockResolvedValueOnce('password');
    secrets.loadSecret.mockResolvedValueOnce('key');
    secrets.loadSecret.mockResolvedValueOnce('tenant');
    const {
      styraToken,
      iamApiEmail,
      iamApiPassword,
      iamApiKey,
      iamApiTenant,
    } = await loadCredentials('serviceAccount', 'staging');
    expect(styraToken).toEqual('styra-token');
    expect(iamApiEmail).toEqual('email');
    expect(iamApiPassword).toEqual('password');
    expect(iamApiKey).toEqual('key');
    expect(iamApiTenant).toEqual('tenant');
    expect(secrets.loadSecret.mock.calls).toHaveLength(4);
  });
});

const secrets = require('../../../gcp-secret-manager/src/secrets');

jest.mock('../../../gcp-secret-manager/src/secrets');

const loadCredentials = require('../../src/utils/load-credentials');

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
    process.env.STYRA_TOKEN = 'styra-token';
    const styraToken = await loadCredentials('serviceAccount', 'prod', 'styra-token', 'STYRA_TOKEN');
    expect(styraToken).toEqual('styra-token');
    expect(secrets.loadSecret).not.toHaveBeenCalled();
  });

  test('It can load secrets', async () => {
    secrets.loadSecret.mockResolvedValueOnce('styra-token');
    const styraToken = await loadCredentials('serviceAccount', 'staging', 'styra-token', 'STYRA_TOKEN');
    expect(styraToken).toEqual('styra-token');
    expect(secrets.loadSecret).toHaveBeenCalled();
  });
});

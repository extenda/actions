/**
 * @jest-environment node
 */

jest.mock('google-auth-library', () => ({
  // eslint-disable-next-line object-shorthand
  GoogleAuth: function GoogleAuth() {
    return {
      getClient: async () => Promise.resolve({
        projectId: 'test-project',
        request: async () => Promise.resolve({
          data: {
            payload: {
              data: 'dGVzdC12YWx1ZQ==', // echo -n test-value | base64
            },
          },
        }),
      }),
    };
  },
}));

const core = require('@actions/core');
const {
  parseInputYaml,
  loadSecrets,
  loadSecret,
  loadSecretIntoEnv,
} = require('../src/secrets');


const orgEnv = process.env;

describe('Secrets Manager', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
  });

  afterEach(() => {
    process.env = orgEnv;
  });

  test('It can parse input YAML', () => {
    const input = `
ENV_NAME: secret-name
EXPORT_AS: my-secret
`;
    const map = parseInputYaml(input);
    expect(map).toMatchObject({
      ENV_NAME: 'secret-name',
      EXPORT_AS: 'my-secret',
    });
  });

  test('It can load secrets', async () => {
    await loadSecrets('', { TEST_TOKEN: 'test-token' });
    expect(process.env.TEST_TOKEN).toEqual('test-value');
  });

  test('It can load a single secret', async () => {
    const secret = await loadSecret('', 'test-token');
    expect(secret).toEqual('test-value');
  });

  describe('loadSecretIntoEnv', () => {
    test('It sets env vars from secrets', async () => {
      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
      );
      expect(secret).toEqual('test-value');
      expect(process.env.MY_SECRET).toEqual('test-value');
    });

    test('It exports variables', async () => {
      const exportVariable = jest.spyOn(core, 'exportVariable');
      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
        true,
      );
      expect(exportVariable).toHaveBeenCalledWith('MY_SECRET', secret);
      exportVariable.mockReset();
    });

    test('It preserves set env.vars', async () => {
      process.env.MY_SECRET = 'existing-value';
      const secret = await loadSecretIntoEnv(
        'service-account-key',
        'my-secret',
        'MY_SECRET',
      );
      expect(secret).toEqual('existing-value');
      expect(process.env.MY_SECRET).toEqual('existing-value');
    });

    test('It fails if values are not resolved', async () => {
      await expect(loadSecretIntoEnv('', 'my-secret', 'MY_SECRET'))
        .rejects.toThrow('Missing env var: MY_SECRET');
    });
  });
});

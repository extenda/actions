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

const { parseInputYaml, loadSecrets, loadSecret } = require('../src/secrets');

describe('Secrets Manager', () => {
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
});

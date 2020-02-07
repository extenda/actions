/**
 * @jest-environment node
 */

jest.mock('@google-cloud/secret-manager', () => ({
  // eslint-disable-next-line object-shorthand
  SecretManagerServiceClient: function () {
    return {
      accessSecretVersion: async () => [{ payload: { data: Buffer.from('test-value') } }],
      auth: {
        getProjectId: () => 'test-project',
      },
      secretVersionPath: (project, secret, version) => `${project}/${secret}/versions/${version}`,
    };
  },
}));

const { parseInputYaml, loadSecrets } = require('../src/secrets');

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
});

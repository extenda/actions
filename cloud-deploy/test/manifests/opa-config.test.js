const request = require('request');
const yaml = require('js-yaml');
const buildOpaConfig = require('../../src/manifests/opa-config');

jest.mock('request');

describe('buildOpaConfig', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should build the Opa Config', async () => {
    const systemId = 'system-id';
    const styraToken = 'styra-token';
    const namespace = 'my-service';
    const styraUrl = 'https://styra.com';
    const expectedToken = 'styra-system-token';

    const mockResponse = `
    data:
      conf.yaml: |
        services:
          - name: styra
            url: ${styraUrl}/v1
            credentials:
              bearer:
                token: ${expectedToken}
    `;

    request.mockImplementation((conf, callback) => {
      callback(null, { statusCode: 200 }, mockResponse);
    });

    const opaConfigYAML = await buildOpaConfig(systemId, styraToken, namespace, styraUrl);
    const opaConfig = yaml.load(opaConfigYAML.config);

    expect(opaConfig.kind).toBe('ConfigMap');
    expect(opaConfig.metadata.name).toBe('opa-envoy-config');
    expect(opaConfig.metadata.namespace).toBe(namespace);
    expect(opaConfig.data['conf.yaml']).toContain(`token: "${expectedToken}"`);
  });
});

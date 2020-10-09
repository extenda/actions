const yaml = require('yaml');
const patchConfigMapYaml = require('../src/patch-configmap-yaml');

describe('Patches ConfigMap.yml', () => {
  test('It adds environment variables', () => {
    const environmentArgs = {
      key1: 'value1',
      key_2: 'value_2',
    };
    const configMap = `
kind: ConfigMap
metadata:
  name: hiiretail
`;

    const output = yaml.parse(patchConfigMapYaml(environmentArgs, configMap));
    expect(output).toMatchObject({
      kind: 'ConfigMap',
      metadata: {
        name: 'hiiretail',
      },
      data: {
        key1: 'value1',
        key_2: 'value_2',
      },
    });
  });
});

import yaml from 'yaml';

import patchConfigMapYaml from '../src/patch-configmap-yaml';

describe('Patches ConfigMap.yml', () => {
  test('It adds environment variables', () => {
    const environmentArgs = {
      key1: 'value1',
      key_2: 'value_2',
    };
    const configMap = `
kind: ConfigMap
metadata:
  name: configmap
`;

    const output = yaml.parse(patchConfigMapYaml(environmentArgs, configMap));
    expect(output).toMatchObject({
      kind: 'ConfigMap',
      metadata: {
        name: 'configmap',
      },
      data: {
        key1: 'value1',
        key_2: 'value_2',
      },
    });
  });
});

import yaml from 'yaml';

import patchServiceYaml from '../src/patch-service-yaml';

describe('Patches service.yml', () => {
  test('It patches ports and removes clusterIp:NONE', () => {
    const service = {
      ports: [
        {
          protocol: 'TCP',
          port: 80,
          targetPort: 8080,
        },
      ],
    };
    const serviceYml = `
kind: Service
spec:
  type: ClusterIP
  clusterIP: None
`;

    const output = yaml.parse(patchServiceYaml(service, serviceYml));
    expect(output).toMatchObject(
      expect.objectContaining({
        spec: {
          type: 'ClusterIP',
          ports: [
            {
              protocol: 'TCP',
              port: 80,
              targetPort: 8080,
            },
          ],
        },
      }),
    );
  });

  test('It leaves clusterIp:NONE if no ports specified', () => {
    const service = {};
    const serviceYml = `
kind: Service
spec:
  type: ClusterIP
  clusterIP: None
`;

    const output = yaml.parse(patchServiceYaml(service, serviceYml));
    expect(output).toMatchObject(
      expect.objectContaining({
        spec: {
          type: 'ClusterIP',
          clusterIP: 'None',
        },
      }),
    );
  });
});

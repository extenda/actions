const yaml = require('yaml');
const patchDeploymentYaml = require('../src/patch-deployment-yaml');

describe('Patches Deployment.yml', () => {
  test('It patches replicas count', () => {
    const service = {
      replicas: 3,
    };
    const deployment = `
kind: Deployment
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: hiiretail
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 100m
              memory: 256Mi
`;

    const output = yaml.parse(patchDeploymentYaml(service, deployment));
    expect(output).toMatchObject(expect.objectContaining({
      spec: expect.objectContaining({ replicas: 3 }),
    }));
  });

  test('It patches cpu and memory count', () => {
    const service = {
      cpu: '400m',
      memory: '1024Mi',
    };
    const deployment = `
kind: Deployment
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: hiiretail
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 100m
              memory: 256Mi`;

    const output = yaml.parse(patchDeploymentYaml(service, deployment));
    expect(output).toMatchObject(expect.objectContaining({
      spec: expect.objectContaining({
        template: expect.objectContaining({
          spec: expect.objectContaining({
            containers: expect.arrayContaining([
              expect.objectContaining({
                resources: expect.objectContaining({
                  requests: expect.objectContaining({
                    cpu: '400m',
                    memory: '1024Mi',
                  }),
                  limits: expect.objectContaining({
                    cpu: '400m',
                    memory: '1024Mi',
                  }),
                }),
              }),
            ]),
          }),
        }),
      }),
    }));
  });
});

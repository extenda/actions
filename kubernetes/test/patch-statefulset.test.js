const yaml = require('yaml');
const patchStatefulSetYaml = require('../src/patch-statefulset-yaml');

describe('Patches statefulSet.yml', () => {
  const service = {
    cpu: '400m',
    memory: '1024Mi',
    replicas: 3,
    storage: '1Gi',
  };

  const statefulSetYaml = `
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: hiiretail
spec:
  serviceName: hiiretail
  replicas: 1
  selector:
    matchLabels:
      app: hiiretail
  template:
    metadata:
      labels:
        app: hiiretail
    spec:
      containers:
        - name: hiiretail
          image: eu.gcr.io/extenda/IMAGE:TAG
          envFrom:
            - configMapRef:
                name: hiiretail
          volumeMounts:
            - name: hiiretail
              mountPath: /data/state
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 100m
              memory: 256Mi
  volumeClaimTemplates:
  - metadata:
      name: hiiretail
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 256Mi`;

  test('It patches replicas count', () => {
    const output = yaml.parse(patchStatefulSetYaml(service, statefulSetYaml));
    expect(output).toMatchObject(expect.objectContaining({
      spec: expect.objectContaining({ replicas: 3 }),
    }));
  });

  test('It patches storage size', () => {
    const output = yaml.parse(patchStatefulSetYaml(service, statefulSetYaml));
    expect(output).toMatchObject(expect.objectContaining({
      spec: expect.objectContaining({
        volumeClaimTemplates: expect.arrayContaining([
          expect.objectContaining({
            spec: expect.objectContaining({
              resources: expect.objectContaining({
                requests: expect.objectContaining({
                  storage: '1Gi',
                }),
              }),
            }),
          }),
        ]),
      }),
    }));
  });

  test('It patches cpu and memory count', () => {
    const output = yaml.parse(patchStatefulSetYaml(service, statefulSetYaml));
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

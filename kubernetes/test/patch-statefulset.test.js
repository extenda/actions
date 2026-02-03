import yaml from 'yaml';

import patchStatefulSetYaml from '../src/patch-statefulset-yaml.js';

describe('Patches statefulSet.yml', () => {
  const service = {
    requests: {
      cpu: '200m',
      memory: '512Mi',
    },
    limits: {
      cpu: '400m',
      memory: '1024Mi',
    },
    replicas: 3,
    storage: {
      volume: '1Gi',
      mountPath: '/data/new_path',
      storageClassName: 'premium-rwo',
    },
  };

  const statefulSetYaml = `
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: statefulset
spec:
  serviceName: statefulset
  replicas: 1
  selector:
    matchLabels:
      app: statefulset
  template:
    metadata:
      labels:
        app: statefulset
    spec:
      containers:
        - name: statefulset
          image: eu.gcr.io/extenda/IMAGE:TAG
          envFrom:
            - configMapRef:
                name: statefulset
          volumeMounts:
            - name: statefulset
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
      name: statefulset
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: standard-rwo
      resources:
        requests:
          storage: 256Mi`;

  test('It patches replicas count', () => {
    const output = yaml.parse(patchStatefulSetYaml(service, statefulSetYaml));
    expect(output).toMatchObject(
      expect.objectContaining({
        spec: expect.objectContaining({ replicas: 3 }),
      }),
    );
  });

  test('It patches storage', () => {
    const output = yaml.parse(patchStatefulSetYaml(service, statefulSetYaml));
    expect(output).toMatchObject(
      expect.objectContaining({
        spec: expect.objectContaining({
          template: expect.objectContaining({
            spec: expect.objectContaining({
              containers: expect.arrayContaining([
                expect.objectContaining({
                  volumeMounts: expect.arrayContaining([
                    expect.objectContaining({
                      mountPath: '/data/new_path',
                    }),
                  ]),
                }),
              ]),
            }),
          }),
          volumeClaimTemplates: expect.arrayContaining([
            expect.objectContaining({
              spec: expect.objectContaining({
                storageClassName: 'premium-rwo',
                resources: expect.objectContaining({
                  requests: expect.objectContaining({
                    storage: '1Gi',
                  }),
                }),
              }),
            }),
          ]),
        }),
      }),
    );
  });

  test('It leaves default cpu and memory count', () => {
    const serviceObj = {
      storage: {
        volume: '1Gi',
        mountPath: '/data/new_path',
      },
    };
    const output = yaml.parse(
      patchStatefulSetYaml(serviceObj, statefulSetYaml),
    );
    expect(output).toMatchObject(
      expect.objectContaining({
        spec: expect.objectContaining({
          template: expect.objectContaining({
            spec: expect.objectContaining({
              containers: expect.arrayContaining([
                expect.objectContaining({
                  resources: expect.objectContaining({
                    requests: expect.objectContaining({
                      cpu: '100m',
                      memory: '256Mi',
                    }),
                    limits: expect.objectContaining({
                      cpu: '100m',
                      memory: '256Mi',
                    }),
                  }),
                }),
              ]),
            }),
          }),
        }),
      }),
    );
  });

  test('It patches cpu and memory count', () => {
    const output = yaml.parse(patchStatefulSetYaml(service, statefulSetYaml));
    expect(output).toMatchObject(
      expect.objectContaining({
        spec: expect.objectContaining({
          template: expect.objectContaining({
            spec: expect.objectContaining({
              containers: expect.arrayContaining([
                expect.objectContaining({
                  resources: expect.objectContaining({
                    requests: expect.objectContaining({
                      cpu: '200m',
                      memory: '512Mi',
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
      }),
    );
  });
});

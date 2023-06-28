var fs = require('fs');
const checkSystem = require('./check-system');
const buildOpaConfig = require('./opa-config');

const manifestTemplate = async (name, image, minInstances, maxInstances, cpuThreshold, cpuRequest, memoryRequest, environment, labels, opa, readiness, readinessPath) => {

  return `---
apiVersion: v1
kind: Namespace
metadata:
  name: ${name}
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${name}
  annotations:
    cloud.google.com/neg: '{"exposed_ports":{"80":{"name":"${name}-neg"}}}'
spec:
  type: NodePort
  selector:
    app: ${name}
  ports:
    - protocol: TCP
      port: 80
      targetPort: ${opa ? '8000' : '8080'}
      name: ${readiness === 'grpc' ? 'HTTP2' : 'http'}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${name}
  labels:${labels.map(label => `
    ${label.name}: ${label.value}`).join('')}
    app: ${name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      serviceAccountName: workload-identity-sa
      containers:
      - image: ${image}
        imagePullPolicy: IfNotPresent
        name: user-container
        readinessProbe:
          httpGet:
            path: ${readinessPath}
            port: ${readiness !== 'grpc' ? `8080` : '8085'}
          initialDelaySeconds: 3
          periodSeconds: 5
          failureThreshold: 10
          timeoutSeconds: 3
        ports:
        - containerPort: 8080
          protocol: TCP
        resources:
          requests:
            cpu: ${cpuRequest}
            memory: ${memoryRequest}
        env:${environment.map(env => `
        - name: ${env.name}
          value: ${env.value}`).join('')}
      ${readiness === 'grpc' ? `
      - image: eu.gcr.io/extenda/platform/healthcheck:v1.0
        imagePullPolicy: IfNotPresent
        name: healthchecker
        readinessProbe:
          httpGet:
            path: /health
            port: 8085
          initialDelaySeconds: 3
          periodSeconds: 5
          failureThreshold: 10
          timeoutSeconds: 3
        ports:
        - containerPort: 8085
          protocol: TCP
        resources:
          requests:
            cpu: "0.5"
            memory: ${memoryRequest}
      ` : ``}
      ${opa ? `
      - image: eu.gcr.io/extenda/envoy:test
        ports:
          - containerPort: 8000
            protocol: TCP
        imagePullPolicy: IfNotPresent
        resources:
          requests:
            cpu: "0.5"
            memory: 1Gi
        name: envoy
      - image: openpolicyagent/opa:0.50.2-envoy-rootless
        name: opa
        ports:
          - containerPort: 8181
        imagePullPolicy: IfNotPresent
        args:
          - "run"
          - "--server"
          - "--config-file=/config/conf.yaml"
          - "--log-level=error"
        volumeMounts:
        - name: opa
          readOnly: true
          mountPath: /config
        readinessProbe:
          httpGet:
            path: /health?bundles
            port: 8181
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 5
      volumes:
        - name: opa
          configMap:
            name: opa-envoy-config
      ` : ``}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}
  namespace: ${name}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: deployment
    name: ${name}
  minReplicas: ${minInstances}
  maxReplicas: ${maxInstances}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: ${cpuThreshold}
`
}

const createSkaffoldManifest = async () => {
  return `apiVersion: skaffold/v2beta16
kind: Config
deploy:
  kubectl:
    manifests:
      - k8s-*
`
}

const createCloudDeployPipe = async (name, projectID, clanName, env) => {
  return `apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: ${name}
description: ${name} pipeline
serialPipeline:
  stages:
  - targetId: gke
    profiles: []
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: gke
description: k8s-cluster
gke:
  cluster: projects/${projectID}/locations/europe-west1/clusters/${clanName}-cluster-${env}
  `
}

const generateManifest = async (fileName, content) => {
  fs.writeFile(`${fileName}`, content, function (err) {
    if (err) throw err;
  });
}

const prepareGcloudDeploy = async (name, projectID, clanName, env) => {
  await generateManifest('skaffold.yaml', await createSkaffoldManifest());
  await generateManifest('clouddeploy.yaml', await createCloudDeployPipe(name, projectID, clanName, env));
}

const buildManifest = async (image, service, projectId, clanName, env, styraToken) => {

  const {
    name,
    'permission-prefix': permissionPrefix,
    memory,
    cpu,
    'max-instances': maxInstances = 50,
    'min-instances': minInstances = 1,
    'opa-enabled': opa = false,
    environment = [],
    labels = [],
    platform,
  } = service;

  const styraUrl = 'https://extendaretail.svc.styra.com';
  const styraSystemName = `${permissionPrefix}.${name}-${env}`;

  let readiness = 'http';
  let readinessPath = '/health';
  if (platform && platform.gke && platform.gke['readiness-type']) {
    readiness = platform.gke['readiness-type'];
    if (platform.gke['readiness-path'] && platform.gke['readiness-type'] === 'http') {
      readinessPath = platform.gke['readiness-path'];
    }
  }

  const envArray = Object.entries(environment).map(([key, value]) => ({
    name: key,
    value: value.match(/^[0-9]+$/) == null ? value.replace('*', projectId) : `'${value}'`,
  }));
  const labelArray = Object.entries(labels).map(([key, value]) => ({
    name: key,
    value: value,
  }));
  envArray.push({ name: 'SERVICE_NAME', value: name });
  envArray.push({ name: 'SERVICE_PROJECT_ID', value: projectId });
  envArray.push({ name: 'SERVICE_ENVIRONMENT', value: env });
  envArray.push({ name: 'SERVICE_CONTAINER_IMAGE', value: image });
  envArray.push({ name: 'CLAN_NAME', value: clanName });

  await prepareGcloudDeploy(name, projectId, clanName, env);
  if (opa) {
    const system = await checkSystem(styraSystemName, styraToken, styraUrl);
    if (system.id === '') {
      throw new Error(`Styra system not found with the name ${styraSystemName}`);
    } else {
      await generateManifest('k8s-opa-config.yaml', await buildOpaConfig(system.id, styraToken, name, styraUrl));
    };
  }

    await generateManifest('k8s-manifest.yaml', await manifestTemplate(name, image, minInstances, maxInstances, 50, cpu, memory, envArray, labelArray, opa, readiness, readinessPath));
    return readiness;
}

module.exports = buildManifest;

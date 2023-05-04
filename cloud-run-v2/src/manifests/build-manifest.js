var fs = require('fs');

// TODO: ADD Labels and environment
const manifestTemplate = async (name, image, minInstances, maxInstances, cpuThreshold, cpuRequest, memoryRequest, version, environment, opa) => {

  // labels and env
  return `---
apiVersion: v1
kind: Namespace
metadata:
  name: ${name}
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}-neg
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
      name: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${name}
  labels:
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
  - targetId: ${clanName}-cluster-${env}
    profiles: []
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: ${clanName}-cluster-${env}
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

const buildManifest = async (image, service, version, projectId, clanName, env) => {

  const {
    name,
    memory,
    cpu,
    'max-instances': maxInstances = -1,
    'opa-enabled': opa = false,
    environment = [],
  } = service;

  const envArray = Object.entries(environment).map(([key, value]) => ({
    name: key,
    value: value.replace('*', projectId)
  }));
  envArray.push({ name: 'SERVICE_NAME', value: name });

  await prepareGcloudDeploy(name, projectId, clanName, env);
  await generateManifest('k8s-manifest.yaml', await manifestTemplate(name, image, 1, 100, 50, cpu, memory, version, envArray, opa));

}

module.exports = { buildManifest };

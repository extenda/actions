var fs = require('fs');

// TODO: ADD Labels and environment
const manifestTemplate = async (name, image, minInstances, maxInstances, cpuThreshold, cpuRequest, memoryRequest) => {

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
      targetPort: 8000
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
        name: ${name}
        ports:
        - containerPort: 8080
          protocol: TCP
        resources:
          requests:
            cpu: ${cpuRequest}
            memory: ${memoryRequest}
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

const buildManifest = async (image, service) => {
  const {
    name,
    memory,
    cpu,
    'max-instances': maxInstances = -1,
    environment = [],
  } = service;
  const content = await manifestTemplate(name, image, 1, 100, 50, cpu, memory);
  fs.writeFile('manifest.yaml', content, function (err) {
    if (err) throw err;
    console.log('Saved manifest!');
  });
}

const backupManifest = async (yaml) => 
  fs.writeFile('manifest-backup.yaml', yaml, function (err) {
    if (err) throw err;
    console.log('Saved backup manifest!');
  });

module.exports = { 
  buildManifest, 
  backupManifest,
};

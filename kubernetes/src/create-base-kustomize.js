const fs = require('fs');
const path = require('path');

const createBaseKustomize = (deploymentName) => {
  const yamls = {
    service: `
apiVersion: v1
kind: Service
metadata:
  name: ${deploymentName}
  labels:
    app: ${deploymentName}
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: ${deploymentName}
`,
    statefulSet: `
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${deploymentName}
spec:
  serviceName: ${deploymentName}
  replicas: 1
  selector:
    matchLabels:
      app: ${deploymentName}
  template:
    metadata:
      labels:
        app: ${deploymentName}
    spec:
      containers:
        - name: ${deploymentName}
          image: eu.gcr.io/extenda/IMAGE:TAG
          envFrom:
            - configMapRef:
                name: ${deploymentName}
          volumeMounts:
            - name: ${deploymentName}
              mountPath: /data/storage
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 100m
              memory: 256Mi
  volumeClaimTemplates:
  - metadata:
      name: ${deploymentName}
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
`,
    deployment: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deploymentName}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${deploymentName}
  template:
    metadata:
      labels:
        app: ${deploymentName}
    spec:
      containers:
        - name: ${deploymentName}
          image: eu.gcr.io/extenda/IMAGE:TAG
          envFrom:
            - configMapRef:
                name: ${deploymentName}
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 100m
              memory: 256Mi
`,
    configmap: `
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${deploymentName}
`,
    kustomization: `
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - service.yml
  - configmap.yml
`,
  };

  fs.mkdirSync('kustomize');
  Object.keys(yamls).forEach((name) => {
    fs.writeFileSync(path.join('kustomize', `/${name}.yml`), yamls[name]);
  });
};

module.exports = createBaseKustomize;

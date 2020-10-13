const fs = require('fs');
const path = require('path');

const createBaseKustomize = (deploymentName) => {
  const yamls = {
    service: `
apiVersion: v1
kind: Service
metadata:
  name: hiiretail
  labels:
    app: hiiretail
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: hiiretail
`,
    statefulSet: `
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
        - name: ${deploymentName}
          image: eu.gcr.io/extenda/IMAGE:TAG
          envFrom:
            - configMapRef:
                name: hiiretail
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
  name: hiiretail
spec:
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
  name: hiiretail
`,
    kustomization: `
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - service.yml
  - configmap.yml
  - statefulSet.yml
`,
  };

  fs.mkdirSync('kustomize');
  Object.keys(yamls).forEach((name) => {
    fs.writeFileSync(path.join('kustomize', `/${name}.yml`), yamls[name]);
  });
};


module.exports = createBaseKustomize;

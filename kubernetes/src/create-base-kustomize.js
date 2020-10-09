const fs = require('fs');
const path = require('path');

const createBaseKustomize = () => {
  const yamls = {
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
  - deployment.yml
  - configmap.yml
`,
  };

  fs.mkdirSync('kustomize');
  Object.keys(yamls).forEach((name) => {
    fs.writeFileSync(path.join('kustomize', `/${name}.yml`), yamls[name]);
  });
};


module.exports = createBaseKustomize;

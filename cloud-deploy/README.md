# cloud-deploy

This is a GitHub Action to deploy a service with [Cloud Deploy](https://cloud.google.com/sdk/gcloud/reference/deploy).
It supports three types of deployment targets

  * Managed Cloud Run
  * Kubernetes Deployment
  * Kubernetes StatefulSet

## Usage

See [action.yml](action.yml).

See the [schema documentation](schema_doc.md) for details about the `cloud-deploy.yaml`.

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### YAML Examples

The action will read a `cloud-deploy.yaml` file for its configuration.

### Managed Cloud Run

Managed Cloud Run service with Hii Retail IAM security. The security sidecar will use default resources.

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
```

Managed Cloud Run service with SQL instance connection

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      SQL_INSTANCE_NAME: sm://*/secret-name # Important ENV variable
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
```

Managed Cloud Run service with IAM bindings setup

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  consumers:
    service-accounts:
      - my-service@project-id.iam.gserviceaccount.com
      - user:user-account@extendaretail.com
      - group:group-account@extendaretail.com
    audiences:
      - https://my-service.retailsvc.com
      - my-service

```

### Kubernetes deployment

A Kubernetes deployment with IAM security resources customized.

```yaml
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50

security:
  permission-prefix: mye
  resources:
    cpu: 1
    memory: 1Gi

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    max-instances: 20
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 1
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
```

### Kubernetes Deployment as internal service

An internal Kubernetes gRPC service that doesn't use IAM security. The request timeout has been increased from the
default 300s to 900s. This service will only be available on the internal domain.

```yaml
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http2
  timeout: 900
  scaling:
    cpu: 50

security: none

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    env: &env
      KEY: value
  staging:
    min-instances: 1
    max-instances: 1
    env:
      <<: *env
```

### Kubernetes StatefulSet

An internal Kubernetes StatefulSet that doesn't use Open Policy Agent. The stateful set has a volume mounted for
persistent disk shared in the set.

```yaml
kubernetes:
  type: StatefulSet
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
  volumes:
    - disk-type: ssd
      size: 5Gi
      mount-path: /mnt/shared/data

security: none

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 3
    max-instances: 3
    env: &env
      KEY: value
  staging:
    min-instances: 1
    max-instances: 1
    env:
      <<: *env
```

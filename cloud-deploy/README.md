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

Managed Cloud Run service with Open Policy Agent (OPA) for security. OPA and its Envoy proxy will use default resources.

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
  open-policy-agent:
    permission-prefix: mye

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

### Kubernetes deployment

A Kubernetes deployment with Open Policy Agent and Envoy resources customized.

```yaml
kubernetes:
  service: my-service
  type: deployment
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50

security:
  open-policy-agent:
    permission-prefix: mye
    resources:
      cpu: 0.5
      memory: 512Mi
  envoy:
    resources:
      cpu: 0.5
      memory: 512Mi

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

An internal Kubernetes gRPC service that doesn't use Open Policy Agent. This service will only be available on the internal domain.

```yaml
kubernetes:
  service: my-service
  type: deployment
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http2
  scaling:
    cpu: 50

security: 'none'

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

```yaml
kubernetes:
  service: my-service
  type: stateful-set
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
  volume:
    disk-type: ssd
    size: 5Gi
    mount-path: /mnt/shared/data

security: 'none'

environments:
  production:
    min-instances: 3
    max-instances: 3
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

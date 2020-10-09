# kubernetes

This is a GitHub Action to deploy a service to Kubernetes.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the service.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

## Kubernetes YAML

The kubernetes service should be specified in a YAML file that is later used by this action. This allows us to keep
the service specification DRY while deploying it to different environments.

By default, the action will load `kubernetes.yaml` from the repository base directory.

### Schema

The YAML syntax is formally defined with [JSON Schema](src/kubernetes-schema.js). The following table explains what
properties are required and not.

| Property                   | Description                                                                                                                                                       | Required | Default Value |
|:---------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------|:--------------|
| `name`                     | The service name.                                                                                                                                                 | Yes      |               |
| `memory`                   | Set a memory limit, for example `256Mi`, `512Mi` or `1Gi`.                                                                                                        | No       | `256Mi`       |
| `cpu`                      | The CPU limit for the service, for example `200m`.                                                                                                                | No       | `100m`        |
| `replicas`                 | The number of pod instances to run.                                                                                                                               | No       | `1`           |
| `environment`<top>\*</top> | A map of environment variables. The values can be Secret Manager URLs on the form `sm://*/my-secret` where `*` will be replaced by the project ID at deploy time. | No       | -             |

<top>\*</top> Once set, this value can only be unset by passing `[]` (empty array) as value.

### YAML Examples

This example defines a service.
```yaml
name: my-kubernetes-service
memory: 256Mi
cpu: 300m
environment:
  DEBUG_LOG: 'false'
  SECRET_NAME: sm://*/secret-name
```

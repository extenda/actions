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

| Property                   | Description                                                                                                                                                       | Required |  Default Value  |
|:---------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------|:----------------|
| `name`                     | The service name.                                                                                                                                                 | Yes      |                 |
| `requests.memory`          | Set a memory requested, for example `256Mi`, `512Mi` or `1Gi`.                                                                                                    | No       | `256Mi`         |
| `requests.cpu`             | The CPU requested for the service, for example `200m`.                                                                                                            | No       | `100m`          |
| `limits.memory`            | Set a memory limit, for example `256Mi`, `512Mi` or `1Gi`.                                                                                                        | No       | `256Mi`         |
| `limits.cpu`               | The CPU limit for the service, for example `200m`.                                                                                                                | No       | `100m`          |
| `replicas`                 | The number of pod instances to run.                                                                                                                               | No       | `1`             |
| `ports`                    | The array of port mappings. If no ports specified, the service is created with ClusterIP:None                                                                     | No       |                 |
| `storage.volume`           | The size of the volume attached to pod.                                                                                                                           | No       | `1Gi`           |
| `storage.mountPath`        | The path volume will be mounted under.                                                                                                                            | No       | `/data/storage` |
| `autoscale.minReplicas`    | The min replicas count for horizontal pos autoscaling
| `autoscale.maxReplicas`    | The max replicas count for horizontal pos autoscaling
| `autoscale.cpuPercent`     | The cpu utilization percentage for horizontal pos autoscaling
| `environment`<top>\*</top> | A map of environment variables. The values can be Secret Manager URLs on the form `sm://*/my-secret` where `*` will be replaced by the project ID at deploy time. | No       | -               |

<top>\*</top> Once set, this value can only be unset by passing `[]` (empty array) as value.

> **Note**: If `storage` property is not provided, action assumes that the deployment is stateless and will deploy using `Deployment` manifest.
> If `storage` property is provided, deployment will be done using `StatefulSet` manifest.

### YAML Examples

This example defines a service.
```yaml
name: my-kubernetes-service
requests:
  memory: 256Mi
  cpu: 100m
limits:
  memory: 512Mi
  cpu: 300m
storage:
  volume: 1Gi
  mountPath: /data/storage
environment:
  DEBUG_LOG: 'false'
  SECRET_NAME: sm://*/secret-name
```

This example defines a service with port 80 opened for communications inside same cluster
```yaml
name: my-kubernetes-service
requests:
  memory: 256Mi
  cpu: 100m
limits:
  memory: 512Mi
  cpu: 300m
ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

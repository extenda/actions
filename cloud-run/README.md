# cloud-run

This is a GitHub Action to deploy a service to Cloud Run.

When deploying to Cloud Run on GKE, the action will also conditionally deploy or configure the following

  * Service Kubernetes namespace
  * Workload identity and service account
  * Istio and OPA injection
  * Config maps
  * Domain bindings for external services

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### DNS mappings

For fully automated DNS mappings on GKE, the following conditions must be met.

  * Cloud DNS must be enabled and manage DNS record-sets for your domain(s)
  * The service account in use must be permitted to update DNS record sets
  * Label your DNS project with the `dns` label for auto-discovery or use the `dns-project-label` input if another label is used.
  * The DNS zones must follow this naming convention: For domain `mydomain.com` the zone is `mydomain-com`

## Cloud Run YAML

The cloud run service should be specified in a YAML file that is later used by this action. This allows us to keep
the service specification DRY while deploying it to different environments.

By default, the action will load `cloud-run.yaml` from the repository base directory.

### Schema

The YAML syntax is formally defined with [JSON Schema](src/cloud-run-schema.js). The following table explains what
properties are required and not.

| Property                   | Description                                                                                                                                                       | Required | Default Value |
|:---------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------|:--------------|
| `name`                     | The service name.                                                                                                                                                 | Yes      |               |
| `memory`                   | Set a memory limit, for example `256Mi`, `512Mi` or `1Gi`.                                                                                                        | Yes      |               |
| `cpu`                      | The CPU limit for the service. For managed Cloud Run, use core count `1` or `2`. For Cloud Run on GKE, use millicpu (e.g., `200m`).                               | Yes      |               |
| `concurrency`              | The max concurrent requests per container. Will scale with cpu if left blank (`250m` sets 20 in concurrency).                                        | No       | `10-100`          |
| `max-instances`            | The maximum number of container instances to run. Set to `-1` to use the platform default (recommended).                                                          | No       | `-1`          |
| `environment`<top>\*</top> | A map of environment variables. The values can be Secret Manager URLs on the form `sm://*/my-secret` where `*` will be replaced by the project ID at deploy time. | No       | -             |
| `enable-http2`             | Flag to enable HTTP/2. Application must support h2c to work correctly with HTTP/2                                                                                 | No       | `false`       |

<top>\*</top> Once set, this value can only be unset by passing `[]` (empty array) as value.

These properties only apply to Managed Cloud Run:

| Property                                           | Description                                                                                                                                                      | Required | Default Value      |
|:---------------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------|:-------------------|
| `platform.managed.allow-unauthenticated`           | Whether to enable unauthenticated access to the publicly available service.                                                                                      | Yes      |                    |
| `platform.managed.region`                          | The region in which to run the service.                                                                                                                          | Yes      |                    |
| `platform.managed.cloudsql-instances`<top>\*</top> | A list of [Cloud SQL instance names](https://cloud.google.com/sdk/gcloud/reference/run/deploy#--add-cloudsql-instances) this service can connect to.             | No       | -                  |
| `platform.managed.service-account`                 | The runtime service account used by the Cloud Run service. Either a fully-qualified email or a prefix where the default project email is appended automatically. | No       | `cloudrun-runtime` |

<top>\*</top> Once set, this value can only be unset by passing `[]` (empty array) as value.

These properties only apply to Cloud Run on GKE:

| Property                               | Description                                                                                               | Required | Default Value                   |
|:---------------------------------------|:----------------------------------------------------------------------------------------------------------|:---------|:--------------------------------|
| `min-instances`                        | The minimum number of container instances to run. Set to `-1` to use the platform default (recommended).  | No       | `-1`                            |
| `platform.gke.cluster`                 | The name of the cluster to deploy to.                                                                     | No       | The `k8s-cluster` in Tribe GKE. |
| `platform.gke.connectivity`            | Determines if the service can be invoked through internet. Can be set to `external` or `internal`.        | Yes      |                                 |
| `platform.gke.domain-mappings.prod`    | List of fully qualified domains to map in the `prod` environment. Only applies to `external` services.    | No       |                                 |
| `platform.gke.domain-mappings.staging` | List of fully qualified domains to map in the `staging` environment. Only applies to `external` services. | No       |                                 |
| `platform.gke.namespace`               | The Kubernetes namespace to use.                                                                          | No       | The service `name`              |
| `platform.gke.opa-enabled`             | Flag to enable OPA and Istio injection on service.                                                        | No       | `true`                          |

### YAML Examples

#### Managed Cloud Run

This example defines a Cloud Run service that runs in managed Cloud Run.
```yaml
name: my-service
memory: 256Mi
cpu: 1
environment:
  DEBUG_LOG: 'false'
  SECRET_NAME: sm://*/secret-name
platform:
  managed:
    allow-unauthenticated: true
    region: europe-west1
```

### Cloud Run on auto-discovered GKE

This example defines a Cloud Run service that runs on Cloud Run on GKE.
```yaml
name: my-service
memory: 256Mi
cpu: 200m
platform:
  gke:
    connectivity: external
```

### Cloud Run on GKE with domain-mappings

This example defines a Cloud Run service that is bound to a public domain.
```yaml
name: my-service
memory: 256Mi
cpu: 300m
platform:
  gke:
    connectivity: external
    domains-mappings:
      prod:
        - my-service.retailsvc.com
      staging:
        - my-service.retailsvc.dev
```

### Cloud run on manually specified GKE

This example defines a Cloud Run service that runs on Cloud Run on GKE.
```yaml
name: my-service
memory: 256Mi
cpu: 200m
platform:
  gke:
    connectivity: external
    cluster: k8s-cluster
    namespace: default
```

Replace the `cluster` with the name of your target GKE cluster. The cluster can also be specified using the fully
qualified name on the form `projects/<project-id>/zones/<cluster-location>/clusters/<cluster-name>`

### Examples

#### Basic Usage

Given the following `cloud-run.yaml`:
```yaml
name: my-service
memory: 256Mi
cpu: 1
platform:
  managed:
    allow-unauthenticated: true
    region: europe-west1
```

The following example deploys the service to fully-managed cloud run in a staging project.
The action will use the default runtime account and `cloud-run.yaml` file.

```yaml
on: push

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/cloud-run@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: eu.gcr.io/extenda/my-service:$GITHUB_SHA
```

#### Custom runtime account

Given the following `cloud-run.yaml`:
```yaml
name: my-service
memory: 256Mi
cpu: 1
platform:
  managed:
    allow-unauthenticated: true
    region: europe-west1
    service-account: my-account
```

The following example uses a custom runtime account for the cloud run service.

```yaml
on: push

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/cloud-run@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          service-definition: cloud-run.yaml
          image: eu.gcr.io/extenda/my-service:$GITHUB_SHA
```

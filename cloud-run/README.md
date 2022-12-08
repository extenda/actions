# cloud-run

This is a GitHub Action to deploy a service to Cloud Run.

When deploying to Cloud Run on GKE, the action will also conditionally deploy or configure the following

  * Service Kubernetes namespace
  * Workload identity and service account
  * Istio and OPA injection
  * Config maps
  * Domain bindings for external services

## Vulnerability scanning

This action will automatically scan your image for vulnerabilities. If a vulnerability is found rated with HIGH or CRITICAL severity you will be notified on your clan slack channel. Important to note is that if your clan slack channel is private you will have to invite the slackNotification app/bot to recieve these reports. If you don't know what your clan slack channel is it's specified in your clan infra common repository under your common.hcl file.

To work locally with the scan tool or for more information visit [trivy-github](https://github.com/aquasecurity/trivy#table-of-contents)

### Securing your image

When a vulnerability is found on your service, this usually means that you are using a base image with many packages installed that can be exploited by malicious users/bots. A good solution is to make sure you are using a secure version of the image or alternatively an alpine/distroless version which usually contain few or no known vulnerabilities.

In cases where there are no new versions of your image you may be able to update the affected packages directly in your dockerfile depending on what package manager you are using. Images that don't include a package manager might need to leverage the multistage build to secure the image in one step of the build process and finalize image in another.

### Ignore vulnerabilities

In some cases we have to use certain images for a service that may requires a package/support installed. In these cases we have the .trivyignore that should be placed in the root of your repository.
````
#.trivyignore
# Accept the risk
CVE-2018-14618

# No impact in our settings
CVE-2019-1543
````

This will be useful when you are forced to use an image with a known vulnerability.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### Environment variables

This action adds the following default environment variables to the Cloud Run serivce:

- `SERVICE_PROJECT_ID`: The GCloud project ID
- `SERVICE_ENVIRONMENT`: Either `staging` or `prod`
- `SERVICE_CONTAINER_IMAGE`: The used Docker image for the deployment

Furthermore, this action ensures to resolve `*` from secret definitions with `sm://*/my-secret` the project ID.

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

| Property                           | Description                                                                                                                                                       | Required | Default Value |
|:-----------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------|:--------------|
| `name`                             | The service name.                                                                                                                                                 | Yes      |               |
| `memory`                           | Set a memory limit, for example `256Mi`, `512Mi` or `1Gi`.                                                                                                        | Yes      |               |
| `cpu`                              | The CPU limit for the service. For managed Cloud Run, use core count `1` or `2`. For Cloud Run on GKE, use millicpu (e.g., `200m`).                               | Yes      |               |
| `concurrency`                      | The max concurrent requests per container. Will scale with cpu if left blank (`250m` sets 20 in concurrency).                                                     | No       | `10-100`      |
| `max-instances`                    | The maximum number of container instances to run. Set to `-1` to use the platform default (recommended).                                                          | No       | `-1`          |
| `max-revisions`                    | The maximum number of cloudrun revisions to save. Set to `4` to use the platform default (recommended).                                                           | No       | `4`           |
| `environment`<top>\*</top>         | A map of environment variables. The values can be Secret Manager URLs on the form `sm://*/my-secret` where `*` will be replaced by the project ID at deploy time. | No       | -             |
| `enable-http2`                     | Flag to enable HTTP/2. Application must support h2c to work correctly with HTTP/2                                                                                 | No       | `false`       |
| `canary.enabled`                   | Flag, that enables canary deployment. You must also specify `canary.steps`, `canary.thresholds` for canary to work                                                | No       | `false`       |
| `canary.steps`                     | Dot-separated list of traffic percentages that will be set to new revision each `canary.interval` period                                                          | No       | `10.50.80`    |
| `canary.interval`                  | Interval (in minutes) for each step. Also metrics for rollout/rollback decision will be fetched for `canary.interval` period (should not be less that 10)         | No       | `10`          |
| `canary.thresholds.latency99`      | Latency 99 percentile threshold (im milliseconds). If last revision had latency 99 percentile above threshold, service will rollback to previous revision         | No       | -             |
| `canary.thresholds.latency95`      | Latency 95 percentile threshold (im milliseconds). If last revision had latency 95 percentile above threshold, service will rollback to previous revision         | No       | -             |
| `canary.thresholds.latency50`      | Latency 50 percentile threshold (im milliseconds). If last revision had latency 50 percentile above threshold, service will rollback to previous revision         | No       | -             |
| `canary.thresholds.error-rate`     | Error rate threshold (in percents). Percentage of 5xx responses in service. If last revision exceeds threshold, service will rollback to previous revision        | No       | -             |

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
|

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
    domain-mappings:
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

#### Canary deployment

Given the following `cloud-run.yaml`:
```yaml
name: my-service
memory: 256Mi
cpu: 1
canary:
  enabled: true
  steps: '10.50.80' # 10% traffic, 20% traffic, 80% traffic and 100% (implicit)
  interval: '10'
  thresholds:
    latency99: '1500' # 1500 ms
    latency95: '500' # 500 ms
    latency50: '100' # 100 ms
    error-rate: '1' # 1% of all requests
platform:
  managed:
    allow-unauthenticated: true
    region: europe-west1
```

The following example enables `canary` for  service. New revision of a service will not service 100% of traffic from the start.
Instead traffic percentage will be updated each `canary.interval` minutes using `canary.steps` values.
On each step metrics for latest revision will be fetched and compared to `canary.thresholds`.
If current metrics do not exceed thresholds, traffic will be increased otherwise servie will rollback to previous revision.

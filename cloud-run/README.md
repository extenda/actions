# cloud-run

This is a GitHub Action to deploy a service to Cloud Run.

## Usage

See [action.yaml](action.yaml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

## Cloud Run YAML

The cloud run service should be specified in a YAML file that is later used by this action. This allows us to keep
the service specification DRY while deploying it to different environments.

By default, the action will load `cloud-run.yaml` from the repository base directory.

### Schema

The YAML syntax is formally defined with [JSON Schema](src/cloud-run-schema.js). The following table explains what
properties are required and not.

| Property             | Description                                                                                                                                                       | Required |
|:---------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------|
| `name`               | The service ID or name.                                                                                                                                           | Yes      |
| `memory`             | Set a memory limit, for example 256Mi, 512Mi or 1Gi.                                                                                                              | Yes      |
| `concurrency`        | The max concurrent requests per container. Set to `-1` to use the default concurrency for the platform (recommended).                                             | No       |
| `max-instances`      | The maximum number of container instances to run. Set to `-1` to use the platform default (recommended).                                                          | No       |
| `environment`        | A map of environment variables. The values can be Secret Manager URLs on the form `sm://*/my-secret` where `*` will be replaced by the project ID at deploy time. | No       |
| `cloudsql-instances` | A list of [Cloud SQL instance names](https://cloud.google.com/sdk/gcloud/reference/run/deploy#--add-cloudsql-instances) this service can connect to.              | No       |

These properties only apply to Managed Cloud Run:

| Property                                 | Description                                                                 | Required |
|:-----------------------------------------|:----------------------------------------------------------------------------|:---------|
| `platform.managed.region`                | The region in which to run the service.                                     | Yes      |
| `platform.managed.cpu`                   | The CPU limit for the service. Default is 1. Can be set to 2.               | No       |
| `platform.managed.allow-unauthenticated` | Whether to enable unauthenticated access to the publicly available service. | Yes      |

These properties only apply to Cloud Run on GKE:

| Property                        | Description                                                                                        | Required |
|:--------------------------------|:---------------------------------------------------------------------------------------------------|:---------|
| `platform.gke.cluster`          | The name of the cluster to deploy to.                                                              | Yes      |
| `platform.gke.cluster-location` | The zone in which the cluster is located.                                                          | Yes      |
| `platform.gke.connectivity`     | Determines if the service can be invoked through internet. Can be set to `external` or `internal`. | Yes      |
| `platform.gke.cpu`              | The CPU limit for the service in Kubernetes CPU units, for example 500m.                           | No       |
| `platform.gke.namespace`        | The Kubernetes namespace to use.                                                                   | No       |

### YAML Examples

#### Managed Cloud Run

This example defines a Cloud Run service that runs in managed Cloud Run.
```yaml
name: my-service
memory: 256Mi
platform:
  managed:
    region: europe-west1
    allow-unauthenticated: true
```

### Cloud Run on GKE

This example defines a Cloud Run service that runs on Cloud Run on GKE
```yaml
name: my-service
memory: 256Mi
platform:
  gke:
    cluster: tribe-gke-cluster
    cluster-location: europe-west1
    connectivity: external
```
Replace the `cluster` and `cluster-location` with the name and location of your target GKE cluster.

### Examples

Given the following `cloud-run.yaml`:
```yaml
name: my-service
memory: 256Mi

platform:
  managed:
    region: europe-west1
    allow-unauthenticated: true
```

#### Basic Usage

The following example deploys the service to fully-managed cloud run in a staging project.
The action will use the default runtime account and `cloud-run.yaml` file.

```yaml
on: push

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/setup-gcloud@v0
        id: gcloud
        service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - uses: extenda/actions/cloud-run@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: gcr.io/${{ steps.gcloud.outputs.project-id }}/my-service:$GITHUB_SHA
```

#### Custom runtime account

The following example uses a custom runtime account for the cloud run service.

```yaml
on: push

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/setup-gcloud@v0
        id: gcloud
        service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - uses: extenda/actions/cloud-run@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          service-definition: cloud-run.yaml
          runtime-account-email: my-account
          image: gcr.io/${{ steps.gcloud.outputs.project-id }}/my-service:$GITHUB_SHA
```

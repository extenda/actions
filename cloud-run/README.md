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

### Fully-managed

This example defines a Cloud Run service that runs in managed Cloud Run.
```yaml
name: my-service
memory: 256Mi
allow-unauthenticated: true

runs-on:
  managed:
    region: europe-west1
```

### Cloud Run on GKE

This example defines a Cloud Run service that runs on Cloud Run on GKE
```yaml
name: my-service
memory: 256Mi
allow-unauthenticated: true

runs-on:
  gke:
    cluster: tribe-gke-cluster
    cluster-location: europe-west1
```
Replace the `cluster` and `cluster-location` with the name and location of your target GKE cluster.

### Examples

Given the following `cloud-run.yaml`:
```yaml
name: my-service
memory: 256Mi
allow-unauthenticated: true

runs-on:
  fully-managed:
    region: europe-west1
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

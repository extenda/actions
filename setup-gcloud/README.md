# setup-gcloud

This is a GitHub Action to set up and configure the gcloud CLI.

The action offers similar functionality as the [GoogleCloudPlatform/github-actions/setup-gcloud](https://github.com/GoogleCloudPlatform/github-actions/tree/master/setup-gcloud)
action, but differs in the following ways:

  * It requires a `service-account-key` as input and always authenticates
  * It provides the default `project-id` as output

## Usage

See [action.yaml](action.yaml).

### Secrets

This action requires a GCP service account key. Once created, the JSON key should be `base64` encoded and added as
secret in the GitHub repository.

### Examples

#### Basic Usage

This example will set up `gcloud` CLI and use it to authenticate docker to later build and push an image to GCR.

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

      - name: Build and push Docker image
        run: |
          gcloud auth configure-docker
          IMAGE="gcr.io/${{ steps.gcloud.outputs.project-id }}/my-service:$GITHUB_SHA"
          docker build -t $IMAGE .
          docker push $IMAGE
```

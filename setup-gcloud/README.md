# setup-gcloud

This is a composite GitHub Action to set up and configure the gcloud CLI and cache it for further use. This action uses a setup-gcloud-base action, see more details [setup-gcloud-base](https://github.com/extenda/actions/tree/master/setup-gcloud-base)

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key. Once created, the JSON key should be `base64` encoded and added as
secret in the GitHub repository.

### Examples

```yaml
on: push

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/setup-gcloud@v0
        id: gcloud
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - name: Build and push Docker image
        run: |
          gcloud auth configure-docker
          IMAGE="gcr.io/${{ steps.gcloud.outputs.project-id }}/my-service:$GITHUB_SHA"
          docker build -t $IMAGE .
          docker push $IMAGE
```

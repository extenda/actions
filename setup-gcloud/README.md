# setup-gcloud

This is a GitHub Action to set up and configure the gcloud CLI.

The action offers similar functionality as the [GoogleCloudPlatform/github-actions/setup-gcloud](https://github.com/GoogleCloudPlatform/github-actions/tree/master/setup-gcloud)
action, but differs in the following ways:

  * It requires a `service-account-key` as input and always authenticates
  * It provides the default `project-id` as output

## Usage

See [action.yml](action.yml).

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
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - name: Build and push Docker image
        run: |
          gcloud auth configure-docker
          IMAGE="gcr.io/${{ steps.gcloud.outputs.project-id }}/my-service:$GITHUB_SHA"
          docker build -t $IMAGE .
          docker push $IMAGE
```

#### Make the action run faster

This example will download the `gcloud` CLI and cache it for further use. The CLI is used to authenticate docker to later build and push an image to GCR.

```yaml
on: push

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Get gcloud latest version
        run: |
          url="https://dl.google.com/dl/cloudsdk/channels/rapid/components-2.json"
          version=$(curl -s "$url" | grep -o '"version": "[^"]*' | cut -d'"' -f4)
          echo "gcloud_version=$version" >> $GITHUB_ENV

      - name: Cache Gcloud packages
        uses: actions/cache@v3
        id: gcloud-cache
        with:
          key: ${{ runner.os }}-cache-gcloud-${{ env.gcloud_version }}
          path: |
            /opt/hostedtoolcache/gcloud/${{ env.gcloud_version }}

      - uses: extenda/actions/setup-gcloud@v0
        id: gcloud
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          cache: steps.gcloud-cache.outputs.cache-hit

      - name: Build and push Docker image
        run: |
          gcloud auth configure-docker
          IMAGE="gcr.io/${{ steps.gcloud.outputs.project-id }}/my-service:$GITHUB_SHA"
          docker build -t $IMAGE .
          docker push $IMAGE
```

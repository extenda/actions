# test-pod

GitHub Action to run acceptance tests in a Kubernetes Pod. Use this action to test internal services that are not
reachable directly from GitHub Actions.

The action supports the following features:

  * Test against cluster internal services
  * Supports any Docker image
  * Mount a volume as working directory in Pod
  * Specify a custom entrypoint for the container
  * Expose the internal service URL as a `SERVICE_URL` environment variable when `cloud-run.yaml` is used

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the Pod.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

## Examples

### Test internal Cloud Run service

This example will run Newman tests against an internal Cloud Run service. The service is assumed to have been deployed
with the [`cloud-run`](../cloud-run#readme) action. The `cluster` and `namespace` inputs are derived from the `cloud-run.yaml`
which is assumed to exist in the repository root.

````yaml
on: push

jobs:
  acceptance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Acceptance tests
        uses: extenda/actions/test-pod@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: postman/newman:alpine
          working-directory: test/newman
          entrypoint: test/newman/run-test.sh
````

### Test internal service without `cloud-run.yaml`

This example demonstrates how to run a test without depending on a `cloud-run.yaml` in your repository.

Note that when `cloud-run.yaml` isn't used, the Pod will not have a `SERVICE_URL` environment variable set.

```yaml
on: push

jobs:
  acceptance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Acceptance tests
        uses: extenda/actions/test-pod@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: postman/newman:alpine
          working-directory: test/newman
          entrypoint: test/newman/run-test.sh
          cluster: projects/example-staging/zones/europe-west1/clusters/k8s-cluster
          namespace: example
```


### Test with custom Docker image

This example demonstrates how to build a custom Docker image to run the tests in.

```yaml
on: push

jobs:
  acceptance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - name: Build test image
        run: |
          gcloud --quiet auth configure-docker
          IMAGE=eu.gcr.io/extenda/example-test:${{ github.sha }}
          docker build --build-arg SERVICE_URL=http://example.example -t $IMAGE .
          docker push $IMAGE
        working-directory: test/newman

      - name: Acceptance tests
        uses: extenda/actions/test-pod@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: eu.gcr.io/extenda/example-test:${{ github.sha }}
```

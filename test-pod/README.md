# test-pod

**:warning: This action is deprecated and will be removed in v1.**

GitHub Action to run acceptance tests in a Kubernetes Pod. Use this action to test internal services that are not
reachable directly from GitHub Actions.

The action supports the following features:

  * Test against cluster internal services
  * Test Pod runs in the service's namespace, with the same workload identity (service account)
  * Supports any Docker image
  * Mount a volume as working directory in Pod
    > :warning: The mount is not recursive, only direct children of the directory will be included
  * Specify a custom shell script to run as entrypoint for the container
  * Expose the internal service URL as a `SERVICE_URL` environment variable when `cloud-run.yaml` is used
  * Expose any `TESTPOD_*` environment variables to the Pod at runtime
  * [Stream files over standard out](#test-that-saves-reports-on-the-github-runner) to save test and coverage reports in a `test-pod-output` folder in the working directory
    > :warning: Files are transferred in a tarball over `stdout` so be careful to not transfer too large files.

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

The example also demonstrates how to pass additional environment variables to your pod runtime using environment
variables with `TESTPOD_` prefixes. In the example, the `TESTPOD_API_KEY` will be available to tests
as a system environment variable.

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
        env:
          TESTPOD_API_KEY: ${{ secrets.API_KEY }}
````

To trim the `TESTPOD_` prefixes from environment variables set `trim-prefix: true` flag.
In the example below, the `TESTPOD_API_KEY` will be available to tests as a system environment variable named `API_KEY`.

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
          trim-prefix: true
        env:
          TESTPOD_API_KEY: ${{ secrets.API_KEY }}
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
You want to use a custom docker image when using a compiled language for the test suite, for example Java or Dotnet.

Below, we use the following `Dockerfile` as an example. It will:

  * Copy the working directory contents
  * Use a `serviceUrl` and `apiKey` as build time arguments which we access as environment variables at runtime
  * Run Newman tests from files in the image

```dockerfile
FROM postman/newman:alpine
WORKDIR /work
ARG serviceUrl
ENV SERVICE_URL $serviceUrl
COPY . .
ENTRYPOINT ["./run.sh"]
```

And our `run.sh` would look something like this:

```shell script
#!/bin/sh
if [ -z "$SERVICE_URL" ]; then
  SERVICE_URL="http://localhost:8080"
fi

exec newman run piglatin-service.postman_collection.json \
  --environment piglatin-staging.postman_environment.json \
  --env-var serverUrl=$SERVICE_URL \
  --color off
```

Below is the sample workflow that builds and runs the custom `Dockerfile`.

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
          docker build \
            --build-arg serviceUrl=http://example.example \
            -t $IMAGE .
          docker push $IMAGE
        working-directory: test/newman

      - name: Acceptance tests
        uses: extenda/actions/test-pod@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: eu.gcr.io/extenda/example-test:${{ github.sha }}
        env:
          TESTPOD_API_KEY: ${{ secrets.API_KEY }}
```

### Test that saves reports on the GitHub runner

Sometimes you need access to files generated by the test, for example test reports or coverage reports.
The `test-pod` action enables this by capturing files from standard out. However, the container that runs the test must
write the files to standard out itself.

The action supports a single file transfer on the following format
  1. Write `test-pod-output BEGIN` to standard out to start the transfer
  2. Create a TAR archive with the files to transfer, Base64 encode it and write it to standard out
  3. Write `test-pod-output END` to standard out to end the transfer

We recommend performing the file transfer in the `entrypoint` action input script,
or in your custom docker image's `entrypoint`.

With POSIX shell, the following commands would transfer all files in the `coverage` directory as well as all
`.txt` files in the working directory.

The transfer should be among the last things done by your test script.

```shell script
echo test-pod-output BEGIN
tar -czf - coverage *.txt | base64
echo test-pod-output END
```

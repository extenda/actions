# opa-policy-test

Test OPA policies with bundles downloaded from Google Cloud Storage (GCS).

The action assumes that policy files and tests are located in `policies/policy`. Tests are executed with `opa test`
and all tests in the bundle will be executed. This means the test action supports both ingress and application policies.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to download bundles from GCS.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### Examples

```yaml
jobs:
  test-opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Test OPA policies
        uses: extenda/actions/opa-policy-test@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
```

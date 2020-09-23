# iam-test-token

This is a GitHub Action to obtain a valid ID token from the Hii Retail IAM. The token can be used in acceptance tests.

The action outputs the token as `iam-token` as well as an `IAM_TOKEN` environment variable.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### Examples

```yaml
jobs:
  acceptance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: IAM token
        uses: extenda/actions/iam-test-token@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}

      - name: Acceptance test
        run: |
          newman run e2e.postman_collection.json \
            --environment e2e.postman_environment.json \
            --env-var iamToken=$IAM_TOKEN \
            --color off
```

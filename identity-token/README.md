# identity-token

This is a GitHub Action to obtain a valid identity token for the specified account.

The action outputs the token as `identity-token` as well as an `IDENTITY_TOKEN` environment variable.

Note: This action can be executed only in the staging environment.

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
      - uses: actions/checkout@v4

      - name: Identity token
        uses: extenda/actions/identity-token@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          service-account: braveheart-quotes-webclient@quotes-staging-ccdf.iam.gserviceaccount.com
          audiences: bhq-braveheart-quotes

      - name: Acceptance test
        run: |
          newman run e2e.postman_collection.json \
            --environment e2e.postman_environment.json \
            --env-var identityToken=$IDENTITY_TOKEN \
            --color off
```

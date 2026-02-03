# pact-can-i-deploy

This is a composite GitHub Action to query a Pact Broker to determine if a pact is verified and the new version
can be deployed to production.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permissions to access secret payloads. Once created, the JSON key should be `base64` encoded and added as
secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

The following example shows how the action can be used to verify if the pipeline can proceed to deploy the new version.

```yaml
on: push

jobs:
  can-i-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Can I deploy?
        uses: extenda/actions/pact-can-i-deploy@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application-name
```

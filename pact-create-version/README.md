# pact-create-version

This is a composite GitHub Action to create or update a pacts' version in a Pact Broker.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permissions to access secret payloads. Once created, the JSON key should be `base64` encoded and added as
secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

The following example shows how the action can be used to publish pacts that's been created during consumer tests.

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      # Run tests that produces pacts...

      - name: Create/update pact version
        uses: extenda/actions/pact-create-version@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
```

# pact-publish

This is a composite GitHub Action to publish pacts to a Pact Broker.

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
      - uses: actions/checkout@v4

      # Run tests that produces pacts...

      - name: Publish pacts
        uses: extenda/actions/pact-publish@v0
        with:
          pacts-directory: target/pacts
          service-account-key: ${{ secrets.SECRET_AUTH }}
```

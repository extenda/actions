# pact-broker

This is a composite GitHub Action to make it easy to run an authenticated Pact Broker CLI.
The action will get credentials using the [gcp-secret-manager](../gcp-secret-manager#readme).

This is a low-level action and most end users should instead look ot the higher-order
actions built on top of this:

  * [pact-can-i-deploy](../pact-can-i-deploy#readme)
  * [pact-publish](../pact-publish#readme)
  * [pact-tag-version](../pact-tag-version#readme)

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permissions to access secret payloads. Once created, the JSON key should be `base64` encoded and added as
secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

The following example shows how to use the action to execute commands with the Pact Broker CLI.
Note that it is important to use the correct multi-line string syntax.

```yaml
on: push

jobs:
  pact-broker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Publish pacts
        uses: extenda/actions/pact-broker@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          args: |-
            broker publish target/pacts \
            --tag="$(git rev-parse --abbrev-ref HEAD)" \
            --consumer-app-version=${{ github.sha }}
```

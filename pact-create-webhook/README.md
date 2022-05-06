# pact-create-webhook

This is a composite GitHub Action to instruct a Pact Broker to create a provider webhook.
The webhook is used to instruct the provider to verify the pact(s).

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permissions to access secret payloads.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

The following example shows how the action can be used in the pipeline to instruct the Pact Broker
to create the provider webhook.

```yaml
on: push

jobs:
  pact-create-webhook:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create Pact Broker provider webhook
        uses: extenda/actions/pact-create-webhook@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          uuid: a-uuid-that-you-generate
```

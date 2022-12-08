# pact-record-deployment

This is a composite GitHub Action to instruct a Pact Broker to record a pact as deployed.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permissions to access secret payloads.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

The following example shows how the action can be used in the pipeline to instruct the Pact Broker
to record the deployment to production. Preferably place this step after cloud-run deployment.

```yaml
on: push

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy pact to Production
        uses: extenda/actions/pact-record-deployment@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application
          release-version: ${{ steps.release.outputs.version }}
```

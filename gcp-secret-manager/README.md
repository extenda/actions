# gcp-secret-manager

This GitHub Action can be used to access secrets in [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
in your GitHub Actions Workflow.

The action takes a key-value pair of environment variables mapped to secret names. It will populate all the
environment variables with the secret value and make them available in subsequent steps.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to access secret payloads.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.


### Available Secrets

Extenda Retail's pipeline secrets are documented on the
[GPC Pipeline Secrets Confluence page](https://confluence.extendaretail.com/display/BT/GCP+Pipeline+Secrets).

If you miss a secret, reach out to the platform team.

### Examples

#### Basic Usage

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

    - uses: extenda/actions/gcp-secret-manager@v0
      with:
        service-account-key: ${{ secrets.SECRET_AUTH }}
        secrets: |
          NEXUS_PASSWORD: nexus-password
          NEXUS_USERNAME: nexus-username
          SONAR_TOKEN: sonarsource-token
```

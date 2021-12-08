# txengine-deploy

GitHub Action to deploy a tenant-specific Transaction Engine. This action is used internally at Extenda Retail for a
repeatable and scalable deployment of applications.

This action supports the following:

  * Custom Transaction Engine docker containers
  * Reuse of manifests maintained by the Transaction Engine clan
  * Custom environment variables
  * Custom secrets resolved from GCP Secret Manager. Use the
    `sm://*/secret-name` syntax to refer secrets. The secrets will
    be resolved and available for the application as environment variables.

The action will always set the following environment and secrets:

  * `DATABASE_HOST`
  * `DATABASE_USER`
  * `DATABASE_PASSWORD`
  * `SERVICE_PROJECT_ID` - the GCP project ID
  * `SERVICE_ENVIRONMENT` - one of `staging` or `prod`
  * `LAUNCH_DARKLY_ACCESS_KEY` - the SDK key to use LaunchDarkly as a feature flag provider

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy to Kubernetes.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It also requires a GCP service account key with permission to access secrets from GCP secret manager.

## Examples

### Deploy tenant specific service

In this example, a job is used to deploy a Transaction Engine to production.
It depends on a release job that we assume have built, tagged and pushed a docker
image that we can access via an output variable.

The `environment` input is optional. When used, it should be a YAML map of additional key-value pairs to set as
environment on the user container. For secret manager values, it is recommended to use `*` instead of the project ID.
The wildcard will be replaced with the correct project ID.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
    needs:
      - release
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to production
        uses: extenda/actions/txengine-deploy@v0
        with:
          deploy-service-account-key: ${{ secrets.GCLOUD_AUTH_PROD }}
          secret-service-account-key: ${{ secrets.SECRET_AUTH }}
          image: ${{ needs.release.outputs.container-image }}
          tenant-name: acme
          country-code: SE
          environment: |
            CENTRALOFFICE_HOST: 127.0.0.1
            MY_SECRET: sm://*/my-secret
```

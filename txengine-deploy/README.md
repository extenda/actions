# txengine-deploy

GitHub Action to deploy a tenant-specific Transaction Engine. This action is used internally at Extenda Retail for a
repeatable and scalable deployment of applications.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy to Kubernetes.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It also requires a GCP service account key with permission to access secrets from GCP secret manager.

## Examples

### Deploy tenant specific service

In this example, a deploy job is used to deploy a Transaction Engine to production.
It depends on a release job that we assumes have built, tagged and pushed a docker
image that we can access via an output variable.

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
```

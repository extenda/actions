# iam

This is a GitHub Action to publish permissions and roles to Hii Retail IAM.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### Examples

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            STYRA_TOKEN: styra-das-token
            IAM_EMAIL: iam-api-email-staging
            IAM_PASSWORD: iam-api-password-staging
            IAM_TENANT: iam-api-tenantId-staging
            IAM_APIKEY: iam-api-key-staging

      - name: IAM permissions
        uses: extenda/actions/iam@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          styra-token: ${{ env.STYRA_TOKEN }}
          iam-email: ${{ env.IAM_EMAIL }}
          iam-password: ${{ env.IAM_PASSWORD }}
          iam-key: ${{ env.IAM_APIKEY }}
          iam-tenant: ${{ env.IAM_TENANT }}
          iam-definition: iam.yaml
          styra-tenant: extendaretail
          iam-api-url: https://iam-api.retailsvc.dev

```
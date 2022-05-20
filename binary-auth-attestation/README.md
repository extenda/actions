# Binary Auth Attestation

This is a GitHub Action to sign and create a Binary Authorization Attestation using a Cloud KMS key.

Binary Authorization is a service that allows only "attested" images to be deployed to the cluster. An attested image is one that has been verified or guaranteed by an "attestor". Any unauthorized images that do not match the Binary Authorization policy will be rejected.

## Usage

See [action.yml](action.yml).

### Examples

```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - name: Build and push Docker image
        run: |
          gcloud --quiet auth configure-docker
          IMAGE=eu.gcr.io/extenda/image-name:${{ github.sha }}
          docker build -t $IMAGE .
          docker push $IMAGE

      - name: Attest image
        uses: extenda/actions/binary-auth-attestation@v0
        with:
          image-path: eu.gcr.io/extenda/image-name:${{ github.sha }}
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - name: Deploy to Staging
        uses: extenda/actions/cloud-run@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: eu.gcr.io/extenda/image-name:${{ github.sha }}
```

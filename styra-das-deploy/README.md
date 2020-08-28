# policy-push

This is a GitHub Action to publish the DAS staging policy to DAS production system

## Usage

See [action.yml](action.yml).

### Example

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

      - name: DAS production deploy
        uses: extenda/actions/styra-das-deploy@v0
        with:
          styra-das-token: ${{ secrets.STYRA_TOKEN }}
          staging-system-id: 'Your Styra DAS staging System ID (e.g., iam-staging)'
          prod-system-id: 'Your Styra DAS prod System ID (e.g., iam-prod)'
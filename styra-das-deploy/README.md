# styra-das-deploy

This is an opinionated GitHub Action to publish a DAS staging policy to its matching DAS production system.

The action makes the following assumptions:

  * DAS systems follow a naming convention adhering to `<permission-prefix>.<service-name>-<env>`
  * All systems have a `staging` and `prod` environment
  * Staging systems allow interactive editing with GitOps integration in Styra DAS
  * Prod systems are read-only in Styra DAS

## Usage

See [action.yml](action.yml).

### Example

```yaml
jobs:
  prod:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v2

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            STYRA_TOKEN: styra-das-token

      - name: DAS production deploy
        uses: extenda/actions/styra-das-deploy@v0
        with:
          styra-das-token: ${{ env.STYRA_TOKEN }}
          permission-prefix: tst
          service-name: my-service
```

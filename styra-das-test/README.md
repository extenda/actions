# styra-das-test

Execute unit tests for Rego rules inside Styra DAS.

The following files are expected to exist in your project:

- `policies/policy/com.styra.envoy.ingress/test/test/test.rego`
- `policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego`

## Usage

See [action.yml](action.yml).

## Example

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

      - name: Run OPA tests
        uses: extenda/actions/styra-das-test@v0
        with:
          system-id: 'Your Styra DAS System ID (e.g., iam-staging)'
```

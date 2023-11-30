# styra-das-test

**:warning: This action is deprecated and will be removed in v1. Use [opa-policy-test](../opa-policy-test#readme) instead.**

An opinionated action to execute unit tests for Rego rules inside Styra DAS.

The following files are expected to exist in your project:

- `policies/policy/com.styra.envoy.ingress/test/test/test.rego`
- `policies/policy/com.styra.envoy.ingress/rules/rules/ingress.rego`

If running tests on app policy type these files are expected:

- `policies/policy/com.styra.envoy.app/test/test/test.rego`
- `policies/policy/com.styra.envoy.app/rules/rules/app.rego`


The DAS system name is expected to follow the Extenda Retail naming convention:
`<permission-prefix>.<service-name>-staging`.

## Usage

See [action.yml](action.yml).

## Example

```yaml
jobs:
  test-opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            STYRA_TOKEN: styra-das-token

      - name: OPA/Rego unit tests
        uses: extenda/actions/styra-das-test@v0
        with:
          styra-das-token: ${{ env.STYRA_TOKEN }}
          permission-prefix: tst
          service-name: my-service
```

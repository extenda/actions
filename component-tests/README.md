# Component testing

## Overview

The purpose of this testing is to make sure that service which is deployed to staging is healthy (ping health-check) and to make sure that all endpoints pass authorization (OPA).
For this to work we need authorization token to make requests.

## Usage

See [action.yml](action.yml).

## Example

```yaml
jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: IAM permissions
        uses: extenda/actions/component-tests@v0
        with:
          auth-token: ${{ env.AUTH_TOKEN }} # Used as the 'Bearer' auth to make requests to the service and test permissions
          base-url: https://iam-api.retailsvc.dev/
          tests: ./tests/component-tests/tests.yaml 
```

## Tests YAML

Test specification should be included inside the yaml file.
All the entries in YAML should be in the form of `<METHOD> <PATH>: { code: <HTTP_CODE>, body: <RESPONSE_BODY> }`.
You can find the example [here](./src/tests.yml).

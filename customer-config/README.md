# Customer Configuration GitHub Action

This GitHub action synchronises CCC config definitions service.
# Usage

See [action.yml](action.yml)

# Common repo setup

Example (customer-config/che.yaml)
```yaml
version: 1 # always 1 for now
system-prefix: che
definitions: # list of config definitions for your system
  - name: receipt-layout # name (part of generated id)
    version: v1 # version (part of generated id)
    display-name: Receipt Layout config # human-readable name for the configuration
    schema-location: https://example.com/schema.json # location of the JSON schema
    default-value: # default value for the configuration
      layout: default
```

# Action setup example

.github/workflows/exe.yml
```yaml
name: Customer Configuration
on:
  push:
    paths: customer-config/*.yaml

jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Customer config sync
        uses: extenda/actions/customer-config@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          definitions: customer-config/*.yaml # default is `customer-config/*.yaml`
          dry-run: ${{ github.ref != 'refs/heads/master' }}
```

# Cloud Run Traffic

A simple action for managing Cloud Run revisions traffic. Can be used for rollbacks or gradual rollouts.

# Usage

See [action.yml](action.yml)

# Action setup example

.github/workflows/exe.yml
```yaml
name: Manage Cloud Run Traffic [prod]
on:
  workflow_dispatch:
    inputs:
      revision:
        required: true
      service:
        required: true
      percentage:
        required: false
        default: '100'

jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Customer config sync
        uses: extenda/actions/cloud-run-traffic@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH }} # required
          # service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # staging
          service: ${{ github.event.inputs.service }} # required
          revision: ${{ github.event.inputs.revision }} # required
          percentage: ${{ github.event.inputs.percentage }} # optional. 100 by default
```

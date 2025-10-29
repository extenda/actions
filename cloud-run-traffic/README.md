# Cloud Run Traffic

> Notice: this action is deprecated and is going to be removed soon.
> It's recommended to use [Service manager UI](https://operations.retailsvc.com/ui/platform/service-manager) instead.

A simple action for managing Cloud Run revisions traffic. Can be used for rollbacks or gradual rollouts.

# Usage

See [action.yml](action.yml)

> Note: this action support cloud run fully managed in clan projects. Cloud Run for Anthos support is not implemented yet.

# Action setup example

.github/workflows/manage-traffic-prod.yml
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
      - name: Manage Traffic
        uses: extenda/actions/cloud-run-traffic@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_PROD }} # required
          # service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # staging
          service: ${{ github.event.inputs.service }} # required
          target-revision: ${{ github.event.inputs.revision }} # required
          percentage: ${{ github.event.inputs.percentage }} # optional. 100 by default
```

# dora-metrics

This is a GitHub Action to store dora metrics.

When deploying your service to production you should also run this action on a successful deploy.

## Usage

See [action.yml](action.yml).

### Examples

The following example generates and stores all bugs into a bucket that will be used to display the change failure rate for you product.

```yaml
on: push

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            JIRA_USERNAME: jira-username
            JIRA_PASSWORD: jira-password

      - uses: extenda/actions/dora-metrics@v0
        with:
          product-name: Scan & Go
          product-component: mcpe-selfscan
          jira-username: ${{ env.JIRA_USERNAME }}
          jira-password: ${{ env.JIRA_PASSWORD }}
          jira-project-key: MCPE
```

# UI Health Check

A simple action, that takes in config and visits by a URL to check
if the UI is up and running.

# Usage

See [action.yml](action.yml)


# Action setup example

.github/workflows/ui-healthcheck.yml

```yaml
name: UI Health Check
on:
  workflow_dispatch:
  schedule:
    - cron: '0 * * * *'

jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: UI Health Check
        uses: extenda/actions/ui-healthcheck@master
        with:
          config-path: ./ui-health-check-config.yml
```

ui-health-check-config.yml

```yaml
cases:
  - name: "Cash Management To Bank"
    setup:
      url: 'https://testrunner.hiiretail.com/in-store/cash-management/to-bank'
      requireLogin: true
    expect:
      element: '[data-testid="no-data-overlay"]'
      toHaveText: 'You can not proceed with this operation. No currencies found'

  - name: "Reconciliation till audit"
    setup:
      url: 'https://testrunner.hiiretail.com/in-store/reconciliation/audit'
      requireLogin: true
    expect:
      element: '[data-testid="page-title"]'
      toInclude: 'Audit'

  - name: 'Receipt journal'
    setup:
      url: 'https://testrunner.hiiretail.com/in-store/receipt-journal'
      requireLogin: true
    expect:
      element: '[data-testid="txr-table"]'
      to: 'exists' # 'not-exists' | 'be-visible' | 'not-be-visible'
```

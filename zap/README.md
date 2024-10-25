# ZAP API Scanning

GitHub Action to run [ZAP API scanning](https://www.zaproxy.org/) test in your pipeline.

### Usage

```yaml
name: Scheduled ZAP scan

on:
  schedule:
    # Runs at 12:00 AM UTC on Sunday (midnight between Saturday and Sunday)
    - cron: '0 0 * * SUN'
  workflow_dispatch: # Allows manual triggering of the workflow

steps:
  - uses: extenda/actions/zap@v0
    with:
      audience: 'service-a'
      openapi: 'https://service-a.retailsvc.dev/api/v1/openapi.yaml'
      slack-channel: 'my-team-channel'
```

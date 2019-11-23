# wait-for-checks

This GitHub Action waits for status checks to pass for the current commit SHA. 

With this action, workflows that triggers on multiple events can detect if checks from a another flow has passed or not.
One concrete use case is for acceptance tests that should run on pull requests, but wait for push triggered unit tests 
to complete first. 

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.
 
  * `GITHUB_TOKEN`: The GitHub Actions provided access token for the repository

### Basic Usage

```yaml
on: pull_request
jobs:
  acceptance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@master

      - name: Wait for tests to pass
        uses: extenda/actions/wait-for-checks@v0
        with:
          checks: |
            test
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

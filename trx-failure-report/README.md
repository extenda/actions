# trx-failure-report

This GitHub Action parses all Microsoft trx files and prints failures to console in a human friendly format

## Usage

See [action.yml](action.yml).


### Basic Usage

```yaml
on: push
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v1

      - name: Print TRX Failures
	if: failure()
        uses: extenda/actions/trx-failure-report@v0
```

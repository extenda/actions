# vale-linting

This is a composite GitHub Action to make it easy to run a [Vale Linter](https://github.com/errata-ai/vale).

## Usage

See [action.yml](action.yml).

### Secrets

This action uses `GITHUB_TOKEN` secret that GitHub automatically creates to use in the workflow. We use the `GITHUB_TOKEN` to authenticate in a workflow run.

### Examples

The following example shows how to use the action and exclude files from linting.

```yaml
on: push

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Lint natural language with Vale
        uses: extenda/actions/vale-linting@v0
        with:
          exclude: .github/**/*
```

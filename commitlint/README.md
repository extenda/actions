# commitlint

This GitHub Action can be used to lint commit messages to ensure they adhere to
the conventional commits specification.

This action has two main use cases

  1. Validate commits added in a pull request
  2. Validate the pull request title

To complement this action, it is recommended to enforce commit conventions
using [pre-commit hooks](../jira-releasenotes/README.md#pre-commit-configuration).

## Usage

See [action.yml](action.yml).

## Examples

### Validate Commits in a Pull Request

```yaml
on: pull_request

jobs:
  lint_commits:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Validate commit messages
        uses: extenda/actions/commitlint@v0
```

### Validate Pull Request Title

```yaml
on: pull_request

jobs:
  lint_pull_request:
    runs-on: ubuntu-latest
    steps:
      - name: Validate pull request title
        uses: extenda/actions/commitlint@v0
        with:
          message: ${{ github.event.pull_request.title }}
```

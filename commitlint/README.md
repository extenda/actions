# commitlint

This GitHub Action can be used to lint commit messages to ensure they adhere to
the conventional commit specification.

This action has two main use cases

  1. Validate the pull request title
  2. Validate commits added in a pull request

The action has an optional relaxed mode. When used, commit messages will only be validated if
the pull request title is invalid or if the pull request only consists of a single commit.
For most use cases, the relaxed mode is now recommended.
The action also has an optional enable-commit-validation parameter. When used, the commit
message will be validated with a custom plugin according to conventional commits (e.g., feat(ABC-1234): Commit name).

To complement this action, it is recommended to enforce commit conventions
using [pre-commit hooks](../jira-releasenotes/README.md#pre-commit-configuration).

## Usage

See [action.yml](action.yml).

## Examples

### Validate pull request title and single commit message

This example will always validate the pull request title. In case enable-commit-validation will be
true additional checks will be performed (checking git prefix , syntax validation).
If the title is valid, it will only validate commits if the pull request consists of a single commit.
The rationale behind this behavior is that PRs with single commits will be used as the default squash
message by GitHub.

A workflow configured like this is the most forgiving, while enforing good commits as long as
squash and merge is used.

```yaml
on:
  pull_request:
    types:
      - edited
      - opened
      - reopened
      - synchronize

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Lint pull request title
        uses: extenda/actions/commitlint@v0
        with:
          message: ${{ github.event.pull_request.title }}
          enable-commit-validation: ${{ inputs.enable-commit-validation }}

      - name: Lint commit messages
        if: always()
        uses: extenda/actions/commitlint@v0
        with:
          relaxed: ${{ contains(job.status, 'success') }}
```

### Validate pull request title and all commit messages

```yaml
on:
  pull_request:
    types:
      - edited
      - opened
      - reopened
      - synchronize

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Lint pull request title
        uses: extenda/actions/commitlint@v0
        with:
          message: ${{ github.event.pull_request.title }}
          enable-commit-validation: ${{ inputs.enable-commit-validation }}

      - name: Lint commit messages
        uses: extenda/actions/commitlint@v0
```

### Usage with `actions/checkout@v2`

To use this with the `checkout/v2` action, one must take care to checkout all commits and the pull request HEAD and
not the merge reference. If the merge reference is checked out, it will confuse the relaxed check.

```yaml
on:
  pull_request:
    types:
      - edited
      - opened
      - reopened
      - synchronize

jobs:
  commitlint:
    - uses: actions/checkout@v2
      with:
        ref: ${{ github.event.pull_request.head.sha }}
        fetch-depth: 0

    - name: Lint pull request title
      uses: extenda/actions/commitlint@v0
      with:
        message: ${{ github.event.pull_request.title }}
        enable-commit-validation: ${{ inputs.enable-commit-validation }}

    - name: Lint commit messages
      if: always()
      uses: extenda/actions/commitlint@v0
      with:
        relaxed: ${{ contains(job.status, 'success') }}
```

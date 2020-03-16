# jira-releasenotes

This GitHub Action integrates [conventional commit](https://conventionalcommits.org) messages as release notes in JIRA.
The action will identity all commits that refers JIRA issues and update the JIRA issue with the commit message.

The recommended way to use this action is to run it on the `master` branch to update JIRA when a pull request is being
merged. By using `Squash and merge`, multiple commits can easily be combined to a single commit with a good commit
message suitable for conventional release notes and JIRA release notes.

The action can update multiple issues and process multiple commits. If the same JIRA issue is referenced by multiple
commits, the last commit message will be used.

When using this action, it is recommended to enforce commit conventions using [pre-commit hooks](#pre-commit-configuration).

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

  * `JIRA_USERNAME`: JIRA username used for basic authentication
  * `JIRA_PASSWORD`: JIRA password used for basic authentication

### Examples

#### Basic Usage

This example will update release notes on https://jira.extendaretail.com when commits are pushed to the `master` branch.
The release note will be written to a custom field named `Release note`.

```yaml
on:
  push:
    branches:
      - master

jobs:
  jira-releasenotes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Update JIRA release notes
        uses: actions/extenda/jira-releasenotes@v0
        with:
          jira-project: ELY
        env:
          JIRA_USERNAME: ${{ secrets.JIRA_USERNAME }}
          JIRA_PASSWORD: ${{ secrets.JIRA_PASSWORD }}
```

#### Usage With Secret Manager

```yaml
on:
  push:
    branches:
      - master

jobs:
  jira-releasenotes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: actions/extenda/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            JIRA_PASSWORD: jira-password
            JIRA_USERNAME: jira-username

      - name: Update JIRA release notes
        uses: actions/extenda/jira-releasenotes@v0
        with:
          jira-project: ELY
```

#### Pre-commit configuration

To enforce commit conventions, we recommend using [pre-commit](https://pre-commit.com).
With commit message hooks, we can ensure that all pushed commits follows our conventions.

To configure pre-commits, start by installing [pre-commit](https://pre-commit.com).
Next, create a `pre-commit-config.yaml` file in your repository root.

```yaml
default_stages: [commit]
exclude: '^.*/dist/.*$'
repos:
  - repo: git@github.com:extenda/pre-commit-hooks.git
    rev: v0.4
    hooks:
      - id: commitlint
        stages: [commit-msg]
```

Pre-commit must be initiated after a repository has been cloned. To do this, run:

```bash
$ pre-commit install -t pre-commit -t commit-msg
```

The hook will now run every time `git commit` is used.

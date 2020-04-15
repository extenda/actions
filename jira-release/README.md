# jira-release

This GitHub Action automates creating and releasing project versions in JIRA. The action performs the following:

  * Create or reuse project version adhering to the naming convention `<projectKey> [<component>] <semver>`
  * Use  [conventional commit](https://conventionalcommits.org) messages to assign fix version on all included issues
  * Release the version

The action will not transition issues (e.g. close them) and it will discover open issues in a release version.

While this action can be used on its own, it is recommended in a workflow together with

  * [conventional-release](../conventional-release#readme)
  * [conventional-version](../conventional-version#readme)
  * [jira-releasenotes](../jira-releasenotes)

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

  * `JIRA_USERNAME`: JIRA username used for basic authentication
  * `JIRA_PASSWORD`: JIRA password used for basic authentication

### Examples

#### JIRA release with release notes

This example would run the `jira-release` job after a `release` job that has created a git tag. The job will
populate issues with release notes and then create the JIRA release, set the fix version in all issues and finally
release the JIRA version. Note the use of `${{ steps.outputs.semver.release-version }}` to obtain the semantic version
that was tagged in the `release` job.

```yaml
on:
  push:
    branches:
      - master

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: semver
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Build release ...

  jira-release:
    runs-on: ubuntu-latest
    needs: release
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            JIRA_PASSWORD: jira-password
            JIRA_USERNAME: jira-username

      - uses: extenda/actions/conventional-version@v0
        id: semver

      - name: Update JIRA release notes
        uses: extenda/actions/jira-releasenotes@v0
        with:
          jira-project: ELY

      - name: Create JIRA release
        uses: extenda/actions/jira-release@v0
        with:
          jira-project: ELY
          version: ${{ steps.outputs.semver.release-version }}
```

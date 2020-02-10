# jira-releasenotes

This GitHub Action integrates [conventional commit](https://conventionalcommits.org) messages as release notes in JIRA.
The action will identity all commits that refers JIRA issues and update the JIRA issue with the commit message.

The recommended way to use this action is to run it on the `master` branch to update JIRA when a pull request is being 
merged. By using `Squash and merge`, multiple commits can easily be combined to a single commit with a good commit 
message suitable for conventional release notes and JIRA release notes.

The action can update multiple issues and process multiple commits. If the same JIRA issue is referenced by multiple 
commits, the last commit message will be used.


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

```
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

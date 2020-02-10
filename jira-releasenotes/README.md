# jira-releasenotes

This GitHub Action integrates [conventional commit](https://conventionalcommits.org) messages as release notes in JIRA.
The action will identity all commits that refers JIRA issues and update the JIRA issue with the commit message. 

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

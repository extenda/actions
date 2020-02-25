# sonar-scanner-ms

This GitHub Action performs a [SonarQube](https://sonarqube.org) analysis for c# projects and waits for the Quality Gate to be analysed.
This actions supports the following features:

  * Perform analysis on branches and pull requests
    * [SonarQube v6](https://sonar.extenda.io)
  * Wait for Quality Gate results after analysis
  * Fail build if Quality Gate is not passed

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

  * `SONAR_TOKEN`: an access token with permissions to create projects and perform an analysis

### Examples

#### Basic Usage

This example runs tests on a Node project and then performs an analysis on [SonarCloud](https://sonarcloud.io).

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - name: Setup Sonarscanner
        uses: extenda/actions/sonar-scanner-ms@v0
        with:
          sonar-host: https://sonar.extenda.io
          project-key: RS.Postal
          project-name: RS.Postal
          version: ${{ steps.semver.outputs.version }}
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run build and tests
        ...
 
      - name: Scan with SonarCloud
        uses: extenda/actions/sonar-scanner-ms@v0
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

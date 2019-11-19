# sonar-scanner

This GitHub Action performs a [SonarQube](https://sonarqube.org) analysis and waits for the Quality Gate to be analysed.
This actions supports the following features:

  * Perform analysis on branches and pull requests
  * Support multiple SonarQube versions
    * [SonarCloud](https://sonarcloud.io)
    * [SonarQube v6](https://sonar.extenda.io)
  * Detect build system
    * Gradle
    * Maven
    * Node (NPM)
  * Wait for Quality Gate results after analysis
  * Fail build if Quality Gate is not passed

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

  * `SONAR_TOKEN`: an access token with permissions to create projects and perform an analysis
  
If SonarQube v6 is used to analyze pull requests, the following is _also_ required.
 
  * `GITHUB_TOKEN`: The GitHub Actions provided access token for the repository 
  
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

      - name: Unit tests
        run: |
          npm ci
          npm test -- --ci --coverage

      - name: Scan with SonarCloud
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonarcloud.io
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

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
  * Supports MSBuild Sonar Scanner
  * Wait for Quality Gate results after analysis
  * Fail build if Quality Gate is not passed

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

  * `SONAR_TOKEN`: an access token with permissions to create projects and perform an analysis
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
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Usage for MSBuild

This example first enables the MSBuild scanner, then runs the tests and finalizes the analysis afterwards.
The MSBuild Sonar Scanner behaves differently compared to other build systems as it must be initialized prior to the
regular build cycle.

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - name: Begin Sonar Scanner
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonar.extenda.io
          msbuild: true
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Run dotnet build

      - name: Analyze with Sonar
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonar.extenda.io
          msbuild: true
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

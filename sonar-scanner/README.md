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

If this action is used with GCP Secret Manager it requires a GCP service account key with permission to access
secret payloads. Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

If not used with secrets manager, the following environment variables are required.

  * `SONAR_TOKEN`: an access token with permissions to create projects and perform an analysis
  * `GITHUB_TOKEN`: A GitHub access token. For SonarCloud, use the GitHub Actions provided token.
                    For SonarQube, this must be a personal access token.

If any of these environment variables are set, they take precedence over secret manager values.

### Examples

#### Usage with GCP Secret Manager

This example runs tests on a Node project and then performs an analysis on [SonarCloud](https://sonarcloud.io).

It will load a `github-token` and `sonarcloud-token` named secret from the GCP Secret Manager
using the provided `service-account-key`. The default secret names can be modified with the
`github-token-secret-name` and `sonar-token-secret-name` input variables.

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
          service-account-key: ${{ secrets.SECRET_AUTH }}
```

### Usage with GitHub Secrets

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
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Usage with MSBuild

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
          sonar-scanner: dotnet
          service-account-key: ${{ secrets.SECRET_AUTH }}

      # Run dotnet build

      - name: Analyze with Sonar
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonar.extenda.io
          sonar-scanner: dotnet
          service-account-key: ${{ secrets.SECRET_AUTH }}
```

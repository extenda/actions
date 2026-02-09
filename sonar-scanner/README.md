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

See [action.yml](action.yml) for the complete list of inputs and outputs.

### Inputs

Key inputs include:

* `sonar-host` (required): The Sonar server URL (e.g., `https://sonarcloud.io` or `https://sonar.example.com`)
* `sonar-scanner`: The scanner to use (`auto`, `maven`, `gradle`, `node`, or `dotnet`). Defaults to `auto`
* `create-sonar-project`: Whether to create the Sonar project if it does not exist. Defaults to `true`
  - Set to `false` if the project already exists in SonarQube and you want to avoid creating a duplicate
* `main-branch`: The main branch name. Defaults to `master`
* `service-account-key`: Base64-encoded GCP service account key for Secret Manager access (optional)

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

#### Usage with Secret Manager

This example runs tests on a Node project and then performs an analysis on [SonarCloud](https://sonarcloud.io).

It will load a `github-token` and `sonarcloud-token` named secret from the GCP Secret Manager
using the provided `service-account-key`. The default secret names can be modified with the
`github-token-secret-name` and `sonar-token-secret-name` input variables.

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

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

#### Usage with GitHub Secrets

This example runs tests on a Node project and then performs an analysis on [SonarCloud](https://sonarcloud.io).

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

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

#### Usage with Existing SonarQube Project

If your SonarQube project already exists, or if your token does not have permissions to create projects, you can disable
automatic project creation by setting `create-sonar-project` to `false`.

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Unit tests
        run: |
          npm ci
          npm test -- --ci --coverage

      - name: Scan with SonarQube (existing project)
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonar.example.com
          create-sonar-project: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

#### Usage with MSBuild

This example first enables the MSBuild scanner, then runs the tests and finalizes the analysis afterwards.
The MSBuild Sonar Scanner behaves differently compared to other build systems as it must be initialized prior to the
regular build cycle.

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

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

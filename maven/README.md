# maven

This GitHub Action runs Maven preconfigured for Extenda Retail's Google Cloud Artifact Registry.

  * Use Maven Central for open-source dependencies
  * Use Artifact Registry for everything else
  * The deprecated Nexus Registry is supported until the project contains `.mvn/extensions.xml`

It also supports:
  * Semantic versioning from git tags. It will automatically update POM versions according to
[conventional-version](../conventional-version#readme) before building
  * Use of Maven Wrapper (`mvnw` or `mvnw.cmd`) when detected

## Usage

See [action.yml](action.yml).

### Secrets

If this action is used with GCP Secret Manager it requires a GCP service account key with permission to access
secret payloads. Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

### Basic Usage With Secret Manager

This example shows how to load credentials automatically using a service account.

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-java@v5
        with:
          java-version-file: .java-version
          cache: maven

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          args: test
```

#### Usage Without Conventional Versioning

This example shows how to disable conventional versioning. When disabled, the build version is always read from the POM
file the version must be bumped manually.

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-java@v5
        with:
          java-version-file: .java-version
          cache: maven

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          args: test
          version: pom.xml
```

#### Release

Combine with the [conventional-release](../conventional-release#readme) action to build releases on every successful
commit to `master`.

```
on: push

jobs:
  test:
    run-on: ubuntu-latest
    steps:
      # Steps to validate build...

  release:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v5
        with:
          java-version-file: .java-version
          cache: maven

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Build release
        uses: extenda/actions/maven@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          args: deploy
          version: ${{ steps.release.outputs.version }}
```

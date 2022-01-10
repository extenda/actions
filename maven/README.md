# maven

This GitHub Action runs Maven preconfigured for Extenda Retail's Nexus Repository Manager.

  * Use Maven Central for open-source dependencies
  * Use [repo.extendaretail.com](https://repo.extendaretail.com) for everything else

It also supports:
  * Semantic versioning from git tags. It will automatically update POM versions according to
[conventional-version](../conventional-version#readme) before building
  * ~~Automatic caching of the `~/.m2/repository`&nbsp;~~
  * Loading Nexus repository credentials from GCP secret manager
  * Use of Maven Wrapper (`mvnw` or `mvnw.cmd`) when detected

## Usage

See [action.yml](action.yml).

### Secrets

If this action is used with GCP Secret Manager it requires a GCP service account key with permission to access
secret payloads. Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

The following environment variables are used. They are optional if a service account key is used, otherwhise required.

  * `NEXUS_USERNAME`: user for [repo.extendaretail.com](https://repo.extendaretail.com)
  * `NEXUS_PASSWORD`: password for [repo.extendaretail.com](https://repo.extendaretail.com)

### Examples

#### Basic Usage

This example runs tests on a Maven project for every `push` event. The build version will be determined by commit history
and conventional commit messages.

```
on: push

env:
  NEXUS_USERNAME: username
  NEXUS_PASSWORD: ${{ secrets.NEXUS_PASSWORD }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v2
        with:
          distribution: adopt
          java-version: 11
          cache: maven

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
          args: test
```

### Basic Usage With Secret Manager

This example shows how to load Nexus credentials automatically using the built-in support for GCP secret manager and
the default secret names.

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: actions/setup-java@v2
        with:
          distribution: adopt
          java-version: 11
          cache: maven

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          args: test
```

The action can also be used with manually loaded secrets.

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - uses: actions/setup-java@v2
        with:
          distribution: adopt
          java-version: 11
          cache: maven

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
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
      - uses: actions/checkout@v2

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - uses: actions/setup-java@v2
        with:
          distribution: adopt
          java-version: 11
          cache: maven

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
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
    if: github.ref == refs/heads/master
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - uses: actions/setup-java@v2
        with:
          distribution: adopt
          java-version: 11
          cache: maven

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Build release
        uses: extenda/actions/maven@v0
        with:
          args: deploy
          version: ${{ steps.release.outputs.version }}
```

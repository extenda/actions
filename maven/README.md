# maven

This GitHub Action runs Maven preconfigured for Extenda Retail's Nexus Repository Manager.

  * Use Maven Central for open-source dependencies
  * Use [repo.extendaretail.com](https://repo.extendaretail.com) for everything else

It also supports semantic versioning from git tags. It will automatically update POM versions according to
[conventional-version](../conventional-version#readme) before building.

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

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
      - uses: actions/checkout@master

      - uses: actions/setup-java@v1
        with:
          java-version: 11

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
          args: test
```

### Basic Usage With Secret Manager

This example shows how to load Nexus credentials from GCP Secret Manager.

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - uses: actions/setup-java@v1
        with:
          java-version: 11

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
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - uses: actions/setup-java@v1
        with:
          java-version: 11

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
          args: test
          version: pom.xml
```

#### Usage With Cache

This examples uses a [`cache`](https://github.com/actions/cache#readme) for the Maven dependencies.

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - uses: actions/setup-java@v1
        with:
          java-version: 11

      - uses: actions/cache@v1
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - name: Unit tests
        uses: extenda/actions/maven@v0
        with:
          args: test
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
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - uses: actions/setup-java@v1
        with:
          java-version: 11

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Build release
        uses: extenda/actions/maven@v0
        with:
          args: deploy
          version: ${{ steps.release.outputs.version }}
```

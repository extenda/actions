![](https://github.com/extenda/actions/workflows/Commit/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=extenda_actions&metric=alert_status&token=40a364ceea3bf93e483e0d5b4644eced24b54d8a)](https://sonarcloud.io/dashboard?id=extenda_actions)
![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/extenda/actions?label=version)
![GitHub](https://img.shields.io/github/license/extenda/actions)

# actions

This is a monorepo containing GitHub Actions by Extenda Retail. These actions provides reusable logic for
the fundamental parts of our CI/CD pipelines.

The following actions are available

  * [cloud-run](cloud-run#readme)
  * [commitlint](commitlint#readme)
  * [conventional-release](conventional-release#readme)
  * [conventional-version](conventional-version#readme)
  * [docker](docker#readme)
  * [gcp-secret-manager](gcp-secret-manager#readme)
  * [jira-release](jira-release#readme)
  * [jira-releasenotes](jira-releasenotes#readme)
  * [maven](maven#readme)
  * [rs-create-installerpkg](rs-create-installerpkg#readme)
  * [setup-gcloud](setup-gcloud#readme)
  * [setup-git](setup-git#readme)
  * [setup-msbuild](setup-msbuild#readme)
  * [setup-nuget-sources](setup-nuget-sources#readme)
  * [slack-message](slack-message#readme)
  * [sonar-scanner](sonar-scanner#readme)

## :rocket: Workflow Examples

The following workflows demonstrates the high-level usage of many of our actions.

  * [Maven](#maven)
  * [MSBuild](#msbuild)
  * [Node](#node)

### Maven

This workflow demonstrates how a Maven project can be built using two jobs.

  * Every commit triggers the `test` job
    * Run unit tests
    * Scan with Sonar
  * Every successful commit on `master` triggers the release job
    * Bump the version and create a release
    * Deploy to Nexus without running tests

```yaml
name: Commit
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

      - uses: actions/cache@v1
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - uses: actions/setup-java@v1
        with:
          java-version: 11

      - name: Run tests
        uses: extenda/actions/maven@v0
        with:
          args: verify

      - name: Scan with SonarCloud
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonarcloud.io
          service-account-key: ${{ secrets.SECRET_AUTH }}

  release:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/cache@v1
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - uses: actions/setup-java@v1
        with:
          java-version: 11

      - name: Build release
        uses: extenda/actions/maven@v0
        with:
          args: deploy -DskipTests
          version: ${{ steps.release.outputs.version }}
```

### MSBuild

This workflow demonstrates how a .NET Core project can be built using two jobs.

  * Every commit triggers the `test` job
    * Build the project
    * Run unit tests
    * Scan with Sonar
  * Every successful commit on `master` triggers the release job
    * Bump the version and create a release
    * Deploy the NuGet package to Nexus
    * Build a Docker image and push it to Amazon ECR

```yaml
name: Commit
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
            NUGET_API_KEY: nuget-api-key

      - uses: extenda/actions/conventional-version@v0
        id: semver
        with:
          version-suffix: -${{ github.sha }}

      - name: Setup .NET Core 2.1
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: 2.1.607

      - name: Setup NuGet
        uses: NuGet/setup-nuget@v1.0.2
        with:
          nuget-version: latest

      - name: Setup NuGet sources
        uses: extenda/actions/setup-nuget-sources@v0
        with:
          config-file: NuGet.Config
          sources: |
              [{
                "name": "nuget.org",
                "source": "https://api.nuget.org/v3/index.json"
              },
              {
                "name": "Extenda",
                "source": "https://repo.extendaretail.com/repository/nuget-group/",
                "username": "${{ env.NEXUS_USERNAME }}",
                "password": "${{ env.NEXUS_PASSWORD }}",
                "apikey": "${{ env.NUGET_API_KEY }}"
              }]

      - name: Begin Sonar Scanner
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonar.extenda.io
          sonar-scanner: dotnet
          main-branch: develop
          service-account-key: ${{ secrets.SECRET_AUTH }}

      - name: Build
        run: |
          dotnet build --configuration Release \
            /p:Version=${{ steps.semver.outputs.version }}

      - name: Run tests
        run: |
          dotnet test --results-directory "./testresults" -l trx -c Release \
            /p:CollectCoverage=true \
            /p:CoverletOutputFormat=opencover \
            --verbosity minimal

      - name: Analyze with Sonar
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonar.extenda.io
          sonar-scanner: dotnet
          main-branch: develop
          service-account-key: ${{ secrets.SECRET_AUTH }}

  release:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username
            NUGET_API_KEY: nuget-api-key
            AWS_ACCESS_KEY_ID: aws-access-key-id
            AWS_SECRET_ACCESS_KEY: aws-secret-access-key

      - uses: extenda/actions/conventional-version@v0
        id: semver
        with:
          version-suffix: -${{ github.sha }}

      - name: Create a release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup .NET Core 2.1
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: 2.1.607

      - name: Setup NuGet
        uses: NuGet/setup-nuget@v1.0.2
        with:
          nuget-version: latest

      - name: Setup NuGet sources
        uses: extenda/actions/setup-nuget-sources@v0
        with:
          config-file: NuGet.Config
          sources: |
              [{
                "name": "nuget.org",
                "source": "https://api.nuget.org/v3/index.json"
              },
              {
                "name": "Extenda",
                "source": "https://repo.extendaretail.com/repository/nuget-group/",
                "username": "${{ env.NEXUS_USERNAME }}",
                "password": "${{ env.NEXUS_PASSWORD }}",
                "apikey": "${{ env.NUGET_API_KEY }}"
              }]

      - name: Build
        run: dotnet build --configuration Release /p:Version=${{ steps.release.outputs.version }}

      - name: Publish
        run: |
          dotnet publish MyExample.csproj \
            --configuration Release \
            /p:Version=${{ steps.semver.outputs.version }}

      - name: Docker build and push
        uses: extenda/actions/docker@v0
        with:
          image: extenda/my-example
          tag: latest,${{ steps.release.outputs.version }}
```

### Node

This workflow demonstrates how a Node project can be built using two jobs.

  * Every commit triggers the `test` job
    * Run `eslint`
    * Run unit tests
    * Build the project
    * Scan with Sonar
  * Every successful commit on `master` triggers the release job
    * Bump the version and create a release
    * Build the released version
    * Build a Docker image and push it to GCR

```yaml
name: Commit
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
            SONAR_TOKEN: sonarcloud-token

      - name: NPM install
        run: npm ci

      - name: Lint javascript
        run: |
          npm run lint:js -- \
            --format junit \
            --output-file test-results/eslint/TEST-eslint.xml

      - name: Unit tests
        run: npm test -- --ci --coverage

      - name: Build
        run: npm run build

      - name: SonarCloud Scan
        uses: extenda/actions/sonar-scanner@v0
        with:
          sonar-host: https://sonarcloud.io
          service-account-key: ${{ secrets.SECRET_AUTH }}

  release:
    if: github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v1

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: NPM install
        run: npm ci

      - name: Build
        run: |
          npm version ${{ steps.release.outputs.version }} --no-git-tag-version
          npm run build

      - uses: extenda/actions/setup-gcloud@v0
        id: gcloud
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH }}

      - name: Publish Docker image
        run: |
          gcloud auth configure-docker
          IMAGE=gcr.io/${{ steps.gcloud.outputs.project-id }}/my-example:v${{ steps.release.outputs.version }}
          docker build -t $IMAGE .
          docker push $IMAGE
```

## :construction: Development

The repository is a monorepo consisting of multiple packages. There are some dependencies between packages. Primarily

  * All actions depend on common functions from [`utils`](utils)
  * Cross-cutting actions like [`sonar-scanner`](sonar-scanner) depends on other actions

Javascript actions are compiled into a single javascript files using [`@zeit/ncc`](https://www.npmjs.com/package/@zeit/ncc)
to avoid committing `node_modules` into source control. This is required because GitHub Actions does not run `npm install`
before running actions.

### Development Environment

Development tools needed are:

  * Latest Node 12 LTS release
  * Docker
  * Pre-commit

#### Pre-commit hooks

Developers should use [pre-commit](https://pre-commit.com) on this repository to validate file formatting and commit
messages on every commit. After pre-commit has been installed on your system, activate on the repository.

```bash
$ pre-commit install -t pre-commit -t commit-msg
```

### How to Build

Use the NPM scripts in the root `package.json` to install and build the complete project.

```bash
$ npm install --no-bin-links
```
Runs `npm install` on all Javascript packages.

```bash
$ npm run lint:js
```
Runs `eslint` on all Javascript files everywhere.

```bash
$ npm test
```
Runs Jest everywhere.

```bash
$ npm run build
```
Runs `npm run build` on all Javascript projects. This recompiles the package into its `dist` directory.

```bash
$ npm run build:docker
```
Same as `npm run build`, but builds the project in a Docker container to ensure strictly identical output across platforms.

#### Tips

  * Remember to always run `npm run build` before committing changes to packages.
    Failing to do so will not pass CI/CD checks.
  * If you've run `npm run build` and your build still fails, try `npm ci && npm run build`
  * If developing a package, run `jest` within that package instead of the root to only test your changes.
  * Do not add dependencies to the root package unless you are making global changes, for example to the build process.

### CI/CD Pipeline

The project is built with a [GitHub Actions pipeline](.github/workflows/commit.yml).
Every successful commit to `master` will

  * Be tagged to a semantic release version
  * Update the `v{MAJOR}` branch to point to the new release

## Versioning

The repository is versioned using a single semantic version. This means that all packages are always released and map
to the same version.

To follow [GitHub Actions version conventions](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
actions will always be accessible from a `v{MAJOR}` branch that points to the last release for that major version.
For example `v1` will point to `v1.1.2` after it has been released.

### Conventional Commits

The project is versioned with [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) conventions.

  * Make sure your commits to `master` always follow conventional commits
  * Always use squash and merge when merging to `master`

## License

This repository is released under the [MIT license](LICENSE).

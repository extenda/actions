# actions

This is a monorepo containing GitHub Actions by Extenda Retail. These actions provides reusable logic for
the fundamental parts of our CI/CD pipelines.

The following actions are available

  * [`actions/conventional-release`](conventional-release)
  * [`actions/maven`](maven)
  * [`actions/sonar-scanner`](sonar-scanner)

## Workflow Examples

The following workflows demonstrates the high-level usage of most actions.

### Maven Workflow

This workflow demonstrates how a Maven project can be built using two jobs.

  * Every commit triggers the `test` job
    * Run unit tests
    * Scan with Sonar
  * Every successful commit on `master` triggers the release job
    * Bump the version and create a release
    * Deploy to Nexus without running tests

```
name: Commit
on: push

env:
  NEXUS_USERNAME: maven-deployment
  NEXUS_PASSWORD: ${{ secrets.NEXUS_PASSWORD }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

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
        uses: extenda/actions/maven@master
        with:
          args: verify

      - name: Scan with SonarCloud
        uses: extenda/actions/sonar-scanner@master
        with:
          sonar-host: https://sonarcloud.io
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  release:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@master

      - name: Create release
        uses: extenda/actions/conventional-release@master
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
        uses: extenda/actions/maven@master
        with:
          args: deploy -DskipTests
          version: ${{ steps.release.outputs.version }}
``` 

## Development

The repository is a monorepo consisting of multiple packages. There are some dependencies between packages. Primarily

  * All actions depend on common functions from [`utils`](utils)
  * Cross-cutting actions like [`actions/sonar-scanner`](sonar-scanner) depends on other actions
  
Javascript actions are compiled into a single javascript files using [`@zeit/ncc`](https://www.npmjs.com/package/@zeit/ncc) 
to avoid committing `node_modules` into source control. This is required because GitHub Actions does not run `npm install` 
before running actions.

To make it easier to work with the repository and to recompile the distribution files we use a `Makefile`.

```bash
$ make install
```
Runs `npm install` on all Javascript packages.

```bash
$ make lint
```
Runs `npm run lint:js` on all Javascript packages.

```bash
$ make test
```
Runs `npm test` on all Javascript packages.

```bash
$ make build
```
Runs `npm run build` on all Javascript projects. This recompiles the package into its `dist` directory.

Remember to always run `make build` before committing changes to packages. Failing to do so will not pass CI/CD checks.

## Versioning

The repository is versioned using a single semantic version. This means that all packages are always released and map 
to the same version.

To follow GitHub Actions conventions, the following applies

  * Major version tags always point to the latest release for given version, for example `v1` will point to `v1.1.2` 
    if that has been released
  * Releases are published from `releases/*` branches where one branch exists for every major version
  * The `master` branch always contains all changes

### Conventional Commits

The project is versioned with [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) conventions.

  * Make sure your commits to `master` always follow conventional commits
  * Always use squash and merge when merging to `master`
  
## CI/CD Pipeline

The project is built with a GitHub Actions pipeline. Every successful commit to `master` will

  * Be tagged to a semantic release version
  * Be merged into the matching release branch
  * Move the `v{MAJOR}` tag to point to the new release

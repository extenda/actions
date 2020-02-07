# actions

![](https://github.com/extenda/actions/workflows/Commit/badge.svg)

This is a monorepo containing GitHub Actions by Extenda Retail. These actions provides reusable logic for
the fundamental parts of our CI/CD pipelines.

The following actions are available

  * [`actions/conventional-release`](conventional-release#readme)
  * [`actions/conventional-version`](conventional-version#readme)
  * [`actions/docker`](docker#readme)
  * [`actions/gcp-secret-manager`](gcp-secret-manager#readme)
  * [`actions/maven`](maven#readme)
  * [`actions/rs-create-installerpkg`](rs-create-installerpkg#readme)
  * [`actions/setup-git`](setup-git#readme)
  * [`actions/setup-msbuild`](setup-msbuild#readme)
  * [`actions/setup-nuget-sources`](setup-nuget-sources#readme)
  * [`actions/sonar-scanner`](sonar-scanner#readme)

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

```yaml
name: Commit
on: push

env:
  NEXUS_USERNAME: maven-deployment
  NEXUS_PASSWORD: ${{ secrets.NEXUS_PASSWORD }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

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
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  release:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v1

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

## Development

The repository is a monorepo consisting of multiple packages. There are some dependencies between packages. Primarily

  * All actions depend on common functions from [`utils`](utils)
  * Cross-cutting actions like [`actions/sonar-scanner`](sonar-scanner) depends on other actions
  
Javascript actions are compiled into a single javascript files using [`@zeit/ncc`](https://www.npmjs.com/package/@zeit/ncc) 
to avoid committing `node_modules` into source control. This is required because GitHub Actions does not run `npm install` 
before running actions.

### Development Environment

Development tools needed are:

  * Latest Node 12 LTS release
  * Docker

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
  * If developing a package, run `jest` within that package instead of the root to only test your changes.
  * Do not add dependencies to the root package unless you are making global changes, for example to the build process.

### CI/CD Pipeline

The project is built with a [GitHub Actions pipeline](.github/workflows/commit.yml). Every successful commit to `
master` will

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

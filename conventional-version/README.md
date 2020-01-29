# conventional-version

This GitHub Action determines the semantical release of a project based on 
[conventional commits](https://conventionalcommits.org). The action will find the latest release tag and bump the 
version according to conventional commits.

## Usage

See [action.yml](action.yml).

Use the `outputs` of this action in subsequent build steps, for example to modify the version of project files prior 
to building a binary distribution.

### Secrets

No secrets. 
  
### Examples

#### Basic Usage

This example determines the version and then uses the `outputs` of the action to build the software project.

```yaml
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - uses: actions/setup-java@v1
        with:
          java-version: 11
      
      - name: generate build number
        uses: einaregilsson/build-number@v2
        id: buildnumber
        with:
          token: ${{ secrets.TOKEN }}

      - name: Determine version
        uses: extenda/actions/conventional-version@v0
        id: semver
        with:
          version-suffix: -SNAPSHOT
          build-number: ${{ steps.buildnumber.outputs.build_number }} #optional, needed by dev only
          sha-size: 7 #optional, defaults to 7

      - name: Print outputs from semver
        run: |
          echo ${{ steps.semver.outputs.version }} && \
          echo ${{ steps.semver.outputs.branch-name }} && \
          echo ${{ steps.semver.outputs.branch-name-friendly }} && \
          echo ${{ steps.semver.outputs.is-prerelease }} && \
          echo ${{ steps.semver.outputs.short-sha }} && \
          echo ${{ steps.semver.outputs.composed-version-string }}
      
      - name: Build project
        run: |
          ./gradlew build -Dproject.version=${{ steps.semver.outputs.version }}
```

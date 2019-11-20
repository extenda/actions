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

```
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - uses: actions/setup-java@v1
        with:
          java-version: 11

      - name: Determine version
        uses: extenda/actions/conventional-version@v0
        id: semver
        with:
          version-suffix: -SNAPSHOT

      - name: Build project
        run: |
          ./gradlew build -Dproject.version=${{ steps.semver.outputs.version }}
```

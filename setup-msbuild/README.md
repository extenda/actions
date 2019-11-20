# setup-msbuild

This GitHub Action sets up `MSBuild.exe` as a CLI tool for in use in actions by:
  
  * Optionally downloading and caching a version of `VSWhere.exe` to help find the latest `MSBuild.exe` on the machine
  * Adds the location of the `MSBuild.exe` to the `PATH`

This action is based on [Warren Buckley's](https://github.com/warrenbuckley) 
[setup-MSBuild](https://github.com/warrenbuckley/Setup-MSBuild) action and is a rewrite from Typescript to Javascript.

## Usage

See [action.yml](action.yml).

### Secrets

No secrets.

### Basic Usage

```yaml
on: push
jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@master

      - name: Setup MSBuild.exe
        uses: extenda/actions/setup-msbuild@v0

      - name: MSBuild
        working-directory: src
        run: msbuild MyProject.csproj
```

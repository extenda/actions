# run-rsinstallpackagebuilder

This GitHub Action generates RS installer package artifact.

## Usage

See [action.yml](action.yml).

### Basic Usage

This example installs NuGet and updates sources to use defined credentials.

```yaml
on: push
jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@master      

      - uses: actions/cache@v1
        with:
          path: ~/.nuget/packages
          key: nuget-cache
          restore-keys: nuget-cache

      - name: NuGet Restore
        run: nuget restore MyProject.sln
      
      - name: Build
        run: <build>
      
      - name: Create RS installer package
        uses: extenda/actions/run-rsinstallpackagebuilder@v0
        with:
          packageName: <package name>
          workingDir: <where to work from>
          outputDir: <where to store the package>
          sourcePaths: <where are the files you want to package>
          toolVersion: <eg. 1.0.0>
```

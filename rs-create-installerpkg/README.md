# rs-create-installerpkg

This GitHub Action generates a zipped RS installer package artifact. Installer packages will have the file extension pkg.zip
NEXUS_USERNAME and NEXUS_PASSWORD env needs to be set to be able to download the binary from Nexus.

Three different ways to build installer packages are available.

  * 'single' - Produce a single zipped installer package with the specified package name.
  * 'multiple' - Produces multiple 'single' zips for all subfolders in 'sourcePaths', where each subfolder result in a subfoldername.pkg.zip file.
  * 'singleflat' - Produce a single zipped installer package where all files found under 'sourcePaths' and 'sourceFilePaths'. All files will be directly under the root directory of the package.

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

      - name: Create installer package
        uses: extenda/actions/rs-create-installerpkg@v0
        with:
          builder-type: single
          tool-version: 1.0.0
          package-name: PackageName
          working-dir: .
          output-dir: installpackages
          source-paths: Project\bin\publish\bin
          source-filepaths: Project\SingleFile.txt
          search-filter: *.dll;*.exe
          package-version: ${{ steps.semver.outputs.version }}
          publish-package: true
          publish-root-url: https://repo.extendaretail.com/repository/raw-hosted/RS/
          branch-name-short: ${{ steps.semver.outputs.branch-name-short }}
        env:
          NEXUS_USERNAME: ${{ secrets.NEXUS_USERNAME }}
          NEXUS_PASSWORD: ${{ secrets.NEXUS_PASSWORD }}
```

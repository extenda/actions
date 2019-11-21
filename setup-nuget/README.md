# setup-nuget

This GitHub Action prepares NuGet for use with Extenda Retail's Nexus Repository Manager

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

  * `NUGET_USERNAME`: user for [repo.extendaretail.com](https://repo.extendaretail.com)
  * `NUGET_PASSWORD`: password for [repo.extendaretail.com](https://repo.extendaretail.com)
  * `NUGET_API_KEY`: NuGet API key for [repo.extendaretail.com](https://repo.extendaretail.com)

### Basic Usage

This example installs NuGet and updates sources to use defined credentials.

```yaml
on: push
jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@master

      - name: Setup NuGet
        uses: extenda/actions/setup-nuget@v0
        with:
          sources: |
            [{ 
              "name": "nuget.org", 
              "source": "https://repo.extendaretail.com/repository/nuget-group/",
              "auth": true
            },
            { 
              "name": "RS (Nexus)", 
              "source": "https://repo.extendaretail.com/repository/nuget-group/",
              "auth": true
            }]
        env:
          NUGET_USERNAME: ${{ secrets.NUGET_USERNAME }}
          NUGET_PASSWORD: ${{ secrets.NUGET_PASSWORD }}
          NUGET_API_KEY: ${{ secrets.NUGET_API_KEY }}

      - uses: actions/cache@v1
        with:
          path: ~/.nuget/packages
          key: nuget-cache
          restore-keys: nuget-cache

      - name: NuGet Restore
        run: nuget restore MyProject.sln
```

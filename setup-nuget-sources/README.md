# setup-nuget-sources

Configure NuGet.Config file by commenting out already existing sources with the same URL before adding it again with username, password, and API-key
Linux only supports clear-text passwords so make sure you use secrets to pass in the passwords.
This step requires that the 'nuget' command is available from earlier steps in the GitHub workflow. This can be achieved by using one of the two following methods:
 * Run 'sudo apt install nuget'.
 * Define a set using  'NuGet/setup-nuget@v1.0.2'.

## Usage

See [action.yml](action.yml).

### Basic Usage

This example installs NuGet and updates sources to use defined credentials.

```yaml
on: push
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            NEXUS_PASSWORD: nexus-password
            NEXUS_USERNAME: nexus-username
            NUGET_API_KEY: nuget-api-key

      - uses: actions/checkout@v1

      - name: Setup NuGet
        uses: NuGet/setup-nuget@v1.0.2
        with:
          nuget-version: 'latest'

      - name: Setup NuGet Sources
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
              "username": "${{ env.NUGET_USERNAME }}",
              "password": "${{ env.NUGET_PASSWORD }}",
              "apikey": "${{ env.NUGET_API_KEY }}"
            }]

      - uses: actions/cache@v1
        with:
          path: ~/.nuget/packages
          key: nuget-cache
          restore-keys: nuget-cache

      - name: NuGet Restore
        run: nuget restore MyProject.sln
```

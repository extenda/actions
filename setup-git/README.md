# setup-git

This GitHub Action configures Git with credentials so it can be used with ease from scripts to push to GitHub.

## Usage

See [action.yml](action.yml).

### Secrets

The following environment variables are required.

  * `GITHUB_TOKEN`: The GitHub Actions provided access token for the repository

### Basic Usage

```yaml
on: push
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure Git
        uses: extenda/actions/setup-git@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

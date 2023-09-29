# pact-tag-version

This is a composite GitHub Action to add a tag to a previously published pact. This action is
mainly intended for promoting a pact to production.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permissions to access secret payloads. Once created, the JSON key should be `base64` encoded and added as
secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

The following example shows how the action can be used to tag a pact version.

```yaml
on: push

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Pact release
        uses: extenda/actions/pact-tag-version@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          application-name: my-application-name
          release-tag: ${{ steps.release.outputs.release-tag }}
          release-version: ${{ steps.release.outputs.release-version }}
```

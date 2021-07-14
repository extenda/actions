# Authorization to hiiretail npm nexus registry

This is a GitHub Action to authorize to hiiretail npm nexus registry with NEXUS_USERNAME
and NEXUS_PASSWORD envs optionally fetching them from gcp-secret-manager.
It produces .npmrc file with auth data at specified location.

Note: only packages in @hiiretail scope are fetched from nexus registry, others are using default npm registry.

## Example

This example will auth to hiiretail npm nexus registry
using nexus auth credentials fetched from gcp-secret-manager.

```yaml
jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Auth to Nexus npm registry
        uses: extenda/actions/nexus-auth-npm@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}

      - name: Install dependencies
        run: npm ci

```

## Internal dependencies

This action depends on gcp-secret-manager action in this repo.

# Translations GitHub Action

Publishes a module's `default`-layer UI translations to the production Hii Retail
Translation Service. The default layer is the module's English file, so the
action publishes one `en-US.json` per module — a multi-module repo invokes it
once per module.

An unchanged file is not republished, because every publish stores a new file
version and invalidates every client's cached ETag.

> **Caveat:** the service has no per-layer read, so the unchanged check compares
> against the resolved read, which merges `managed` on top of `default`. A managed
> `en-US` override normally defeats the check and costs a harmless extra publish;
> in the narrow case where the managed layer alone equals this file, the publish
> is skipped while the `default` layer stays behind.

# Usage

See [action.yml](action.yml)

| Input                 | Required | Default         | Description                                                                |
| --------------------- | -------- | --------------- | -------------------------------------------------------------------------- |
| `service-account-key` | Yes      |                 | Service account key or WIF configuration used to authenticate against TRS. |
| `module-id`           | Yes      |                 | The module ID to publish translations for.                                 |
| `path`                | No       | `translations/` | Directory containing the `en-US.json` translation file.                    |
| `dry-run`             | No       | `false`         | If `true`, report whether a real run would publish or skip, without a PUT. |

When authenticating with workload identity federation, the calling workflow
must grant:

```yaml
permissions:
  id-token: write
```

# Translation file format

`<path>/en-US.json` is a flat map of translation keys:

```json
{
  "app.title": {
    "value": "Point of Sale",
    "description": "Application title shown in the header"
  },
  "app.greeting": {
    "value": "Hello, {name}",
    "description": "Greeting shown after sign-in",
    "parameters": ["name"]
  }
}
```

A file already wrapped in a top-level `entries` object is also accepted and
unwrapped before publishing.

# Action setup example

.github/workflows/translations.yml

```yaml
name: Translations
on:
  push:
    branches:
      - master
    paths:
      - translations/*.json

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - name: Publish translations
        uses: extenda/actions/translations@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          module-id: pos
          path: translations/ # default is `translations/`
```

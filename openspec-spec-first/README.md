# openspec-spec-first

Spec first for service repositories: a `feat` pull request must have its change in the OpenSpec store.

The Jira key in the scope of a `feat` pull request title, `feat(HICC-123): Summary`, must be the key of
exactly one group heading in a `tasks.md` of the store, either in an open change or in an archived one.

```markdown
## 1. my-service: Add the refund endpoint (HICC-123)
```

Rules:

  * Only `feat` titles are checked. `fix` and every other type pass, even with a key.
  * The key is the conventional commit scope `<project>-<number>`, case-insensitive. A `feat` title without it fails.
  * The key must match exactly one group heading. Zero or several fail.
  * The repo in the heading is compared with the name of the repository of the pull request. A mismatch is only a
    warning, since old headings may carry a service name.

The store is read through the GitHub API, there is no checkout of it. The tree of the store is read once and every
`tasks.md` below `openspec/changes/` is fetched, archived changes included.

The group heading rules, and the key pattern, are shared with [openspec-guard](../openspec-guard#readme), which
checks them when a change is proposed in the store.

## Usage

See [action.yml](action.yml).

The store is usually private. The `GITHUB_TOKEN` of a workflow cannot read another private repository, so create a
token that can read the store. The example uses a GitHub App token limited to `contents: read` on the store
repository.

The title goes into the action through its default, `github.event.pull_request.title`, which is passed as an
input and never interpolated into a script.

```yaml
name: spec-first
on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

permissions:
  contents: read

jobs:
  spec-first:
    runs-on: ubuntu-latest
    steps:
      - name: Create store read token
        id: app-token
        uses: actions/create-github-app-token@v3
        with:
          client-id: ${{ secrets.EXTENDA_BOT_APP_ID }}
          private-key: ${{ secrets.EXTENDA_BOT_PRIVATE_KEY }}
          owner: extenda
          repositories: experience-cardpayment-common
          permission-contents: read

      - uses: extenda/actions/openspec-spec-first@v0
        with:
          store: extenda/experience-cardpayment-common
          token: ${{ steps.app-token.outputs.token }}
```

The workflow does not need to check out the repository. The `edited` type re-runs the check when the title changes.

### Inputs

| Input       | Required | Description                                                                   |
|-------------|----------|-------------------------------------------------------------------------------|
| `store`     | yes      | The store repository as `owner/name`.                                         |
| `token`     | yes      | A token with `contents: read` on the store.                                   |
| `store-ref` | no       | Branch, tag or SHA of the store to read. Default is its default branch.       |
| `title`     | no       | The pull request title. Default is the title in the event.                    |
| `repo-name` | no       | The name of this repository. Default is the repository of the event.          |

### Outputs

| Output | Description                                                                  |
|--------|------------------------------------------------------------------------------|
| `key`  | The Jira key of a `feat` title, or an empty string when spec first does not apply. |

# openspec-guard

Keeps an approved OpenSpec change approved in an OpenSpec store.
Run it on every pull request of the store.

Once a change is on the base branch, its proposal PR has merged and the change is approved.
From then on:

  * The proposal, the design and the spec deltas of the change are frozen.
  * `tasks.md` of the change may only get boxes ticked, `[ ]` to `[x]`.
    Tasks are counted as OpenSpec 2.0.0 counts them: a `-`, `*` or `+` bullet or a numbered item (`1.` or `1)`), then `[ ]`, `[x]` or `[]`.
  * `openspec/specs/` and `openspec/changes/archive/` change only on a `chore/archive-<change>` branch, and only for that change.
    `openspec/config.yaml` is free.
  * An archive PR must equal what `openspec archive <change>` produces on the base branch, apart from ticks in the archived `tasks.md`.
    The action runs the OpenSpec CLI on the base to find out.
    Every archived task must be ticked.
    The check fails, and lists the files, when the archive writes files that `.gitignore` would hide.
    Exactly one new `archive/<date>-<change>` folder must come out on each side; folders that the base already has are ignored.
  * Everything below `openspec/` and `.openspec-store/` must be regular files, no symlinks or submodules.

A change that is not on the base branch yet is checked when it is proposed:

  * `tasks.md` groups are `## <n>. <repo>: <title> (<KEY>)`, numbered from 1.
    `<repo>` is a bare GitHub repo name, `^[A-Za-z0-9_][A-Za-z0-9._-]*$`.
    Only its shape is checked, PRs are linked to groups by the Jira key.
  * `<KEY>` is a Jira key.
    `(TBD)` is accepted only while the pull request is a draft.
    The draft state is read live from the API, since the event payload is replayed unchanged by a workflow re-run.
  * A key names one group.
    A proposal fails when a key is already the key of a group in another change of the base, open or archived, or when it is the key of two groups of its own `tasks.md`.
  * A group has at most 6 tasks, and a task outside a group is an error.
  * A capability folder under `specs/` starts with a service of the clan, or with the clan prefix.
    The store id is never a prefix of its own, whatever the clan prefix is: only a service of the clan that starts with it, such as `hiiconnect-router`, admits a name.
    A bare service name is not a capability name.
    The clan services are read from the **base** branch, never from the pull request, which could widen the list.
    The list is only loaded when the change has spec folders.

The action exits with an error, and never passes silently, when it cannot run: an unresolvable base ref, a shallow clone or a git error.

The spec first check of the service repositories, [openspec-spec-first](../openspec-spec-first#readme), shares the heading and key parsing with this action.

## Usage

See [action.yml](action.yml).

The action runs from the git toplevel, so a checkout `path:` works.
The checkout needs the history to compare with the base: `fetch-depth: 0`.
The job needs `pull-requests: read` to read the draft state.

```yaml
name: openspec-guard
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: read

jobs:
  openspec-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: extenda/actions/openspec-guard@v0.x.y # a release tag, see below
        with:
          clan-prefix: cardpayment-
```

Pin a release tag, not `@v0`.
`@v0` moves on every merge to this repository, so a new `@v0` could change the merge gate of the store without a pull request in the store.
A release tag makes every change of the gate a reviewed change in the store, and a shadow run compares a fixed version.
Replace `v0.x.y` with the latest release.

`ready_for_review` re-runs the check when a draft pull request is made ready, so `(TBD)` is caught.

### Store and clan settings

Nothing about a clan is hard-coded.

| Input              | Default                       | Description                                                            |
|--------------------|-------------------------------|------------------------------------------------------------------------|
| `clan-prefix`      | none                          | A spec name prefix besides the services, e.g. `cardpayment-`.          |
| `store-id`         | `id:` of `.openspec-store/store.yaml` on the base | The store id. A spec name never starts with it.    |
| `services-file`    | `.agent/discovered.md`        | The file on the base that lists the services of the clan.             |
| `services-heading` | `Other services in this clan` | The services are the `- name` bullets under the `### ` heading that contains this text. |
| `max-tasks`        | `6`                           | The most tasks one group may have.                                     |

### Other inputs

| Input             | Default                          | Description                                                      |
|-------------------|----------------------------------|------------------------------------------------------------------|
| `base-ref`        | `origin/<pull request base>`     | The ref to compare with.                                         |
| `head-ref`        | head branch of the pull request  | Only `chore/archive-<change>` branches may archive a change.    |
| `github-token`    | `${{ github.token }}`            | Reads the live draft state of the pull request.                 |
| `draft`           | live state from the API          | `true` lets groups say `(TBD)`.                                  |
| `openspec-command`| the pinned CLI, see below        | The OpenSpec command to run on archive branches.                |

### The OpenSpec CLI

Only archive branches need the OpenSpec CLI.
It is pinned to `@fission-ai/openspec@2.0.0`, with all transitive dependencies locked in [openspec-cli/package-lock.json](openspec-cli/package-lock.json).
The action installs it with `npm ci --ignore-scripts` from that folder, which fails when `package.json` and the lock disagree and skips install scripts.
It runs with the Node of the action, which satisfies OpenSpec's `>=22.12` requirement.

To upgrade, edit [openspec-cli/package.json](openspec-cli/package.json), run `npm install --package-lock-only --ignore-scripts` in that folder and commit both files.
Dependabot does not update this folder on purpose: an OpenSpec upgrade changes what an archive looks like and must be a deliberate change.
The GitHub dependency graph still scans `openspec-cli/package-lock.json`, so security alerts, and security update pull requests where enabled, still apply to it.

`openspec-command` replaces the pinned CLI, for example `npx @fission-ai/openspec@2.0.0`.
That does not lock the transitive dependencies.

### Moving from a copy of the script

A store that ran `scripts/openspec-guard.sh --ci` replaces the checkout, the Node setup, the CLI install and the draft step of its workflow with the one `uses:` step above.
The hook part of that script, the PreToolUse hook for Claude Code, is not part of this action.

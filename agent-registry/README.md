# agent-registry

Registers A2A agents, MCP servers, and skills into the [GCP Agent Registry](https://cloud.google.com/agent-registry) on every push to main. Only items whose files changed in the commit are processed — unchanged items are skipped.

## Workflow setup

Add this workflow to your repo (typically a `-common` repo that owns the registry definitions):

```yaml
# .github/workflows/agent-registry.yml
name: Agent Registry

on:
  push:
    branches: [main, master]
    paths: [agent-registry/**]
  pull_request:
    paths: [agent-registry/**]

permissions:
  contents: read
  id-token: write

jobs:
  register:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # required for changed-file detection

      - uses: extenda/actions/agent-registry@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          dry-run: ${{ github.event_name == 'pull_request' }}
```

On a **pull request** the action runs in dry-run mode — it prints what would happen without touching the registry. On **merge to main** it registers for real.

## Directory layout

```
agent-registry/
  agents/
    <agent-id>/
      agent.yaml          # required
      instructions.md     # optional — uploaded to GCS on merge
  mcp/
    <mcp-id>/
      mcp.yaml            # required
  skills/
    <skill-id>/
      SKILL.md            # required
```

Any directory prefixed with `example-` is ignored.

---

## Defining an agent

Create `agent-registry/agents/<agent-id>/agent.yaml`:

```yaml
displayName: My Agent
description: Does something useful.
url: https://my-agent.example.com

skills:
  - id: my-skill
    name: My Skill
    description: A short description of what the skill does.
    tags: [example, tag]
    examples:
      - An example prompt the agent handles

capabilities:
  streaming: true

interfaces:
  - protocolBinding: a2a
    url: https://my-agent.example.com/a2a

defaultInputModes: [text/plain]
defaultOutputModes: [text/plain]
```

| Field | Required | Description |
|-------|----------|-------------|
| `displayName` | no | Human-readable name. Defaults to the agent directory name. |
| `description` | no | Short description of what the agent does. |
| `url` | yes | Base URL where the agent is reachable. |
| `skills` | no | Skills this agent advertises. Each entry can be a plain string ID or an object with `id`, `name`, `description`, `tags`, `examples`. |
| `capabilities` | no | A2A capabilities object (e.g. `streaming: true`). |
| `interfaces` | no | Protocol bindings. Defaults `protocolBinding` to `a2a` if omitted. |
| `defaultInputModes` | no | Defaults to `[text/plain]`. |
| `defaultOutputModes` | no | Defaults to `[text/plain]`. |

### Agent versioning

The action reads the current version from the registry and bumps it automatically — **do not add a `version` field to `agent.yaml`**. Version format is `major.minor` (`0.1`, `0.2`, `1.0`).

- Default branch → minor bump (`0.1` → `0.2`)
- Branch named `breaking/*` or `major/*` → major bump (`0.3` → `1.0`)

### Agent instructions

If `agent-registry/agents/<agent-id>/instructions.md` exists it is uploaded to GCS at:

```
gs://extenda-agent-artifacts/agents/<agent-id>/<git-sha>/instructions.md
```

The GCS bucket (`extenda-agent-artifacts`) is fixed. How the agent uses this file is up to the agent implementation.

---

## Defining a skill

Create `agent-registry/skills/<skill-id>/SKILL.md` with a YAML frontmatter block:

```markdown
---
name: Fix Failing Dependabot PR
description: Fixes failing Dependabot PRs by identifying breaking changes and applying the minimal code fix needed to pass CI.
metadata:
  category: DeveloperTooling
---

# Fix Failing Dependabot PR

You are a dependency upgrade specialist...
(skill instructions follow)
```

| Frontmatter field | Required | Description |
|-------------------|----------|-------------|
| `name` | yes | Display name shown in the registry. |
| `description` | yes | Short description of what the skill does. |
| `metadata` | no | Arbitrary key/value pairs (e.g. `category`). |

The skill is registered as `private-<skill-id>` in the `eu` location. The entire `SKILL.md` file is zipped and uploaded as the skill payload.

### Skill versioning

Versions are tracked as revisions in the registry — **do not add a version to `SKILL.md`**. Version format is `v<major>-<minor>` (`v0-1`, `v0-2`, `v1-0`).

- Default branch → minor bump
- Branch named `breaking/*` or `major/*` → major bump

---

## Defining an MCP server

Create `agent-registry/mcp/<mcp-id>/mcp.yaml`:

```yaml
displayName: My MCP Server
description: Provides tools for X.
specType: tool-spec

spec:
  tools:
    - name: do-something
      description: Does something useful.

interfaces:
  - protocolBinding: JSONRPC
    url: https://my-mcp-server.retailsvc.com/mcp
```

| Field | Required | Description |
|-------|----------|-------------|
| `displayName` | no | Human-readable name. Defaults to the MCP directory name. |
| `description` | no | Short description. |
| `specType` | no | MCP spec type. Defaults to `tool-spec`. |
| `spec` | no | The MCP server spec content (tools, resources, etc.). |
| `interfaces` | no | Protocol bindings. Defaults `protocolBinding` to `JSONRPC`. |

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `service-account-key` | yes | — | GCP service account key for authentication. |
| `dry-run` | no | `false` | If `true`, print planned changes without modifying the registry. |

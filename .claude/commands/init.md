Run the **platform-orchestrator-setup** skill to initialise or refresh this repo's agent context.

Fetch and follow the skill now:

```bash
REVISION=$(gcloud alpha agent-registry skills describe private-platform-orchestrator-setup \
  --location=eu --project=extenda \
  --format="value(defaultRevision.basename())")
gcloud storage cat gs://extenda-agent-artifacts/skills/platform-orchestrator-setup/${REVISION}/SKILL.md
```

Follow every step in the skill. When complete, confirm that `.agent/Core.md` has been written.

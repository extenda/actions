#!/bin/bash
# tool-guardian.sh
# PreToolUse hook — deployed from agent-registry/config/hooks/ and synced to GCS by sync-claude-code-config.
# Intercepts Bash tool calls and blocks dangerous operations before they execute.
# Claude receives the exit message as context for why the action was blocked.
#
# Hook input (stdin): JSON with tool_name and tool_input fields.
# Exit 0 → allow. Non-zero exit → block.

input=$(cat)
command -v jq >/dev/null 2>&1 || { echo "tool-guardian: jq not found — blocking all Bash as a precaution" >&2; exit 1; }
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Block force push to any remote
if echo "$command" | grep -qE 'git push.*(--force|-f)'; then
  echo "Blocked: force push is not permitted. Open a PR or ask a human to perform this action." >&2
  exit 1
fi

# Block direct resets that discard work
if echo "$command" | grep -qE 'git reset --hard|git checkout -- \.|git restore \.'; then
  echo "Blocked: destructive git operations require explicit human confirmation." >&2
  exit 1
fi

# Block production database writes
if echo "$command" | grep -qiE '(psql|mysql|gcloud sql).*(prod|production).*(DROP|DELETE|TRUNCATE|ALTER)'; then
  echo "Blocked: direct production database writes are not permitted." >&2
  exit 1
fi

# Block destructive infrastructure without approval keywords
if echo "$command" | grep -qE 'terraform (destroy|apply).*-auto-approve'; then
  echo "Blocked: terraform destroy and auto-approved applies require human review." >&2
  exit 1
fi

# Block deletion of IAM bindings in production projects
if echo "$command" | grep -qE 'gcloud (projects|iam).*(remove-iam-policy|delete).*(prod|production)'; then
  echo "Blocked: production IAM changes require human approval." >&2
  exit 1
fi

exit 0

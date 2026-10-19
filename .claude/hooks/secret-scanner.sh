#!/bin/bash
# secret-scanner.sh
# PreToolUse hook — deployed from agent-registry/config/hooks/ and synced to GCS by sync-claude-code-config.
# Scans content written by Write and Edit tool calls for credentials and API keys.
# Alerts Claude so it can remove the secret before committing.
#
# Hook input (stdin): JSON with tool_name and tool_input fields.
# Exit 0 → allow (no secrets found).
# Exit 2 → block the write; stderr is fed back to Claude so it can remove the secret.
# (Exit 1 is a non-blocking error and would let the write through.)

input=$(cat)
command -v jq >/dev/null 2>&1 || { echo "secret-scanner: jq not found — blocking write as a precaution" >&2; exit 2; }
tool=$(echo "$input" | jq -r '.tool_name // ""')

# Only scan Write and Edit calls
if [[ "$tool" != "Write" && "$tool" != "Edit" ]]; then
  exit 0
fi

# Extract the content being written
content=$(echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // ""')

# Anthropic API keys
if echo "$content" | grep -qE 'sk-ant-[a-zA-Z0-9_-]{20,}'; then
  echo "Secret detected: Anthropic API key found in written content. Remove it before committing." >&2
  exit 2
fi

# GCP service account keys (JSON key files)
if echo "$content" | grep -qE '"private_key":[[:space:]]*"-----BEGIN (RSA )?PRIVATE KEY'; then
  echo "Secret detected: GCP service account private key found. Use Secret Manager instead." >&2
  exit 2
fi

# Generic high-entropy strings labelled as keys or secrets
if echo "$content" | grep -qiE '(api_key|api_secret|secret_key|access_token|auth_token)[[:space:]]*[:=][[:space:]]*["'"'"'][a-zA-Z0-9_-]{20,}'; then
  echo "Secret detected: possible API key or token found in written content. Use Secret Manager or environment variables." >&2
  exit 2
fi

# GitHub personal access tokens
if echo "$content" | grep -qE 'gh[ps]_[a-zA-Z0-9]{36,}'; then
  echo "Secret detected: GitHub token found in written content." >&2
  exit 2
fi

exit 0

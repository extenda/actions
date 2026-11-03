#!/bin/bash
# ensure-pre-commit.sh
# SessionStart hook — deployed from agent-registry/config/hooks/ and synced to GCS by sync-claude-code-config.
# Installs the repository's pre-commit git hooks (pre-commit and commit-msg stages) when the
# repository has a .pre-commit-config.yaml but the hooks are missing, so formatting and
# commitlint run on every commit Claude or a subagent makes.
#
# Stdout is added to Claude's context. Silent when the hooks are already installed,
# outside a git repository, or when the repository has no .pre-commit-config.yaml.
# Always exits 0: a missing hook must never block a session.

root=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -f "$root/.pre-commit-config.yaml" ] || exit 0
hooks=$(git -C "$root" rev-parse --path-format=absolute --git-path hooks)
grep -qs pre-commit "$hooks/pre-commit" && grep -qs pre-commit "$hooks/commit-msg" && exit 0

if command -v pre-commit >/dev/null 2>&1 &&
  (cd "$root" && pre-commit install --hook-type pre-commit --hook-type commit-msg) >/dev/null 2>&1; then
  echo "Installed the repository's pre-commit hooks (pre-commit, commit-msg). Never bypass them with --no-verify."
else
  echo "This repository has .pre-commit-config.yaml but its git hooks are not installed and could not be installed automatically. Tell the user to run: pre-commit install --hook-type pre-commit --hook-type commit-msg"
fi
exit 0

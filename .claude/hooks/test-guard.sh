#!/bin/bash
# test-guard.sh
# PreToolUse hook — deployed from agent-registry/config/hooks/ and synced to GCS by sync-claude-code-config.
# Keeps a failing test that was written for a bug fix intact: once its path is listed in
# .claude/locked-tests, Claude must make it pass by fixing the code, not by editing the test.
# Pairs with verify-on-stop.sh, which forces green builds and would otherwise make weakening a test
# the cheapest way to get green.
#
# Lock file: .claude/locked-tests at the git root (SessionStart never overwrites it). One entry per
# line: a repo-relative path or a bash glob (e.g. test/**/refund*.spec.ts). '#' comments and blank
# lines are ignored. Absent or empty means this hook does nothing.
# Workflow: write the failing test, confirm it fails for the expected reason, add it to the lock
# file, fix the code. verify-on-stop.sh removes the lock file automatically after a green verify
# run; the person can still remove entries manually at any time.
# Add-only: Claude (or the person) may ADD entries. Removing entries or the file is reserved for the
# person; Claude is blocked from it.
#
# Hook input (stdin): JSON with cwd, tool_name and tool_input fields.
# Handles Write, Edit, MultiEdit, NotebookEdit (path-based, reliable) and Bash (heuristic).
# The Bash check is a best-effort heuristic: it looks for a locked path plus a mutating command.
# It can be bypassed (e.g. python -c, node -e, editors, indirect paths). Code review is the fallback.
#
# Protected files: while a lock exists, the guard, the stop verifier, the verifier script and the
# project settings (which wire the hooks), plus verify-on-stop's state directory
# (claude-verify-on-stop under $TMPDIR, which holds the verifier attestations) cannot be written, edited, deleted, moved or chmod-ed by
# Claude. Otherwise deleting the guard (settings.json then no-ops on a missing script) or replacing
# .claude/verify.sh with `exit 0` would disable the lock or fake the green run that auto-unlocks it.
# This is a guard against accidental or casual tampering, not a sandbox.
#
# Exit 0 → allow. Exit 2 → block; stderr is fed back to Claude.
# Fails open (exit 0) when jq is missing, outside a git repository, with no lock file, or when
# CLAUDE_TEST_GUARD=0.

[ "${CLAUDE_TEST_GUARD:-1}" = "0" ] && exit 0
command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // ""')
cwd=$(printf '%s' "$input" | jq -r '.cwd // ""')
[ -n "$cwd" ] || cwd="${CLAUDE_PROJECT_DIR:-$PWD}"
root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || exit 0
root=$(cd "$root" 2>/dev/null && pwd -P) || exit 0
LOCK=".claude/locked-tests"
[ -f "$root/$LOCK" ] || exit 0

normalize() { sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | grep -v -e '^$' -e '^#'; }
entries=$(normalize <"$root/$LOCK")
[ -n "$entries" ] || exit 0

block() {
  echo "Blocked: $1 is locked by $LOCK (a failing test written for this fix). Fix the code, not the test. If the test itself is wrong, stop and ask the user to unlock it." >&2
  exit 2
}
block_lock() {
  echo "Blocked: $LOCK may only be extended, not shortened or removed. Only the user may unlock tests; stop and ask the user to unlock it." >&2
  exit 2
}

PROTECTED=".claude/hooks/test-guard.sh
.claude/hooks/verify-on-stop.sh
.claude/verify.sh
.claude/settings.json"

block_protected() {
  echo "Blocked: $1 is protected while tests are locked by $LOCK (it enforces or verifies the lock). Do not modify, move or delete it; stop and ask the user." >&2
  exit 2
}

# Succeeds when repo-relative path $1 is one of the protected files.
is_protected() {
  local e
  while IFS= read -r e; do
    [ "$1" = "$e" ] && return 0
  done <<EOF
$PROTECTED
EOF
  return 1
}

# Prints the repo-relative path of $1 (file or directory may not exist yet); returns 1 if outside the repo.
resolve() {
  local p=$1 dir base rest phys full
  case "$p" in /*) ;; *) p="$cwd/$p" ;; esac
  dir=$(dirname "$p")
  base=$(basename "$p")
  rest=$base
  while [ ! -d "$dir" ] && [ "$dir" != "/" ] && [ "$dir" != "." ]; do
    rest="$(basename "$dir")/$rest"
    dir=$(dirname "$dir")
  done
  phys=$(cd -P "$dir" 2>/dev/null && pwd -P) || return 1
  full="${phys%/}/$rest"
  case "$full" in
    "$root"/*) printf '%s\n' "${full#"$root"/}" ;;
    *) return 1 ;;
  esac
}

# Succeeds when repo-relative path $1 matches a lock entry (exact or glob).
is_locked() {
  local e
  while IFS= read -r e; do
    e=${e#./}
    # shellcheck disable=SC2053
    [[ "$1" == $e ]] && return 0
  done <<EOF
$entries
EOF
  return 1
}

# Succeeds when every lock entry line in $1 (old text) also appears in $2 (new text).
keeps_entries() {
  local old new line
  old=$(printf '%s\n' "$1" | normalize)
  new=$(printf '%s\n' "$2" | normalize)
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    printf '%s\n' "$new" | grep -Fxq -- "$line" || return 1
  done <<EOF
$old
EOF
  return 0
}

case "$tool" in
  Write | Edit | MultiEdit | NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // ""')
    [ -n "$path" ] || exit 0
    # verify-on-stop's per-session state and verifier attestations live outside the repository.
    case "$path" in */claude-verify-on-stop/*) block_protected "$path" ;; esac
    rel=$(resolve "$path") || exit 0
    is_protected "$rel" && block_protected "$rel"
    if [ "$rel" = "$LOCK" ]; then
      case "$tool" in
        Write)
          new=$(printf '%s' "$input" | jq -r '.tool_input.content // ""')
          keeps_entries "$entries" "$new" || block_lock
          ;;
        Edit)
          old=$(printf '%s' "$input" | jq -r '.tool_input.old_string // ""')
          new=$(printf '%s' "$input" | jq -r '.tool_input.new_string // ""')
          keeps_entries "$old" "$new" || block_lock
          ;;
        MultiEdit)
          n=$(printf '%s' "$input" | jq -r '(.tool_input.edits // []) | length')
          i=0
          while [ "$i" -lt "$n" ]; do
            old=$(printf '%s' "$input" | jq -r ".tool_input.edits[$i].old_string // \"\"")
            new=$(printf '%s' "$input" | jq -r ".tool_input.edits[$i].new_string // \"\"")
            keeps_entries "$old" "$new" || block_lock
            i=$((i + 1))
          done
          ;;
        *) block_lock ;;
      esac
      exit 0
    fi
    is_locked "$rel" && block "$rel"
    exit 0
    ;;
  Bash)
    command=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
    [ -n "$command" ] || exit 0

    # Mutating operations. $1 is the command text.
    mutates() {
      local c=$1
      # Ignore harmless redirects: 2>&1, >&2, >/dev/null
      c=$(printf '%s' "$c" | sed -E 's/[0-9]*>&[0-9-]+//g; s/&?[0-9]*>+[[:space:]]*\/dev\/null//g')
      printf '%s' "$c" | grep -Eq '(^|[^A-Za-z0-9_./-])(rm|mv|cp|truncate|dd|patch|tee|install)([^A-Za-z0-9_-]|$)' && return 0
      printf '%s' "$c" | grep -Eq '(sed|perl)[^|;&]*[[:space:]](-[A-Za-z]*i|--in-place)' && return 0
      printf '%s' "$c" | grep -Eq '>' && return 0
      printf '%s' "$c" | grep -Eq 'git[[:space:]]+(checkout|restore|rm|mv|stash)([^A-Za-z0-9_-]|$)' && return 0
      printf '%s' "$c" | grep -Eq 'git[[:space:]]+reset[^|;&]*--hard' && return 0
      return 1
    }

    # Mutating operations on a protected file. Redirects count only when they target it, so
    # `grep x .claude/verify.sh > /tmp/out` stays allowed.
    mutates_protected() {
      local c=$1
      c=$(printf '%s' "$c" | sed -E 's/[0-9]*>&[0-9-]+//g; s/&?[0-9]*>+[[:space:]]*\/dev\/null//g')
      printf '%s' "$c" | grep -Eq '(^|[^A-Za-z0-9_./-])(rm|mv|cp|truncate|dd|patch|tee|install|chmod|chown|ln)([^A-Za-z0-9_-]|$)' && return 0
      printf '%s' "$c" | grep -Eq '(sed|perl)[^|;&]*[[:space:]](-[A-Za-z]*i|--in-place)' && return 0
      printf '%s' "$c" | grep -Eq 'git[[:space:]]+(checkout|restore|rm|mv)([^A-Za-z0-9_-]|$)' && return 0
      printf '%s' "$c" | grep -Eq ">>?[[:space:]]*[\"']?[^[:space:];|&]*(test-guard\.sh|verify-on-stop\.sh|verify\.sh|\.claude/settings\.json|claude-verify-on-stop/)" && return 0
      return 1
    }

    ref_prot=""
    case "$command" in
      *claude-verify-on-stop*) mutates_protected "$command" && block_protected "claude-verify-on-stop state" ;;
    esac
    ref_test=""
    ref_lock=0
    tokens=$(printf '%s' "$command" | tr "$(printf ';|&()<>`"\047')" '\n' | tr -s '[:space:]' '\n')
    while IFS= read -r tok; do
      [ -n "$tok" ] || continue
      case "$tok" in -*) continue ;; esac
      t=${tok#./}
      case "$t" in /*) t=$(resolve "$t") || t="" ;; esac
      [ -n "$t" ] || continue
      if is_protected "$t"; then
        ref_prot=$t
        continue
      fi
      # Bare file name of a hook/verifier (e.g. after cd .claude/hooks)
      case "$(basename "$t")" in
        test-guard.sh | verify-on-stop.sh | verify.sh) ref_prot=$t; continue ;;
      esac
      if [ "$t" = "$LOCK" ] || [ "$(basename "$t")" = "locked-tests" ]; then
        ref_lock=1
        continue
      fi
      if is_locked "$t"; then
        ref_test=$t
        continue
      fi
      # Basename match against entries (bare file name used after cd, or a glob on file names)
      b=$(basename "$t")
      while IFS= read -r e; do
        eb=$(basename "${e#./}")
        # shellcheck disable=SC2053
        if [[ "$b" == $eb ]] && [[ "$b" != "*" ]]; then ref_test=$t; fi
      done <<EOF
$entries
EOF
    done <<EOF
$tokens
EOF

    if [ -n "$ref_prot" ] && mutates_protected "$command"; then
      block_protected "$ref_prot"
    fi
    if [ -n "$ref_test" ] && mutates "$command"; then
      block "$ref_test"
    fi
    if [ "$ref_lock" = 1 ]; then
      # A pure append (>> or tee -a) to the lock file is allowed; anything else mutating is not.
      stripped=$(printf '%s' "$command" | sed -E 's/>>/ /g; s/tee[[:space:]]+(-[A-Za-z]*a[A-Za-z]*|--append)/ /g')
      mutates "$stripped" && block_lock
    fi
    # Broad wipes of uncommitted work would also destroy locked tests.
    if printf '%s' "$command" | grep -Eq 'git[[:space:]]+(stash|clean)([^A-Za-z0-9_-]|$)|git[[:space:]]+reset[^|;&]*--hard|git[[:space:]]+(checkout|restore)[^|;&]*[[:space:]]\.([[:space:]]|$)'; then
      echo "Blocked: this git command can discard uncommitted work, including the tests locked by $LOCK. Ask the user to run it." >&2
      exit 2
    fi
    exit 0
    ;;
esac
exit 0

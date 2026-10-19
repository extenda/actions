#!/bin/bash
# verify-on-stop.sh
# Stop and SessionStart hook — deployed from agent-registry/config/hooks/ and synced to GCS by sync-claude-code-config.
# Gives Claude a feedback loop: Claude cannot finish a turn while the repository's build and tests fail.
# On Stop it runs the repo's verify command; on failure it blocks the stop and feeds the tail of the
# output back to Claude so it keeps iterating. With --baseline (SessionStart) it records the repo state
# at session start, so sessions that change nothing (Q&A) never trigger a build.
#
# Hook input (stdin): JSON with session_id, cwd and stop_hook_active fields.
# Exit 0 → allow Claude to stop (verification passed, skipped, or given up after the retry cap).
# Exit 2 → block the stop; stderr is fed back to Claude.
# Fails open (exit 0, silent) when jq is missing, outside a git repository, when no project is
# detected, or when CLAUDE_VERIFY_ON_STOP=0.
#
# Verify command, first match wins:
#   1. $CLAUDE_VERIFY_CMD
#   2. executable .claude/verify.sh in the repository (repo-owned, never overwritten by SessionStart)
#   3. auto-detect at the git root: Maven, Gradle, Node/TypeScript (npm/yarn/pnpm), .NET
#      Maven/Gradle run the fast unit-test phase only (`mvn test -T1C` (parallel, one thread per core) / `gradlew test`); integration
#      tests (failsafe, `verify`/`check`) are left to CI. Set CLAUDE_VERIFY_FULL=1 for the full
#      `verify` / `check`. For a custom fast+full split, use .claude/verify.sh.
# Auto-unlock: after an actual green verify run, if .claude/locked-tests lists entries (see
# test-guard.sh), the unlocked entries are removed from the file (the file itself when none are
# left) and a systemMessage lists them. Never done when verification was skipped, given up, or not
# run.
#   - Built-in runners (item 3 above) run the whole suite, so green unlocks every entry. Gap:
#     excluding a locked test via build config is not guarded.
#   - Custom verifiers (items 1 and 2) are opaque, so exit 0 alone unlocks nothing. The verifier
#     must attest what it ran: it appends each locked entry (exactly as written in locked-tests)
#     that it executed and that passed, one per line, to the file named by $CLAUDE_VERIFY_ATTEST_FILE.
#     Only attested entries are unlocked; the rest stay locked and the systemMessage says which.
#     While entries stay locked the run is not cached as green, so the next Stop runs the verifier again.
#     The attest file is created fresh for every run outside the repository, so the agent cannot
#     pre-write it; .claude/verify.sh is protected by test-guard.sh while tests are locked.
#     Residual risk: a verifier that attests without running the tests (or a CLAUDE_VERIFY_CMD set
#     by the agent's own environment) is trusted.
# Knobs: CLAUDE_VERIFY_ON_STOP=0 (disable), CLAUDE_VERIFY_MAX_ATTEMPTS (default 3),
# CLAUDE_VERIFY_FULL=1 (Maven/Gradle: run integration tests too via verify/check).
# Fast mode (Maven/Gradle default) never auto-unlocks integration-test locks: entries matching
# *IT.java, *IT.kt, *ITCase.java, *IntegrationTest*, */it/*, */integration*/* (covers Gradle
# src/integrationTest/**) stay in .claude/locked-tests until a full run (CLAUDE_VERIFY_FULL=1) is
# green; unit-test entries are unlocked as usual. The green cache is per mode ("<fp>:fast" or
# "<fp>:full"): a full green satisfies a later fast check at the same fingerprint, not vice versa.

[ "${CLAUDE_VERIFY_ON_STOP:-1}" = "0" ] && exit 0
command -v jq >/dev/null 2>&1 || exit 0

MODE=stop
[ "$1" = "--baseline" ] && MODE=baseline

input=$(cat)
root=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --show-toplevel 2>/dev/null) || exit 0
sid=$(printf '%s' "$input" | jq -r '.session_id // "default"' 2>/dev/null | tr -c 'A-Za-z0-9_-' '_')
[ -n "$sid" ] || sid=default
state="${TMPDIR:-/tmp}/claude-verify-on-stop/$sid"
mkdir -p "$state" 2>/dev/null || exit 0

hash_stdin() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | cut -d' ' -f1; else sha256sum | cut -d' ' -f1; fi
}

# Paths that are not code; SessionStart rewrites some of them.
EXCLUDES=(':(exclude,glob).claude/**' ':(exclude,glob).agent/**' ':(exclude)CLAUDE.md' ':(exclude)AGENTS.md' ':(exclude,glob)**/*.md' ':(exclude,glob)openspec/**')

is_ignored() {
  case "$1" in
    .claude/* | .agent/* | CLAUDE.md | AGENTS.md | *.md | openspec/*) return 0 ;;
  esac
  return 1
}

# Prints the relevant untracked files (one per line).
untracked_files() {
  git -C "$root" ls-files -o --exclude-standard 2>/dev/null | while IFS= read -r f; do
    is_ignored "$f" || printf '%s\n' "$f"
  done
}

# Sets $fp (fingerprint of the repo state) and $dirty (1 when relevant uncommitted changes exist).
compute_state() {
  local head diffh untracked f
  head=$(git -C "$root" rev-parse HEAD 2>/dev/null)
  diffh=$(git -C "$root" diff HEAD -- . "${EXCLUDES[@]}" 2>/dev/null)
  untracked=$(untracked_files)
  dirty=0
  { [ -n "$diffh" ] || [ -n "$untracked" ]; } && dirty=1
  fp=$(
    {
      printf '%s\n%s\n' "$head" "$diffh"
      printf '%s\n' "$untracked" | while IFS= read -r f; do
        [ -n "$f" ] && [ -f "$root/$f" ] && printf '%s %s\n' "$f" "$(hash_stdin <"$root/$f")"
      done
    } | hash_stdin
  )
}

if [ "$MODE" = baseline ]; then
  compute_state
  rm -f "$state/failures" "$state/green" "$state/gaveup"
  printf '%s' "$fp" >"$state/baseline"
  exit 0
fi

compute_state
read_state() { [ -f "$state/$1" ] && cat "$state/$1"; }
baseline=$(read_state baseline)
if [ -n "$baseline" ]; then
  [ "$fp" = "$baseline" ] && exit 0
else
  [ "$dirty" = 1 ] || exit 0
fi
# fast=1: Maven/Gradle auto-detect without CLAUDE_VERIFY_FULL=1 (unit tests only).
fast=0
if [ -z "$CLAUDE_VERIFY_CMD" ] && [ ! -x "$root/.claude/verify.sh" ] && [ "${CLAUDE_VERIFY_FULL:-0}" != "1" ] &&
  { [ -f "$root/mvnw" ] || [ -f "$root/pom.xml" ] || [ -f "$root/gradlew" ]; }; then
  fast=1
fi
vmode=full
[ "$fast" = 1 ] && vmode=fast
green=$(read_state green)
[ "$green" = "$fp:full" ] && exit 0
[ "$fast" = 1 ] && [ "$green" = "$fp:fast" ] && exit 0
[ "$fp" = "$(read_state gaveup)" ] && exit 0

# Resolve the verify command: $cmd is what is executed, $label is what is shown.
cmd=""
label=""
custom=0 # 1 when the verify command is opaque and must attest the locked tests it ran
if [ -n "$CLAUDE_VERIFY_CMD" ]; then
  cmd="$CLAUDE_VERIFY_CMD"
  custom=1
elif [ -x "$root/.claude/verify.sh" ]; then
  cmd="./.claude/verify.sh"
  custom=1
elif [ -f "$root/mvnw" ]; then
  if [ "${CLAUDE_VERIFY_FULL:-0}" = "1" ]; then cmd="./mvnw -B -q verify"; else cmd="./mvnw -B -q test -T1C"; fi
elif [ -f "$root/pom.xml" ]; then
  if [ "${CLAUDE_VERIFY_FULL:-0}" = "1" ]; then cmd="mvn -B -q verify"; else cmd="mvn -B -q test -T1C"; fi
elif [ -f "$root/gradlew" ]; then
  if [ "${CLAUDE_VERIFY_FULL:-0}" = "1" ]; then cmd="./gradlew check"; else cmd="./gradlew test"; fi
elif [ -f "$root/package.json" ]; then
  if [ -f "$root/pnpm-lock.yaml" ]; then pm=pnpm; elif [ -f "$root/yarn.lock" ]; then pm=yarn; else pm=npm; fi
  steps=()
  for s in lint typecheck type-check build test; do
    body=$(jq -r --arg s "$s" '.scripts[$s] // empty' "$root/package.json" 2>/dev/null)
    [ -n "$body" ] || continue
    case "$body" in *"no test specified"*) continue ;; esac
    steps+=("$pm run $s")
  done
  if [ ${#steps[@]} -gt 0 ]; then
    label=""
    cmd=""
    for s in "${steps[@]}"; do
      label="${label:+$label && }$s"
      cmd="${cmd:+$cmd && }echo '==> $s' && $s"
    done
    export CI=true
  fi
else
  sln=$(cd "$root" && ls -1 ./*.sln 2>/dev/null | LC_ALL=C sort | head -n1)
  if [ -n "$sln" ]; then
    cmd="dotnet test --nologo \"$sln\""
    [ "$(cd "$root" && ls -1 ./*.sln | wc -l | tr -d ' ')" -gt 1 ] && echo "verify-on-stop: several .sln files found, using $sln" >&2
  elif ls "$root"/*.csproj >/dev/null 2>&1; then
    cmd="dotnet test --nologo"
  fi
fi
[ -n "$cmd" ] || exit 0
[ -n "$label" ] || label="$cmd"

max="${CLAUDE_VERIFY_MAX_ATTEMPTS:-3}"
case "$max" in '' | *[!0-9]*) max=3 ;; esac
failures=$(read_state failures)
case "$failures" in '' | *[!0-9]*) failures=0 ;; esac
attempt=$((failures + 1))

log="$state/last.log"
attest=$(mktemp "$state/attest.XXXXXX" 2>/dev/null) || attest=""
(cd "$root" && CLAUDE_VERIFY_ATTEST_FILE="$attest" bash -c "$cmd") >"$log" 2>&1 </dev/null
rc=$?

if [ $rc -eq 0 ]; then
  rm -f "$state/failures"
  printf '%s' "$fp:$vmode" >"$state/green"
  # Green: unlock the locked tests (see test-guard.sh) that provably passed. Built-in runners ran
  # the whole suite; custom verifiers must have attested the entries they ran.
  lock="$root/.claude/locked-tests"
  if [ -f "$lock" ]; then
    locked=$(sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' "$lock" | grep -v -e '^$' -e '^#')
    if [ -n "$locked" ]; then
      if [ "$custom" = 0 ] && [ "$fast" = 0 ]; then
        unlocked=$locked
        remaining=""
      elif [ "$custom" = 0 ]; then
        # Fast run: only unit tests ran, so integration-test entries stay locked.
        unlocked=""
        remaining=""
        while IFS= read -r e; do
          case "${e#./}" in
            *IT.java | *IT.kt | *ITCase.java | *IntegrationTest* | */it/* | it/* | */integration*/* | integration*/*)
              remaining="${remaining:+$remaining
}$e"
              ;;
            *)
              unlocked="${unlocked:+$unlocked
}$e"
              ;;
          esac
        done <<EOF
$locked
EOF
      else
        attested=""
        [ -n "$attest" ] && [ -f "$attest" ] && attested=$(sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' "$attest" | grep -v -e '^$' -e '^#')
        unlocked=""
        remaining=""
        while IFS= read -r e; do
          if [ -n "$attested" ] && printf '%s\n' "$attested" | grep -Fxq -- "$e"; then
            unlocked="${unlocked:+$unlocked
}$e"
          else
            remaining="${remaining:+$remaining
}$e"
          fi
        done <<EOF
$locked
EOF
      fi
      join() { printf '%s\n' "$1" | paste -sd, - | sed 's/,/, /g'; }
      # Entries still locked: do not cache this run as green, so the next Stop re-runs the verifier.
      [ -n "$remaining" ] && [ "$fast" = 0 ] && rm -f "$state/green"
      if [ "$fast" = 1 ] && [ "$custom" = 0 ]; then
        note="Still locked: the unit-test-only run did not exercise integration tests; set CLAUDE_VERIFY_FULL=1 to unlock them: "
      else
        note="Still locked, not attested by the verifier: "
      fi
      if [ -z "$remaining" ]; then
        rm -f "$lock" && jq -n --arg c "$label" --arg l "$(join "$unlocked")" \
          '{systemMessage: ("Verification passed (`" + $c + "`). Unlocked tests that now pass: " + $l)}'
      elif [ -n "$unlocked" ]; then
        tmp="$lock.tmp.$$"
        printf '%s\n' "$remaining" >"$tmp" && /bin/mv -f "$tmp" "$lock" &&
          jq -n --arg c "$label" --arg u "$(join "$unlocked")" --arg r "$(join "$remaining")" --arg n "$note" \
            '{systemMessage: ("Verification passed (`" + $c + "`). Unlocked: " + $u + ". " + $n + $r)}'
      elif [ "$fast" = 1 ] && [ "$custom" = 0 ]; then
        jq -n --arg c "$label" --arg r "$(join "$remaining")" \
          '{systemMessage: ("Verification passed (`" + $c + "`), but the unit-test-only run did not exercise integration tests, so they stay locked: " + $r + ". Set CLAUDE_VERIFY_FULL=1 to run them and unlock.")}'
      else
        jq -n --arg c "$label" --arg r "$(join "$remaining")" \
          '{systemMessage: ("Verification passed (`" + $c + "`), but the verifier did not attest that it ran the locked tests, so they stay locked: " + $r + ". A custom verifier must append each locked entry it ran and passed to $CLAUDE_VERIFY_ATTEST_FILE.")}'
      fi
    fi
  fi
  [ -n "$attest" ] && rm -f "$attest"
  exit 0
fi

[ -n "$attest" ] && rm -f "$attest"

if [ "$attempt" -ge "$max" ]; then
  rm -f "$state/failures"
  printf '%s' "$fp" >"$state/gaveup"
  msg="verify-on-stop: verification still fails after $max attempts ($label). Stopping anyway; the repository is not green."
  jq -n --arg m "$msg" '{systemMessage: $m}'
  exit 0
fi

printf '%s' "$attempt" >"$state/failures"
{
  echo "Verification failed: \`$label\` (attempt $attempt/$max). Fix the code, not the tests, then finish."
  [ -f "$root/.claude/locked-tests" ] && echo "Locked tests: see .claude/locked-tests (do not edit them)."
  echo
  tail -n 60 "$log"
} >&2
exit 2

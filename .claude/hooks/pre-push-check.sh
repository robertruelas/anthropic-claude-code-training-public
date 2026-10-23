#!/usr/bin/env bash
# PreToolUse hook for Bash: gate `git push` on the merchant console's tests and build.
#
# Reads the hook payload on stdin. Anything that is not a git push passes straight
# through. For a push, runs `npm test` then `npm run build` in the app; if either
# fails the push is blocked (exit 2) and stderr says which step failed and where
# its full output is.

set -uo pipefail

payload="$(cat)"
command="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"

# `git push`, `git -C dir push`, `git -c k=v push`, also after `&&`, `;` or `|`.
push_re='(^|[;&|({[:space:]])git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)*[[:space:]]+push([[:space:]]|$)'
if [[ -z "$command" ]] || ! grep -Eq "$push_re" <<<"$command"; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
app_dir="${PRE_PUSH_APP_DIR:-$project_dir/build-battle/merchant-console}"
log_dir="${TMPDIR:-/tmp}/claude-pre-push-check"
mkdir -p "$log_dir"

if [[ ! -f "$app_dir/package.json" ]]; then
  echo "pre-push check: no package.json in $app_dir; push blocked. Set PRE_PUSH_APP_DIR to the app folder." >&2
  exit 2
fi

# The build runs in a throwaway copy of the app so it never overwrites the .next
# folder a running `next dev` is serving from. node_modules is linked, not copied.
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/claude-pre-push-build.XXXXXX")"
trap 'rm -rf "$build_dir"' EXIT
rsync -a --exclude node_modules --exclude .next "$app_dir/" "$build_dir/"
ln -s "$app_dir/node_modules" "$build_dir/node_modules"

run_step() {
  local name="$1" dir="$2"; shift 2
  local log="$log_dir/$name.log"
  if ! (cd "$dir" && "$@") >"$log" 2>&1; then
    {
      echo "Push blocked: the $name step failed ($*, in $app_dir)."
      echo "Full output: $log"
      echo "See it with: cat \"$log\""
      echo "Last lines:"
      tail -n 15 "$log"
    } >&2
    exit 2
  fi
}

run_step tests "$app_dir" npm test
run_step build "$build_dir" npm run build

exit 0

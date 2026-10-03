#!/usr/bin/env bash
# PostToolUse hook: lint the file Claude just wrote or edited. ESLint errors go to stderr with
# exit code 2, which Claude Code feeds back to Claude so it can fix them right away.
set -u

file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
project="${CLAUDE_PROJECT_DIR:-$(pwd)}"

case "$file" in
  "$project"/node_modules/* | "$project"/.next/*) exit 0 ;;
  "$project"/*.ts | "$project"/*.tsx | "$project"/*.js | "$project"/*.mjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

cd "$project" || exit 0
if ! output=$(npx --no-install eslint --no-warn-ignored "$file" 2>&1); then
  echo "ESLint found problems in $file:" >&2
  echo "$output" >&2
  exit 2
fi

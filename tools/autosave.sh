#!/usr/bin/env bash
# Commits and pushes the working tree every N seconds (default 600) so agents and
# the orchestrator don't spend turns on git. Large render outputs are gitignored.
# Usage: tools/autosave.sh [interval_seconds] &
cd "$(dirname "$0")/.." || exit 1
INTERVAL="${1:-600}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
while true; do
  if [ -n "$(git status --porcelain)" ]; then
    git add -A >/dev/null 2>&1
    git commit -q -m "Autosave: work in progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PmrnuMV8vDh6fYoKG3XG6d" >/dev/null 2>&1
    for d in 2 4 8 16; do git push -q -u origin "$BRANCH" >/dev/null 2>&1 && break; sleep "$d"; done
  fi
  sleep "$INTERVAL"
done

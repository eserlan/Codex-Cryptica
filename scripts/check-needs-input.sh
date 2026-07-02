#!/bin/bash
# Cheap gate for the resume-review agent flow. Meant to run frequently (e.g.
# every 5 min via cron) at near-zero cost: it only checks GitHub for new
# comments on `needs-input` PRs and escalates to a full `claude -p
# "/resume-review"` invocation when there's actually something to act on.
#
# State: a JSON map of PR number -> last-seen top-level comment ID, so we
# only escalate once per new comment instead of on every tick.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$REPO_DIR/.claude/state"
STATE_FILE="$STATE_DIR/resume-review-last-seen.json"
LOG_FILE="${RESUME_REVIEW_LOG:-$HOME/.claude/logs/resume-review-cron.log}"

mkdir -p "$STATE_DIR" "$(dirname "$LOG_FILE")"
[ -f "$STATE_FILE" ] || echo '{}' > "$STATE_FILE"

# gh CLI auth breaks under a stray GITHUB_TOKEN env var in this environment.
unset GITHUB_TOKEN || true

cd "$REPO_DIR"

prs_json=$(gh pr list --label needs-input --state open --json number,comments 2>&1) || {
  echo "$(date -u +%FT%TZ) check-needs-input: gh pr list failed: $prs_json" >> "$LOG_FILE"
  exit 0
}

pr_numbers=$(echo "$prs_json" | jq -r '.[].number')

if [ -z "$pr_numbers" ]; then
  exit 0
fi

any_new=false

for pr in $pr_numbers; do
  latest_id=$(echo "$prs_json" | jq -r --argjson pr "$pr" '.[] | select(.number == $pr) | .comments | last | .id // empty')
  [ -z "$latest_id" ] && continue

  last_seen=$(jq -r --arg pr "$pr" '.[$pr] // empty' "$STATE_FILE")

  if [ "$latest_id" != "$last_seen" ]; then
    any_new=true
    echo "$(date -u +%FT%TZ) check-needs-input: new comment on PR #$pr (comment $latest_id)" >> "$LOG_FILE"
    jq --arg pr "$pr" --arg id "$latest_id" '.[$pr] = $id' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
  fi
done

if [ "$any_new" = true ]; then
  echo "$(date -u +%FT%TZ) check-needs-input: escalating to resume-review" >> "$LOG_FILE"
  claude -p "/resume-review" --dangerously-skip-permissions >> "$LOG_FILE" 2>&1
fi

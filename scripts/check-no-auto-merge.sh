#!/usr/bin/env bash
# This script ensures the auto-merge-staging.yml workflow is never reintroduced.
# It runs in CI to prevent accidental restoration of the auto-merge behavior.

set -euo pipefail

AUTO_MERGE_FILE=".github/workflows/auto-merge-staging.yml"

if [ -e "$AUTO_MERGE_FILE" ]; then
  echo "❌ FAIL: $AUTO_MERGE_FILE must not exist."
  echo ""
  echo "This workflow was removed to give maintainers manual control over merges."
  echo "See: https://github.com/eserlan/Codex-Cryptica/pull/583"
  exit 1
fi

echo "✅ PASS: No auto-merge-staging.yml workflow found."
exit 0

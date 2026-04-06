#!/bin/bash
# Discord Deployment Notification Script

TYPE=$1 # "staging" or "production"
WEBHOOK_URL=$2
PAGE_URL=$3

if [ -z "$WEBHOOK_URL" ]; then
  echo "Error: Missing Webhook URL"
  exit 1
fi

if [ "$TYPE" == "staging" ]; then
  EMOJI="🧪"
  TITLE="Staging Deployment Complete"
  DESCRIPTION="The latest changes have been deployed to the staging environment for verification."
elif [ "$TYPE" == "release" ]; then
  EMOJI="📦"
  TITLE="New Codex Release Available"
  DESCRIPTION="A new formal version of Codex Cryptica has been archived and is ready for download."
else
  EMOJI="🚀"
  TITLE="Production Deployment Complete"
  DESCRIPTION="The latest stable version has been deployed to production."
fi

# Get the latest meaningful commit (skip the automated version bumps)
REAL_COMMIT=$(git log --grep="chore(web): auto-bump" --invert-grep -n 1 --format="%H")

# Fallback: if no non-bump commit is found (e.g. shallow clone), use HEAD
if [ -z "$REAL_COMMIT" ]; then
  REAL_COMMIT=$(git rev-parse HEAD)
fi

REAL_HASH=$(git rev-parse --short "$REAL_COMMIT")
COMMIT_AUTHOR=$(git log -1 --pretty=%an "$REAL_COMMIT")

if [ "$TYPE" == "production" ]; then
  # Find the previous successful deployment commit using gh CLI
  LAST_SUCCESS_SHA=$(gh run list --workflow "Deploy to GitHub Pages" --branch main --status success --limit 1 --json headSha --jq '.[0].headSha' || echo "")
  
  if [ -n "$LAST_SUCCESS_SHA" ]; then
    # List meaningful changes since the last deployment
    RECENT_COMMITS=$(git log ${LAST_SUCCESS_SHA}..HEAD --no-merges --invert-grep --grep="chore(web): auto-bump" --pretty="- %s")
  else
    # Fallback if no previous run found
    RECENT_COMMITS=$(git log -5 --no-merges --invert-grep --grep="chore(web): auto-bump" --pretty="- %s")
  fi
  
  # If there are no commits (e.g. forced re-deploy), show a fallback message
  if [ -z "$RECENT_COMMITS" ]; then
    RECENT_COMMITS="- Maintenance re-deployment"
  fi

  # Truncate to ensure payload doesn't exceed Discord's 2000 char limit
  if [ ${#RECENT_COMMITS} -gt 1500 ]; then
    RECENT_COMMITS="${RECENT_COMMITS:0:1500}... [Truncated]"
  fi
  
  MESSAGE="${EMOJI} **${TITLE}**

**Environment:** ${TYPE}
**URL:** ${PAGE_URL:-"https://codexcryptica.com/"}
**Triggered by:** \`${REAL_HASH}\` (**${COMMIT_AUTHOR}**)

**Updates Since Last Deployment:**
${RECENT_COMMITS}

${DESCRIPTION}"
else
  # For staging/release, just show the single commit message
  COMMIT_MSG=$(git log -1 --pretty=%s "$REAL_COMMIT")

  MESSAGE="${EMOJI} **${TITLE}**

**Environment:** ${TYPE}
**URL:** ${PAGE_URL:-"https://eserlan.github.io/Codex-Cryptica/"}
**Commit:** \`${REAL_HASH}\` by **${COMMIT_AUTHOR}**
**Message:** ${COMMIT_MSG}

${DESCRIPTION}"
fi

if [ "$TYPE" == "release" ]; then
  RELEASE_BODY=""

  if command -v gh >/dev/null 2>&1; then
    RELEASE_BODY=$(gh release view --json body --jq '.body' 2>/dev/null || true)
  fi

  if [ -n "$RELEASE_BODY" ]; then
    RELEASE_BODY=$(printf '%s' "$RELEASE_BODY" | sed '/^<!--/d' | sed '/^$/N;/^\n$/D')
    if [ ${#RELEASE_BODY} -gt 1600 ]; then
      RELEASE_BODY="${RELEASE_BODY:0:1600}... [Truncated]"
    fi

    MESSAGE="${EMOJI} **${TITLE}**

**Environment:** ${TYPE}
**URL:** ${PAGE_URL:-"https://github.com/${GITHUB_REPOSITORY:-eserlan/Codex-Cryptica}/releases/latest"}
**Triggered by:** \`${REAL_HASH}\` (**${COMMIT_AUTHOR}**)

**Release Notes:**
${RELEASE_BODY}

${DESCRIPTION}"
  fi
fi

# Use jq -c to safely construct compact JSON payload
PAYLOAD=$(jq -nc --arg content "$MESSAGE" '{content: $content}')

curl -s -H "Content-Type: application/json" \
     -X POST \
     --data-binary "$PAYLOAD" \
     "$WEBHOOK_URL"

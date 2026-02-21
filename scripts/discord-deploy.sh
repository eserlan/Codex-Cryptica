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
else
  EMOJI="🚀"
  TITLE="Production Deployment Complete"
  DESCRIPTION="The latest stable version has been deployed to production."
fi

COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)

MESSAGE="${EMOJI} **${TITLE}**

**Environment:** ${TYPE}
**URL:** ${PAGE_URL:-"https://eserlan.github.io/Codex-Cryptica/"}
**Commit:** `${COMMIT_HASH}` by **${COMMIT_AUTHOR}**
**Message:** ${COMMIT_MSG}

${DESCRIPTION}"

# Use jq -c to safely construct compact JSON payload
PAYLOAD=$(jq -nc --arg content "$MESSAGE" '{content: $content}')

curl -s -H "Content-Type: application/json" 
     -X POST 
     --data-binary "$PAYLOAD" 
     "$WEBHOOK_URL"

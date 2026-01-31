#!/bin/bash
# Discord Notification Script for Gemini CLI

WEBHOOK_URL="https://discord.com/api/webhooks/1467138976627298337/7TRjwaA6otrA4Q48EChhTymFuLrs47C6okgeSIshDNEtXQWYIcsoaosGLEin8dnJxK6j"
CLI_SESSION_ID="${GEMINI_SESSION_ID:-unknown_session}"

# Read event data from stdin if available
if [ ! -t 0 ]; then
  EVENT_DATA=$(cat)
  REASON=$(echo "$EVENT_DATA" | jq -r '.reason // "no reason provided"')
  MESSAGE="🚀 **Gemini CLI Session Ended**
**Session ID:** 
${CLI_SESSION_ID}
**Reason:** ${REASON}"
else
  # Manual execution or simple message
  MESSAGE="🔔 **Notification from Gemini CLI**
**Session ID:** 
${CLI_SESSION_ID}
**Content:** ${1:-"Task completed!"}"
fi

# Use jq -c to safely construct compact JSON payload
PAYLOAD=$(jq -nc --arg content "$MESSAGE" '{content: $content}')
echo "DEBUG: PAYLOAD=$PAYLOAD"

curl -H "Content-Type: application/json" \
     -X POST \
     -d "{\"content\": \"$MESSAGE\"}" \
     "$WEBHOOK_URL"

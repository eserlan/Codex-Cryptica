#!/bin/bash
# Discord PR Review Notification Script

WEBHOOK_URL=$1
PR_TITLE=$2
PR_URL=$3
REVIEW_STATE=$4
REVIEWER=$5
REVIEW_BODY=$6

if [ -z "$WEBHOOK_URL" ]; then
  echo "Error: Missing Webhook URL"
  exit 1
fi

# Define emoji and title based on review state
case "$REVIEW_STATE" in
  "approved")
    EMOJI="✅"
    TITLE="PR Approved by Copilot"
    COLOR=3066993 # Green
    ;;
  "changes_requested")
    EMOJI="❌"
    TITLE="Changes Requested by Copilot"
    COLOR=15158332 # Red
    ;;
  "commented")
    EMOJI="💬"
    TITLE="Copilot Review Comments"
    COLOR=3447003 # Blue
    ;;
  *)
    EMOJI="🔍"
    TITLE="Copilot PR Review Finished"
    COLOR=8421504 # Grey
    ;;
esac

# Construct the message
MESSAGE="${EMOJI} **${TITLE}**

**PR:** [${PR_TITLE}](${PR_URL})
**Reviewer:** ${REVIEWER}
**Status:** ${REVIEW_STATE^^}"

if [ -n "$REVIEW_BODY" ] && [ "$REVIEW_BODY" != "null" ]; then
  # Truncate body if too long
  TRUNCATED_BODY=$(echo "$REVIEW_BODY" | head -c 1000)
  if [ ${#REVIEW_BODY} -gt 1000 ]; then
    TRUNCATED_BODY="${TRUNCATED_BODY}..."
  fi
  MESSAGE="${MESSAGE}

**Comments:**
${TRUNCATED_BODY}"
fi

# Use jq -c to safely construct compact JSON payload
PAYLOAD=$(jq -nc --arg content "$MESSAGE" '{content: $content}')

curl -s -H "Content-Type: application/json" \
     -X POST \
     --data-binary "$PAYLOAD" \
     "$WEBHOOK_URL"

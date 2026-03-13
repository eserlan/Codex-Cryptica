#!/bin/bash
# Discord PR Review Notification Script

# Read from environment variables to avoid shell quoting issues
WEBHOOK_URL="${DISCORD_WEBHOOK_URL}"
PR_TITLE="${PR_TITLE}"
PR_URL="${PR_URL}"
REVIEW_STATE="${REVIEW_STATE}"
REVIEWER="${REVIEWER}"
REVIEW_BODY="${REVIEW_BODY}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "Error: Missing DISCORD_WEBHOOK_URL environment variable"
  exit 1
fi

# Define emoji and title based on review state
case "${REVIEW_STATE,,}" in # lowercase for matching
  "approved")
    EMOJI="✅"
    TITLE="PR Approved by Copilot"
    ;;
  "changes_requested")
    EMOJI="❌"
    TITLE="Changes Requested by Copilot"
    ;;
  "commented")
    EMOJI="💬"
    TITLE="Copilot Review Comments"
    ;;
  *)
    EMOJI="🔍"
    TITLE="Copilot PR Review Finished"
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

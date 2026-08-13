#!/bin/bash
# Discord Notification Script for Gemini CLI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  # Parse just the one key needed rather than `source`-ing the whole file —
  # this script can run unattended (cron), so treating .env as executable
  # shell is unnecessary risk for a single config value.
  DISCORD_WEBHOOK_URL=$(grep -E '^DISCORD_WEBHOOK_URL=' "$SCRIPT_DIR/.env" | tail -n1 | cut -d '=' -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//')
fi

if [ -z "$DISCORD_WEBHOOK_URL" ]; then
  echo "DISCORD_WEBHOOK_URL not set (check .env)" >&2
  exit 1
fi

WEBHOOK_URL="$DISCORD_WEBHOOK_URL"
CLI_SESSION_ID="${GEMINI_SESSION_ID:-unknown_session}"

# Read event data from stdin if available
if [ ! -t 0 ]; then
  EVENT_DATA=$(cat)
  
  # Check if it's a SessionEnd event
  SESSION_END_REASON=$(echo "$EVENT_DATA" | jq -r '.reason // empty')
  
  if [ -n "$SESSION_END_REASON" ]; then
    exit 0 # Silent exit for session end
  else
    # Check if it's an AfterAgent event (contains prompt and prompt_response)
    PROMPT=$(echo "$EVENT_DATA" | jq -r '.prompt // empty')
    RESPONSE=$(echo "$EVENT_DATA" | jq -r '.prompt_response // empty')
    
    # ONLY notify if the special speckit.implement marker is present
    if [[ "$PROMPT" == *"GEMINI_CMD: speckit.implement"* ]] || [[ "$RESPONSE" == *"GEMINI_CMD: speckit.implement"* ]]; then
      # Try to find the feature name from the implementation plan matching current branch
      BRANCH=$(git branch --show-current)
      FEATURE_NAME=$(grep -h "^# Implementation Plan:" "specs/${BRANCH}/plan.md" 2>/dev/null | head -n 1 | sed 's/# Implementation Plan: //')
      
      if [ -z "$FEATURE_NAME" ]; then
        FEATURE_NAME="Current Feature"
      fi

      # Extract Summary of Changes if present
      # Matches "### Summary of Changes" or "#### Summary of Changes" etc.
      # Stops at the next header starting with # or the end of the string
      SUMMARY=$(echo "$RESPONSE" | sed -n '/Summary of Changes/,/^[[:space:]]*#/p' | grep -v "Summary of Changes" | grep -v "^[[:space:]]*#" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      
      # If no explicit summary section, try to find the first bullet point list or just take the first few lines
      if [ -z "$SUMMARY" ]; then
        SUMMARY=$(echo "$RESPONSE" | grep -m 5 "^-" | head -n 5)
      fi

      if [ -n "$SUMMARY" ]; then
        DETAILS="\n\n**Changes:**\n${SUMMARY}"
      else
        DETAILS="\n\nThe implementation of **${FEATURE_NAME}** has finished. All systems are operational."
      fi

      MESSAGE="🚀 **Implementation Complete: ${FEATURE_NAME}**${DETAILS}"
      
      # Truncate if too long for Discord (2000 chars)
      if [ ${#MESSAGE} -gt 1900 ]; then
        MESSAGE="${MESSAGE:0:1890}..."
      fi
    else
      exit 0 # Silent exit for any other command
    fi
  fi
else
  # Manual execution or simple message from command line arg
  MESSAGE="🔔 **Gemini CLI Notification**
**Content:** ${1:-"Task completed!"}"
fi

# Use jq -c to safely construct compact JSON payload
PAYLOAD=$(jq -nc --arg content "$MESSAGE" '{content: $content}')

curl -s -H "Content-Type: application/json" \
     -X POST \
     --data-binary "$PAYLOAD" \
     "$WEBHOOK_URL"

#!/bin/bash
# Discord Notification Script for Gemini CLI

WEBHOOK_URL="https://discord.com/api/webhooks/1467279751629639709/UArTaoiq8E1qu-VM7XFPF866izX7mTg1t8VQeZ1JMG3hn1nZ7wy72UVW8CBYMNx88aFv"
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

      MESSAGE="🚀 **Implementation Complete: ${FEATURE_NAME}**

The implementation of **${FEATURE_NAME}** has finished. All systems are operational."
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

#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="$HOME/.config/codex-pr-review/webhook.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE does not exist yet. Set up RELEASE_COMMS_SECRET etc. first per docs/devops/release-comms-agent-setup.md." >&2
  exit 1
fi

# Remove any existing values for keys we're about to (re)write.
sed -i.bak \
  '/^X_ACCESS_TOKEN=/d;/^X_REFRESH_TOKEN=/d;/^X_CLIENT_ID=/d;/^X_CLIENT_SECRET=/d;/^X_ENV_FILE=/d;/^X_AUTO_PUBLISH=/d' \
  "$ENV_FILE"

read_hidden() {
  local prompt="$1"
  local var
  echo "$prompt (input hidden, never echoed):"
  read -r -s var
  echo
  echo "$var"
}

TOKEN_JSON="$(read_hidden "Paste the full JSON response from the token exchange curl")"

if [[ -z "$TOKEN_JSON" ]]; then
  echo "Error: empty input, aborting." >&2
  exit 1
fi

# Parsed via stdin (not argv) so the JSON never appears in `ps`.
X_ACCESS_TOKEN="$(printf '%s' "$TOKEN_JSON" | node -e '
  const body = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (!body.access_token) { console.error("missing access_token"); process.exit(1); }
  process.stdout.write(body.access_token);
')"
X_REFRESH_TOKEN="$(printf '%s' "$TOKEN_JSON" | node -e '
  const body = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (!body.refresh_token) { console.error("missing refresh_token"); process.exit(1); }
  process.stdout.write(body.refresh_token);
')"
unset TOKEN_JSON

X_CLIENT_ID="$(read_hidden "Paste the X app's OAuth 2.0 Client ID")"
X_CLIENT_SECRET="$(read_hidden "Paste the X app's OAuth 2.0 Client Secret")"

if [[ -z "$X_ACCESS_TOKEN" || -z "$X_REFRESH_TOKEN" || -z "$X_CLIENT_ID" || -z "$X_CLIENT_SECRET" ]]; then
  echo "Error: could not parse access_token/refresh_token from the pasted JSON, or client ID/secret were empty. Aborting." >&2
  exit 1
fi

{
  echo "X_ACCESS_TOKEN=${X_ACCESS_TOKEN}"
  echo "X_REFRESH_TOKEN=${X_REFRESH_TOKEN}"
  echo "X_CLIENT_ID=${X_CLIENT_ID}"
  echo "X_CLIENT_SECRET=${X_CLIENT_SECRET}"
  echo "X_ENV_FILE=${ENV_FILE}"
  echo "X_AUTO_PUBLISH=1"
} >> "$ENV_FILE"

chmod 600 "$ENV_FILE"
unset X_ACCESS_TOKEN X_REFRESH_TOKEN X_CLIENT_ID X_CLIENT_SECRET

echo "Wrote X publisher credentials to $ENV_FILE (mode 600)."
echo "X_ENV_FILE points the service at its own env file so refreshed tokens persist across restarts."
echo "Restarting codex-pr-review-webhook.service..."
systemctl --user restart codex-pr-review-webhook.service

echo "Checking health endpoint..."
curl -fsS https://pr-webhook.codexcryptica.com/health || echo "Health check failed — check 'systemctl --user status codex-pr-review-webhook.service'"

echo "Done."

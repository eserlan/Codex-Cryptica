#!/usr/bin/env bash
set -euo pipefail

SYSTEMD_DIR="${HOME}/.config/systemd/user"
mkdir -p "${SYSTEMD_DIR}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp "${SCRIPT_DIR}/codex-degodify.service" "${SYSTEMD_DIR}/"
cp "${SCRIPT_DIR}/codex-degodify.timer" "${SYSTEMD_DIR}/"

systemctl --user daemon-reload
systemctl --user enable --now codex-degodify.timer

echo "✅ Installed and activated codex-degodify.timer"
systemctl --user list-timers --all | grep codex-degodify || true

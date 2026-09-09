# Local PR review webhook setup

The PR review fixer currently runs from Espen's Omarchy PC rather than from a
hosted worker.

## Traffic path

```text
GitHub webhook
  -> https://pr-webhook.codexcryptica.com/github
  -> Cloudflare Tunnel: codex-pr-review
  -> 127.0.0.1:8788
  -> scripts/pr-check-fix.ts
```

The Cloudflare DNS route and tunnel belong to the `codexcryptica.com` zone.
The tunnel credentials remain in the user's Cloudflare directory and must not
be committed.

## Services

Both processes run as enabled systemd user services, so no terminal needs to
remain open:

- `codex-pr-review-webhook.service` runs the Bun listener from the repository.
- `codex-pr-review-tunnel.service` runs `cloudflared` and requires the listener.

Their local definitions are:

```text
~/.config/systemd/user/codex-pr-review-webhook.service
~/.config/systemd/user/codex-pr-review-tunnel.service
```

The listener environment file is private and contains the GitHub webhook
secret:

```text
~/.config/codex-pr-review/webhook.env
```

It must stay mode `600`. The secret is shared only with the GitHub repository
webhook configuration and is not stored in this repository.

## Checking the setup

```sh
systemctl --user status codex-pr-review-webhook.service
systemctl --user status codex-pr-review-tunnel.service
curl -fsS https://pr-webhook.codexcryptica.com/health
journalctl --user -u codex-pr-review-webhook.service -f
journalctl --user -u codex-pr-review-tunnel.service -f
# List durable per-run fixer logs
ls -lt ~/.local/state/codex-pr-review/
# Follow the latest fixer log
tail -f ~/.local/state/codex-pr-review/pr-<number>-<run-id>.log
```

The health endpoint should return JSON containing `ok: true`. The tunnel must
be running before GitHub can deliver events. The PC must be awake and online;
a future scheduled poller can recover events missed while it is unavailable.

Each fixer run also writes the agent's stdout and stderr to a durable log under
`~/.local/state/codex-pr-review/`. The systemd journal contains the same agent
output plus periodic heartbeat messages, so a quiet journal can be diagnosed by
checking the active process and its per-run log.

## Reinstalling the services

The checked-in examples are under `ops/systemd/`. After copying or changing a
unit:

```sh
systemctl --user daemon-reload
systemctl --user enable --now codex-pr-review-webhook.service
systemctl --user enable --now codex-pr-review-tunnel.service
```

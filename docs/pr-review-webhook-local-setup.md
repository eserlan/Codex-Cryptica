# Local PR review webhook setup

The PR review fixer, and the release communications evaluator (issue #2906),
currently run from Espen's Omarchy PC rather than from a hosted worker. Both
share the same Bun listener, port, and Cloudflare Tunnel — only the route
differs.

## Traffic path

```text
GitHub webhook
  -> https://pr-webhook.codexcryptica.com/github
  -> Cloudflare Tunnel: codex-pr-review
  -> 127.0.0.1:8788
  -> scripts/pr-check-fix.ts

promote-to-prod.yml (on successful production deploy)
  -> https://pr-webhook.codexcryptica.com/release-comms
  -> Cloudflare Tunnel: codex-pr-review
  -> 127.0.0.1:8788
  -> scripts/release-comms-agent.ts
```

`/release-comms` isn't a GitHub webhook payload, so it isn't verified with
`GITHUB_WEBHOOK_SECRET`/`X-Hub-Signature-256`. It's authenticated with a
separate shared secret instead: the caller (the GitHub Actions workflow)
sends it in an `X-Release-Comms-Secret` header, checked against
`RELEASE_COMMS_SECRET`. The workflow step that calls it always has
`continue-on-error: true` — a failure here can never affect, delay, or roll
back the production deploy that already happened before this step runs.

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
secret, plus the release-comms shared secret:

```text
~/.config/codex-pr-review/webhook.env
```

It must stay mode `600`. `GITHUB_WEBHOOK_SECRET` is shared only with the
GitHub repository webhook configuration; `RELEASE_COMMS_SECRET` is shared
only with the `RELEASE_COMMS_SECRET` GitHub Actions secret on this repo.
Neither is stored in this repository.

The same private environment file enables squash auto-merge with
`PR_AUTO_MERGE=true`. The listener persists handled feedback under
`~/.local/state/codex-pr-review/`, so a restart does not cause repeated fixes
for the same unchanged PR state. The release-comms evaluator persists its own
state (last evaluated production SHA, and evaluation history for dedup)
under `~/.local/state/codex-release-comms/state.json`, with per-run agent
logs alongside it as `~/.local/state/codex-release-comms/eval-<run-id>.log`.

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

For the release comms agent specifically: when a release is postworthy, a
second "writer" agent pass drafts channel-specific Bluesky/Discord/Reddit
copy (consulting `.claude/skills/bsky-note/SKILL.md` and
`.claude/skills/cc-announcer/SKILL.md` for voice/format rules), and the
evaluator verdict plus drafts are posted as one comment on
[issue #2906](https://github.com/eserlan/Codex-Cryptica/issues/2906),
matching the "Approve / Skip" template requested there. Nothing is
auto-published — actually posting still goes through the normal
`bsky-note`/`cc-announcer` workflows by hand, using the drafted text as a
starting point. This is deliberate: the point of this phase is to watch
whether the evaluator's and writer's judgment are sane over several real
deploys before wiring up an approval-triggered auto-publish path. To
dry-run the whole pass against a real past production promotion without
waiting for the next deploy:

```sh
bun run comms:evaluate <promote-to-prod run id>
```

## Reinstalling the services

The checked-in examples are under `ops/systemd/`. After copying or changing a
unit:

```sh
systemctl --user daemon-reload
systemctl --user enable --now codex-pr-review-webhook.service
systemctl --user enable --now codex-pr-review-tunnel.service
```

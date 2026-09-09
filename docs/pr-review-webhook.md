# Local PR review webhook

The local listener receives GitHub pull request events through the named
Cloudflare Tunnel `codex-pr-review`:

```text
https://pr-webhook.codexcryptica.com/github
    -> http://127.0.0.1:8788/github
```

It verifies `X-Hub-Signature-256`, accepts only review and completed-check
events for `eserlan/Codex-Cryptica`, and starts one local
`scripts/pr-check-fix.ts` process per pull request. The fixer remains
responsible for checking out an isolated worktree and pushing changes.

## Local configuration

Create `~/.config/codex-pr-review/webhook.env` with mode `600`:

```sh
GITHUB_WEBHOOK_SECRET=replace-with-the-github-webhook-secret
GITHUB_REPOSITORY=eserlan/Codex-Cryptica
PR_FIX_ROOT=/path/to/remotecc
PR_WEBHOOK_PORT=8788
```

In the repository settings, add a webhook with:

- Payload URL: `https://pr-webhook.codexcryptica.com/github`
- Content type: `application/json`
- Secret: the value of `GITHUB_WEBHOOK_SECRET`
- Events: pull request reviews, pull request review comments, pull requests,
  and check runs

The listener ignores pull requests targeting anything other than `staging`.

## Tunnel configuration

Copy `ops/cloudflared/codex-pr-review-config.yml.example` to
`~/.cloudflared/codex-pr-review.yml`, replacing `TUNNEL_ID` with the ID
returned by `cloudflared tunnel create` and using its credentials file.

Run the tunnel manually during initial testing:

```sh
cloudflared tunnel --config ~/.cloudflared/codex-pr-review.yml run codex-pr-review
```

## Run the listener

```sh
bun run pr:webhook
curl http://127.0.0.1:8788/health
```

The example systemd user unit can then be copied to
`~/.config/systemd/user/codex-pr-review-webhook.service` and enabled with:

```sh
systemctl --user daemon-reload
systemctl --user enable --now codex-pr-review-webhook.service
```

Keep the tunnel running as a separate user service. The machine must be awake
and connected for webhook delivery; a scheduled GitHub poller is still useful
as a recovery path for missed events.

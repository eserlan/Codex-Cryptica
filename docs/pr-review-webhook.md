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
# Explicit opt-in: only staging PRs that settle green may be squash auto-merged.
PR_AUTO_MERGE=true
```

In the repository settings, add a webhook with:

- Payload URL: `https://pr-webhook.codexcryptica.com/github`
- Content type: `application/json`
- Secret: the value of `GITHUB_WEBHOOK_SECRET`
- Events: pull request reviews, pull request review comments, pull requests,
  and check runs

The listener ignores pull requests targeting anything other than `staging`.
It keeps its handled-feedback state in
`~/.local/state/codex-pr-review/feedback-state.json`, so duplicate deliveries
and service restarts do not repeat an LLM fix for the same comment or failed
check.

When `PR_AUTO_MERGE=true`, the listener enables GitHub squash auto-merge only
after a fresh state check confirms that the PR targets `staging`, is mergeable,
is not a draft or changes-requested review, has no pending or failing checks,
and has no new actionable feedback. It waits 60 seconds after the final event
before making that request; GitHub branch protection remains the final gate.

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

## Fixer logs

Every PR fixer run gets a timestamped log in:

```text
~/.local/state/codex-pr-review/pr-<number>-<run-id>.log
```

The listener journal includes the agent output and emits a heartbeat every 30
seconds while the LLM or its checks are running:

```sh
journalctl --user -u codex-pr-review-webhook.service -f
ls -lt ~/.local/state/codex-pr-review/
tail -f ~/.local/state/codex-pr-review/pr-<number>-<run-id>.log
```

## Fixer safeguards

Before invoking an LLM, the fixer fetches the current `staging` branch and
merges it into its isolated PR worktree. If that merge conflicts, the agent
receives the exact paths and must resolve, test, commit, and push the merge
before it can continue. Failed GitHub Actions checks include a bounded
failed-job log excerpt in the fix prompt. A successful agent exit is not
enough to suppress feedback: the listener requires a pushed head change or
the originally actionable items to be observably resolved.

A push to `staging` performs a lightweight scan of open staging PRs and starts
the fixer only for PRs GitHub reports as conflicting. It does not otherwise
reprocess dormant PRs.

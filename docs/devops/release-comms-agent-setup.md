# Release Communications Agent — Omarchy PC setup and test checklist

Tracking issue: [#2906](https://github.com/eserlan/Codex-Cryptica/issues/2906).
Shipped in PRs [#2907](https://github.com/eserlan/Codex-Cryptica/pull/2907)
(evaluator), [#2908](https://github.com/eserlan/Codex-Cryptica/pull/2908)
(writer pass), and [#2911](https://github.com/eserlan/Codex-Cryptica/pull/2911)
(GitHub Discussions channel). This doc is the runbook for the one-time setup
this needed on Espen's Omarchy PC, and how to verify it actually works
before trusting it on a real production deploy.

Background reading: `docs/pr-review-webhook-local-setup.md` covers the
shared webhook listener/tunnel/systemd setup this agent reuses — read that
first if the traffic path (`promote-to-prod.yml` → `/release-comms` →
Cloudflare Tunnel → `scripts/release-comms-agent.ts`) is unfamiliar.

## 1. One-time setup on the Omarchy PC

- [ ] Pull the merged code: `cd` into the repo checkout the webhook service
      runs from (`WorkingDirectory` in
      `~/.config/systemd/user/codex-pr-review-webhook.service`, typically
      `~/dev/remotecc` per `ops/systemd/codex-pr-review-webhook.service.example`)
      and `git pull` on `staging` once #2907/#2908/#2911 are all merged.
- [ ] Generate a shared secret with `openssl rand -hex 32`.
- [ ] Add it to the local env file (`~/.config/codex-pr-review/webhook.env`,
      must stay mode `600`) as `RELEASE_COMMS_SECRET=<the value you generated>`.
- [ ] Add the exact same value as a GitHub Actions secret on the repo:
      `gh secret set RELEASE_COMMS_SECRET --repo eserlan/Codex-Cryptica`.
      The workflow step in `promote-to-prod.yml` and the listener both
      compare against this one secret.
- [ ] Restart the webhook service so it picks up the new code and env var:
      `systemctl --user restart codex-pr-review-webhook.service`.
- [ ] Confirm the new route is live: `curl -fsS https://pr-webhook.codexcryptica.com/health`
      should return JSON including `activeCommsJobs` (not just `activeJobs`).
- [ ] Check that `gh auth status` on this machine has the scopes this agent
      needs. It already comments on issues and lists PRs/runs (same as the
      existing PR-review automation), but posting to GitHub Discussions is
      new — verify with a real test post in step 2 below rather than
      assuming the scope is there.

## 2. Safe local dry runs (no webhook, no live secret needed)

These exercise the actual code paths without going through
`promote-to-prod.yml` or the Cloudflare Tunnel at all — good for checking
the evaluator's and writer's judgment before trusting a real deploy to it.

Pick a real past production promotion to evaluate against:

```sh
gh run list --workflow "Promote Staging to Production" --status success --limit 5 \
  --json databaseId,headSha,createdAt
```

Run the evaluator and writer directly against one of those run ids:

```sh
bun run comms:evaluate <promote-to-prod run id>
```

Watch `~/.local/state/codex-release-comms/eval-<run id>-evaluate.log` and
the matching `...-write.log` for the raw agent output, and confirm a
comment lands on [#2906](https://github.com/eserlan/Codex-Cryptica/issues/2906)
matching the "📣 Post suggested / Approve / Skip" template (or the "not
postworthy" summary, if that's the correct call). It remembers the last SHA
it evaluated in `~/.local/state/codex-release-comms/state.json` — delete or
rename that file between repeat test runs if you want to force it to
re-process the same SHA. Try this against two or three different past
promotions with genuinely different content (a postworthy one, a boring
one) to get a feel for whether the postworthy/importance calls are sane.

Dry-run the Discussions poster (no network call, just prints what it would
send). This needs [#2911](https://github.com/eserlan/Codex-Cryptica/pull/2911)
merged first — `post:discussion` doesn't exist on `staging` until then:

```sh
bun run post:discussion --dry-run --title "Test" --body "Test body"
```

Then do one real Discussions test post, since the dry run above never
touches the network:

```sh
bun run post:discussion --category "General" \
  --title "release-comms test post (safe to delete)" \
  --body "Testing gh auth scope for Discussions posting -- delete me."
```

Confirm it prints a discussion URL. If it fails with a permissions error,
`gh auth refresh` with the needed scope, or check whether the posting
account needs write access on the repo. Delete the test post afterwards
from the GitHub UI (Discussions → the post → "Delete discussion").

## 3. End-to-end webhook test (uses the real secret and tunnel)

Once the secret is set in both places (step 1) and the service has
restarted, fire the same request the workflow sends, by hand:

```sh
curl -fsS -m 10 -X POST https://pr-webhook.codexcryptica.com/release-comms \
  -H "X-Release-Comms-Secret: $RELEASE_COMMS_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"promoteRunId": "<a real promote-to-prod run id>"}'
```

Expect `{"accepted":true}` back immediately (the agent itself runs async in
the background). Tail the journal while that runs:

```sh
journalctl --user -u codex-pr-review-webhook.service -f
```

Look for `[webhook] started release-comms agent for promote run ...` and
its exit line, then confirm the comment landed on #2906, same as the local
dry run in step 2.

## 4. Watch it fire for real

Trigger `Promote Staging to Production` (manually, via the GitHub Actions
UI or `gh workflow run`, or just wait for the next real one) and confirm
the "Trigger Release Communications Agent" step is green regardless of
what the agent itself does — `continue-on-error: true` means a failure
here must never show up as a failed deploy — and that a comment appears on
#2906 shortly after.

## Bluesky auto-queueing (direct commit to staging)

Per feature (not per release), the evaluator can mark a feature
`bluesky_worthy`, and the writer drafts one standalone post for each. Those
drafts are queued automatically into `.social/bluesky-posts.md`'s "Drafted
(not yet posted)" section, and the agent commits and pushes that change
**directly to `staging`, unattended, no PR** — an isolated `git worktree`
is used so this never disturbs whatever branch state the main checkout is
in. This is the mechanism for the "post early and often" cadence: small
wins get queued as they ship, so `bsky-note`'s daily posting flow always
has fresh drafts to pull from instead of waiting for a big release.

Verify this works: after a postworthy run (local dry run or real), check
that `.social/bluesky-posts.md` on `origin/staging` actually gained a new
entry, and that the #2906 comment includes a commit URL rather than a
"could not auto-queue" error. If it fails, the most likely cause is push
access from this machine's `git`/SSH auth — the same auth already used for
other automation here should suffice, but confirm with a manual
`git push origin HEAD:staging` test from a throwaway worktree if needed.

## Known gaps (tracked separately, not blocking this checklist)

- No automated parsing of "approve"/"skip" replies on the #2906 comment
  yet — a human still decides on Discord/Reddit/GitHub Discussion posts,
  and still supplies a screenshot before posting any auto-queued Bluesky
  draft (the queue entry leaves the image/alt fields as `_TODO_`).
- Discord has a drafted channel but no publish script yet (only the
  existing deploy-notification webhooks exist, which are a different
  thing) — not yet filed as its own issue.
- Instagram: [#2909](https://github.com/eserlan/Codex-Cryptica/issues/2909).
- Facebook group: [#2910](https://github.com/eserlan/Codex-Cryptica/issues/2910).

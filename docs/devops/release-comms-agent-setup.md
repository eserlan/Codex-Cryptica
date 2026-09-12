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
- [ ] Add `INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`, and
      `INSTAGRAM_GRAPH_API_URL` to that same private environment file.
      The account must be a Meta-supported professional account connected to
      the relevant Facebook Page, and the token must be authorised for content
      publishing. If an installation opts out of automatic Instagram
      publishing, set `INSTAGRAM_AUTO_PUBLISH=0` in that same private
      environment file to skip Instagram publishing without failing releases.
- [ ] Create the dedicated Codex Cryptica X account, create an X developer app,
      and authorise it with that account (OAuth 2.0 Authorization Code + PKCE,
      `tweet.write users.read tweet.read offline.access` scopes). Add the
      resulting values to that same private environment file:
      `X_ACCESS_TOKEN`, `X_REFRESH_TOKEN`, `X_CLIENT_ID`, `X_CLIENT_SECRET`,
      and `X_ENV_FILE=<absolute path to this same webhook.env>`. The access
      token expires in ~2 hours; `release-comms-x.ts` refreshes it
      automatically on a 401 using the other three values and rewrites
      `X_ENV_FILE` in place so the new token survives a service restart. If
      any of `X_REFRESH_TOKEN`/`X_CLIENT_ID`/`X_CLIENT_SECRET` are missing,
      publishing just fails again after the token expires until someone
      re-authorises by hand. `scripts/setup-x-publisher.sh` automates writing
      all five values. X publishing stays inactive until `X_ACCESS_TOKEN` is
      present; set `X_AUTO_PUBLISH=0` to opt out after configuration.
- [ ] Restart the webhook service so it picks up the new code and environment:
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

Run the evaluator and writer directly against one of those run ids without
publishing anything. This uses a throwaway state file, records `dry-run://`
publication URLs, and skips the tracking-issue comment:

```sh
RELEASE_COMMS_DRY_RUN=1 \
RELEASE_COMMS_STATE_FILE="$(mktemp /tmp/release-comms-dry-state.XXXXXX.json)" \
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

The same dry-run setting reaches the agent's full publisher branch only when
the chosen release is postworthy. Use a known public-page promotion, or seed
a resumable draft in a throwaway state file when checking the publisher path.
The log must show both `[release-comms] published ... dry-run://...` lines and
`dry run: skipped tracking issue comment`; rerun it with the same state file
to confirm `already evaluated; skipping`.

Dry-run the Discussions poster directly (no network call, just prints what it
would send):

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

## Automated public-page publishing

For each promoted public answer, example, blog, landing page, newly
registered generator, or dedicated tool route, the evaluator decides whether
it warrants a short Bluesky post, a long-form GitHub Discussion, both, or
neither. Every draft includes the exact public-page URL. The agent rejects
invented URLs, missing image/alt text, unresolved placeholders, and Bluesky
copy over 300 characters rather than publishing a broken post.

When an item clears its channel's bar, it publishes immediately:

- Bluesky uses the page's verified R2 social image and records the returned
  post URL.
- GitHub Discussions publishes the long-form Markdown body with that same
  image and direct page link, then records its Discussion URL.
- Instagram publishes the exact resolved Bluesky caption with that same R2
  JPEG image, then records its Instagram permalink.

Each external URL is checkpointed in
`~/.local/state/codex-release-comms/state.json` before the next channel runs.
Replaying a partial failure resumes only the missing publication; it does not
duplicate a successful one. The tracking issue comment lists the drafts and
durable publication URLs.

The listener environment needs `BLUESKY_IDENTIFIER`, `BLUESKY_APP_PASSWORD`,
`INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`, and
`INSTAGRAM_GRAPH_API_URL` in addition to the webhook secrets. Keep the env
file mode `600`. GitHub Discussions uses the authenticated local `gh` session.

When a public page has no source social card, the agent first checks its
deterministic `https://assets.codexcryptica.com/og/<slug>.jpg` location. If it
is absent, it requests a 16:9 card from the deployed Oracle image endpoint,
converts it to JPEG, uploads it to R2 with the authenticated local Wrangler
session, and uses that card for the publication. Temporary image files are
removed immediately; generated assets are never committed to git. If image
generation or upload fails, publishing remains resumable and no text-only
post is sent.

## Other channels

Discord deployment and formal-release notifications are already posted by
GitHub Actions through `scripts/discord-deploy.sh`. The release-comms writer
also creates a Discord draft, but does not send a duplicate content-specific
deployment message.

### Automatic Instagram publishing

Every Bluesky-qualified item is also published to Instagram by the deploy
agent, using the exact same final caption and verified R2 social image. This
keeps the two posts aligned without asking the writer to invent a second
version. The agent checkpoints each permalink before continuing, so a Meta API
failure leaves the release resumable and retries only the missing post.

Configure the local, mode-`600` webhook environment with the connected
Instagram professional account ID, a Meta access token authorised for content
publishing, and the Graph API base URL configured for the current Meta app:

```sh
export INSTAGRAM_ACCOUNT_ID=<Instagram professional account ID>
export INSTAGRAM_ACCESS_TOKEN=<Meta access token>
export INSTAGRAM_GRAPH_API_URL=https://graph.facebook.com/v<your configured version>
```

The account must be a Meta-supported professional Instagram account connected
to the relevant Facebook Page. Confirm the current app permissions and API
version in Meta's dashboard before its first real post.

The release issue comment shows the exact final Bluesky caption and verified
R2 JPEG image URL for each qualifying draft, plus the published Instagram
permalink. First exercise the full release agent with `RELEASE_COMMS_DRY_RUN=1`
as described above; it never contacts Meta. The manual command remains useful
only for troubleshooting the Meta credentials without a release:

```sh
bun run post:instagram -- --dry-run \
  --image https://assets.codexcryptica.com/og/example.jpg \
  "The exact final Bluesky caption, unchanged"
```

For a troubleshooting post, remove `--dry-run` and copy one caption and image
URL from the release issue comment. Do not use it alongside the automatic
release agent for the same draft, or it will create a duplicate post.

### Automatic X publishing

X mirrors every final Bluesky post through X's official Create Post API. It
uses the exact resolved text, including the public-page URL and hashtags; it
does not create separate copy. Create a dedicated X account and an X developer
app, then complete OAuth 2 user authorisation for that account with permission
to create posts. Store the resulting user access token only in the mode-`600`
webhook environment file:

```sh
export X_ACCESS_TOKEN=<X OAuth 2 user access token>
# Optional: leave credentials installed but disable automatic posts.
export X_AUTO_PUBLISH=1
```

Leave `X_ACCESS_TOKEN` unset until the account and app are ready. The release
agent then logs a skip, rather than attempting an unauthorised request. For a
non-production endpoint during troubleshooting only, set `X_POST_URL` to an
absolute HTTPS URL; production defaults to `https://api.x.com/2/tweets`.

The Facebook group [#2910](https://github.com/eserlan/Codex-Cryptica/issues/2910)
remains a separate, unconfigured channel.

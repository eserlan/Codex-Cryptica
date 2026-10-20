# In-app reports: setup, triage and retention

In-app reports (the "Report a problem / Send feedback" form) become **private issues** in a GitHub repository that only the maintainer can read. This page covers how to set that up, how to triage reports, how to delete them, and how to respond to abuse. The design is in `specs/179-in-app-feedback/`.

## 1. Create the private triage repository

1. Create a **private** repository, for example `eserlan/codex-cryptica-feedback`. Keep it private; reports contain users' own words.
2. Create three labels: `report:problem`, `report:idea` and `report:other`.
3. Invite anyone who should triage reports as a collaborator. Nobody else gets access.

## 2. Create the intake token (create-only)

The worker needs a token that can only **create issues** in that one repository.

1. GitHub → Settings → Developer settings → Fine-grained personal access tokens → Generate.
2. Resource owner: you. Repository access: **Only select repositories** → the triage repository.
3. Repository permissions: **Issues: Read and write**. Nothing else.
4. Set an expiry and put a reminder in your calendar to rotate it.

Do **not** give this token the permission to delete issues. Deletion uses a separate credential (section 5).

## 3. Configure the worker

```sh
cd apps/workers/oracle-proxy
bunx wrangler secret put FEEDBACK_GITHUB_TOKEN   # the token from section 2
bunx wrangler secret put FEEDBACK_HASH_KEY       # any long random string, kept secret
```

Set the repository in `wrangler.toml` under `[vars]`:

```toml
FEEDBACK_GITHUB_REPO = "eserlan/codex-cryptica-feedback"
```

Until `FEEDBACK_GITHUB_REPO` is set, the endpoint refuses reports with a "misconfigured" response. It never claims success without a stored issue.

For local development, put the same three values in `apps/workers/oracle-proxy/.dev.vars`. That file is not committed.

## 4. Configure the R2 cleanup rule

The worker stores short-lived quota counters and duplicate-check markers under `feedback/` in the `codex-cryptica-statics` bucket. They hold no report text. Add an object lifecycle rule in the Cloudflare dashboard (R2 → the bucket → Object lifecycle rules): prefix `feedback/`, delete after **2 days**.

## 5. Triage

- Each report arrives as an issue titled `[Problem] CC-XXXX-XXXX`, `[Idea] …` or `[Other] …`, with the matching `report:*` label.
- The body shows the kind, reference, time received, app version, area, browser family and screen class, then the description and any contact email, each in a code block. Text inside a code block is shown as written and is not rendered as Markdown, links or images.
- Reply on the issue only if the reporter gave an email address, and reply by email, not on the issue.

### Turning a report into a public issue

Do this by hand. Never paste a raw report into a public tracker.

1. Write a short, sanitised summary in your own words: the problem, the steps, the area and the app version. Remove anything personal, any contact details and any text that quotes the user.
2. Open the public issue in `eserlan/Codex-Cryptica` with that summary.
3. Link the public issue from the private report, so the context is kept.

Two kinds of failure: GitHub refusing a report is definite, so nothing was created and a retry starts clean. A timeout or dropped connection is not: the issue may exist, so the worker keeps the submission marker and rejects retries as in progress while that marker exists. The marker expires after two days; a later retry can be treated as a new submission.

## 6. Delete a report on request

When a user quotes their reference, delete the report. Run this while logged in to `gh` as the maintainer:

```sh
FEEDBACK_REPO=eserlan/codex-cryptica-feedback bun scripts/feedback-delete.ts CC-7F3K-9Q2M
```

The script deletes the issue rather than closing it, and does nothing if there is no match or more than one. It needs admin rights on the repository, which your own login already has and the worker token does not.

## 7. Retention

Reports are deleted after **180 days** by a daily scheduled workflow in the private repository. The template is `docs/feedback-triage/purge-old-reports.yml`. Copy it into the private repository, add the secret `FEEDBACK_PURGE_TOKEN` (a maintainer token with admin rights on that repository only), and run it once with `dry_run` on to check its output before letting it delete.

## 8. Responding to spam or abuse

Reports are limited per source: 5 a minute, 5 an hour and 20 a day, keyed on a hashed address.

1. If spam gets through, first look at the `feedback.report` log lines. Their `outcome` and `kind` fields show volume without any report text.
2. Tighten the limits in `apps/workers/oracle-proxy/wrangler.toml` (`FEEDBACK_RATE_LIMITER`) and in `HOURLY_REPORT_LIMIT` / `DAILY_REPORT_LIMIT` in `apps/workers/oracle-proxy/src/feedback-reports.ts`.
3. If that is not enough, add the invisible Turnstile challenge that the copyright report form already uses (`apps/web/src/lib/services/publishing/turnstile.ts`) to the feedback submission. Remember that this makes the form fail for users whose blockers stop third-party scripts, so use it only when needed.
4. Close and delete obvious spam with section 6.

## 9. Usage metrics

The worker logs one line per request, for example `{"event":"feedback.report","outcome":"accepted","kind":"problem"}`. Outcomes are `accepted`, `duplicate`, `rejected`, `limited`, `unavailable` and `misconfigured`. The lines carry no text, no contact details, no reference and no address.

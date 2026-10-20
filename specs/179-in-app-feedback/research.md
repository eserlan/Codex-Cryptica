# Research: In-App Problem Reports and Feedback

Phase 0 decisions for [spec.md](./spec.md). Each entry records the decision, why, and what else was considered.

## R1. Triage destination: private GitHub repository issues

- **Decision**: The worker creates one issue per report in a private repository (for example `eserlan/codex-cryptica-feedback`) through the GitHub REST API (`POST /repos/{owner}/{repo}/issues`). It authenticates with a fine-grained personal access token scoped to that one repository with **Issues: read and write** only. The token is a Worker secret (`FEEDBACK_GITHUB_TOKEN`), and the repository is a Worker variable (`FEEDBACK_GITHUB_REPO`). Each issue carries one label per kind: `report:problem`, `report:idea` or `report:other`.
- **Rationale**: This was chosen in clarification (FR-021). Notifications, labels, search and the step to a public issue come with GitHub at no extra cost. A token limited to one repository and to issues keeps the damage small if it leaks.
- **Alternatives**: A GitHub App, which needs more setup and has no benefit for one maintainer. A classic PAT, which gives too wide access. Cloudflare-only storage, which was rejected in clarification.

## R2. Keeping report text inert in GitHub (FR-015, FR-023, Story 5)

- **Decision**:
  - The issue **title** contains no user text, only `[<Kind>] <reference>`, for example `[Problem] CC-7F3K-9Q2M`.
  - The **body** is built only from allowlisted values: kind, reference, received time, app version, area, browser family and screen class, all enum or pattern values from the contract, followed by the description and the optional email.
  - The description and email each sit in a fenced code block whose fence is one backtick longer than the longest run of backticks in that text, with a minimum of three. Inside a code block, GitHub renders no Markdown, HTML, images or links, and does not process `@mentions` or `#refs`.
  - Before storing, the text is normalised to NFC, and control and bidirectional-override characters are removed, keeping newline and tab.
- **Rationale**: GitHub renders issue bodies as Markdown. A code fence is the only way to show arbitrary text inert and with no remote fetches. A fence sized to the content cannot be closed early from inside.
- **Alternatives**: HTML-escaping, which doesn't stop Markdown links or images and still notifies mentions. Using `<pre>`, whose contents GitHub still partly processes.

## R3. Secret redaction (FR-015, SC-003)

- **Decision**: `redactSecrets(text)` in the new `feedback-engine` package replaces each match with `[removed: possible secret]`. It matches:
  - OpenAI-style `sk-…` keys
  - GitHub tokens (`ghp_`, `gho_`, `ghs_`, `ghu_`, `github_pat_`)
  - AWS access key IDs (`AKIA…`)
  - Google API keys (`AIza…`)
  - `Bearer <token>`
  - JWTs (three base64url segments)
  - PEM private key blocks
  - `password`, `passwd`, `pwd`, `secret`, `token` or `api key` written as `…: value` or `…= value`
  - long unbroken base64 or hex runs of 40 characters or more

  The worker applies it and is the authority. The form's disclosure tells the user that such text is removed. The set of patterns is a counterexample table in the tests, with flagged and unflagged rows including ordinary prose, dice formulas, URLs and UUIDs.

- **Rationale**: Users paste error output and config. Removing what is recognisable costs little, and the table guards against false positives such as `1d20+5`, or a UUID that someone might quote as a reference.
- **Alternatives**: Rejecting reports that contain secrets, which loses the report. Client-only redaction, which is not authoritative.

## R4. Rate limits: 5 per hour and 20 per day per source (FR-016)

- **Decision**:
  - The source key is an HMAC-SHA-256 of `CF-Connecting-IP`, keyed by a new secret `FEEDBACK_HASH_KEY`, as the template-report endpoint already does. The raw address is never stored or logged.
  - **Burst**: a new rate-limit binding, `FEEDBACK_RATE_LIMITER`, set to 5 per 60 seconds. The platform only supports 10- or 60-second periods.
  - **Hourly and daily caps**: R2 compare-and-set counters at `feedback/quota/hour/<yyyyMMddHH>/<hash>` (limit 5) and `feedback/quota/day/<yyyyMMdd>/<hash>` (limit 20). The quota helper from `entity-template-directory-report.ts` is extracted into a shared `r2-quota.ts`, so both endpoints use one tested implementation.
  - A slot is reserved after validation and **released if delivery to GitHub fails**, so a GitHub outage does not use up the user's retries.
  - An R2 lifecycle rule deletes `feedback/` objects after 2 days.
- **Rationale**: The binding alone cannot express hours or days. The repository already has a race-safe R2 counter, and reusing it avoids a second design.
- **Alternatives**: A D1 counter table, which adds schema for little gain. Cloudflare KV, which is eventually consistent, so concurrent requests could exceed the cap.

## R5. One report per submission (FR-017, SC-005)

- **Decision**:
  - The form gives each draft a `submissionId` (a UUID v4). It keeps that ID across retries and replaces it after a success, or when the user starts a new report.
  - The worker claims a marker at `feedback/submission/<hmac(submissionId)>` with `onlyIf: { etagDoesNotMatch: "*" }`. The marker records `{ state: "pending", at }`, and after delivery `{ state: "delivered", reference }`.
  - A repeat request whose marker is `delivered` gets the same reference with HTTP 200. One whose marker is `pending` gets `409 in_progress`, and the form retries after a short delay.
  - A `pending` marker continues to block retries while it exists. It is not re-claimed based on age because a timed-out request may already have created its GitHub issue.
  - The marker is deleted when the request is definitely refused: a quota refusal, or a non-2xx answer from GitHub. A timeout or dropped connection is an unknown outcome, so the marker and quota slot are kept. Markers contain no report text and expire with the 2-day lifecycle rule, which bounds this idempotency protection to two days.
- **Rationale**: A double click or a retry after a timeout must not create two issues. Searching GitHub for the reference before creating an issue would be slow, rate-limited and racy. A marker holding no content keeps the "no copy of the report" decision from clarification.
- **Alternatives**: Client-side guards only, which can't handle a timeout where the first request actually succeeded. The `Idempotency-Key` header semantics, which amount to the same thing with more ceremony.

## R6. Abuse checks without a challenge (FR-016)

- **Decision**:
  - Require an `Origin` header that is on the existing allowlist (`isOriginAllowed`), and refuse requests without one.
  - Require `Content-Type: application/json`, which forces a CORS preflight.
  - Include a hidden honeypot field, `website`, which must be empty. A filled honeypot gets the normal `400 invalid` response, never a fake success.
  - Bound the body at 16 KB before parsing.
  - Leave Turnstile out of this slice.
- **Rationale**: The spec forbids a mandatory challenge. The invisible Turnstile flow loads a third-party script and fails closed for users whose blockers stop it. The copyright form tolerates that; a "my app is broken" form should not. The rate limits already bound the volume. The spam procedure documents how to add the existing invisible Turnstile flow if abuse appears.
- **Alternatives**: Invisible Turnstile on submit (the existing pattern), deferred as above. A proof-of-work check, which is complexity without a demonstrated need.

## R7. Report reference (FR-008, FR-018)

- **Decision**: `CC-` followed by 8 random Crockford base32 characters (40 bits), shown as two groups of four, for example `CC-7F3K-9Q2M`. It is generated on the worker with `crypto.getRandomValues`. The format and its parser live in `feedback-engine`.
- **Rationale**: It is short enough to read aloud and quote, has no ambiguous characters, and reveals nothing about storage. The GitHub issue number is never returned.
- **Alternatives**: Returning the issue number, which leaks internal IDs. A UUID, which is too long to quote.

## R8. Area identifier (FR-013)

- **Decision**: A fixed enum, `FEEDBACK_AREAS`, defined in `feedback-engine`:
  - the help areas from `HELP_AREAS` (`entity-detail`, `graph`, `generators`, `map`, …)
  - plus `tabletop`, `help`, `public-generators`, `public-tools`, `public-site` and `other`

  The pure function `feedbackAreaFor({ pathname, vttActive, helpArea })` maps the current page to one value on the client. The worker accepts enum values only. Route patterns are not used.

- **Rationale**: An enum cannot carry an identifier, query or fragment, so FR-013 holds by construction rather than by sanitising. Reusing the help areas keeps Cif's and reporting's view of the app consistent.
- **Alternatives**: Route patterns with IDs stripped, which the spec allows but which needs a sanitiser and risks missing a new route segment.

## R9. Browser family and screen class (FR-012)

- **Decision**:
  - **Browser family**: `chrome`, `edge`, `firefox`, `safari`, `samsung` or `other`. It comes from `navigator.userAgentData.brands` where available and otherwise from a small `userAgent` match in `feedback-engine`.
  - **Screen class**: `narrow` when the viewport is under 640 CSS pixels, otherwise `wide`.

  Both are computed on the client so that the disclosure can show them, and the worker checks them against the enums. No full user-agent string or version number is sent.

- **Rationale**: These are descriptive labels that help reproduce a bug, not feature detection. The review rule against sniffing user agents is about changing behaviour, and nothing here changes behaviour. Sending only the family limits fingerprinting.
- **Alternatives**: Reading the `User-Agent` header on the worker, which the user can't see before sending.

## R10. Retention and deletion (FR-024, FR-026)

- **Decision**:
  - A scheduled GitHub Actions workflow in the **private triage repository** runs daily and deletes issues older than 180 days, so none survives past 181 days (FR-024), using GraphQL `deleteIssue`. It runs with a maintainer token stored as that repository's secret. Deleting an issue needs admin rights, which the intake token deliberately lacks.
  - On request, the maintainer runs `scripts/feedback-delete.ts <reference>`. It uses the maintainer's own `gh` login to find the issue by its title reference and delete it.
  - A template of the workflow, a setup checklist and the procedure are in `docs/feedback-triage.md`.
- **Rationale**: The intake credential stays create-only. Deletion uses a separate, stronger credential that never touches the worker or the browser.
- **Alternatives**: Deleting from a worker cron, which would put an admin token on the internet-facing worker. Closing issues instead of deleting them, which the spec rules out.

## R11. Operational metrics (FR-025)

- **Decision**: One structured log line per request, `{ "event": "feedback.report", "outcome": "...", "kind": "..." }`. The outcome is one of `accepted`, `duplicate`, `rejected`, `limited`, `unavailable` or `misconfigured`. The kind is included only when valid. The line is built by an allowlisting function like `buildHelpMetric`: it carries no text, email, address, reference or submission ID, and an unknown value yields no line.
- **Rationale**: This matches the existing help-metrics pattern and its privacy reasoning, and the Cloudflare dashboard can count these lines.
- **Alternatives**: Analytics Engine or other new infrastructure, which isn't needed.

## R12. Client form and failure handling (FR-005–FR-011, Story 4)

- **Decision**:
  - **Components**: `FeedbackDialog.svelte` is built on the existing `ModalShell`, which provides the focus trap, Escape and focus return. A small store, `feedbackDialog` (`apps/web/src/lib/stores/ui/feedback-dialog.svelte.ts`), opens it with options `{ kind?, description?, area? }`. It is mounted once in the root `+layout.svelte`, so both the app and the public pages can open it, and the component is loaded with a dynamic import on first open. `FeedbackReportService` handles the network call, with constructor injection of `fetch` and the base URL, following `CopyrightReportService`.
  - **Draft**: the store keeps the draft (kind, description, email and `submissionId`) **in memory only** while the page is open. A closed or failed form reopens with the text intact. Nothing goes to `localStorage`, `sessionStorage` or the vault.
  - **Failures**: an offline device (`navigator.onLine === false`, or a fetch `TypeError`) shows the offline message. HTTP 429 shows the limit message, using `Retry-After` when present. A 503 or 5xx response, or `misconfigured`, shows the unavailable message. A `409 in_progress` response is retried up to 3 times, 1.5 seconds apart. Every failure keeps the text and offers retry, plus Discord (`DISCORD_URL`) and GitHub issues (`GITHUB_URL`) as fallbacks.
- **Rationale**: This follows existing dialog, service and DI conventions. Keeping the draft in memory meets "keep my words" without writing user text to disk, in line with the vault privacy boundary.
- **Alternatives**: Persisting the draft to storage, which writes free text to disk unprompted. A route-level page, which takes the user away from their context.

## R13. Entry points (FR-001, Story 6)

- **Decision**: A shared `ReportProblemButton.svelte` (a link-styled button) is added to:
  - the Help window header (`HelpHeader.svelte`)
  - Settings → Help (`HelpTab.svelte`)
  - the Cif panel footer (`HelpAssistantPanel.svelte`), as a plain link, not an escalation
  - the tabletop help surface (`HelpVttMapSurface.svelte`)
  - the in-app generator dialog footer (`CampaignGeneratorModal.svelte`, a one-line addition)
  - the public site footer (`MarketingShell.svelte`), which covers the public generator and tool pages

  Each passes its area.

- **Rationale**: These are the existing Help surfaces, and the spec rules out a new floating button. One component keeps the label and behaviour the same everywhere.
- **Alternatives**: A global keyboard shortcut only, which isn't discoverable.

## R14. Help content (Principle VII)

- **Decision**: Add a help article, `apps/web/src/lib/content/help/report-a-problem.md`, covering what can be reported, what is sent, who can read it (private GitHub), retention, deletion by reference, and the limits. Add a `report-problem` feature entry to the help-engine `FEATURE_REGISTRY`, so Cif can direct users to the form. Cif can describe the action but does not submit anything (handoff is #4230).
- **Rationale**: The constitution requires help content for user-facing features, and Cif must not claim abilities it lacks.

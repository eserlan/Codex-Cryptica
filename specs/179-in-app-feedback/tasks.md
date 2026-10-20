---
description: "Task list for In-App Problem Reports and Feedback"
---

# Tasks: In-App Problem Reports and Feedback

**Input**: Design documents from `/specs/179-in-app-feedback/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/feedback-report-api.md](./contracts/feedback-report-api.md), [quickstart.md](./quickstart.md)

**Tests**: Required for changed behaviour (Constitution II). Every test task covers the success path and at least one failure, cancellation or negative path, and is written first so that it fails before the implementation.

**User Help (Constitution VII)**: The help article and the Cif registry entry are in Phase 9 (T060–T061). They are required before release.

**Organization**: Tasks are grouped by user story (spec.md Stories 1–6). Story 1 is the MVP and carries the end-to-end path. Later stories harden or widen it.

## Implementation status (2026-10-19)

Done and checked: setup, the shared engine, the worker endpoint, the web service, store, dialog and host, the entry points, the help article and registry entry, the deletion script and the triage documentation. Tests written first for each module.

Not done, or partly done:

- **T029**: Done in #4229 follow-up: the tabletop button sits under the VTT controls (`VTTControls.svelte`).
- **T057**: Not run in a browser yet (quickstart manual pass).
- **T058**: Focus return is tested; contrast in all themes is not yet checked.
- **T059**: Bundle impact not measured.
- **T062**: Staging run with the real private repository not done.
- **T063**: Changelog entry deferred to the release that ships it.
- **T064**: Gate: lint, impacted tests, svelte-check and Fallow pass. codex-review not yet run.

Fallow: verdict pass. Svelte-check: 0 errors. Impacted tests: all four workspaces pass. Nothing is committed yet.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US6 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create the package `packages/feedback-engine` (`package.json` named `feedback-engine` with `main`/`types` set to `./src/index.ts`, scripts `test` = `bun test` and `lint`, dependencies `zod` and `help-engine` (`workspace:*`, for `HELP_AREAS`), plus `tsconfig.json` and `bunfig.toml` copied from `packages/onboarding-journey-engine`), and register it in the root workspaces if they are not globbed.
- [x] T002 [P] Add `feedback-engine` as a workspace dependency of `apps/web` (`apps/web/package.json`) and make it resolvable from `apps/workers/oracle-proxy` (relative import or workspace dependency, matching how `help-engine` is reached), then run `bun install`.
- [x] T003 [P] Add worker configuration placeholders: the `FEEDBACK_RATE_LIMITER` ratelimit binding (5 per 60 s, with its own unused `namespace_id` and a comment explaining the platform period limit) and the `FEEDBACK_GITHUB_REPO` var in `apps/workers/oracle-proxy/wrangler.toml`, and the `FEEDBACK_GITHUB_TOKEN?`, `FEEDBACK_GITHUB_REPO?`, `FEEDBACK_HASH_KEY?` and `FEEDBACK_RATE_LIMITER?` fields in `apps/workers/oracle-proxy/src/env.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ No story work can start until this phase is complete.**

- [x] T004 [P] Write tests first in `packages/feedback-engine/tests/contract.test.ts`. A valid v1 input parses, and each of these is rejected: unknown top-level and `meta` keys, `schemaVersion` ≠ 1, unknown `kind`, a description of 0 or 4,001 code points after trimming, an emoji-heavy description of exactly 4,000 code points (accepted), a malformed email or one longer than 254 characters, a non-UUID `submissionId`, an `appVersion` with a URL or longer than 32 characters, an `area`/`browser`/`screen` outside its enum, and a non-empty honeypot `website`. An empty `contactEmail` is treated as absent.
- [x] T005 Implement `packages/feedback-engine/src/contract.ts`: `FEEDBACK_KINDS`, `FEEDBACK_BROWSERS`, `FEEDBACK_SCREENS`, `FeedbackReportInputSchema` (strict, per data-model.md), `FeedbackReceipt`, `FEEDBACK_ERROR_CODES` and the fixed user-facing error messages. Export them from `src/index.ts`. (Depends on T004 and T007.)
- [x] T006 [P] Write tests first in `packages/feedback-engine/tests/area.test.ts`. `FEEDBACK_AREAS` contains every `HELP_AREAS` value plus `tabletop`, `help`, `public-generators`, `public-tools`, `public-site` and `other`. `feedbackAreaFor` maps representative paths: `/map` with the tabletop on → `tabletop`, `/map` with it off → `map`, `/generators/npc` → `public-generators`, `/tools/...` → `public-tools`, `/` and `/blog/x` → `public-site`, an in-app path with `helpArea` given → that area, and unknown paths → `other`. The result never contains a path segment, query or fragment.
- [x] T007 Implement `packages/feedback-engine/src/area.ts` (`FEEDBACK_AREAS`, `FeedbackArea`, `feedbackAreaFor`), importing `HELP_AREAS` from `help-engine`. (Depends on T006.)
- [x] T008 [P] Write tests first in `packages/feedback-engine/tests/reference.test.ts`. `createReference(random)` with an injected random source gives `CC-XXXX-XXXX` in Crockford base32 with no I, L, O or U. `isReference` accepts that format and rejects lower-case, the wrong length and other prefixes. Two calls with different random bytes differ.
- [x] T009 Implement `packages/feedback-engine/src/reference.ts`. (Depends on T008.)
- [x] T010 [P] Write tests first in `packages/feedback-engine/tests/text.test.ts`. `normaliseText` applies NFC, keeps newlines and tabs, removes C0/C1 control characters, zero-width characters and bidi overrides (U+202A–U+202E and U+2066–U+2069), and trims.
- [x] T011 Implement `packages/feedback-engine/src/text.ts`. (Depends on T010.)
- [x] T012 [P] Write tests first in `apps/workers/oracle-proxy/src/r2-quota.test.ts`, using an in-memory R2 fake with etag semantics:
  - `reserve` up to the limit succeeds and the next one returns `full`
  - concurrent reserves never exceed the limit
  - `release` decrements and never goes below 0
  - an unreadable counter keeps the existing fail-open behaviour
- [x] T013 Extract `reserveQuota(bucket, key, limit)` and add `releaseQuota(bucket, key)` in `apps/workers/oracle-proxy/src/r2-quota.ts`, from `reserveDailyQuota` in `entity-template-directory-report.ts`. Switch that file to the shared helper with no change in behaviour. The existing template-report tests in `apps/workers/oracle-proxy/src/__tests__/` must still pass. (Depends on T012.)

**Checkpoint**: The contract, areas, references, text normalisation and quota helper are ready.

---

## Phase 3: User Story 1 - Report a problem from where it happened (Priority: P1) 🎯 MVP

**Goal**: A user who isn't signed in files a problem from a generator or the tabletop, the maintainer gets a private GitHub issue, and the user sees a real reference.

**Independent Test**: Quickstart scenario 1. It passes against a worker using a GitHub `fetch` fake (automated) and the real private repository (manual).

### Tests for User Story 1 ⚠️

- [x] T014 [P] [US1] Write tests first in `packages/feedback-engine/tests/triage-issue.test.ts`:
  - `renderTriageIssue(record)` gives the title `[Problem] CC-…` with no user text, the label `report:problem`, and a body with the allowlisted metadata lines and the description in a fenced `text` block
  - a description containing ` ``` ` or ` ` ```` gets a longer fence that cannot be closed from inside
  - the Contact section appears only when an email is given
  - Markdown images, HTML, `@mentions` and `#123` appear only inside the fence
- [x] T015 [P] [US1] Write tests first in `apps/workers/oracle-proxy/src/feedback-reports.test.ts`, injecting env, `fetch`, clock and random source:
  - a valid POST from an allowed origin creates exactly one GitHub issue with the expected title, labels and body, and returns 201 `{ reference }` with `Cache-Control: no-store` and CORS headers
  - the response has no issue number, URL, repository or token
  - a missing or disallowed `Origin` returns 403 `forbidden_origin` and no GitHub call
  - a body over 16 KB and a schema violation return 400 `invalid` and no GitHub call
  - `OPTIONS` returns the preflight
  - the only outbound request is to `api.github.com`: no AI or other service is called (FR-027)
- [x] T016 [P] [US1] Write tests first in `apps/web/src/lib/services/feedback/FeedbackReportService.test.ts`. It POSTs to `${baseUrl}/api/feedback/reports` with JSON. On 201/200 it returns `{ reference }`. On other statuses it throws a typed `FeedbackSubmitError` carrying `code` and `retryAfterSeconds`. A fetch `TypeError` becomes `offline`.
- [x] T017 [P] [US1] Write tests first in `apps/web/src/lib/stores/ui/feedback-dialog.svelte.test.ts`:
  - `open()` creates a draft with a fresh `submissionId`, and `close()` sends nothing
  - `submit()` calls the service once with the draft and the computed meta, goes to `sent`, and stores the returned reference
  - a second `submit()` while `sending` is ignored
  - "Send another" resets the draft with a new `submissionId`
- [x] T018 [P] [US1] Write tests first in `apps/web/src/lib/components/feedback/FeedbackDialog.test.ts`:
  - the three kind options, the description and the optional email are all labelled
  - choosing "Something isn't working" shows the "what were you trying to do / what happened" prompt as placeholder or help text, not as required fields
  - Submit is disabled while the description is empty
  - a success shows the confirmation with the reference from the service
  - Escape closes the dialog without submitting, and focus returns to the opener
- [x] T019 [P] [US1] Write tests first in `apps/web/src/lib/components/feedback/ReportProblemButton.test.ts`. The button's visible text and accessible name are "Report a problem", is a `type="button"`, and clicking it calls `feedbackDialog.open({ area })` with its area prop.

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement `packages/feedback-engine/src/triage-issue.ts` (`renderTriageIssue`, fence sizing) and export it. (Depends on T014, T005 and T009.)
- [x] T021 [US1] Implement `handleFeedbackReport(request, env, deps)` in `apps/workers/oracle-proxy/src/feedback-reports.ts`:
  - origin check, 16 KB cap, strict parse, honeypot, `normaliseText` on the description
  - build the record, call GitHub with an 8 s timeout, and return 201 with a new reference
  - fixed error bodies only, and never echo upstream text
  - injected `fetch`, clock and random source

  (Depends on T015, T020, T011 and T009.)

- [x] T022 [US1] Route `POST|OPTIONS /api/feedback/reports` to the handler in `apps/workers/oracle-proxy/src/index.ts` (one branch, next to `/api/reports/copyright`). (Depends on T021.)
- [x] T023 [P] [US1] Implement `packages/feedback-engine/src/client-meta.ts` (`browserFamily(navigatorLike)`, `screenClass(width)`) with tests first in `packages/feedback-engine/tests/client-meta.test.ts`:
  - `userAgentData.brands` is preferred when present
  - Edge is detected before Chrome, and Samsung Internet before Chrome
  - an unknown agent gives `other`
  - widths 639 and 640 fall on either side of the narrow/wide boundary
- [x] T024 [US1] Implement `apps/web/src/lib/services/feedback/FeedbackReportService.ts` with constructor injection of `fetch` and `baseUrl` (the same base-URL resolution as `CopyrightReportService`) and a default singleton. (Depends on T016 and T005.)
- [x] T025 [US1] Implement `apps/web/src/lib/stores/ui/feedback-dialog.svelte.ts`:
  - `open(options)`, `close()`, the in-memory `FeedbackDraft`, `submit()` and the `sending` guard
  - meta from `VERSION`, `feedbackAreaFor`, `browserFamily` and `screenClass`
  - DI for the service, the UUID generator and the window/navigator readers
  - nothing persisted

  (Depends on T017, T024, T023 and T007.)

- [x] T026 [US1] Implement `apps/web/src/lib/components/feedback/FeedbackDialog.svelte` on `ModalShell`, titled "Report a problem or send feedback":
  - three kind radios with the spec wording, a description textarea with the bug prompt and a remaining-character counter (FR-014)
  - an optional email field with its "used only to reply; stored with your report" note
  - Submit with a sending state, and a confirmation showing the reference and "Send another"
  - semantic tokens, Iconify icons and labelled controls
  - an error region with `role="alert"`

  (Depends on T018 and T025.)

- [x] T027 [US1] Implement `apps/web/src/lib/components/feedback/FeedbackHost.svelte`, which dynamically imports `FeedbackDialog.svelte` the first time `feedbackDialog` opens, and mount it once in `apps/web/src/routes/+layout.svelte`. (Depends on T026.)
- [x] T028 [P] [US1] Implement `apps/web/src/lib/components/feedback/ReportProblemButton.svelte`, a link-styled `type="button"` with an `area` prop and an optional label. (Depends on T019 and T025.)
- [x] T029 [US1] Add the MVP entry points: `<ReportProblemButton area="tabletop" />` in `apps/web/src/lib/components/help-assistant/HelpVttMapSurface.svelte`, and the one-line `<ReportProblemButton area="generators" />` in the footer of `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte`. Extend their existing tests to assert that the button renders. (Depends on T028.)

**Checkpoint**: The MVP works end to end. A problem can be filed from the tabletop and from the in-app generator, and the reference is real.

---

## Phase 4: User Story 2 - Send an idea or other feedback (Priority: P1)

**Goal**: Ideas and other feedback arrive labelled correctly.

**Independent Test**: Quickstart scenario 2: one report of each kind arrives with its label.

- [x] T030 [P] [US2] Extend `packages/feedback-engine/tests/triage-issue.test.ts` with `[Idea]` / `report:idea` and `[Other]` / `report:other` cases, and assert that each kind gets exactly one label.
- [x] T031 [P] [US2] Extend `apps/workers/oracle-proxy/src/feedback-reports.test.ts`: `kind` `idea` and `other` each reach GitHub with the matching title prefix and label.
- [x] T032 [P] [US2] Extend `apps/web/src/lib/components/feedback/FeedbackDialog.test.ts`. Choosing "I have an idea" or "Something else" sends `idea` or `other`, and the bug prompt is shown only for "Something isn't working". Submitting `open({ kind: "idea" })` without changing the selection sends `idea`.
- [x] T033 [US2] Make whatever changes those tests need in `triage-issue.ts`, `feedback-reports.ts` and `FeedbackDialog.svelte`. (Depends on T030–T032.)

---

## Phase 5: User Story 3 - Know exactly what is sent (Priority: P1)

**Goal**: The disclosure matches what is sent, secrets are removed, and nothing outside the allowlist leaves the device.

**Independent Test**: Quickstart scenarios 3 and 4, plus the privacy assertions.

- [x] T034 [P] [US3] Write tests first in `packages/feedback-engine/tests/redact.test.ts` as a counterexample table.

  Flagged:
  - `sk-…`, `ghp_…` and `github_pat_…` tokens
  - `AKIA…`, `AIza…`, `Bearer abc.def`
  - a JWT and a PEM private key block
  - `password: hunter2` and `api key = x`
  - a 48-character base64 run and a 40-character hex run

  Not flagged:
  - ordinary prose
  - the dice formulas `1d20+5` and `2d6+3`
  - `https://codexcryptica.com/generators/npc`
  - a UUID
  - a `CC-7F3K-9Q2M` reference
  - "I forgot my password" with no value
  - an entity name containing "Token"

  Several secrets in one text are all replaced, and the rest of the text is unchanged.

- [x] T035 [US3] Implement `packages/feedback-engine/src/redact.ts` (`redactSecrets`, marker `[removed: possible secret]`). (Depends on T034.)
- [x] T036 [US3] Apply `redactSecrets` in `apps/workers/oracle-proxy/src/feedback-reports.ts` after `normaliseText`. Extend `feedback-reports.test.ts` with privacy assertions that cover SC-003, then fix the handler until they pass:
  - a secret in the description is removed from the GitHub body
  - a request with extra fields (`vaultId`, `entities`, `chat`, `url` containing `?q=` or `#x`, `userAgent`) is rejected as `invalid`, and nothing reaches GitHub
  - the source IP and the raw `submissionId` never appear in the GitHub body or any log line

  (Depends on T035 and T021.)

- [x] T037 [P] [US3] Extend `apps/web/src/lib/components/feedback/FeedbackDialog.test.ts`:
  - the "What is sent" section lists exactly app version, area, browser and screen with their values
  - it states that the report is stored as a private issue on GitHub, readable only by the maintainer and people they grant access, and deleted after 180 days or on request (FR-005a)
  - it states that recognisable secrets are removed
  - the request body built by the store contains exactly the disclosed meta keys and no others
- [x] T038 [US3] Add the disclosure section to `FeedbackDialog.svelte`. Make it collapsible, open by default on first use, and reachable by keyboard. (Depends on T037.)
- [x] T039 [P] [US3] Extend `apps/web/src/lib/stores/ui/feedback-dialog.svelte.test.ts`. Opening the form on a path with a vault ID, query and fragment gives an area enum value only. The store's request body never contains `location.href`, document title, entity or vault data. `open()` receives no entity or vault argument.

---

## Phase 6: User Story 4 - Keep my words when sending fails (Priority: P1)

**Goal**: Failures are honest, the text survives, retries never duplicate, and a fallback route is offered.

**Independent Test**: Quickstart scenarios 6–9.

### Tests ⚠️

- [x] T040 [P] [US4] Extend `apps/workers/oracle-proxy/src/feedback-reports.test.ts` with:
  - **Burst**: limiter refusal returns 429 `rate_limited` with `Retry-After`.
  - **Hourly and daily caps**: the 6th report in an hour and the 21st in a day return 429. Concurrent requests never exceed the caps.
  - **Delivery failure**: GitHub returns 500, a network error or a timeout over 8 s, which gives 503 `unavailable`. The quota slots are released and the submission marker is deleted, so a retry is accepted.
  - **Configuration missing**: no token, repository or hash key gives 503 `misconfigured` with no GitHub call and no quota use.
  - **Duplicates**: the same `submissionId` after delivery returns 200 with the same reference and no second issue. While delivery is pending it returns 409 `in_progress`, including after two minutes, so an ambiguous GitHub timeout cannot create a second issue during the marker's two-day retention window.
  - **Marker cleanup**: after a quota refusal or a delivery failure, the marker is gone, so a retry with the same `submissionId` is processed normally.
  - **Hashing**: the hash key is required, and the source hash in R2 keys is not the raw IP.
- [x] T041 [P] [US4] Extend `apps/web/src/lib/stores/ui/feedback-dialog.svelte.test.ts` with:
  - **Offline**: offline (`navigator.onLine` false, or a fetch `TypeError`) gives `failed/offline` with the text kept.
  - **Limit**: 429 gives `failed/limited` with `retryAfterSeconds`.
  - **Service problem**: 503 `unavailable` or `misconfigured`, or a 5xx, gives `failed/unavailable`.
  - **In progress**: 409 `in_progress` is retried up to 3 times, 1.5 s apart, with fake timers, and then fails as `unavailable`.
  - **Retry**: a retry reuses the same `submissionId`. Closing during sending and reopening shows the outcome, not a fresh form, and the text is never lost.
  - **No false success**: no state reports success without a reference from the service.
  - **No AI dependency**: with AI disabled on the device, a report still submits and the store reads no AI setting (FR-027).
- [x] T042 [P] [US4] Extend `apps/web/src/lib/components/feedback/FeedbackDialog.test.ts`:
  - each failure shows its own message
  - Retry and the Discord and GitHub fallback links are present
  - the error is announced (`role="alert"`)
  - the description and email stay filled
  - the Submit button cannot be activated twice while sending

### Implementation

- [x] T043 [US4] Add rate limiting and duplicate handling to `apps/workers/oracle-proxy/src/feedback-reports.ts`:
  - hash the source with HMAC-SHA-256 using `FEEDBACK_HASH_KEY`
  - apply the `FEEDBACK_RATE_LIMITER` burst limit
  - claim, deliver and settle the submission marker (R5), deleting it on a quota refusal or a delivery failure
  - reserve and release the hourly and daily quotas through `r2-quota.ts`
  - return the misconfigured and unavailable responses

  Follow the order in the contract. (Depends on T040 and T013.)

- [x] T044 [US4] Add the failure states, the 409 retry loop, offline detection and `retryAfterSeconds` to `apps/web/src/lib/stores/ui/feedback-dialog.svelte.ts`, with an injected timer. (Depends on T041.)
- [x] T045 [US4] Add the failure messages, the Retry button and the fallback links (`DISCORD_URL`, `GITHUB_URL`) to `FeedbackDialog.svelte`. (Depends on T042 and T044.)

---

## Phase 7: User Story 5 - Read and act on reports privately (Priority: P1)

**Goal**: The maintainer can triage privately, publish deliberately, delete by reference, and purge after 180 days. Usage counts carry no content.

**Independent Test**: Quickstart scenarios 5 and 11, plus a dry run of the purge selection.

- [x] T046 [P] [US5] Write tests first in `packages/feedback-engine/tests/metric.test.ts`:
  - `buildFeedbackMetric` accepts only known outcomes and kinds
  - unknown values give `null`
  - extra input fields (description, email, reference, IP) never appear in the output
- [x] T047 [US5] Implement `packages/feedback-engine/src/metric.ts` and emit exactly one metric per request from `feedback-reports.ts`, covering every outcome in the test matrix. Extend `feedback-reports.test.ts` with a captured logger. (Depends on T046 and T043.)
- [x] T048 [P] [US5] Write tests first in `scripts/feedback-delete.test.ts`:
  - argument validation through `isReference`
  - the found issue is deleted with `deleteIssue`, not closed
  - no match, or more than one, exits non-zero without deleting
  - `gh` is called through an injected runner
- [x] T049 [US5] Implement `scripts/feedback-delete.ts`. It uses the maintainer's `gh` login to search the private repository by the title reference and delete the matching issue through GraphQL `deleteIssue`. It never takes a token argument. (Depends on T048.)
- [x] T050 [US5] Write `docs/feedback-triage.md`, covering:
  - creating the private repository and its labels
  - the fine-grained token scope and its rotation
  - `wrangler secret put` for `FEEDBACK_GITHUB_TOKEN` and `FEEDBACK_HASH_KEY`
  - the `FEEDBACK_GITHUB_REPO` var
  - the R2 lifecycle rule for `feedback/`, deleting after 2 days
  - who can access reports
  - retention (180 days) and deletion on request
  - the spam response: tighten the limits, then enable the existing invisible Turnstile flow
  - the triage-to-public-issue procedure: write a sanitised summary by hand and never paste raw reports
  - reading the `feedback.report` metric lines
- [x] T051 [P] [US5] Add the daily purge workflow template `docs/feedback-triage/purge-old-reports.yml`, a GitHub Actions workflow for the **private** triage repository. It runs **daily**, lists issues created more than 180 days ago and deletes each with `gh api graphql deleteIssue`, using a maintainer token secret, and has a `dry_run` input. Link it from `docs/feedback-triage.md`.

---

## Phase 8: User Story 6 - Reach the form from any Help entry point (Priority: P2)

**Goal**: Every existing Help surface, in the app and on the public site, opens the same form, and later features can prefill it.

**Independent Test**: Each entry point opens the same dialog with its area. A test caller's prefill is editable and nothing is sent before Submit.

- [x] T052 [P] [US6] Add `<ReportProblemButton area="help" />` to `apps/web/src/lib/components/help/HelpHeader.svelte`, and create `apps/web/src/lib/components/help/HelpHeader.test.ts` to assert that it renders and opens the dialog with `area: "help"`.
- [x] T053 [P] [US6] Add `<ReportProblemButton area="settings" />` to `apps/web/src/lib/components/help/HelpTab.svelte`, and create `apps/web/src/lib/components/help/HelpTab.test.ts` to assert the same with `area: "settings"`.
- [x] T054 [P] [US6] Add a plain "Report a problem" link to the Cif panel footer in `apps/web/src/lib/components/help-assistant/HelpAssistantPanel.svelte`, passing the panel's current help area. Extend its tests. The link is not an escalation, and no Cif text is passed.
- [x] T055 [P] [US6] Add `<ReportProblemButton />` to the public footer in `apps/web/src/lib/components/seo/MarketingShell.svelte`, which computes its area through `feedbackAreaFor`. Extend `MarketingShellComponent.test.ts`.
- [x] T056 [P] [US6] Extend `apps/web/src/lib/stores/ui/feedback-dialog.svelte.test.ts` and `FeedbackDialog.test.ts`. `open({ kind, description, area })` prefills the form, every prefilled field stays editable, and nothing is sent until Submit (FR-011, Story 6 scenario 2).
- [ ] T057 [US6] Check the entry points on desktop and at 320 px in the app (Help window, Settings → Help, Cif panel, tabletop, generator dialog) on a public generator page, and in the guest (shared world) view. Each must be visible without scrolling past unrelated content (Story 6 scenario 1). Record any layout fix in its component.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T058 [P] Accessibility and theme pass on `FeedbackDialog.svelte` (FR-010, SC-006):
  - keyboard-only completion, with focus moving in on open and returning to the opener on close
  - named controls and announced errors
  - no horizontal scroll at 320 px
  - light and dark themes, with contrast checked in every theme as the codex-review patterns require

  Add a test for focus return.

- [ ] T059 [P] Check bundle impact. `FeedbackDialog` is in its own chunk loaded on first open, and the root layout adds only `FeedbackHost` and the store.
- [x] T060 [P] Write the help article `apps/web/src/lib/content/help/report-a-problem.md`. It covers what can be reported, how to open the form (every entry point), what is sent and who can read it (private GitHub, the maintainer and granted people), the 180-day retention, deletion by quoting the reference, the limits (5 an hour and 20 a day), and that no AI or account is needed.
- [x] T061 [P] Add a `report-problem` entry to the help-engine `FEATURE_REGISTRY` (`packages/help-engine/src/registry/features/`), so Cif can point users to the form without claiming it can file reports. Run the help-engine registry tests.
- [ ] T062 Run the quickstart scenarios 1–11 against staging with the real private repository and record the results in the PR. Measure SC-001 (at most 3 actions after opening Help, and under 2 minutes) and the worker response time (p95 under 2 s over 20 submissions).
- [ ] T063 [P] Add a user-facing entry for in-app reporting to `apps/web/src/lib/content/changelog/releases.json` in the release that ships it, describing the user-visible feature only.
- [ ] T064 Run the PR quality gate:
  - `bun scripts/lint-changed.mjs`
  - `bun scripts/test-changed.mjs`, plus `vitest related` for the changed web files
  - `bun run --cwd packages/feedback-engine test`
  - `bun run --cwd apps/workers/oracle-proxy test`
  - `svelte-check` in `apps/web`
  - Fallow audit
  - `codex-review`

---

## Requirement Traceability

| Requirement                           | Tasks                       |
| ------------------------------------- | --------------------------- |
| FR-001 entry points                   | T029, T052–T055, T057       |
| FR-002 three kinds                    | T005, T018, T032            |
| FR-003 bug prompt                     | T018, T026                  |
| FR-004 optional email                 | T004, T026                  |
| FR-005, FR-005a disclosure            | T037, T038                  |
| FR-006 nothing before Submit          | T017, T056                  |
| FR-007 sending guard                  | T017, T042                  |
| FR-008 real reference                 | T016–T018                   |
| FR-009 honest failures                | T041, T042, T044, T045      |
| FR-010 accessibility                  | T018, T058                  |
| FR-011 reusable form                  | T025, T056                  |
| FR-012 contract                       | T004, T005, T023            |
| FR-013 area enum                      | T006, T007, T039            |
| FR-014 bounds                         | T004, T015, T026            |
| FR-015 redaction, inert text          | T010, T011, T014, T034–T036 |
| FR-016 origin and limits              | T015, T040, T043            |
| FR-017 one report per submission      | T040, T043                  |
| FR-018 non-sensitive responses        | T015                        |
| FR-019 controlled failure             | T040, T043                  |
| FR-020 server-side secrets            | T015                        |
| FR-021 private GitHub issues          | T021, T050                  |
| FR-022 manual publishing              | T050                        |
| FR-023 issue content                  | T014, T020                  |
| FR-024 retention and deletion         | T049, T051                  |
| FR-025 metrics                        | T046, T047                  |
| FR-026 operations docs                | T050                        |
| FR-027 no AI                          | T015, T041                  |
| FR-028 no automatic collection        | T036, T039                  |
| SC-001 three actions, two minutes     | T057, T062                  |
| SC-002 delivery to private repository | T062                        |
| SC-003 privacy                        | T034, T036, T039            |
| SC-004 no false success               | T040–T042                   |
| SC-005 one report per submission      | T040                        |
| SC-006 accessibility at 320 px        | T058                        |

SC-007 is a post-launch outcome and has no build task.

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies.
- **Phase 2 (Foundational)**: after Setup. Blocks every story.
- **Phase 3 (US1, MVP)**: after Phase 2.
- **Phases 4–7 (US2–US5)**: after US1. They are independent of each other, although US4 and US5 both edit `feedback-reports.ts`, so run them in sequence or coordinate.
- **Phase 8 (US6)**: after US1. It can run alongside Phases 4–7.
- **Phase 9 (Polish)**: after all stories.

### Within Each Story

Tests come before the implementation and must fail first. The engine comes before the worker, and the service and store come before the components.

### Parallel Opportunities

- Phase 2: T004, T006, T008, T010 and T012 are in different files.
- US1: T014–T019 are all tests in different files. Then T020, T023 and T028 alongside the worker chain T021→T022.
- US6: T052–T055 touch different components.
- Polish: T058–T061.

## Parallel Example: User Story 1

```text
Tests together:  T014 triage-issue · T015 worker route · T016 service · T017 store · T018 dialog · T019 button
Then together:   T020 renderTriageIssue · T023 client-meta · (T021 → T022 worker)
Then:            T024 → T025 → T026 → T027, with T028 → T029
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phases 1–2.
2. Phase 3. Then stop and validate quickstart scenario 1 on staging with the private repository.
3. Do not ship to production before US3 (disclosure and redaction) and US4 (honest failures and rate limits) are in, because both are P1 guardrails. The MVP checkpoint is for validation only.

### Incremental Delivery

US1 gives the end-to-end path. US2 adds the kinds, US3 privacy, US4 resilience and US5 operations. Then US6 adds reach, and Polish adds help and the gate. Release when US1–US5 are complete. US6 can follow in the same or the next release.

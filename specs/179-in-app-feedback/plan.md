# Implementation Plan: In-App Problem Reports and Feedback

**Branch**: `179-in-app-feedback` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/179-in-app-feedback/spec.md` (epic #4227, slices #4228 and #4229)

## Summary

Anyone using Codex Cryptica, in the app or on the public generator and tool pages, can open a short "Report a problem / Send feedback" form from the existing Help surfaces. The form discloses exactly what will be sent, and the user submits a problem, an idea or other feedback.

A new endpoint on the existing `oracle-proxy` worker validates the report against a strict contract, removes recognisable secrets, rate-limits each source, and creates an issue in a **private GitHub repository** with the text shown inert. It returns a short reference such as `CC-7F3K-9Q2M`.

The worker keeps no copy of the report. Only content-free submission markers and quota counters live briefly in R2. The shared contract, redaction, reference format, area mapping and issue rendering live in a new framework-free package, `packages/feedback-engine`.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14; Cloudflare Workers runtime for `apps/workers/oracle-proxy`
**Primary Dependencies**:

- `zod` (already used)
- the existing worker modules `cors.ts` (`isOriginAllowed`, `handleCorsPreflight`), rate-limit bindings and the R2 compare-and-set quota (extracted to `r2-quota.ts`)
- `help-engine` (`HELP_AREAS`, `FEATURE_REGISTRY`)
- the web `ModalShell`, `focusTrap`, `VERSION`, `DISCORD_URL` and `GITHUB_URL`, Tailwind 4 semantic tokens and Iconify classes
- new internal package `packages/feedback-engine`
- GitHub REST API (issues) called from the worker with `fetch`

No new third-party dependency.
**Storage**:

- No report storage in the worker.
- R2 (existing `BUCKET`): content-free submission markers and hourly and daily quota counters under `feedback/`, removed by a 2-day lifecycle rule.
- Reports themselves: issues in the private GitHub repository, deleted after 180 days by a scheduled workflow in that repository.
- Browser: the draft is kept in memory only. Nothing goes to `localStorage`, `sessionStorage`, IndexedDB, OPFS or the vault, so there is no migration.

**Testing**:

- Vitest for the worker (`apps/workers/oracle-proxy`, `vitest run`) and the web app (`bunx vitest`)
- Bun test for `feedback-engine`, matching the other engine packages
- `@testing-library/svelte` for the dialog

**Target Platform**: Browsers (desktop and mobile, down to 320 CSS px wide); Cloudflare Workers
**Project Type**: Web application (SvelteKit app plus Cloudflare Worker plus internal packages)
**Performance Goals**:

- The dialog chunk is loaded only on first open and adds nothing to the initial bundle.
- The worker responds in under 2 s at p95 with GitHub healthy, and gives up on GitHub after 8 s with `unavailable`.

**Constraints**:

- no AI call (FR-027)
- no automatic collection (FR-028)
- strict allowlist contract
- 16 KB body cap
- description of 1–4,000 characters
- 5 reports per minute, 5 per hour and 20 per day per source
- no mandatory challenge
- the intake token is create-only for one repository

**Retention**: the daily purge workflow in the private repository deletes reports at 180 days, so none survives past 181 (FR-024).
**Scale/Scope**: Low volume, tens of reports a week expected. One endpoint, one dialog, six entry points, one help article.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Library-First                    | PASS   | The contract, normalisation, redaction, reference, area mapping, browser family and issue rendering are in `packages/feedback-engine`, which is framework-free and imported by both the worker and the web app.                                                                                                                                                                                                                                                                                                                                  |
| II. TDD                             | PASS   | Each module is test-first: a contract table, a redaction counterexample table, a worker route matrix (success, duplicate, every failure code) and dialog behaviour, with failure and cancellation paths included.                                                                                                                                                                                                                                                                                                                                |
| III. Simplicity & YAGNI             | PASS   | No server-side report store, no Turnstile, enum-only areas, one dialog component, no ticket portal or history.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| IV. AI-First Extraction             | N/A    | The feature deliberately uses no AI (FR-027). Cif only describes where the form is.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| V. Privacy & Client-Side Processing | PASS   | No vault data leaves the device. The opt-in remote-storage exception is not invoked, because reports are user-written messages, not vault data, and nothing is mirrored. A report is sent only on Submit and contains only the disclosed fields. The form names the third party holding it (GitHub, private repository) and gives retention and deletion (FR-005a). Campaign content is never read by the reporting code: the dialog receives only an area value. There is no client analytics; server metrics are counts without content (R11). |
| VI. Clean Implementation            | PASS   | Strict schemas, fixed error strings, no upstream text echoed, typed outcomes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| VII. User Documentation             | PASS   | Help article `report-a-problem.md` and a `FEATURE_REGISTRY` entry (R14).                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| VIII. DI                            | PASS   | `FeedbackReportService` (`fetch`, `baseUrl`), the `feedbackDialog` store (service, clock, `submissionId` generator, online check) and the worker handler (env, `fetch`, clock, random source) are all injectable, with default singletons.                                                                                                                                                                                                                                                                                                       |
| IX. Natural Language                | PASS   | All copy is plain English; the error messages are written for users, not developers.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| X. Quality & Coverage               | PASS   | New modules carry their own tests, and privacy assertions cover SC-003.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| XII. Labels over Tags               | PASS   | GitHub "labels" only; no user-facing tags.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| XIII. Discovery Intent              | N/A    | No new public page. A footer link on existing pages is not a discovery page.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| XIV. Bounded Responsibility         | PASS   | See below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Discovery Intent Check

N/A: the feature adds no public, indexable page. The help article lives in the in-app Help system, not under the discovery routes.

### Bounded Responsibility Check

- [x] Files over 500 lines that this feature touches:
  - `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte` (937 lines). It gains one `<ReportProblemButton area="generators" />` line in its footer. Its responsibility is unchanged (the generator workflow dialog), and all reporting logic stays in the new component.
- [x] `apps/web/src/lib/stores/ui/modal-ui.svelte.ts` (585 lines) and `routes/(app)/+layout.svelte` (754 lines) are deliberately **not** touched. The dialog gets its own store, and it is mounted in the 46-line root `routes/+layout.svelte`.
- [x] New behaviour has extraction targets:
  - non-UI logic goes to `packages/feedback-engine`
  - the worker route goes to a new `feedback-reports.ts` (index.ts gains one route branch)
  - the shared R2 quota goes to `r2-quota.ts`, extracted from `entity-template-directory-report.ts` with its tests carried over
- [x] The quota split carries the template-report quota tests across, and adds tests for the release path.

### User Help Check

- [x] Help article planned: `apps/web/src/lib/content/help/report-a-problem.md`.
- [x] It explains what can be reported, how to open the form, what is sent and who reads it, the limits, and deletion.
- [x] FeatureHint: not needed. The form is a single short dialog.

**Gate result (pre-research)**: PASS. **Post-design re-check**: PASS. The design adds no storage of user text by the worker, no new third-party script, and no change to files over 500 lines beyond the one-line footer addition.

## Project Structure

### Documentation (this feature)

```text
specs/179-in-app-feedback/
├── plan.md              # This file
├── research.md          # Phase 0 decisions (R1–R14)
├── data-model.md        # Contract, record, receipt, errors, markers, quota, draft, metric
├── quickstart.md        # End-to-end validation
├── contracts/
│   └── feedback-report-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit.tasks output
```

### Source Code (repository root)

```text
packages/feedback-engine/            # NEW framework-free package
├── package.json, tsconfig.json, bunfig.toml
├── src/
│   ├── index.ts
│   ├── contract.ts                  # FeedbackReportInput (strict), kinds, areas, browser, screen, errors
│   ├── text.ts                      # normaliseText (NFC, strip control and bidi characters)
│   ├── redact.ts                    # redactSecrets
│   ├── reference.ts                 # createReference(random), isReference
│   ├── area.ts                      # FEEDBACK_AREAS, feedbackAreaFor({ pathname, vttActive, helpArea })
│   ├── client-meta.ts               # browserFamily(navigatorLike), screenClass(width)
│   ├── triage-issue.ts              # renderTriageIssue(record) → { title, body, labels }; fence sizing
│   └── metric.ts                    # buildFeedbackMetric / emitFeedbackMetric
└── tests/                           # one file per module, including the redaction counterexample table

apps/workers/oracle-proxy/
├── src/
│   ├── feedback-reports.ts          # NEW: handleFeedbackReport(request, env, deps)
│   ├── feedback-reports.test.ts     # NEW: route matrix and privacy assertions
│   ├── r2-quota.ts                  # NEW: reserve and release counters (extracted)
│   ├── r2-quota.test.ts             # NEW
│   ├── entity-template-directory-report.ts   # now uses r2-quota.ts
│   ├── index.ts                     # + route branch for /api/feedback/reports
│   └── env.ts                       # + FEEDBACK_* fields
└── wrangler.toml                    # + FEEDBACK_RATE_LIMITER, FEEDBACK_GITHUB_REPO var

apps/web/src/
├── lib/services/feedback/
│   ├── FeedbackReportService.ts     # NEW, DI fetch and baseUrl
│   └── FeedbackReportService.test.ts
├── lib/stores/ui/
│   ├── feedback-dialog.svelte.ts    # NEW: open(), draft, submit, retry state machine
│   └── feedback-dialog.svelte.test.ts
├── lib/components/feedback/
│   ├── FeedbackDialog.svelte        # NEW: ModalShell-based form
│   ├── FeedbackDialog.test.ts
│   ├── FeedbackHost.svelte          # NEW: lazy-loads the dialog on first open
│   ├── ReportProblemButton.svelte   # NEW: shared entry point
│   └── ReportProblemButton.test.ts
├── lib/components/help/HelpHeader.svelte              # + entry point
├── lib/components/help/HelpTab.svelte                 # + entry point
├── lib/components/help-assistant/HelpAssistantPanel.svelte   # + entry point (link)
├── lib/components/help-assistant/HelpVttMapSurface.svelte    # + entry point
├── lib/components/generators/CampaignGeneratorModal.svelte   # + one-line entry point
├── lib/components/seo/MarketingShell.svelte           # + footer entry point
├── lib/content/help/report-a-problem.md               # NEW help article
└── routes/+layout.svelte                              # + <FeedbackHost />

packages/help-engine/src/registry/features/            # + report-problem entry

scripts/feedback-delete.ts           # NEW: maintainer-run deletion by reference (uses gh)
docs/feedback-triage.md              # NEW: setup, access, retention, spam, triage → public, purge workflow template
```

**Structure Decision**:

- **Packages**: one new framework-free package, `feedback-engine`, holds all logic the worker and the app share.
- **Worker**: a new route module in the existing worker, plus a shared quota helper extracted from the template-report endpoint.
- **Web app**: a new service, store and components, mounted once in the root layout and opened from the existing Help surfaces.
- **Repository-level**: the operational script and documentation.

## Complexity Tracking

No constitution violations to justify.

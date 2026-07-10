# Research: Copyright and Fan-Content Notice for Public Worlds

**Date**: 2026-07-10 | **Plan**: [plan.md](./plan.md)

No `NEEDS CLARIFICATION` items remained in the Technical Context; research focused on integration decisions against the existing publishing stack (spec 135 guest snapshots, spec 139 public directory).

## R1. Where the fan-content flag and disclaimer live

- **Decision**: New R2 sidecar `published/{publishId}/notice.json` (`PublishedNoticeSchema`), mutated via `PUT /api/published/:publishId/notice` using the existing writeToken authorization (`authorizeListingMutation` pattern), read via public `GET /api/published/:publishId/notice`.
- **Rationale**: The spec requires the disclaimer on _every_ public vault page, including unlisted link-shared guest views — so it cannot live only in `directory/listings/{id}.json` (deleted when delisted). Putting it in `bundle.json` would require a full republish to change wording and would bloat the snapshot contract. A sidecar is editable independently, cheap to fetch (15s cache like the directory), and survives delisting.
- **Alternatives considered**: (a) extend `GuestBundleSchema` — rejected: republish needed per edit, mixes moderation/legal metadata into content snapshot; (b) listing record only — rejected: disappears for unlisted vaults; (c) client-only localStorage flag — rejected: guest visitors are not the author.

## R2. Acknowledgement enforcement without migration

- **Decision**: `ListingDraftSchema` requires `rightsAcknowledged: z.literal(true)`; the worker stamps `rightsAcknowledgedAt` server-side into both the listing and the notice sidecar. `PublicListingSchema` adds only **optional** fields.
- **Rationale**: `loadListing` uses `safeParse` and drops invalid records — a required field on `PublicListingSchema` would silently delist every existing world. Requiring the flag on the _draft_ (write path) means new listings can't be created without it (FR-005/006) and existing listings are forced through acknowledgement on their next save (FR-008), with zero data migration.
- **Alternatives considered**: schemaVersion bump to 2 with migration pass — rejected as over-engineering for additive optional fields (YAGNI).

## R3. Operator suspension mechanism

- **Decision**: R2 marker `moderation/suspensions/{publishId}.json` (`SuspensionMarkerSchema`: `mode: "delist" | "disable"`, `reason?`, `createdAt`). Worker checks: `handleListPublicListings`/`handleGetPublicListing` skip suspended ids (both modes); bundle, manifest, and asset GET handlers return **451 Unavailable For Legal Reasons** with a neutral JSON body when mode is `disable`. Notice GET reports `suspended: true` so the owner's settings UI can show "public availability suspended pending review" (FR-016). Operators create/remove markers with `wrangler r2 object put/delete` per the quickstart runbook. Deleting the marker restores listing and access with no republish (FR-015).
- **Rationale**: Matches the feature's operator-only, low-volume moderation reality; adds no auth surface, no admin UI, no new datastore. Fail behavior is neutral (no accusation) per FR-016.
- **Alternatives considered**: (a) admin API endpoint with secret header — rejected v1: new secret management + endpoint hardening for an action wrangler already does; (b) deleting the listing object — rejected: destroys the owner's saved metadata and can't distinguish "suspended" from "owner delisted", breaking restore (FR-015).

## R4. Copyright report intake

- **Decision**: `POST /api/reports/copyright` on oracle-proxy. Zod-validated body (`CopyrightReportSchema` input: vaultUrl + reporterContact required; rightsHolder/work, material, details optional-but-encouraged), Cloudflare Turnstile token verification (client helper `apps/web/src/lib/services/publishing/turnstile.ts` already exists), existing IP rate limiting extended to the reports path, persisted as `moderation/reports/{reportId}.json` with server-set `receivedAt` and the reported vault's current listed/published state. Client: `CopyrightReportService` (DI class + singleton) used by `CopyrightReportModal.svelte`, opened from `/worlds` footer notice and the guest page; vault URL pre-filled on guest pages. Success message: received-and-will-be-reviewed, no outcome promise (FR-014).
- **Rationale**: A structured form satisfies FR-013's required-field capture, which a mailto link cannot enforce; R2 + wrangler listing is the same operator workflow as suspensions; Turnstile + rate limiting handles abuse without accounts (FR-012).
- **Alternatives considered**: (a) mailto link — rejected: can't enforce required fields, exposes a scrapeable address; (b) third-party form service — rejected: sends reporter PII off-platform, violates Privacy principle V; (c) automatic delisting above a report threshold — rejected explicitly by spec edge case (operator decision only).

## R5. Notice copy placement and reuse

- **Decision**: One config module `apps/web/src/lib/config/public-worlds-notice.ts` exporting the listing notice copy, the default fan-content disclaimer, and the acknowledgement statement. Consumed by `WorldsProvenanceNotice.svelte` (rendered on `/worlds` as a footer-level block and reused on guest pages), `FanContentDisclaimer.svelte`, and `PublicListingSettings.svelte`.
- **Rationale**: Constitution III DRY rule — identical legal copy must not drift between the directory, guest views, and the settings preview. Copy follows issue #1660's proposed wording, adjusted per Principle IX (plain language). The Terms of Use link is represented as an optional config field left unset until the page exists (FR-017 — renders nothing rather than a broken link).
- **Alternatives considered**: hardcoding strings per component — rejected (three-plus duplication sites, exactly what the constitution's extraction rule forbids).

## R6. Custom disclaimer safety

- **Decision**: `fanContentDisclaimer` is a plain string, `max 500` chars, trimmed; rendered exclusively through Svelte text interpolation (never `{@html}`); empty/whitespace input falls back to the default disclaimer.
- **Rationale**: FR-011 (no active content, bounded length) plus the guest page is an untrusted-content surface — the existing guest bundle rendering already follows text-only discipline.
- **Alternatives considered**: markdown support — rejected: unnecessary (YAGNI) and widens the injection surface; curated per-publisher disclaimer picklist (e.g., WotC FCP wording) — deferred: free-text field lets authors paste required wording today; a picklist can be added later without schema change.

# Worker API Contracts: oracle-proxy additions

**Feature**: 1660-worlds-copyright-notice | **Base**: existing oracle-proxy worker (`apps/workers/oracle-proxy`)

All endpoints share the existing CORS handling (`getCorsHeaders`) and JSON error envelope `{ "error": { "message": string } }`.

## GET /api/published/:publishId/notice

Public. Returns the vault's notice view for guest pages and listing settings.

- **200**: `{ "fanContent": boolean, "fanContentDisclaimer"?: string, "suspended": boolean }`
  - `Cache-Control: public, max-age=15` (same as directory)
  - Returned even when the vault is suspended (`suspended: true`) so the owner UI can display status; contains no reporter or operator data.
- **404**: no published bundle for `publishId`.

## PUT /api/published/:publishId/notice

Owner-only (Bearer writeToken, same `authorizeListingMutation` check as listing PUT).

- **Request**: `{ "fanContent": boolean, "fanContentDisclaimer"?: string }` (strict; disclaimer trimmed, max 500)
- **200**: stored `PublishedNotice` (server sets `updatedAt`)
- **400** invalid body · **401** missing/wrong token · **404** snapshot not found

## PUT /api/published/:publishId/listing — CHANGED

Existing endpoint; draft schema now additionally requires:

- **Request adds**: `"rightsAcknowledged": true` (literal — any other value → 400), `"fanContent"?: boolean`, `"fanContentDisclaimer"?: string`
- Side effects: worker stamps `rightsAcknowledgedAt` on the stored listing **and** upserts the notice sidecar (`fanContent`, `fanContentDisclaimer`, `rightsAcknowledgedAt`).
- **400** when `rightsAcknowledged` missing/false — message names the acknowledgement so the UI can surface it (FR-006).
- Unchanged: auth, cover-image validation, response shape (plus new optional fields).

## GET /api/directory/listings — CHANGED

Suspended publishIds (either mode) are excluded from results (FR-015). No response-shape change.

## GET /api/published/:publishId/listing — CHANGED

Returns **404** when a suspension marker exists (both modes) for public callers. (Owner status comes from the notice endpoint's `suspended` flag.)

## GET /api/published/:publishId/bundle · /manifest · /assets/:assetId — CHANGED

When suspension marker `mode = "disable"` exists:

- **451**: `{ "error": { "message": "This world is temporarily unavailable." } }` — neutral wording, no accusation (FR-016). `delist` mode does not affect these routes.

## POST /api/reports/copyright — NEW

Public, no account. Turnstile-protected, IP rate-limited (reuse existing limiter with a `reports` bucket).

- **Request** (strict):

```json
{
  "vaultUrl": "https://.../guest/abc123", // required
  "reporterContact": "name@example.com", // required
  "rightsHolder": "…", // optional
  "material": "…", // optional
  "details": "…", // optional
  "turnstileToken": "…" // required
}
```

- **200**: `{ "reportId": "uuid", "receivedAt": "ISO" }` — client shows "received and will be reviewed" (no outcome promise, FR-014)
- **400**: validation failure, response lists missing required fields (FR-013 / US4-AS4)
- **403**: Turnstile verification failed
- **429**: rate limited
- Storage side effect: `moderation/reports/{reportId}.json` including server-derived `publishId` and `vaultState` (report accepted even if vault unlisted/deleted — edge case).

## Operator surface (no HTTP endpoint in v1)

Suspension markers are managed with wrangler (see [quickstart.md](../quickstart.md) runbook):

```
wrangler r2 object put codex-cryptica-statics/moderation/suspensions/<publishId>.json --file suspension.json
wrangler r2 object delete codex-cryptica-statics/moderation/suspensions/<publishId>.json
wrangler r2 object list codex-cryptica-statics --prefix moderation/reports/
```

# Data Model: Copyright and Fan-Content Notice for Public Worlds

**Date**: 2026-07-10 | **Plan**: [plan.md](./plan.md)

All schemas live in `packages/schema/src/publishing.ts` (Zod, strict objects, exported types). Storage is Cloudflare R2 under the existing `BUCKET` binding.

## 1. PublishedNotice (`published/{publishId}/notice.json`) — NEW

Per-vault legal metadata attached to a published snapshot; survives delisting, editable without republish.

| Field                  | Type                     | Rules                                                                                   |
| ---------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `schemaVersion`        | `literal(1)`             |                                                                                         |
| `publishId`            | `string`                 | trim, min 1                                                                             |
| `fanContent`           | `boolean`                | default `false`                                                                         |
| `fanContentDisclaimer` | `string?`                | trim, max 500; plain text only; empty → treated as unset (default disclaimer used)      |
| `rightsAcknowledgedAt` | `string?` (ISO datetime) | server-set when a listing PUT carries `rightsAcknowledged: true`; never client-supplied |
| `updatedAt`            | `string` (ISO datetime)  | server-set                                                                              |

**GET projection** (`PublishedNoticeView`): `fanContent`, `fanContentDisclaimer?`, plus derived `suspended: boolean` (from suspension marker head). `rightsAcknowledgedAt` is not exposed publicly.

## 2. ListingDraft — EXTENDED (write contract)

| New field              | Type            | Rules                                                    |
| ---------------------- | --------------- | -------------------------------------------------------- |
| `rightsAcknowledged`   | `literal(true)` | **required** — PUT fails 400 without it (FR-005/006/008) |
| `fanContent`           | `boolean`       | default `false` (FR-007, off by default)                 |
| `fanContentDisclaimer` | `string?`       | trim, max 500                                            |

## 3. PublicListing — EXTENDED (stored record, backward compatible)

| New field              | Type                     | Rules                                                                   |
| ---------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `rightsAcknowledgedAt` | `string?` (ISO datetime) | optional so pre-existing records still `safeParse` (FR-006 audit trail) |
| `fanContent`           | `boolean?`               | optional; absent ≡ false                                                |

`schemaVersion` stays `1`; all additions optional on the read schema. The disclaimer text itself is not duplicated into the listing — the notice sidecar is the single source (DRY).

## 4. CopyrightReport (`moderation/reports/{reportId}.json`) — NEW

| Field             | Type                                              | Rules                                                                            |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `schemaVersion`   | `literal(1)`                                      |                                                                                  |
| `reportId`        | `string`                                          | server-generated (crypto.randomUUID)                                             |
| `vaultUrl`        | `string`                                          | **required**, trim, min 1, max 500 (FR-013)                                      |
| `publishId`       | `string?`                                         | derived server-side from vaultUrl when parseable                                 |
| `rightsHolder`    | `string?`                                         | trim, max 300 — copyrighted work or rights holder                                |
| `material`        | `string?`                                         | trim, max 2000 — material believed to infringe                                   |
| `reporterContact` | `string`                                          | **required**, trim, min 3, max 300 (FR-013)                                      |
| `details`         | `string?`                                         | trim, max 5000 — supporting explanation/evidence                                 |
| `receivedAt`      | `string` (ISO datetime)                           | server-set                                                                       |
| `vaultState`      | `enum: listed \| published-unlisted \| not-found` | server-derived at intake (edge case: report accepted even if vault already gone) |

Input schema (client → worker) = the four reporter fields + `turnstileToken`; everything else server-set. Reporter data is stored only in R2, never rendered publicly (Principle V).

## 5. SuspensionMarker (`moderation/suspensions/{publishId}.json`) — NEW

| Field           | Type                      | Rules                                                                                                 |
| --------------- | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `schemaVersion` | `literal(1)`              |                                                                                                       |
| `publishId`     | `string`                  | matches object key                                                                                    |
| `mode`          | `enum: delist \| disable` | `delist`: hidden from directory only; `disable`: bundle/manifest/assets/listing also blocked (FR-015) |
| `reason`        | `string?`                 | operator note, never shown to visitors                                                                |
| `createdAt`     | `string` (ISO datetime)   |                                                                                                       |

Created/removed by operators via wrangler (see quickstart runbook). Deletion restores prior listing and access — no owner republish needed (FR-015).

## State transitions

```
Published snapshot ──(owner saves listing w/ rightsAcknowledged)──▶ Listed
Listed ──(owner deletes listing)──▶ Published-unlisted            (notice.json persists)
Listed ──(operator marker mode=delist)──▶ Suspended-delisted      (listing object intact)
Any    ──(operator marker mode=disable)──▶ Suspended-disabled     (guest GETs → 451 neutral)
Suspended-* ──(operator deletes marker)──▶ prior state restored
```

## Validation rules carried from spec

- No text field may be rendered with `{@html}`; disclaimer and listing fields are text-interpolated only (FR-011).
- Directory list/get must consult suspension markers before returning a listing (FR-015).
- 451 response body is neutral: "This world is temporarily unavailable." — no infringement claim (FR-016).

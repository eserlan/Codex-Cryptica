# Contract: oracle-proxy `/api/cloud-backup/*`

Follows the existing worker conventions in `apps/workers/oracle-proxy/src/index.ts`: CORS + rate-limit gate first, manual path/method dispatch, JSON in/out, errors as `{ error: { message } }`.

## POST /api/cloud-backup/enable

Creates the initial backup. Requires the consent screen to have already been confirmed client-side (FR-002/FR-003) — the worker doesn't re-verify consent text, it trusts that this endpoint is only called after confirmation.

- **Request body**: `{ vaultTitle: string, bundle: <vault export shape>, assets?: [{ assetId, content (base64) }] }`
- **Response 201**: `{ backupId: string, ownerCode: string, manifest: CloudBackupManifest }` — `ownerCode` is generated server-side and returned exactly once, same as `template-directory.ts`'s `ownerToken` response shape.
- **Errors**: `400` invalid bundle shape; `413` vault exceeds size limit (edge case: oversized vaults).

## POST /api/cloud-backup/{backupId}/push

Push-on-save (FR-018). Authenticated via `Authorization: Bearer {ownerCode}` header, same pattern as `template-directory.ts`'s `ownerToken()`/`authorize()` helpers.

- **Request body**: `{ vaultTitle: string, bundle: <vault export shape>, assets?: [...] }` — always a full snapshot (last-write-wins whole-vault replace, per spec Assumptions), never a delta.
- **Response 200**: `{ manifest: CloudBackupManifest }`
- **Errors**: `401` missing/invalid owner code; `404` unknown `backupId`; `413` oversized.

## GET /api/cloud-backup/{backupId}/status

- **Auth**: `Authorization: Bearer {ownerCode}`.
- **Response 200**: `{ status: "idle" | "error", lastPushedAt: string | null, sizeBytes: number }`. (`"syncing"` is a client-local transient state during an in-flight push, not something the server reports.)
- **Errors**: `401`, `404` — identical shape to a wrong code, per FR-014's "don't reveal whether a backup exists" rule.

## GET /api/cloud-backup/{backupId}/bundle

Restore (FR-006). Read-only; does not mutate `lastPushedAt` or any state.

- **Auth**: `Authorization: Bearer {ownerCode}`.
- **Response 200**: `{ manifest: CloudBackupManifest, bundle: <vault export shape> }`
- **Errors**: `401`, `404` (same undifferentiated shape as status).

## GET /api/cloud-backup/{backupId}/assets/{assetId}

- **Auth**: `Authorization: Bearer {ownerCode}`.
- **Response 200**: binary/media response, mirrors `handleGetAsset` in `publish.ts`.

## DELETE /api/cloud-backup/{backupId}

Permanent deletion (FR-010). Removes the manifest, bundle, and all assets under the `cloud-backup/{backupId}/` prefix — same `list({prefix})` + bulk-delete pattern `publish.ts`'s `handleDeleteVault` already uses.

- **Auth**: `Authorization: Bearer {ownerCode}`.
- **Response 200**: `{ deleted: true }`
- **Errors**: `401`, `404`.

_Disable (FR-009) is entirely client-local — it stops calling `push`, it does not call this endpoint. No dedicated "disable" server route exists._

## POST /api/cloud-backup/admin/lookup

Story 4 support-assisted recovery. Never reachable by end users — gated by a Worker secret, not an owner code.

- **Auth**: `Authorization: Bearer {CLOUD_BACKUP_ADMIN_TOKEN}` (Worker secret, not per-vault).
- **Request body**: `{ vaultTitle: string }` — exact or normalized-case match, not fuzzy/substring (keeps "ambiguous match" behavior predictable).
- **Response 200 (exactly one match)**: `{ matched: true, backupId, vaultTitle, sizeBytes, lastPushedAt }`
- **Response 200 (zero or multiple matches)**: `{ matched: false }` — deliberately identical shape for "not found" and "ambiguous," per the ambiguous-title edge case; the admin never learns "there are 3 vaults named X," only "try a different detail."
- **No pagination parameter, no "list all" mode exists on this endpoint at all** (FR-016).

## POST /api/cloud-backup/admin/{backupId}/reissue-code

Completes Story 4 — mints a fresh `ownerCode`, replacing the old one (the old one, if the user still had it, stops working; there is only ever one valid code per backup).

- **Auth**: `Authorization: Bearer {CLOUD_BACKUP_ADMIN_TOKEN}`.
- **Response 200**: `{ ownerCode: string }` — support relays this to the user through whatever identity-appropriate support channel they used (out of scope for this contract — a support-process concern, not an API concern).

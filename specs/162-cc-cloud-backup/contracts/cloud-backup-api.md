# Contract: oracle-proxy `/api/cloud-backup/*`

Follows the existing worker conventions in `apps/workers/oracle-proxy/src/index.ts`: CORS + rate-limit gate first, manual path/method dispatch, JSON in/out, errors as `{ error: { message } }`.

## Upload protocol

A snapshot is never sent as one body. Assets go up one request each as raw
bytes, then a commit publishes the bundle and names the assets that belong to
the snapshot. This is the same shape the publish path already uses, and it is
required rather than an optimisation: a whole vault base64-encoded inside one
JSON body exceeds the Worker's 128 MB memory ceiling during `request.json()`,
so the size check meant to reject it would never be reached.

Consequences worth stating:

- Peak memory on both ends is bounded by a single asset, not by the vault.
- No base64, so nothing is inflated by a third in transit.
- A failed asset is retried on its own instead of restarting the backup.
- Every JSON endpoint refuses an oversized body by its `Content-Length` before
  reading it.

## POST /api/cloud-backup/enable

Opens a backup and returns its ownership code. Requires the consent screen to have already been confirmed client-side (FR-002/FR-003) — the worker doesn't re-verify consent text, it trusts that this endpoint is only called after confirmation.

Writes the manifest and nothing else; content follows via the asset and commit routes.

- **Request body**: `{ vaultTitle: string }` — no vault content.
- **Response 201**: `{ backupId: string, ownerCode: string, manifest: CloudBackupManifest }` — `ownerCode` is generated server-side and returned exactly once, same as `template-directory.ts`'s `ownerToken` response shape. `manifest.sizeBytes` is `0` until the first commit.
- **Errors**: `400` missing or over-long title; `413` body larger than 8 MB.

## PUT /api/cloud-backup/{backupId}/assets/{assetId}

One file, raw bytes, `Content-Type` describing it. Authenticated via `Authorization: Bearer {ownerCode}`.

- **Request body**: the file's bytes. Not JSON, not base64.
- **Response 200**: `{ assetId: string, sizeBytes: number }`
- **Errors**: `400` invalid `assetId` (empty, over 255 chars, or containing a path separator); `404` unknown backup or wrong code; `413` the file exceeds **5 MB**, or storing it would take the vault past **50 MB**. The 413 body carries `{ error: { message, limitBytes, actualBytes } }` so the client can say how far over the user is. Re-uploading an existing asset counts its replacement, not both copies.

## POST /api/cloud-backup/{backupId}/commit

Publishes the staged snapshot (FR-018). Authenticated via `Authorization: Bearer {ownerCode}`, same pattern as `template-directory.ts`'s `ownerToken()`/`authorize()` helpers.

Writes the bundle, then the manifest, then prunes every asset the snapshot does not name — which is how a deleted image eventually leaves storage. The manifest lands after the bundle because until it does the backup still describes the previous, complete state; the prune runs last because deleting first would leave a bundle whose media is gone.

- **Request body**: `{ vaultTitle: string, bundle: <vault export shape>, assetIds?: string[] }` — always a full snapshot (last-write-wins whole-vault replace, per spec Assumptions), never a delta. The bundle is text only (entities, maps, canvases, asset manifest), so it stays small.
- **Response 200**: `{ manifest: CloudBackupManifest }` with `sizeBytes` measured from what is actually stored.
- **Errors**: `400` invalid bundle shape or asset list; `404` unknown `backupId` or wrong code; `413` body larger than 8 MB.

## GET /api/cloud-backup/{backupId}/status

- **Auth**: `Authorization: Bearer {ownerCode}`.
- **Response 200**: `{ status: "idle" | "error", lastPushedAt: string | null, sizeBytes: number }`. (`"syncing"` is a client-local transient state during an in-flight save, not something the server reports.)
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

_Disable (FR-009) is entirely client-local — it stops calling `commit`, it does not call this endpoint. No dedicated "disable" server route exists._

## POST /api/cloud-backup/admin/lookup

Story 4 support-assisted recovery. Never reachable by end users — gated by a Worker secret, not an owner code.

- **Auth**: `Authorization: Bearer {CLOUD_BACKUP_ADMIN_TOKEN}` (Worker secret, not per-vault).
- **Request body**: `{ vaultTitle: string }` — exact or normalized-case match, not fuzzy/substring (keeps "ambiguous match" behavior predictable).
- **Response 200 (exactly one match)**: `{ matched: true, backupId, vaultTitle, sizeBytes, lastPushedAt }`
- **Response 200 (zero or multiple matches)**: `{ matched: false }` — deliberately identical shape for "not found" and "ambiguous," per the ambiguous-title edge case; the admin never learns "there are 3 vaults named X," only "try a different detail."
- **No pagination parameter, no "list all" mode exists on this endpoint at all** (FR-016).
- **Scan bound**: the handler reads at most **1,000 manifest keys** per request (a single `list()` page). If the scan hits that ceiling without resolving to exactly one match it returns `{ matched: false }` and logs a bound-exceeded warning — it MUST NOT paginate onward, because an unbounded walk is bulk enumeration by another name. Revisit this design once the bucket holds more than ~1,000 backups; until then a secondary index is premature (research.md §5).

## POST /api/cloud-backup/admin/{backupId}/reissue-code

Completes Story 4 — mints a fresh `ownerCode`, replacing the old one (the old one, if the user still had it, stops working; there is only ever one valid code per backup).

- **Auth**: `Authorization: Bearer {CLOUD_BACKUP_ADMIN_TOKEN}`.
- **Response 200**: `{ ownerCode: string }` — support relays this to the user through whatever identity-appropriate support channel they used (out of scope for this contract — a support-process concern, not an API concern).

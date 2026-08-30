# Phase 0 Research: CC Cloud Backup

## 1. Ownership-code storage: hash it, don't store it plaintext

**Decision**: The worker stores only a SHA-256 hash of each backup's ownership code (`ownerCodeHash`) in R2 object `customMetadata`, never the code itself. Every request presents the raw code as a bearer credential; the worker hashes it and compares.

**Rationale**: Two existing R2-backed features in this codebase already do this differently — `template-directory.ts` hashes (`ownerTokenHash` via `hashOwnerToken()`, SHA-256), while `publish.ts` (the guest-vault-r2 feature) stores the token in plaintext (`customMetadata.writeToken`) to support update-in-place from a client-supplied token. Cloud Backup holds much more sensitive content (full private vault data, not a published/already-public guest snapshot), so it should follow the stricter precedent (`template-directory.ts`) rather than the more permissive one.

**Alternatives considered**: Plaintext storage (`publish.ts` style) — rejected because a private full-vault backup is a materially higher-value target than a guest-vault publish or template listing; hashing costs nothing extra (`crypto.subtle.digest` is already used elsewhere in this worker) and closes off a class of internal-access risk that FR-004 ("zero third-party sharing") implicitly extends to accidental/internal exposure too.

## 2. R2 key layout and bucket reuse

**Decision**: No new R2 bucket or binding. Reuse the existing `BUCKET` binding (`codex-cryptica-statics`, declared in `apps/workers/oracle-proxy/wrangler.toml`) with a new key prefix: `cloud-backup/{backupId}/manifest.json` and `cloud-backup/{backupId}/assets/{assetId}`, where `backupId` is a server-generated UUID distinct from the ownership code (the code is a credential, not an identifier/URL component).

**Rationale**: Matches the established convention — `templates/listings/...` and `published/...` already share one bucket by prefix rather than provisioning a bucket per feature. Adding a binding is unjustified infrastructure churn for a single new prefix (Principle III, YAGNI).

**Alternatives considered**: Dedicated `cloud-backup` R2 bucket — rejected; no isolation requirement justifies the operational overhead of a second bucket, and prefix-based separation is the codebase's existing pattern.

## 3. Push-on-save integration point

**Decision**: Cloud Backup push is triggered from the same save-completion hook the local-folder and Google Drive mirror syncs already use, not a new save pathway. Concretely, this means adding a new sync target to whatever dispatches `SyncStore`'s existing "on save, push to configured mirrors" step (`apps/web/src/lib/stores/vault/sync-store.svelte.ts`), following the Drive sync's own registration as a mirror rather than special-casing Cloud Backup in the save function itself.

**Rationale**: The spec (FR-018) explicitly requires parity with the Google Drive push-on-save model. `SyncStore` and `@codex/gdrive-sync`'s `pushVaultToDrive` already establish the pattern of "one function per mirror target, invoked from the same save-completion point"; adding a third mirror target is additive, not architecturally new.

**Alternatives considered**: A separate periodic/background sync loop — explicitly rejected per the spec's Assumptions (no background polling) and per the existing Google Drive precedent (`specs/096-gdrive-cloud-sync` "Is real-time background polling required? → No.").

## 4. Client-side package structure

**Decision**: New workspace package `packages/cloud-backup-sync` (mirroring `packages/gdrive-sync`'s shape: `cloud-backup-sync.ts` exporting `enableCloudBackup`, `pushVaultToCloudBackup`, `restoreVaultFromCloudBackup`, `disableCloudBackup`, `deleteCloudBackup`, `getCloudBackupOwnershipCode`; plus `runtime.ts` and `index.ts`). `apps/web` gets a thin Svelte store (`apps/web/src/lib/stores/cloud-backup.svelte.ts`, status-only, following `drive.svelte.ts`'s shape) and a Settings component (`CloudBackupSettings.svelte`, following `DriveSettings.svelte`'s shape: imports package functions directly, reads/writes the store).

**Rationale**: Principle I (Library-First) requires major features to be standalone packages with the web app as a thin UI layer over them; `gdrive-sync` is the closest sibling feature and already proves this shape works well for a "connect an external mirror to a vault" feature.

**Alternatives considered**: Folding the logic directly into `apps/web/src/lib/services/` — rejected; would violate Library-First and would make the service harder to unit-test in isolation from SvelteKit.

## 5. Admin metadata lookup (Story 4) implementation approach

**Decision**: A new worker route, `POST /api/cloud-backup/admin/lookup`, gated by the same admin-secret pattern already used for template-directory's suspension endpoints (`env.TEMPLATE_ADMIN_TOKEN`-equivalent — a new `CLOUD_BACKUP_ADMIN_TOKEN` secret). Implementation performs a bounded `env.BUCKET.list({ prefix: "cloud-backup/" })` scan, reading each manifest's `customMetadata.vaultTitle`, and returns metadata only when the query matches **exactly one** backup; two or more matches return the same "no result" response as zero matches (FR-015, FR-016, the ambiguous-title edge case).

**Rationale**: A full-bucket list-and-filter scan is a known, deliberate scale tradeoff: at expected volumes (a support-facing recovery path, not a per-request user-facing feature) this avoids standing up a secondary index (KV or D1) for a rarely-exercised, low-QPS operation (Principle III, YAGNI). The "single match or nothing" rule is enforced in the same handler, not left to a client-side filter, so FR-016 ("no bulk browsing") holds even if someone gets the admin token.

**Alternatives considered**: A KV or D1 secondary index keyed by normalized vault title — rejected for now as premature infrastructure; flagged here so it's easy to find if vault-backup volume ever makes the `list()` scan slow enough to matter. Exposing a paginated/browsable admin list endpoint — explicitly rejected; FR-016 requires it not exist at all, not just be hidden from normal users.

## 6. Encryption/access model — confirmed, not changed

**Decision**: Confirmed per spec Assumptions — server-side access control (ownership-code-gated) plus TLS in transit; no client-side/end-to-end encryption layer. Not revisited during planning; flagged again here only because it's the one Assumption with the largest blast radius if wrong (it means Cloudflare/CC infrastructure operators can technically read vault content, which is what makes the admin metadata-lookup feature possible at all without extra plumbing).

**Rationale**: No new information surfaced during planning research that changes this call. Cross-referenced here so `/speckit-analyze` or a future reviewer sees it was a conscious carry-forward, not an oversight.

## Summary of resolved unknowns

| Unknown          | Resolution                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Language/runtime | TypeScript 6.0.3, Svelte 5.55.9 (runes), SvelteKit 2, Bun 1.3.14 workspaces; Cloudflare Workers runtime for oracle-proxy (no `nodejs_compat`)  |
| Storage          | Existing R2 bucket `codex-cryptica-statics` (new `cloud-backup/` prefix); browser IndexedDB for the local backup-enabled/ownership-code record |
| Testing          | Vitest, hand-rolled in-memory `R2Bucket` mock per test file (matches `template-directory.performance.test.ts` convention)                      |
| Admin auth       | New `CLOUD_BACKUP_ADMIN_TOKEN` Worker secret, same shape as the existing template-directory admin-token gate                                   |

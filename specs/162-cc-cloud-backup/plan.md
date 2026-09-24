# Implementation Plan: CC Cloud Backup

**Branch**: `162-cc-cloud-backup` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/162-cc-cloud-backup/spec.md`

## Summary

Opt-in, consent-gated cloud backup of a vault to Codex Cryptica's own Cloudflare R2 storage, following the same directional mirror-sync model already used for Google Drive: push-on-save, manual-only restore, no background polling. Ownership (since there is no authenticated-user concept in this product) is scoped by an opaque per-vault code, hashed server-side, following the existing template-marketplace pattern rather than the guest-vault-r2 plaintext-token pattern. A narrow, admin-only metadata lookup (never content, never bulk browsing) lets support help a user who lost their code, provided the user can supply an identifying detail (the vault title).

## Technical Context

**Language/Version**: TypeScript 6.0.3; Svelte 5.55.9 (runes); SvelteKit 2
**Primary Dependencies**: Existing `@codex/gdrive-sync`-shaped package pattern (new `packages/cloud-backup-sync`); existing `schema`/Zod package (`packages/schema/src/publishing.ts`) for shared types; Cloudflare Workers runtime (`apps/workers/oracle-proxy`) — no new third-party dependency
**Storage**: Existing R2 bucket `codex-cryptica-statics` (new `cloud-backup/` key prefix, no new binding); browser IndexedDB for the local `LocalCloudBackupRecord` (ownership code, enabled state, status cache)
**Testing**: Vitest for both the new package and the worker routes; worker tests use a hand-rolled in-memory `R2Bucket` mock matching `template-directory.performance.test.ts`'s existing convention; component/store tests in `apps/web` follow the source-content and behavior test patterns already used for `ZenHeader`/`DriveSettings`-adjacent components
**Target Platform**: Browser (SvelteKit web app) + Cloudflare Workers (oracle-proxy)
**Project Type**: Web application (existing monorepo: `apps/web` + `apps/workers/oracle-proxy` + `packages/*`)
**Performance Goals**: Push-on-save must not block the local save (FR-019) — fire-and-track asynchronously, same non-blocking contract as Drive's existing push; no specific latency target beyond "doesn't stall the UI thread" (matches `specs/096-gdrive-cloud-sync`'s NFR-001 precedent)
**Constraints**: No `nodejs_compat` in the Worker (Web-standard APIs only: `crypto.subtle`, `fetch`, R2 bindings); no background polling (spec Assumptions); admin lookup MUST NOT support bulk enumeration under any parameter (FR-016) — this is a hard constraint on the contract surface, not just the default UI
**Scale/Scope**: Support-facing admin lookup (Story 4) is a low-QPS, low-volume path by design — a full-bucket `list()` scan is an accepted tradeoff at current scale (see research.md §5); revisit only if that assumption breaks

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: PASS. New standalone package `packages/cloud-backup-sync` holds all backup/restore/status logic; `apps/web` only wires a thin store + Settings component to it, and `apps/workers/oracle-proxy` only adds route handlers that call R2 directly (consistent with how `publish.ts`/`template-directory.ts` are structured today — the worker itself isn't a "web app UI layer" concern).
- **II. TDD**: PASS (planned, not yet executed). `packages/cloud-backup-sync` and the new worker routes both get unit tests before/alongside implementation; see quickstart.md.
- **III. Simplicity & YAGNI**: PASS. Reuses the existing R2 bucket (no new binding), the existing admin-token gating pattern, and the existing `SyncStore`/mirror-target integration point rather than inventing new infrastructure. The admin lookup's `list()`-scan approach is an explicit YAGNI call against building a secondary index prematurely (research.md §5).
- **IV. AI-First Extraction**: N/A — this feature has no Oracle/AI extraction surface.
- **V. Privacy & Client-Side Processing**: PASS **under the narrow opt-in remote-storage exception** added in constitution v1.5.0. That exception is conditional, so each condition is answered here rather than waved at:
  1. _Off by default_ — FR-001, verified by a task asserting a never-consented vault emits no requests.
  2. _Informed consent before the first byte_ — FR-002/FR-003. The consent copy names the data, the storage location, **the third-party infrastructure provider**, and states plainly that the backup is not end-to-end encrypted, so both CC and its host can technically read it (research.md §6).
  3. _Reversible_ — FR-009 (disable) and FR-010 (permanent delete), both self-service, no support contact required.
  4. _Local remains authoritative_ — push-on-save mirror only; FR-019 guarantees a failed push never blocks or rolls back the local save, and FR-006 forbids any automatic pull.
  5. _No onward sharing_ — FR-004, narrowed to permit only the disclosed infrastructure provider and to forbid vault content reaching analytics, telemetry or error reporting.
  6. _Internal access disclosed_ — the Story 4 admin lookup is disclosed in the consent screen (FR-002) and is scoped to metadata only, never content (FR-015).
- **VI. Clean Implementation (AI Guardrails)**: PASS (planned). `bun run lint` and `bun run test` are required gates before this is considered done, same as any other change.
- **VII. User Documentation**: REQUIRED, not yet done. A `apps/web/src/lib/config/help-content.ts` entry and a `FeatureHint` for first-time use of Cloud Backup settings must be added during implementation — tracked as a task, not a plan-time deliverable.
- **VIII. Dependency Injection**: PASS. `packages/cloud-backup-sync`'s functions take an injected `fetch`/`baseUrl` (mirrors `@codex/gdrive-sync` and `PublicTemplateDirectoryService`'s constructor-DI shape), enabling mocked tests without network access.
- **IX. Natural Language**: PASS. Spec already uses plain terms ("Cloud Backup," "ownership code") rather than jargon; carry this into UI copy during implementation.
- **X. Quality & Coverage Enforcement**: New package `packages/cloud-backup-sync` must meet the 70% goal for new packages on introduction.
- **XI. Agent Operational Protocol**: PASS. This plan only touches the files identified in Project Structure below; no unrelated refactors.
- **XII. Terminology (Labels over Tags)**: N/A — feature doesn't touch entity categorization.
- **XIII. Discovery Intent Governance**: N/A — see Discovery Intent Check below (no new public discovery page).

No unjustified violations. Complexity Tracking table is empty/omitted.

### Discovery Intent Check

_Applies only when the feature adds or materially repositions a public, indexable discovery page. N/A here — Cloud Backup is an authenticated-vault Settings feature, not a public discovery surface._

- [x] N/A — not a discovery page feature.

## Project Structure

### Documentation (this feature)

```text
specs/162-cc-cloud-backup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── cloud-backup-api.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
packages/
└── cloud-backup-sync/               # NEW — mirrors packages/gdrive-sync's shape
    ├── src/
    │   ├── cloud-backup-sync.ts     # enableCloudBackup, pushVaultToCloudBackup,
    │   │                            # restoreVaultFromCloudBackup, disableCloudBackup,
    │   │                            # deleteCloudBackup, getCloudBackupOwnershipCode
    │   ├── runtime.ts
    │   └── index.ts
    └── *.test.ts                    # co-located, per Principle X coverage goals

packages/schema/src/
└── publishing.ts                    # EXTEND — add CloudBackupManifestSchema,
                                      # LocalCloudBackupRecordSchema, SupportLookupResultSchema
                                      # alongside the existing Publish/Template schemas

apps/workers/oracle-proxy/src/
├── cloud-backup.ts                  # NEW — handleEnableCloudBackup, handlePushCloudBackup,
│                                     # handleGetCloudBackupStatus, handleGetCloudBackupBundle,
│                                     # handleGetCloudBackupAsset, handleDeleteCloudBackup,
│                                     # handleCloudBackupAdminLookup, handleCloudBackupReissueCode
├── index.ts                         # EXTEND — wire /api/cloud-backup/* routes (same
│                                     # CORS + rate-limit + dispatch pattern as
│                                     # /api/template-directory/* and /api/published/*)
├── wrangler.toml                    # EXTEND — new CLOUD_BACKUP_ADMIN_TOKEN secret,
│                                     # optional new [[ratelimits]] entry for push/enable
└── src/__tests__/
    └── cloud-backup.test.ts         # NEW — in-memory R2Bucket mock, per existing convention

apps/web/src/lib/
├── stores/
│   └── cloud-backup.svelte.ts       # NEW — thin status store, mirrors drive.svelte.ts
├── components/settings/
│   ├── CloudBackupSettings.svelte   # NEW — consent modal + status + disable/delete,
│   │                                # added into VaultSettings.svelte next to DriveSettings
│   └── VaultSettings.svelte         # EXTEND — mount CloudBackupSettings
├── stores/vault/
│   └── sync-store.svelte.ts         # EXTEND — register Cloud Backup as a push-on-save
│                                     # mirror target alongside the existing Drive target
└── config/
    └── help-content.ts              # EXTEND — Cloud Backup help entry (Principle VII)
```

**Structure Decision**: Web application monorepo, existing layout. This feature adds one new workspace package (`packages/cloud-backup-sync`, Library-First) and extends three existing surfaces (the shared `schema` package, the `oracle-proxy` Worker, and `apps/web`'s vault settings/sync-store) rather than introducing any new top-level app or infrastructure component.

## Complexity Tracking

_No unjustified Constitution Check violations — table omitted._

---

## Amendment 2026-09-24: Incremental entity sync (#3354)

**Spec**: FR-018 (amended), FR-021–FR-023, SC-009 (amended), SC-012, SC-013. **Depends on**: #3353 (`readFullEntity`, abortable snapshot builds).

### Summary

Automatic sync (#3189) made every edit re-send the whole vault: the client read every entity body to build a full snapshot, and the worker replaced one `bundle.json`. Media was already incremental via the content-hash cache. This amendment makes entities incremental too: the client tracks which entities changed in a persisted set, reads and sends only those, and the worker merges them into a sharded store. Full uploads remain for the cases where the changed set cannot be trusted (FR-023).

```text
entity save ──► updateLastInternalChange ──► onDurableVaultChange({ vaultId, kind, ids, deleted })
                                                  │  (backup enabled only)
                                                  ▼
                                    IndexedDB cloudBackupDirty  [vaultId, kind, id] → version
                                                  │  debounce (#3189)
                                                  ▼
      needsFullPush / first / v1 remote? ──yes──► full snapshot ──► POST /commit (writes v2)
                                                  │ no
                                                  ▼
                 snapshot dirty rows ──► readFullEntity(ids) ──► POST /delta { upserts, deletes }
                                                  │ 200                     │ 409 (diverged / v1)
                                                  ▼                         ▼
                     delete rows whose version still matches      pause (diverged) or full commit (v1)
```

### Design decisions

| Decision                                                        | Why                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track changes explicitly, not by hashing every entity each push | Hashing needs every body, which is the whole-vault read this removes. Change events already exist at the one durable-write chokepoint (`updateLastInternalChange`).                                                                                                                       |
| Persist the set in IndexedDB                                    | The close-time flush is best-effort (#3189). An in-memory set would lose the last edits of a session that ends before its upload.                                                                                                                                                         |
| Version-guarded clearing                                        | Clearing "everything sent" would drop an edit that lands mid-upload. Deleting a row only when its version is unchanged keeps it for the next upload (FR-022).                                                                                                                             |
| Tombstones in the same store                                    | Deletions otherwise survive in the remote copy and come back on restore (SC-013).                                                                                                                                                                                                         |
| 64 shards, not one object per entity                            | One object per entity makes a restore cost one R2 read per entity, beyond the Worker's per-request subrequest limit for large vaults. 64 shards keep a restore at ~66 reads and a small delta at a few shard rewrites, each around 1/64 of the vault, so worker CPU scales with the edit. |
| Worker merges shards, not the client                            | A client-side merge would need to download shards first. The worker already holds them; the client sends only what changed.                                                                                                                                                               |
| `/delta` refuses v1 and diverged bases with 409                 | Keeps the delta path simple (v2 only, exact base). The client falls back to a full commit for v1 and to the existing conflict pause for divergence.                                                                                                                                       |
| Bulk changes set `needsFullPush` instead of enumerating ids     | Import, reload from disk and restore bypass per-entity saves. A full upload is always correct; a partial one from an incomplete id list silently loses data.                                                                                                                              |
| Idle consistency check against `entityHashes`                   | Safety net for a code path that forgets to mark a change. Compares only entities whose bodies are already in memory, so it never triggers a whole-vault read.                                                                                                                             |

### Constitution re-check

- **V. Privacy**: unchanged exception. The same data goes to the same place; less of it per upload. Change tracking is local-only, and nothing is recorded while backup is off (FR-022), so "off means nothing leaves the device" still holds (SC-002).
- **III. Simplicity**: one new object store, one new endpoint, fixed shard count. Rejected: per-entity objects (subrequest limit), client-side shard merging (extra downloads), CRDT/field-level merge (out of scope).
- **VIII. DI**: the dirty-set store is injected into `CloudBackupStore` like the existing runtime/storage, so tests use an in-memory implementation.
- **II. TDD**: every task below lands test-first; the SC-012 read/request counts and SC-013 round-trip are asserted, not observed manually.

### Touched files

```text
apps/web/src/lib/stores/vault/registry.ts           # change records on onDurableVaultChange
apps/web/src/lib/stores/vault/entity-persistence.ts # emit entity ids / deletions
apps/web/src/lib/utils/entity-db.ts (or idb.ts)      # cloudBackupDirty object store + migration
apps/web/src/lib/stores/cloud-backup-dirty.ts        # NEW — dirty-set repository (DI)
apps/web/src/lib/stores/cloud-backup.svelte.ts       # choose full vs delta; version-guarded clear
apps/web/src/lib/services/cloud-backup-payload.ts    # delta payload builder
apps/web/src/lib/app/init/app-init.ts                # wiring; needsFullPush on bulk events
packages/cloud-backup-sync/src/cloud-backup-sync.ts  # pushDelta(); 409 → full fallback
packages/schema/src/publishing.ts                    # manifest v2 fields, delta request schema
apps/workers/oracle-proxy/src/cloud-backup.ts        # v2 commit, /delta, sharded /bundle
```

### Rollout (three PRs, each shippable)

1. **Change tracking (web only).** Change records, dirty store, bulk-change flags. Uploads stay full; tests assert the set is correct. No protocol change.
2. **Worker v2.** Sharded commit, `/delta`, shard-assembling `/bundle`, v1 still readable. Deployed before any client sends deltas; full uploads migrate backups to v2.
3. **Client delta uploads + consistency check.** Switch the automatic and manual paths to `/delta` when eligible, with the 409 fallbacks.

### Risks

- **A write path that skips `updateLastInternalChange`** would leave remote copies stale. Mitigation: the idle consistency check (FR-023) plus a test enumerating persistence entry points.
- **Two tabs of the same vault** both record into the shared store, which is safe (versions are monotonic per vault in IndexedDB), but both may upload. Automatic sync has no cross-tab coordination today; the optimistic-concurrency guard turns a duplicate delta into a 409 pause rather than a lost write. Add a `navigator.locks` upload lock in PR 3 if duplicate uploads show up in practice.
- **Shard hot spots** in a vault whose ids hash unevenly: acceptable at 64 shards and a 50 MB vault ceiling; revisit only if a shard approaches the 8 MB body limit.

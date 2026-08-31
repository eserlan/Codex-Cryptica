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
- **V. Privacy & Client-Side Processing**: PASS, with a documented, disclosed exception. This feature is inherently a departure from "prioritize client-side processing" — that's the entire point of the issue (#2593) and it's why the spec's User Story 1 makes the consent screen the load-bearing gate: off by default, explicit opt-in, plain-language disclosure of what leaves the device and why, disable/delete always available. The admin lookup (Story 4) extends this same disclosure obligation to internal support access, not just third parties (FR-002 already requires disclosing it).
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

# Research: Import Files from Another Vault

## Decision: Read the source vault directly from OPFS, not via a `.codex.zip` round-trip

**Rationale**: All vaults registered in this browser share a single OPFS root (`getOpfsRoot()`, `apps/web/src/lib/utils/opfs.ts:47`); `getVaultDir(root, vaultId)` (`opfs.ts:295-300`) resolves any vault's directory by id regardless of which vault is currently active. This is already exercised by non-active-vault reads elsewhere (`map-registry.svelte.ts:44`, `canvas-registry.svelte.ts`, `theme.svelte.ts`) and by the portable-backup export path itself (`vault-archive.ts:51-83` opens an arbitrary vault's directory and walks it). No export/download/re-upload step is needed.

**Alternatives considered**:

- Reuse the `.codex.zip` backup round-trip (the original plan for this branch): adds unnecessary UI (export, download, re-upload) for something already reachable in-browser; explicitly superseded per updated requirements.
- Cross-tab `postMessage`/BroadcastChannel to a tab with the source vault "active": unnecessary — a single tab can already read any vault's OPFS directory without activating it.

## Decision: Build the copy plan (added vs. conflicting) before writing, same principle as the original backup-import design

**Rationale**: A source file (or referenced image) is safe to add only if its relative path does not already exist in the target vault. Calculating added/conflicting sets before confirmation keeps the review understandable and prevents accidental overwrites. This logic is path-comparison-only and does not depend on whether the source came from a ZIP or a live OPFS read, so it carries over in spirit from the branch's earlier backup-based design.

**Alternatives considered**:

- Overwrite target paths after confirmation: risks losing current-vault work; out of scope per spec.
- Auto-rename every conflict: would create duplicate entity/asset files without a meaningful user decision.

## Decision: Resolve image references per selected file, not by copying every image in the source vault

**Rationale**: Entities reference images via plain string fields (`image`, `imageArtDirection` in `packages/schema/src/entity.ts:181,188`) pointing at vault-relative paths under `images/` (written by `AssetManager.saveImageToVault`, `packages/vault-engine/src/asset-manager.ts:35-72`, which also produces a `_thumb` variant). Only files the user actually selects should pull their own images along — copying the entire `images/` directory would silently import unrelated assets from files the user didn't choose, and would balloon the operation on large vaults.

**Alternatives considered**:

- Copy the whole `images/` directory: simpler but violates the "only what was selected" expectation and copies orphaned/unrelated assets.
- Require the user to manually select images too: rejected by the spec (FR-008) — image inclusion must be automatic.

## Decision: Treat `.cache/external_images/` as out of scope

**Rationale**: This is a resolved-URL cache for externally fetched images, not authoritative asset storage (see `AssetManager.resolveImageUrl`); it is regenerable and not a durable reference an entity depends on.

## Decision: Rebuild the target vault's entity index after a successful copy, using the existing hook

**Rationale**: Entities are dual-stored — as OPFS markdown files and as rows in an IndexedDB (Dexie) index (`graphEntities`, `entityContent`, `vaultMetadata`) used for search/list/graph queries. Writing OPFS files alone does not update that index. `entityStore.rebuildIndexes()` (`apps/web/src/lib/stores/vault.svelte.ts:423`) already exists for exactly this purpose and is called today after `importFromFolder`; the same call after a successful vault-to-vault copy satisfies FR-013/SC-004 (imports queryable immediately, no manual reload).

**Alternatives considered**:

- Incrementally patch the index per imported file: more efficient but adds complexity for a bulk, infrequent, user-initiated action; `rebuildIndexes()` is already the established pattern for "files landed in OPFS from outside the normal edit flow."

## Decision: New picker modal, source-vault selection built on `vaultRegistry.availableVaults`

**Rationale**: `vaultRegistry` (`apps/web/src/lib/stores/vault-registry.svelte.ts:8-144`) already lists every vault known to this browser profile independent of which is active — exactly the candidate list needed for FR-002. No existing UI lets a user browse a non-active vault's contents without switching to it (`VaultSwitcherModal.svelte` only switches/renames/deletes/loads-from-folder), so a new modal is needed for the browse-and-select step, but it can reuse `vaultRegistry`'s data and the existing confirmation-modal pattern used by the backup-restore flow.

**Alternatives considered**:

- Extend `VaultSwitcherModal.svelte` in place: rejected — its purpose (choose which vault is active) is conceptually different from "borrow files from another vault while staying here," and overloading it risks confusing the two flows.

## Decision: Keep the existing portable-backup restore-as-new-vault action unchanged

**Rationale**: Restoring an isolated `.codex.zip` backup as a brand-new vault remains the safest recovery workflow and is unrelated to this feature; the two must not be conflated (per Assumptions in spec.md).

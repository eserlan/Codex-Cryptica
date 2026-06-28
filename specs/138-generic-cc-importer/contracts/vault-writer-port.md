# Contract: VaultWriter Port (DI seam)

The engine's only path to the vault. Defined in `packages/importer/src/cc/ports.ts`. Production binding lives in `apps/web` and wraps the existing vault store (`VaultRepository.saveToDisk`, `AssetManager`); tests inject an in-memory fake. The engine MUST NOT import `@codex/vault-engine` or `apps/web` directly (Constitution VIII, FR-027/028).

## Interface

```ts
import type { Entity } from "@codex/schema";

interface VaultWriter {
  /** Find an existing entity by its durable source reference (discoverySource). */
  findBySourceRef(sourceRef: string): Promise<{ id: string } | null>;

  /** Create a new entity. Returns the assigned vault id. */
  createEntity(entity: NewEntityInput): Promise<{ id: string }>;

  /**
   * Update only the supplied fields on an existing entity; the writer MUST
   * preserve all unspecified fields (image, artDirection, soundBite, manual
   * edits). discoverySource MUST be preserved. (Clarification Q1 / FR-021.)
   */
  updateEntity(id: string, patch: EntityPatch): Promise<void>;

  /** Persist an asset; returns a vault-relative reference usable in content. */
  saveAsset(asset: AssetInput): Promise<{ ref: string }>;
}

interface NewEntityInput {
  type: string;
  title: string;
  content: string;
  lore?: string;
  tags: string[];
  connections?: Connection[]; // may be set later via updateEntity
  discoverySource: string; // "<system>:<type>:<id>"
  metadata?: Record<string, unknown>;
  parent?: string;
}

// Only the keys present are written; absent keys are left untouched.
type EntityPatch = Partial<
  Pick<
    Entity,
    | "type"
    | "title"
    | "content"
    | "lore"
    | "tags"
    | "connections"
    | "metadata"
    | "parent"
  >
>;

interface AssetInput {
  bytes: Blob | Uint8Array;
  originalName: string;
  mimeType: string;
}
```

## Behavioural contract

- `findBySourceRef` MUST be exact-string match on `discoverySource` (no fuzzy matching — FR-014/023).
- `updateEntity` MUST be a field-level merge that never clears unspecified fields (Clarification Q1).
- The engine calls `createEntity`/`updateEntity` for all included items **before** writing connections (FR-024), so connection `target` ids exist.
- The engine treats any rejected promise as a per-item failure recorded in the report; it MUST NOT roll back already-committed items but MUST avoid writing connections that depend on a failed entity (FR-026).
- `saveAsset` returns a `ref`; the engine substitutes the asset's `placementRef` token in entity content with this `ref` where applicable.

## Production binding (out of scope here, documented for the UI subissue)

The web implementation maps these calls onto the vault store: `createEntity`/`updateEntity` → build a `LocalEntity` and `repository.saveToDisk(...)`; `findBySourceRef` → scan `repository.entities` by `discoverySource`; `saveAsset` → `AssetManager.saveImageToVault` / asset persistence.

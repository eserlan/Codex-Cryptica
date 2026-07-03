# Data Model: Published Guest Vault Snapshots

This document defines the client-side settings, server-side storage layouts, and network contracts for R2 guest snapshots.

## Client-Side Metadata (Local Vault Registry)

We will persist the publishing status of vaults in the host browser's IndexedDB. We will extend the existing IndexedDB stores or store this in the browser-local campaign settings.

### Entity: `PublishRegistry`

Keeps track of local vaults that have been published to Cloudflare R2, storing the write authorization token needed to update or delete the snapshot.

```typescript
interface PublishRegistry {
  /**
   * Local vault ID (campaign ID)
   */
  vaultId: string;

  /**
   * Cloudflare R2 published ID (returned from the worker)
   */
  publishId: string;

  /**
   * The secret token used to overwrite or delete this snapshot on the server
   */
  writeToken: string;

  /**
   * ISO timestamp of the last successful publish
   */
  publishedAt: string;

  /**
   * Count summaries at last publish, for host comparison
   */
  stats: {
    entityCount: number;
    relationshipCount: number;
    assetCount: number;
  };
}
```

### Entity: `GuestHistory`

Keeps track of recently visited guest vaults in the guest browser's `localStorage`.

```typescript
interface GuestHistory {
  /**
   * The public ID of the visited guest vault
   */
  publishId: string;

  /**
   * The public-facing title of the vault
   */
  vaultTitle: string;

  /**
   * ISO timestamp of the last access
   */
  lastAccessed: string;
}
```

---

## Server-Side Storage Layout (Cloudflare R2)

The objects in Cloudflare R2 will be organized under the `published/` prefix:

### 1. Snapshot Bundle Object

- **R2 Key**: `published/${publishId}/bundle.json`
- **Body**: Sanitized JSON bundle (see schema below)
- **Object customMetadata**:
  - `writeToken`: `<secret-token>`
  - `vaultTitle`: `<vault-title>`
  - `publishedAt`: `<iso-timestamp>`
  - `entityCount`: `<count-string>`

### 2. Sanitized Guest Bundle Schema (`GuestBundle`)

The JSON structure uploaded to R2 and fetched by the guest viewer.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "schemaVersion": { "type": "integer" },
    "publishId": { "type": "string" },
    "vaultTitle": { "type": "string" },
    "publishedAt": { "type": "string" },
    "publisherVersion": { "type": "string" },
    "activeTheme": {
      "type": "object",
      "description": "Configuration object representing the active aesthetic theme"
    },
    "metadata": {
      "type": "object",
      "description": "Owner-authored world front-page metadata mirrored into the guest bundle so the guest front page can render the same cover image and briefing the host sees, without exposing edit controls.",
      "properties": {
        "description": { "type": "string" },
        "coverImage": { "type": "string" }
      }
    },
    "entities": {
      "type": "array",
      "description": "Full sanitized Entity objects (see packages/schema/src/entity.ts), including image/thumbnail asset paths so entity portraits render in the graph, sidebar, zen mode, and front page entity cards.",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "type": { "type": "string" },
          "content": { "type": "string" },
          "aliases": { "type": "array", "items": { "type": "string" } },
          "labels": { "type": "array", "items": { "type": "string" } },
          "image": { "type": "string" },
          "thumbnail": { "type": "string" }
        },
        "required": ["id", "title"]
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "sourceId": { "type": "string" },
          "targetId": { "type": "string" },
          "label": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["id", "sourceId", "targetId"]
      }
    },
    "maps": {
      "type": "array",
      "description": "Player-visible maps only (see FR-016)."
    },
    "canvases": {
      "type": "array",
      "description": "Player-visible canvases only (see FR-016)."
    },
    "assetManifest": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "assetId": { "type": "string" },
          "filename": { "type": "string" },
          "mimeType": { "type": "string" },
          "hash": { "type": "string" }
        },
        "required": ["assetId", "mimeType"]
      }
    }
  },
  "required": [
    "schemaVersion",
    "publishId",
    "vaultTitle",
    "publishedAt",
    "entities",
    "relationships"
  ]
}
```

Note: `activeTheme`, `metadata`, `maps`, and `canvases` are optional — see `packages/schema/src/publishing.ts` (`GuestBundleSchema`) for the authoritative Zod definition. Entities use the full `EntitySchema` from `packages/schema/src/entity.ts` rather than the earlier trimmed shape, so guest entities carry the same `image`/`thumbnail`/`labels`/`content` fields the host editor uses.

### 3. Snapshot Asset Object

- **R2 Key**: `published/${publishId}/assets/${assetId}`
- **Body**: Binary data of the image/asset.
- **Object customMetadata**:
  - `mimeType`: `<mime-type-string>`
  - `filename`: `<original-filename>`

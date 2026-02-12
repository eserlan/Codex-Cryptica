# Data Model: Multi-Campaign Switch

## Entities

### VaultRecord
Represents the configuration and identity of a single vault.
- `id`: string (slug, primary key)
- `name`: string (display title)
- `createdAt`: number (timestamp)
- `lastOpenedAt`: number (timestamp)
- `entityCount`: number (cached count for display in vault picker)

### VaultRegistry
A global collection of all `VaultRecord` entries.
- Stored in IndexedDB: `vaults` object store (key: `id`).
- Current Active Vault ID: Stored in `settings` store under key `activeVaultId`.

## Storage Strategy

### OPFS Structure (Primary)
```text
/ (OPFS Root)
└── vaults/
    ├── default/
    │   ├── images/
    │   ├── entity-a.md
    │   └── entity-b.md
    └── my-second-campaign/
        ├── images/
        └── entity-c.md
```

### IndexedDB Schema (v5)
```text
CodexCryptica (v5)
├── settings        # key-value pairs (activeVaultId, defaultVisibility, etc.)
├── vault_cache     # file-level caching (path → lastModified + entity)
├── chat_history    # oracle chat messages
├── world_eras      # timeline era data
└── vaults          # VaultRecord entries (keyPath: id)
```

### FSA Sync (Optional)
- User-selected directory via `showDirectoryPicker()`
- One-way export: OPFS vault → local folder
- One-way import: local folder → OPFS vault
- Handle stored in `settings` as `lastSyncHandle` for convenience

### Migration Path
- Existing users on the OPFS branch have files at the root of OPFS.
- **Auto-migration**: On first run with multi-vault support, if `vaults/` directory does not exist but `.md` files exist at root:
  1. Create a vault named "Default Vault" (id: `default`).
  2. Move all root `.md` files and the `images/` directory into `vaults/default/`.
  3. Register the `default` vault in IndexedDB.
  4. Set `activeVaultId` to `default`.
- Existing users on the FSA branch (current `main`) will start fresh with OPFS — their FSA-based data can be imported via the "Import from Folder" sync feature.

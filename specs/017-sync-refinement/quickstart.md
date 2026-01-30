# Quickstart: Sync Refinement Flow

## 1. Local Deletion
1.  Delete `images/hero.png` locally.
2.  Run Sync.
3.  Engine detects `images/hero.png` in Metadata but missing in Scan.
4.  Engine adds `hero.png` Remote ID to `deletes` plan.
5.  Worker calls `gdrive.deleteFile(remoteId)`.
6.  Metadata for `images/hero.png` is removed.

## 2. Remote Download & UI Refresh
1.  Device B updates `world.md`.
2.  Device A runs Sync.
3.  Engine detects `world.md` `remoteModified` newer than Metadata.
4.  Worker downloads `world.md`.
5.  Worker emits `PARSE_CONTENT`.
6.  Main thread calls `vault.refresh()`.
7.  Graph re-renders with new lore.

## 3. Remote Deduplication (Cleanup)
1.  Multiple files with `appProperties.vault_path == 'map.png'` exist on Drive.
2.  Sync engine `listFiles` pass identifies duplicates.
3.  Newest version is kept; older ones are moved to trash.

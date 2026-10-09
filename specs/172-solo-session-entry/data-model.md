# Data Model: Start Solo Session

No vault, IndexedDB or OPFS schema changes. Two small device-local values are stored in `localStorage` (research R2).

## SoloSession

One per vault, on this device. Key: `codex-solo-session:<vaultId>`.

| Field            | Type             | Rules                                                                                                                       |
| ---------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `version`        | `1`              | Literal. Any other value reads as no session.                                                                               |
| `id`             | `string`         | Non-empty. Generated on start.                                                                                              |
| `vaultId`        | `string`         | Non-empty. Must equal the key's vault id; a mismatch reads as no session.                                                   |
| `startedAt`      | `number`         | Epoch milliseconds, finite, > 0.                                                                                            |
| `mapId`          | `string \| null` | The chosen map, or null for no map. A map no longer in the vault is treated as null when read by the UI, but not rewritten. |
| `journalId`      | `string \| null` | The journal active when the session started, or null if the journal option was off.                                         |
| `sceneName`      | `string`         | Trimmed, at most 80 characters. Empty means no scene.                                                                       |
| `sceneSectionId` | `string \| null` | The journal section created for the current scene, or null.                                                                 |
| `lastRoll`       | `string \| null` | The last quick-roll expression that rolled successfully, at most 64 characters.                                             |

**Validation**: `parseSoloSession(raw: unknown, vaultId: string): SoloSession | null` in the engine. Anything malformed returns null, so it never throws.

**Not stored**: no entity names, no vault text, no roll results. The journal and dice history already hold those (FR-022, FR-031).

## SoloBarPreference

Per device. Key: `codex-solo-bar-minimised`. Value: `"1"` or absent.

## State transitions

```text
          start(setup)                 end(choice)
 (none) ───────────────▶  active  ──────────────────▶ (none)
                           │  ▲
     setScene / renameScene│  │ recordRoll / reload / resume
                           ▼  │
                          active
```

| Transition            | Preconditions                                                                  | Effects                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start(setup)`        | Vault open, not guest, no active session (FR-019), `isSharedPlayOn()` is false | Writes the record. If `setup.mapId` is set: select the map and set SOLO on. If `setup.journal`: `sessionJournalStore.start()` and store `journalId`. Navigate to `/map` or `/`. |
| `resume()`            | Active session                                                                 | Re-apply `setActiveSection(sceneSectionId)` when the journal is active. Navigate to the session's map or `/`. No map settings change (FR-021).                                  |
| `setScene(name)`      | Active session; name non-empty after trimming                                  | `sceneName = name`. If the session's journal is active: `createSection(name)` and store `sceneSectionId`. Otherwise `sceneSectionId = null`.                                    |
| `renameScene(name)`   | Active session with a scene                                                    | `sceneName = name`. If the section still exists in an active journal: `renameSection`.                                                                                          |
| `recordRoll(expr)`    | Active session; the roll succeeded                                             | `lastRoll = expr`.                                                                                                                                                              |
| `end({ endJournal })` | Active session                                                                 | If `endJournal` and the journal is active: `sessionJournalStore.end()`. Remove the key. Nothing else is written or deleted (FR-027).                                            |

## Derived (not stored)

- `isActive`: a valid record exists for the active vault.
- `mapAvailable`: `mapId !== null && mapId in vault.maps`.
- `journalRunning`: `sessionJournalStore.current?.status === "active" && current.id === journalId`.
- `sharedPlayBlockedReason`, `soloStartBlockedReason`: research R7.

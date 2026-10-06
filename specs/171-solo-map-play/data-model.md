# Data Model: Solo Map Play

No new store, table or file format. Two optional fields, one in-memory structure and one new journal entry type.

## Solo setting (exists, #3838)

Per map, on this device, in the existing map settings (`codex-map-settings:<mapId>`).

| Field     | Type    | Default | Notes                                                           |
| --------- | ------- | ------- | --------------------------------------------------------------- |
| `soloFog` | boolean | `false` | Fog drawn opaque in GM view. Read through `mapStore.fogOpaque`. |

No change in this feature.

## Party sight (exists, read differently on hex maps)

| Field         | Type               | Default | Notes                                                                                                                                                                                                    |
| ------------- | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visionRange` | number, grid units | `60`    | Unchanged storage. On a hex map it is shown and edited as `visionRange / gridDistance` hexes, and the reveal radius is `round(visionRange / gridDistance)` hexes. Minimum 0 hexes (the token's own hex). |

## Travel tally (new, in memory)

Per open map. Not persisted; cleared on map switch, reload or Reset.

| Field            | Type                                | Notes                                                  |
| ---------------- | ----------------------------------- | ------------------------------------------------------ |
| `lastHexByToken` | map of token id → hex               | Where each vision source token was at the last reveal. |
| `lastMove`       | `{ hexes, distance, unit } \| null` | The most recent move.                                  |
| `total`          | `{ hexes, distance, unit }`         | Sum since the map was opened or Reset.                 |

Rules:

- A move is counted when it **completes**: on drag end, or on a single-step move. While a drag is in progress, hexes are revealed live but nothing is counted, undone or recorded.
- The move runs from the hex the token was in when the move started to the hex it ends in. Ending in the starting hex counts nothing.
- `hexes` is `hexDistance(from, to)`. `distance` is `hexes * gridDistance` in `gridUnit`.
- A token placed for the first time sets `lastHexByToken` and counts no travel.
- On square and gridless maps, travel is the straight-line distance in map units. `hexes` is not shown.

## Journal: map capture switch (new optional field)

On `SessionJournal` (`session-journal-engine`), persisted with the journal in the existing `session_journals` store.

| Field             | Type              | Default                       | Notes                                                                                                                           |
| ----------------- | ----------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `captureMapMoves` | boolean, optional | treated as `true` when absent | Off stops `map-move` entries only. Dice, table and deck capture are unaffected (FR-015). No migration: old journals read as on. |

## Journal entry type `map-move` (new)

Produced from a `JOURNAL:CAPTURE` event through the existing `captureToEntryInput`, which bounds every entry.

| Field       | Value                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`      | `"map-move"`                                                                                                                                              |
| `content`   | One line, for example "Moved 3 hexes (18 mi) to 04.07, revealing 5 new hexes." Coordinates appear only when hex coordinates are shown.                    |
| `sourceRef` | `{ mapId, toHex: { q, r } \| null, hexes, distance, unit, revealed }`. Plain JSON, within the existing 4 KB bound. No map name, token name or vault text. |

State rules:

- One entry per completed move (FR-014), never one per hex crossed.
- Written only while a journal is `active`, map capture is on, SOLO is on, and the session is not a guest session (FR-017; the listener already enforces active and non-guest).

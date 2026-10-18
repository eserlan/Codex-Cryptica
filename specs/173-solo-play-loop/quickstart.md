# Quickstart: Solo Play Loop

How to check the feature end to end. The interfaces are in [contracts/solo-play-loop.md](./contracts/solo-play-loop.md) and the stored shapes are in [data-model.md](./data-model.md).

## Prerequisites

- `bun install` at the repository root.
- `bun run dev` in `apps/web`.
- A vault with:
  - at least one map;
  - two Character entities;
  - two random tables;
  - a solo session started from Play with the journal on.

## Automated checks (impacted only)

```bash
bun run test:changed
bun run lint:changed
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

## Manual scenarios

| #   | Steps                                                                                                      | Expected                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pin both tables, then tap one on the map.                                                                  | The result shows in the bar and the map does not move. The journal has the table result. (US3)                                                                                                            |
| 2   | Open Recent, choose Save to Vault on that result, keep the suggested category, and name it "Mara One-Eye". | A draft is created, the screen does not change, and a confirmation shows. The draft links to the journal entry. (US1, SC-001)                                                                             |
| 3   | Save with an empty name.                                                                                   | It is refused with a message, and nothing is created.                                                                                                                                                     |
| 4   | Generate → NPC, generate one, then save it.                                                                | The NPC generator opens. The journal gets "Generated NPC: …", then "Saved … to the Vault". (US2)                                                                                                          |
| 5   | Generate → Rumour, then close it without generating.                                                       | Nothing is recorded.                                                                                                                                                                                      |
| 6   | Choose the party (both characters), then remove one.                                                       | The bar shows the party, and a name opens its entry. The journal records each change, and the party survives a reload. (US4)                                                                              |
| 7   | Set scenes "Arrival" and "Crypt", open the scene list, open "Arrival", then return to it.                  | The list is in order with "Crypt" marked current. The journal opens filtered to "Arrival". Returning starts "Arrival (2)" at the end of the list, with its own section, and "Arrival" is unchanged. (US6) |
| 8   | With AI on, choose Oracle → How does this NPC react?                                                       | The Oracle opens with an editable question including the scene, place, party and recent results. Nothing is sent until you send it. (US5)                                                                 |
| 9   | Turn AI off.                                                                                               | The Oracle menu and shortcuts are gone, and everything else works. (SC-004)                                                                                                                               |
| 10  | Stop the journal, then open Recent.                                                                        | The note explains results are kept only while a journal runs, with an offer to start or continue one.                                                                                                     |
| 11  | At phone width, open the sheet.                                                                            | Every new action is there, grouped. (FR-026)                                                                                                                                                              |
| 12  | Delete a pinned table and a party member.                                                                  | Both disappear from the bar without errors.                                                                                                                                                               |
| 13  | Run the Phase 1 quickstart (spec 172).                                                                     | It passes unchanged. (SC-006)                                                                                                                                                                             |

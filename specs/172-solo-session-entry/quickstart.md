# Quickstart: Start Solo Session

How to check the feature works, end to end. Interfaces are in [contracts/solo-session.md](./contracts/solo-session.md) and the stored shapes are in [data-model.md](./data-model.md).

## Prerequisites

- `bun install` at the repository root.
- `bun run dev` in `apps/web`, then open a vault with at least one map (a hex map is best) and, optionally, a running Session Journal.

## Automated checks (impacted only)

Run from the repository root:

```bash
bun run test:changed          # engine, store, guard, components, nav, help-engine
bun run lint:changed
bun scripts/affected-workspaces.mjs   # then type-check each affected workspace, e.g.
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

What the automated tests must cover (the contracts give the full list):

- `packages/solo-session-engine`: parse, create, default map, scene name, quick-roll resolution. Coverage of at least 70% (Constitution X).
- `SoloSessionStore`: start, resume, reload, vault switch, scenes, end. The failure paths are a guest user, a blocked start, a journal error and a storage error.
- `solo-play-guard`: both directions blocked, and leaving shared mode always allowed.
- Components: quick roll success, error and repeat; setup defaults; the Adventure card hidden when AI is off; the end dialog's three outcomes.

## Manual scenarios

| #   | Steps                                                                                                        | Expected                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Choose **Play** in the rail.                                                                                 | The Play page shows Start Solo Session first, with Adventure Mode below it. With AI off, there is no Adventure card.                                                                                |
| 2   | Choose Start, then Start without changing anything.                                                          | The map you last had open opens with SOLO on, a journal is running, and the bar is under the header. (US1, SC-001)                                                                                  |
| 3   | Type `d20` in quick roll and press Enter, then `2d6+1`, then `xyz`.                                          | The first two show results in the bar and the map does not move. `xyz` shows an inline message. Open the dice window: both rolls are in history. Open the journal: both are recorded. (US2, SC-002) |
| 4   | Clear the quick roll box and press Enter.                                                                    | `2d6+1` rolls again.                                                                                                                                                                                |
| 5   | Set the scene to "Arrival", then "The flooded crypt".                                                        | The bar shows the latest name, and the journal has a section for each. (US5)                                                                                                                        |
| 6   | Reload the page.                                                                                             | The bar, the scene and the journal link are all back, and Play shows Resume. (US3, SC-003)                                                                                                          |
| 7   | Press `p`, try the shared-mode toggles on the graph and map, and try Share on the map and in the vault menu. | None works, and each explains why. (FR-028, SC-006)                                                                                                                                                 |
| 7b  | Open the same vault in a second tab, then end the session in the first.                                      | The second tab's bar disappears without a reload.                                                                                                                                                   |
| 8   | Switch to another vault, then back.                                                                          | The other vault has no bar; the first one's session comes back.                                                                                                                                     |
| 9   | On a phone-width window, open the sheet from the bar's button.                                               | Every action is there. (FR-013)                                                                                                                                                                     |
| 10  | End the session with "End session" and keep the journal.                                                     | The bar is gone, the journal is still running, and the map, rolls and vault are unchanged. (US4, SC-004)                                                                                            |
| 11  | Start again with no map and the journal option off.                                                          | You land on the graph with no new journal, and the bar offers Choose map.                                                                                                                           |
| 12  | Ask Cif "how do I play solo?", then "what would the goblin do?"                                              | The first is explained from the solo session guide and can point at controls. The second is directed to the Oracle. (US6)                                                                           |
| 13  | Open `/adventure` directly.                                                                                  | Adventure Mode works as before. (FR-004)                                                                                                                                                            |

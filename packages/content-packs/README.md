# @codex/content-packs

Framework-free package containing curated creature packs and the mapper that converts them into `DiscoveredEntity[]` for the in-app importer.

## What's in the box

| File                            | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `src/types.ts`                  | `CreaturePack`, `CreaturePackEntry` interfaces         |
| `src/creature-pack-registry.ts` | `listPacks()` / `getPack(id)`                          |
| `src/pack-to-discovered.ts`     | `packToDiscoveredEntities(pack, existingTitles?)`      |
| `src/packs/fantasy-bestiary.ts` | Classic Fantasy Bestiary — 15 system-neutral creatures |

## Adding a new genre pack

1. Create `src/packs/<genre>-<name>.ts` exporting a `CreaturePack` object.
2. Set a unique slug `id` (e.g. `"scifi-fauna"`).
3. Add it to the `PACKS` array in `creature-pack-registry.ts`.
4. Run `bun test` — the pack integrity test in `tests/fantasy-bestiary.test.ts` is a template; duplicate it for your new pack.

No changes to the import flow are needed (SC-006 guarantee).

## Content guidelines

- Entries must be system-neutral (no edition stat blocks, dice notation, or property scores).
- Each entry needs: `title`, `description`, `habitat`, `behaviour`, `threatLevel`, `variants[]`, `hooks[]`.
- `combatNotes` is optional; omit it rather than leaving it blank.
- Target 12–20 entries per pack.

## Running tests

```bash
bun test
bun test --coverage
```

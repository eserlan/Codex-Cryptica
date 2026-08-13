# Quickstart: Bestiary & Creature Catalogue Packs

## What ships in P1

A single "Classic Fantasy Bestiary" pack importable through the existing in-app importer, plus an
empty-vault call-to-action that points to it. No AI required.

## Try it (after implementation)

1. Open an empty vault → click **Populate with a pack**.
   _(or open the importer directly and use the **Creature Packs** section)_
2. Pick **Classic Fantasy Bestiary** → the preview lists every creature, all selected by default.
3. Deselect any you don't want → **Import**.
4. Selected creatures now exist as normal, editable `creature` entities (summary, habitat, behaviour,
   threat level, variants, story hooks). They carry the `creature-pack` label.
5. Re-open the same pack → creatures already in the vault show as existing and are deselected by
   default (no silent duplicates).

## Developer setup

```bash
# new package
bun install                      # picks up packages/content-packs

# run the package tests (TDD: write these first)
bun test packages/content-packs

# web unit/component tests
bun run --filter web test

# full gate before done (Constitution VI)
bun run lint && bun run test
```

## Key files

| Path                                                         | Role                                      |
| ------------------------------------------------------------ | ----------------------------------------- |
| `packages/content-packs/src/packs/fantasy-bestiary.ts`       | Curated P1 content                        |
| `packages/content-packs/src/pack-to-discovered.ts`           | Pure mapper → `DiscoveredEntity[]`        |
| `packages/content-packs/src/creature-pack-registry.ts`       | `listPacks()` / `getPack()`               |
| `packages/importer/src/types.ts`                             | `suggestedType` widened with `"Creature"` |
| `apps/web/src/lib/components/settings/ImportSettings.svelte` | Pack section + `mapType` creature         |
| `apps/web/src/lib/config/help-content.ts`                    | Help article                              |

## Validation checklist (maps to Success Criteria)

- [ ] SC-001: empty vault → populated in < 1 min, no manual entity creation
- [ ] SC-002: pack has 12–20 creatures
- [ ] SC-003: 100% imported as editable creature entities with all sections
- [ ] SC-004: full flow works with AI disabled
- [ ] SC-005: re-import produces no silent duplicates
- [ ] SC-006: a second genre pack can be added with content-only changes

```

```

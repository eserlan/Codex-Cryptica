# Quickstart: validate the ToV stat block import

**Contracts**: [stat-block-reader](./contracts/stat-block-reader.md) · [ai-response](./contracts/ai-response.md) · [ui](./contracts/ui.md)

## Prerequisites

- `bun install` at the repo root.
- A local vault with its game system set to **Tales of the Valiant** (Settings → Game system).
- AI available (signed in to the proxy, or your own key) for the AI scenarios.
- Reference fixtures in `packages/stat-sheet-engine/src/stat-block-reader/__fixtures__/`: at least 10 stat blocks across clean ToV text, PDF-copied text (with ligature and line-break damage), Foundry Black Flag actor JSON, one quick NPC, one 5e creature, and negatives (lore paragraph, two creatures, a PC sheet). Fixtures are open BFRD content or written for this repo, **never** copied from commercial books (FR-024).

## Automated checks (impacted only)

```sh
cd packages/stat-sheet-engine && bunx vitest run src/stat-block-reader src/stat-block
cd apps/web && bunx vitest run src/lib/components/stats/import src/lib/components/entity-detail/DetailStatsTab
bun scripts/lint-changed.mjs
bun scripts/test-changed.mjs
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```

Expected: all pass. The engine tests cover the four guarantees in the reader contract, plus the AI parser against recorded responses (no live AI in CI).

## Manual scenarios

| #   | Do                                                                                | Expect                                                                                                      | Spec           |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | New creature entity → Stats → **Import** → paste a clean ToV creature → Read      | Review matches the source field by field; Save → Monster sheet; attacks roll                                | US1 1, 5       |
| 2   | Paste a block with no languages/skills                                            | Those rows show **not found**, empty                                                                        | US1 2          |
| 3   | Paste PDF-damaged text (`2d6 +` broken across lines)                              | That value shows **check this** with the snippet; edit it; chip clears                                      | US1 3          |
| 4   | Paste a block with no HP into an entity with no sheet                             | Save disabled, "Hit Points needed"; type a value → Save enabled                                             | US1 6, FR-015a |
| 5   | Re-import a block with a different AC into a sheet where you set HP by hand       | Confirm step lists only AC; your HP and custom fields are unchanged                                         | FR-017         |
| 6   | Paste a quick NPC                                                                 | NPC sheet proposed; switch to Monster and back; leftovers listed                                            | US2            |
| 7   | New-entity form → **From stat block** → save a creature whose name already exists | Name-clash choice appears                                                                                   | US3, FR-018    |
| 8   | Paste a 5e creature in **Copy as written**                                        | "Looks like 5e" notice offering Convert                                                                     | FR-010         |
| 9   | Same creature in **Convert from 5e**                                              | Every changed/added value shows **converted** with the original; saved entity has label "Converted from 5e" | US4, FR-020    |
| 10  | Turn AI off → import                                                              | No network request (DevTools); quick-reader notice; Convert hidden                                          | US5, SC-005    |
| 11  | AI on, block the proxy in DevTools → Read                                         | Plain error; pasted text kept; Retry and quick reader offered                                               | FR-013         |
| 12  | Paste 13,000 chars                                                                | Refused before any request                                                                                  | FR-005         |
| 13  | Tick **Keep the original text in notes** → Save                                   | "Original stat block" section in the entity body; share warning was shown                                   | FR-021         |
| 14  | Switch the vault to System Neutral                                                | Import hidden on entities without a ToV sheet; still shown on one that has a ToV sheet                      | FR-002a        |
| 15  | Cancel at Review and at Confirm                                                   | Vault unchanged                                                                                             | FR-016         |

## Accuracy check (SC-002, SC-003, SC-004)

`bun packages/stat-sheet-engine/scripts/stat-block-reader-eval.ts` (added by this feature) runs the AI reader over the reference fixtures against their expected values and prints field accuracy, invented-value count and unmarked-conversion count. It is a manual run, needs AI, and is not part of CI. Targets: ≥ 95% field accuracy, 0 invented values, 0 unmarked conversions.

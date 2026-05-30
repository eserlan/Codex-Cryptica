# Quickstart: Default Art Prompts

## Goal

Validate implementation of spec `115-default-art-prompts` after tasks are complete.

## Prerequisites

- Dependencies installed with the repository's supported Bun workflow.
- Browser test environment available for Playwright checks.
- A vault with at least Character, Location, and Item-like entities.
- Advanced image generation tier or mocked E2E image generation enabled for browser tests.

## Automated Checks

Run focused resolver and integration tests:

```bash
bun run --filter schema test -- art-direction
bun run --filter web test -- image-generation
bun run --filter web test -- chat-commands
```

Run focused browser checks for draw entry points:

```bash
bun run --filter web test:e2e -- draw-button.spec.ts
bun run --filter web test:e2e -- draw-autocomplete.spec.ts
bun run --filter web test:e2e -- graph-image-gen.spec.ts
```

Run full validation before merge:

```bash
bun run lint
bun run test
```

## Manual Validation

1. Open a vault with no user-authored art direction content.
2. Draw a Character entity from the entity sidebar.
3. Confirm the generated prompt path uses Character category composition plus the active theme or global fallback.
4. Open the same entity in Zen mode and draw it.
5. Confirm Zen mode uses the same resolver behavior as the entity sidebar.
6. Open the graph context menu for the same entity and generate an image.
7. Confirm graph image generation uses the selected node's entity/category context.
8. Use `/draw character Almos` and confirm `character` supplies category context when no stronger entity category is available.
9. Use `/draw` for a known entity whose metadata category differs from the typed category hint.
10. Confirm matched entity metadata wins over the typed category hint.
11. Generate front page cover art.
12. Confirm cover generation uses world/cover context rather than entity-specific context.
13. Trigger Oracle chat draw where entity/category context exists.
14. Confirm chat draw uses that context and otherwise falls back safely.
15. Add a normal note/entity containing explicit art direction and include it in draw context.
16. Confirm user-authored art direction wins over shipped category/theme/global defaults when available.

## Regression Checks

- Existing image generation still works when no user-authored art direction exists.
- Lite tier or disabled AI still hides or blocks generation controls as before.
- Guest/demo restrictions are unchanged.
- Shipped defaults do not name living artists.
- Defaults remain concise and include the requested subject in final resolved prompts.

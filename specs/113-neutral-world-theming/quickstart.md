# Quickstart: Neutral App Chrome and World Theming

## Goal

Validate the implementation of spec `113-neutral-world-theming` after tasks are complete.

## Prerequisites

- Dependencies installed with the repository's supported Bun workflow.
- Browser test environment available for Playwright checks.
- A clean profile or cleared app appearance/theme storage for first-time-user validation.

## Automated Checks

Run the focused unit tests first:

```bash
bun run --filter schema test
bun run --filter graph-engine test
bun run --filter web test -- theme
```

Run browser checks for appearance and theme flows:

```bash
bun run --filter web test:e2e -- themes.spec.ts
```

Run full validation before merge:

```bash
bun run lint
bun run test
```

## Manual Validation

1. Clear app storage or use a fresh browser profile.
2. Open the app.
3. Confirm global chrome is neutral and not fantasy parchment.
4. Confirm a new world with no saved theme uses the `workspace` world theme, not `modern` or `fantasy`.
5. Open Appearance settings.
6. Confirm there are separate controls for App appearance and World theme.
7. Select Light, Dark, and System app appearances.
8. Confirm chrome changes while world theme remains unchanged.
9. Select at least two different world themes in two different worlds.
10. Confirm each world restores its world theme independently while chrome stays consistent.
11. Select Fantasy world theme.
12. Confirm fantasy world surfaces retain mood, but chrome remains neutral.
13. Confirm authored body content is readable and not forced into decorative display styling.
14. Confirm body/header/activity bar do not show parchment or other world textures.
15. Confirm the front-page hero on a light theme does not use a muddy dark vignette.
16. Inspect graph relationships in Fantasy; edges should support nodes rather than dominate the graph.
17. Confirm the first-pass surface set is covered: header, activity bar, footer, settings, search, front page, graph, and entity detail.

## Regression Checks

- Existing saved fantasy world should reopen with fantasy world vocabulary.
- Existing saved non-fantasy worlds should reopen with their previous world theme.
- Existing saved `modern` worlds should remain `modern`; only missing world theme values fall back to `workspace`.
- Theme preview should not persist until the user selects/saves a theme.
- Device light/dark change should affect System app appearance without changing world theme.
- Demo/shared sessions should still apply intended world theme without making chrome unreadable.

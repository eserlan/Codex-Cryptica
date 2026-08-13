# Quickstart: VTT Domain Extraction

1. Run `bun --filter map-engine test -- src/vtt.test.ts`.
2. Run `bun --filter web test -- src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`.
3. Run `bun run lint` and `bun run test` from the repository root.
4. Confirm a legacy token visibility value, an invalid selection, and an out-of-
   range turn normalize as documented.

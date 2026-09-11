# Quickstart: Implementing Oracle Adventure Mode Phase 2

This is an implementation handoff, not a substitute for generated `tasks.md`.
Read [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), and all [contracts](./contracts/) first,
plus the shipped Phase 1 spec/plan/data-model/contracts in
`specs/160-solo-adventure-mode/` — Phase 2 is additive to that architecture,
not a rewrite.

## Build order

1. Extend `packages/adventure-engine` schemas/types for `schemaVersion: 2`
   (additive `dicePresets`, `resourceCounters`, per-turn `resolvedRoll`);
   write failing tests first for: a `v1` document loading with defaulted
   Phase 2 fields, and a `v2` document round-tripping unchanged.
2. Add the pure reducer/helper functions from
   `contracts/adventure-session-tools.md` (`buildAdventureRecap`,
   `getRollHistory`, `applyStateCorrection`, dice-preset and
   resource-counter CRUD). Cover each with a success path and a meaningful
   failure path (stale-revision correction, non-finite counter value, empty
   preset expression).
3. Wire `resolvedRoll` capture into the existing turn-commit path in
   `reducer.ts` — when a committed turn resolves `pendingRoll`, snapshot its
   `dice`/outcome into the new turn's `resolvedRoll` field. No other
   turn-commit behavior changes.
4. Extend `AdventureSessionRepository` with `rename` and `duplicate` per
   `contracts/adventure-archive-management.md`. Test: empty-title rejection,
   stale-revision rejection on rename, byte-for-byte source preservation on
   duplicate, and duplicating a `duplicate-active-conflict` record.
5. Extend `AdventureManager` (`stores/oracle/adventure-manager.svelte.ts`)
   with recap/inspection derived state, `submitCorrection`, preset/counter
   actions, and resume-archived-as-active orchestration (reusing the
   existing continue-or-end offer and control-lease machinery — do not
   duplicate that logic).
6. Build the Svelte surfaces: archive toolbar (rename/duplicate/search) in
   `AdventureArchive.svelte`; recap/inspection in `AdventureStateSummary.svelte`;
   new `AdventureCorrectionForm.svelte`, `AdventureRollHistory.svelte`,
   `AdventureResourceCounters.svelte`.
7. Add help content for archive management, recap, correction, and resource
   tracking; add a `FeatureHint` on first use of state correction.
8. Add Playwright coverage for rename/duplicate/search/resume, the
   correction-vs-in-flight-turn race, an offline pass over every Phase 2
   action, and a long-session summarisation leak check exceeding the
   bounded context window.

## Required implementation patterns

- Same constructor-DI, exported-class-plus-singleton pattern as every other
  Phase 1 `adventure-engine`/repository addition.
- Keep all new domain logic in `packages/adventure-engine`; `AdventureManager`
  composes it, it does not reimplement it.
- Never introduce a code path by which `hiddenState` could reach
  `applyStateCorrection`, `buildAdventureRecap`, or any Phase 2 UI — the
  correction patch type is `VisibleStatePatch`, not the full session, by
  design (see data-model.md).
- Reuse the existing optimistic-`revision` save path for every new mutation
  (rename, correction, preset/counter changes); do not add a second
  concurrency mechanism.
- Tailwind 4 semantic tokens, Iconify classes, no `lucide-svelte` — same as
  the rest of the Adventure surface.
- An adventure with no Phase 2 data configured (no presets, no counters,
  `resolvedRoll` absent on every turn) MUST behave identically to a Phase 1
  session; verify this explicitly with a regression test that replays a
  Phase 1 scripted scenario unchanged (SC-007).

## Targeted verification

Run the exact package/app scripts discovered during implementation. At minimum:

```bash
bun test packages/adventure-engine
bun test apps/web/src/lib/services/adventure
bun test apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts
bun test apps/web/src/lib/components/oracle/adventure
bun run lint
```

Playwright journeys for archive management, correction races, and the
long-session summarisation leak check should be run against a local dev
build before considering Phase 2 complete, per the acceptance criteria in
spec.md.

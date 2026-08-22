# Quickstart: Implementing Solo Adventure Mode Phase 1

This is an implementation handoff, not a substitute for generated `tasks.md`.
Read [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), and all [contracts](./contracts/) first.

## Build order

1. Scaffold `packages/adventure-engine` and write failing tests for schema
   parsing, reducer atomicity, explicit reveals, hidden leakage, idempotency,
   pending-roll behavior, and player-safe transcript projection.
2. Implement the engine as pure TypeScript with the existing Zod dependency,
   including field/collection limits and the 32,000-character aggregate state
   ceiling. Reach the new-package 70% coverage goal before app wiring.
3. Implement the OPFS repository. Test successful save/load, failed write,
   corrupt/newer file preservation, revision conflict, archive, and backup path.
4. Implement `AdventureTurnGenerationService` over the stateless structured
   operation request (`operation`, `messages`, `schema`; no Interactions fields)
   and expose only `generateAdventureTurn` through the worker.
5. Implement current-vault context composition and prove deleted/changed source
   handling plus the canonical/provisional boundary.
6. Implement the atomic lease authority before manager commit paths, then add
   the browser heartbeat/BroadcastChannel coordinator with resume UI. Cover
   simultaneous acquisition, expiry, takeover, stale responses, and release.
7. Implement `AdventureManager` and then the smallest Svelte surfaces: start,
   play/state, pending roll, continue/end, archive list/transcript, read-only tab.
8. Add help/privacy copy, offline recovery, the configured-provider evaluation
   runner, explicit performance assertions, and remaining Playwright gates.

## Required implementation patterns

- Use constructor DI and export the class plus production singleton.
- Keep domain logic out of `oracle.svelte.ts`; it only exposes the manager.
- Use `$state.raw` plus replacement for large immutable session objects and
  `$derived` for projections. Do not use effects to initiate turn writes.
- Use Tailwind 4 semantic theme tokens and Iconify classes; never
  `lucide-svelte`.
- Preserve player input across generation, save, and offline failures. Persist a
  supplied roll outcome before resolution so retry never rerolls it.
- Announce generation, save, read-only, and roll status through the existing
  centralized accessible announcement pattern.
- Never log complete prompts, hidden state, secret leakage matches, or canonical
  lore payloads.

## Targeted verification

Run the exact package/app scripts discovered during implementation. At minimum:

```bash
bun test packages/adventure-engine
bun test packages/ai-engine
bun test packages/oracle-engine
bun run lint
bun run test
```

Then run the Adventure Playwright journeys, including two browser pages and
offline transitions. Run the app-side evaluation runner against every enabled
structured-generation provider; it must exercise the 30-turn continuity,
hidden-canary, player-agency, roll, and normal/adventure isolation datasets and
record the provider and aggregate threshold results.

Performance verification uses a warmed production build on the release
acceptance profile (current stable supported browser, at least 4 logical CPUs
and 8 GB RAM): non-model start time under 2 minutes, busy feedback within 16 ms,
turn validation/reduction p95 under 50 ms, and 100-turn restore under 2 seconds.

## Manual acceptance walkthrough

1. Open a vault, start an adventure with an existing Character and two anchors,
   and reach an actionable scene.
2. Play several turns; reload and continue from the same committed state.
3. Trigger a meaningful roll, reload while waiting, report an outcome, and
   verify it is used exactly once.
4. Trigger another roll through Codex dice; verify expression and bands were
   visible before rolling. Dismiss a third request and verify state is unchanged.
5. Open the session in a second tab. Confirm it is read-only, close/release the
   first tab, take control, and submit one non-duplicated action.
6. Change or delete an anchored record; verify the adventure remains resumable
   and identifies the unavailable source without stale lore.
7. End the adventure, open its transcript from the archive, and confirm it
   cannot be resumed or edited and no hidden state is shown.
8. Start a normal Oracle chat and verify no adventure transcript, secret, or
   provisional invention appears. Verify no adventure invention became a vault
   record.
9. Restore a supported vault backup in a clean profile and repeat Continue.
10. Go offline with an active session and verify committed state stays readable,
    a typed action is retained, and no generation request is sent. Reconnect and
    retry the same action.
11. Record a roll outcome, go offline before resolution finishes, reload, and
    verify the same result is retried without another roll.
12. Clear normal Oracle history while Adventure remains active, then end the
    Adventure while normal chat remains open; verify both histories remain
    independent.

## Stop-ship conditions

- Any partial/failed proposal changes committed visible or hidden state.
- Any hidden canary reaches a player-facing or normal Oracle surface.
- Two tabs can submit concurrently or a late former-owner response commits.
- Adventure output triggers normal discovery/archive or canonical entity writes.
- A corrupt/newer session is reset or overwritten.
- Backup/restore loses or duplicates a committed turn or pending roll.
- Offline retry loses typed input or a recorded roll outcome, or permits rerolling
  an already recorded result.
- Complete serialized state exceeds 32,000 characters or a generation request
  exceeds 96,000 characters.
- Player-character agency evaluation falls below the spec threshold.

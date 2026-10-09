# Quickstart: Solo Oracle and Threads

How to check the feature end to end. The interfaces are in [contracts/solo-oracle-threads.md](./contracts/solo-oracle-threads.md) and the stored shapes are in [data-model.md](./data-model.md).

## Prerequisites

- `bun install` at the repository root, then `bun run dev` in `apps/web`.
- A vault with at least one map, one Character and two other entries.
- A solo session started from Play with the journal on.
- For AI checks: the local worker running with a key (`bun run --cwd packages/help-engine bundle`, then `bunx wrangler dev` in `apps/workers/oracle-proxy`).

## Automated checks (impacted only)

```bash
bun run test:changed
bun run lint:changed
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

## Manual scenarios

| #   | Steps                                                                                                  | Expected                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | AI off. Yes or no → "Is the guard asleep?", Likely, Roll.                                              | An answer such as "Yes, but" with its roll appears in the bar. The journal records the question, likelihood, roll and answer. (US1) |
| 2   | Roll with no question at each likelihood.                                                              | Each gives an answer. The journal entry has no question.                                                                            |
| 3   | Set tension to 9 and ask 20 questions, then set it to 1 and ask 20.                                    | Random events come up noticeably more often at 9. Tension changes are journaled. (US2)                                              |
| 4   | With no threads, choose Random event several times.                                                    | Each event names a focus, an action and a subject, and never a thread.                                                              |
| 5   | Threads → add a mystery "Why is the keeper lying?" linked to a Character. Add a lead and an objective. | They are listed as open. Choosing the link opens the entry. The journal notes each one. (US3)                                       |
| 6   | Reload, switch to another vault and back, end the session and start a new one.                         | The three threads are still there. The other vault shows none.                                                                      |
| 7   | Close the mystery with a note, then reopen it.                                                         | It moves to closed with the note, then back to open. Both are journaled.                                                            |
| 8   | With open threads, roll random events until one points at a thread.                                    | The subject is an open thread, never a closed one.                                                                                  |
| 9   | Export the vault (.codex.zip) and import it as a new vault.                                            | The threads come along.                                                                                                             |
| 10  | Journal → Capture → turn dice off. Roll 5 times and ask once.                                          | Only the oracle answer is journaled. Rolls still show in the bar. Start a new journal: everything is on. (US4)                      |
| 11  | Turn scenes off and set a new scene.                                                                   | The scene changes in the bar, but no journal section is created.                                                                    |
| 12  | AI on. Ask Oracle → Let the Oracle run a scene.                                                        | Adventure Mode opens, continuing an existing adventure if there is one. (US5)                                                       |
| 13  | AI on. An answer → Interpret with the Oracle.                                                          | The Oracle opens with an editable question. Nothing is sent.                                                                        |
| 14  | AI off.                                                                                                | Interpret and the Adventure entry are absent. Everything else works. (SC-001)                                                       |
| 15  | Phone width (390 px): open the sheet.                                                                  | Yes or no and Threads are there, with every control usable.                                                                         |
| 16  | Run the Phase 1 and Phase 2 quickstarts (specs 172 and 173).                                           | They pass unchanged. (SC-007)                                                                                                       |
| 17  | End the solo session, open Play.                                                                       | Threads is there and can be viewed and edited with no session running. (FR-020)                                                     |
| 18  | Save to Folder, clear the browser's site data, then Load from Folder.                                  | The threads come back.                                                                                                              |
| 19  | Add threads until there are 200, then try one more.                                                    | It is refused with "This vault has 200 threads. Close or delete one to add another."                                                |

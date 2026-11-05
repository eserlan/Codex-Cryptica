# Research decisions

- **Collection migration**: Current session schema is v2 with one optional `scenarioState`. Use v3 and remove the old writable field; an additive mirror would drift. Preserve plain Adventure sessions without synthesising a quest.
- **Disclosure identity**: hidden-state.ts currently uses global baseline/event secret IDs and text-equality registration. That is unsafe for independent scenarios. Persist opaque per-scenario bindings; preserve legacy IDs and existing reveals, including references in past turns. New identical texts do not imply shared knowledge.
- **Origin identity**: SelectedRumourForPlay has a title/index/source reference but no stable batch identity. Allocate an ID at generation, keep it through retries, and pass it with typed selection. Title/index dedupe is explicitly rejected. Legacy records get an identity derived from their existing session/scenario pair, without guessing their original generation batch.
- **Background compatibility**: world-entry-background.ts serialises three situations into free-text GM threads and separate secrets. It cannot prove their pairings on load. Keep legacy material unchanged and use structured items only for newly created batches. Do not regenerate legacy backgrounds.
- **Bounds**: Existing state is limited to 32,000 characters and current scenarios allow 100 events. Use compact references/derived projections with strict aggregate validation; reject overflow instead of introducing lossy summaries or a second event store.
- **Focus**: optional attention metadata, independent of hearing/acceptance/status. Pending rolls retain their generating context, so scenario mutations wait for resolution/dismissal.
- **Stack**: #4628 merged while this work began. Branch 4573 starts from staging's merged result d5c17dbaf; the dependency is satisfied without targeting a merged feature branch.

Alternative designs rejected: one Adventure per rumour; a second Scenario repository; interpreting legacy prose as structured truth; shared reveal status by string matching; unrestricted prefix-based secret IDs; automatic history truncation; a mandatory scenario selection screen.

Equal-text secrets also need a false-positive test: a legitimate, ID-bound reveal in scenario A must not be rejected solely because the same bytes occur in unrevealed B. This permits known facts without transferring B's disclosure or associations; it does not promise semantic leak detection over arbitrary prose.

## Implementation compatibility audit (T001)

- The merged staging base is `d5c17dbaf` on 2026-11-03. It contains PR #4628, the #4623 grounding foundation; this feature branch is based on that commit.
- Singular scenario state is read by `prompt.ts`, `hidden-state.ts`, `scenario-state.ts`, the reducer's preflight, world-entry background seeding, the active rumour conflict in `AdventureSurface.svelte`, and tests for migration, prompt, long-play and manager handoff. `adventure-session.ts` writes it on new session creation; `rumour-adventure-handoff.svelte.ts` builds its seed.
- `world-entry-background.ts` treats any scenario/secret/thread as already seeded, and writes three text threads plus secrets. `world-time.ts` accepts only existing `gmThreads` IDs. New structured background items must not be fed to that legacy ID validator.
- Player prompt currently projects a single scenario and filters GM events; there is no collection-level heard/unheard projection. Reducer leakage currently considers global hidden secrets, so collection registration must be wired before turn evaluation.
- Compatibility decision: keep legacy threads and their IDs untouched, migrate old singular seeds once to heard collection items, and remove the old field from all current writes. The old fixed secret IDs are referenced by existing tests and could exist in turn reveal history; migration must preserve them as registered legacy IDs rather than replacing them.

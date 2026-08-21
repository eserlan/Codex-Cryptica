# Quickstart: Faction Turn — Influence Vertical Slice

**Feature**: 161-faction-turn-influence
**Branch**: `161-faction-turn-influence`

Orientation for whoever implements this. Read `spec.md` for _what_, `research.md` for _why these choices_, `data-model.md` and `contracts/` for _exact shapes_.

---

## The one-sentence version

A faction takes one Influence action against an entity: the world clock says whether it may act, dice decide the outcome band, AI may nudge it one step and narrate it, the GM reviews before anything is written, and the committed change to a single directed relationship is fully reversible and permanently recorded.

## The mental model

```
world clock (read-only)  →  eligible?
                                ↓
  influence stat  vs  opposition (3 tiers)  →  dice  →  mechanical band + permitted range
                                                              ↓
                                            AI picks within range (optional) + narrates
                                                              ↓
                                             PREVIEW — nothing written yet
                                                              ↓
                                          commit → stat + one directed edge + record
                                                              ↓
                                                    undo → inverse patch
```

Each layer does only what it is good at. Dice give calibrated, tunable odds. Rules give reproducibility and an audit trail. AI gives situational judgement and prose. **AI never sets a number.**

---

## Seven things that will save you hours

**1. The current world date already exists — do not add a field.**
`resolveCalendarCurrentDate()` (`packages/chronology-engine/src/calendar-view.ts:248`) returns `{year, month, day}` today, exposed as `calendarStore.calendarCurrentDate`. Its first tier reads a marker entity titled "current date" / "today" / "now" — the convention users already follow.

**2. But its third tier is the real-world date, and that is a trap.**
Tier 3 returns _today's actual date_. In a campaign set in year 640 that silently becomes 2026 and every faction is eligible forever. **Treat `source === "realWorld"` as "no world date configured"** (FR-008a) and prompt the GM instead. Write this test first.

**3. Relationships are directed and source-owned.**
`Connection` is `{target, type, strength 0–1, label}` on the **source** entity. There is no such thing as "the relationship between A and B" — only A→B and B→A. This feature writes exactly one edge, faction→target, and never touches the reverse (FR-032c). `strength` _is_ the hold.

**4. Write connections through `EntityMutationService`, never by mutating the blob.**
`addConnection` / `updateConnection` (`entity-mutations.ts:586,630`) fire callbacks that keep the inbound map and graph in sync. Direct mutation leaves derived views stale.

**5. A commit writes three places, and there is no transaction.**
Stats, the connection, and the history entry are separate async writes — `EntityMutationService` has no multi-entity transaction boundary. A partial commit is worse than a failed one: if stats land but the history entry doesn't, the GM has no record to undo and the inverse patch died with the proposal. Apply with compensating rollback and write **history last** (FR-025a, research R10).

**6. Deep-import `entityContentHash`; never the oracle-engine barrel.**
`@codex/oracle-engine`'s index re-exports `oracle-settings.svelte`, `chat-history.svelte` and `undo-redo.svelte`. Barrel-importing drags Svelte runes into `@codex/faction-engine`, which is compiled and tested _without_ the Svelte compiler. Use `@codex/oracle-engine/src/lore-delta`. Also define `Result<T, E>` locally rather than importing it from `@codex/adventure-engine` — that coupling is exactly what research R7 declined.

**7. The AI service must never reject.**
`adventure-turn-generation.service.ts` throws on bad output; this one must not. Network failure, timeout, malformed JSON, out-of-range band — all collapse to `{band: null, narrative: null, aiUsed: false}`. FR-021d makes "a turn is never blocked by AI" a hard requirement, and SC-012 tests the whole path with AI unreachable.

---

## Where things go

| What                                                | Where                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Bands, eligibility, opposition, resolution, patches | `packages/faction-engine` — package name **`@codex/faction-engine`** (new, pure, rune-free) |
| Zod schemas                                         | `packages/schema/src/faction-turn.ts` (new) + optional block on `EntitySchema`              |
| AI call                                             | `packages/ai-engine/src/faction-turn-generation.service.ts` (new)                           |
| Store                                               | `apps/web/src/lib/stores/faction-turn.svelte.ts` (new)                                      |
| UI                                                  | New tab in `EntityDetailPanel`, following `DetailTimelineTab.svelte`                        |
| Settings                                            | Section in `VaultSettings.svelte`                                                           |
| Help                                                | `apps/web/src/lib/config/help-content.ts` (Principle VII — required)                        |

**No `DB_VERSION` bump.** The `factionTurn` block nests in the entity blob and every field is optional.

---

## Build order

Follow the 16 steps in `plan.md`. The short version: schema → bands → eligibility → opposition → resolution → AI applier → patches → engine facade → atomic apply → AI service → store → settings → UI → promotion → help → **manual verification**.

Steps 1–8 are pure logic with no app scaffolding, so they are fast to write and fast to test. Do them first.

---

## The tests that matter most

| Test                                                         | Why                             |
| ------------------------------------------------------------ | ------------------------------- |
| `realWorld` source ⇒ not eligible                            | The trap above. Write it first. |
| Five bands × discard leaves vault untouched                  | SC-004                          |
| Five bands × undo restores exactly, including a clamped case | SC-005, FR-034a                 |
| Randomness off + AI off ⇒ identical result every time        | SC-006                          |
| Every AI failure mode still resolves                         | SC-012                          |
| Unclaimed target opposes at exactly the baseline             | FR-020c                         |
| Opted-out faction is indistinguishable from today            | FR-002, SC-008                  |
| A commit that fails partway leaves the vault untouched       | FR-025a                         |
| Nothing the feature does ever changes the world clock        | FR-006, SC-003                  |
| A year-only vault still resolves and gates correctly         | FR-008                          |

---

## Deliberately not in this slice

Any action but Influence · assets · goals · multi-faction World Turn · AI choosing actions or targets · Oracle/Adventure context · adventure hooks · automatic clock advancement · a GM-authored outcome ruleset.

Two things exist as recorded escape hatches rather than built work: extracting a shared preview/commit primitive with `adventure-engine` (wait for the third consumer) and moving history to its own store (only if real vaults exceed the stated scale).

---

## Before you push

`bun run lint` and `bun run test` are necessary but **not sufficient**. Drive the real path in the running app: opt in, map roles, take a turn with AI on, take one with AI off, commit, undo, promote to an event, and confirm the world clock never moved.

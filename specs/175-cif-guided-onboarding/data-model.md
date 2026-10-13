# Data Model: Cif-Guided Onboarding, Phase 1

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

All types live in `packages/onboarding-journey-engine` unless marked **(app)**. No vault, IndexedDB or OPFS schema changes, so no migration is needed.

## Goal

```ts
type Goal = "world" | "story" | "campaign";
type InvitationChoice = Goal | "explore";
```

`explore` is a choice on the invitation, not a goal. It never has a journey.

## JourneyDefinition (data, versioned)

| Field     | Type                                                     | Rules                                                                 |
| --------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| `id`      | `"worldbuilder" \| "writer" \| "rpg-gm"`                 | Unique. Stable across versions.                                       |
| `goal`    | `Goal`                                                   | One journey per goal in P1.                                           |
| `version` | positive integer                                         | Bump when steps are added, removed or reordered.                      |
| `title`   | string ≤ 60                                              | Plain language (Constitution IX).                                     |
| `steps`   | `StepDefinition[]`                                       | 2 to 6 steps. Ids unique within the journey.                          |
| `finish`  | `{ message: string; next?: GuidanceAction & { label } }` | At most one suggested next feature (FR-008). `next` runs only on tap. |

## StepDefinition

| Field          | Type                        | Rules                                                                                                               |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `id`           | kebab-case string           | Unique within the journey. Kept in progress records.                                                                |
| `instruction`  | string ≤ 160                | What to do, in plain words. Never names Cif as the content source.                                                  |
| `completeOn`   | `MilestoneMatcher`          | See below.                                                                                                          |
| `after`        | `StepId[]` (optional)       | The step only accepts its milestone once these are complete (research R3). Must reference earlier steps. No cycles. |
| `showMe`       | `GuidanceAction` (optional) | Validated by `help-engine`'s `GuidanceActionSchema`. Highlights may target shell controls.                          |
| `fallback`     | string ≤ 200                | Shown when `showMe` is absent, invalid, or its target isn't on screen (FR-014). Always present.                     |
| `anyEntryCopy` | string ≤ 160 (optional)     | Required when `completeOn` names categories. Used when the vault has none of them (R4).                             |
| `quickPrompt`  | string (optional)           | Must be a prompt in `help-engine` `QUICK_PROMPT_SETS`. Hidden when Cif or AI is unavailable (FR-018).               |

## Milestone (runtime, never stored)

```ts
type Milestone =
  | { kind: "entry-created"; category: string } // category id only
  | { kind: "connection-added" }
  | { kind: "generator-saved" }
  | { kind: "entry-found" }
  | { kind: "screen"; area: "graph" }; // state milestone (R3)
```

No field carries a name, text, entry id, connection id or label (FR-011). Each milestone carries a timestamp `at` from the injected clock, used only to compare with `startedAt`.

## MilestoneMatcher

```ts
type MilestoneMatcher =
  | { kind: "entry-created"; categories?: string[] } // omitted → any entry
  | { kind: "connection-added" }
  | { kind: "generator-saved" }
  | { kind: "entry-found" }
  | { kind: "screen"; area: "graph" };
```

## JourneyProgress (persisted per vault)

Key: `codex-onboarding-journey:<vaultId>` in `localStorage`. **(app)** persistence; the shape is defined in the engine.

| Field            | Type                                  | Notes                                                                                                                                                                 |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`         | `1`                                   | Record format version, separate from the journey version.                                                                                                             |
| `journeyId`      | JourneyDefinition id                  |                                                                                                                                                                       |
| `journeyVersion` | integer                               | The version the progress was recorded against.                                                                                                                        |
| `startedAt`      | epoch ms                              | Milestones before this are ignored (FR-012).                                                                                                                          |
| `completed`      | `StepId[]`                            | Set semantics. Each step at most once.                                                                                                                                |
| `skipped`        | `StepId[]`                            | A step is never in both lists. Completing a skipped step moves it to `completed`.                                                                                     |
| `viewing`        | `StepId \| null`                      | Set only by Back. Null means "show the first step not done". Cleared by Back to current step, by Skip on a not-done step, and by any milestone that completes a step. |
| `outcome`        | `"running" \| "exited" \| "finished"` |                                                                                                                                                                       |

Derived (not stored): `current` = `viewing` ?? the first step in definition order that is neither completed nor skipped. When none is left, the outcome becomes `finished`.

**Validation on load**: unknown `schema` → discard. `journeyVersion` older than the definition → migrate: keep ids that still exist, drop unknown ones, clear `viewing` if its step is gone. Malformed JSON → discard. Never throw.

## State transitions

```text
            start(goal)
   (none) ───────────────► running ──exit──► exited ──start(same)──► running (resume: completed kept)
                             │  ▲                    └─startOver────► running (fresh startedAt, empty lists)
           milestone/skip ───┘  │ back (viewing = previous step in definition order; cleared by returnToCurrent, a skip, or a completing milestone)
                             │
                 all steps done or skipped
                             ▼
                          finished ──startOver──► running
```

- `applyMilestone(progress, def, m, ctx)`: if not `running` or `m.at < startedAt`, no change. Otherwise every step not yet completed whose matcher matches `m`, whose `after` steps were **already complete before this milestone**, and whose category requirement resolves (R4) becomes completed. Eligibility is judged on the state before the milestone, so one milestone can never complete both a step and a step that depends on it. One milestone may still complete several independent steps (clarification Q3). The function is idempotent for repeated milestones.
- State milestones (`screen`) are applied by the app whenever the area changes **and** after every other transition, so a step whose `after` just completed while the graph is showing completes straight away.
- `skip`, `back`, `returnToCurrent` and `exit` never touch the vault. Exit sets `outcome: "exited"` and clears the session marker. Skip is a no-op on a step that is already done.
- Starting the tour exits a running journey (app store, FR-016). Starting a journey ends a running tour with `helpStore.skipTour()`.
- Only one journey is `running` per vault. Starting another goal exits the running one first (Story 4, scenario 3).

## Onboarding choice (app, device-wide)

New fields on `OnboardingStore` (`stores/ui/onboarding.svelte.ts`), with new `UI_STORAGE_KEYS`:

| Field            | Key                     | Values                                       |
| ---------------- | ----------------------- | -------------------------------------------- |
| `goalInvitation` | `codex_goal_invitation` | `"goal" \| "explore" \| "dismissed" \| null` |
| `chosenGoal`     | `codex_chosen_goal`     | `Goal \| null`, updated on every goal start  |

"Onboarded" = `helpStore.hasSeen("initial-onboarding") || goalInvitation !== null`, computed by the pure `isOnboarded()` in `onboarding-orchestrator.ts`. The orchestrator and the vault theme prompt both use it (FR-003a).

Transient (not persisted) field `firstRunGuidanceActive: boolean`, set by `OnboardingHost` while the invitation is open or a journey is running. The vault theme prompt and the phone graph coach marks wait while it is true.

## Session marker (app)

Key: `codex-onboarding-journey-active` in `sessionStorage`. Value: `{ vaultKey: string, journeyId }`. Written on start and resume, removed on exit and finish. On load, the card is restored only when the marker matches the active vault (clarification Q4).

## Journey content (P1)

| Journey      | Steps (`id` → `completeOn`, `after`)                                                                                                                                                                  | Finish `next`                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| worldbuilder | `add-place` → entry-created [location]; `add-character` → entry-created [character]; `connect` → connection-added; `see-graph` → screen graph, after [add-place, add-character, connect]              | `navigate map` ("Put your world on a map")                       |
| writer       | `add-character` → entry-created [character]; `add-place-or-note` → entry-created [location, note]; `connect` → connection-added; `find-again` → entry-found, after [add-character, add-place-or-note] | `openHelp` the canvas article ("Lay out your story on a canvas") |
| rpg-gm       | `generate` → generator-saved; `add-related` → entry-created [character, location], after [generate]                                                                                                   | `navigate map` ("Prepare a map for your table")                  |

**Why rpg-gm generates first**: every Create button opens the Guided Mode intent menu, which leads into the generator. One save therefore emits `entry-created` and then `generator-saved` (research R6). With "add, then generate", a single save would finish the journey. With "generate, then add a related entry" and before-state eligibility, it takes two real saves: the first save's `entry-created` arrives before `generate` is complete, so it can't count for `add-related`. The natural second action is **Generate related** on the first entry (existing `generate-related-button` control), which also connects the two.

Exact copy, `showMe` actions and the quick prompts are authored in the definitions during implementation and checked by the schema and render-contract tests. A journey whose `showMe` target is missing at some width relies on its `fallback`.

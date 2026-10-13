# Research: Cif Contextual Tips

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No `NEEDS CLARIFICATION` remained after the spec. This records the design decisions and what was verified in the code on 2026-10-13.

## Verified facts

- **F1. Nothing proactive exists.** `HelpAssistantStore` only answers; `quickPrompts` appear in an empty conversation. #3765 never shipped, so there is no tip setting, chip or dismissal store to reuse (`help-assistant.svelte.ts`).
- **F2. The AI gate already exists.** `isHelpAssistantAvailable()` is true only when the Cif build flag is on and `discoveryPolicyStore.aiDisabled` is false (`help-availability.ts`). The tips switch hangs off the same function (FR-002).
- **F3. The goal and setup state already exist.** `OnboardingStore.chosenGoal`, `goalInvitation` (`"goal" | "explore" | "dismissed"`), and `JourneyProgress.outcome` (`running | exited | finished`) per vault (`onboarding.svelte.ts`, `journey-store.svelte.ts`, spec 175 data model). A person who chose "Explore on my own" has `goalInvitation = "explore"` and no journey.
- **F4. Tapping a prompt already has a path.** `journey-runtime.ts` `askCif` opens the pop-out when connected, otherwise the docked panel, then calls `helpAssistant.ask(prompt)`. That is the only request path, and it needs a tap.
- **F5. Cif already degrades to a static guide.** When the service fails or is unreachable, `HelpAssistantStore.ask` builds a fallback from `FEATURE_REGISTRY` and help-article titles (`buildFallback`). So "open the static guide when Cif cannot answer" (FR-018) needs no new code.
- **F6. Verified prompts per screen exist** in `QUICK_PROMPT_SETS` for: `entity-editing`, `entity-connections`, `graph`, `canvas`, `map`, `generators`, `tables`, `import`, `settings`. Areas come from `HELP_AREAS` (`graph`, `canvas`, `map`, `generators`, `tables`, `session-hub`, ...).
- **F7. Screen arrival is observable without tracking.** `helpContext.current.area` is already reactive and is what the journey store uses for the graph step.
- **F8. Quiet signals already exist.** `isEditable(document.activeElement)` (`components/onboarding/focus.ts`), `modalUIStore.isAnyModalOpen` and `showZenMode`, `helpStore.activeTour`, `journeyStore.active`, the invitation flag in `OnboardingHost`, `helpAssistant.isOpen`, `cifPopout.connected`.
- **F9. Storage pattern.** The journey store uses an injected `StorageLike` for `localStorage` and `sessionStorage` (`browserStorage`, `browserSessionStorage` in `runtime-deps`). The tips store follows it.

## Decisions

### D1. Where the logic lives

- **Decision**: Add `tips.ts` to `packages/onboarding-journey-engine`: the catalogue, the history shape and transitions, and `decideTip()`.
- **Rationale**: Framework-free and testable without Svelte (Constitution I and II). The engine owns `Goal` and already imports `help-engine`, so a catalogue test can assert every tip's prompt is in `QUICK_PROMPT_SETS` and its feature is in `FEATURE_REGISTRY` (FR-020, SC-006).
- **Alternatives**: A new `tips-engine` package (extra workspace and dependency edge for about 150 lines; rejected, YAGNI). Putting it in `apps/web` (not framework-free testable, harder to enforce the catalogue integrity test; rejected).

### D2. One decision function, not a scheduler

- **Decision**: `decideTip(input)` returns `{ kind: "show", tip }` or `{ kind: "none", reason }`. The store calls it when the screen area changes and when a blocker clears. There are no timers, no idle detection and no queue.
- **Rationale**: Timers and idle checks are the road to behavioural surveillance (FR-012). Arrival on a screen is the only trigger the 3427 design allows.
- **Alternatives**: Delay-after-arrival timer (invites "stuck" inference; rejected). Random tip rotation (not auditable; rejected).

### D3. Reconciling "waits until I stop typing" with "no queue"

Spec Story 3 says a blocked tip waits for the block to clear; FR-015 says a blocked tip is not queued. These are reconciled as: a tip is **pending for the current screen only**. If a blocker clears while the person is still on that screen, the tip may show. If they leave the screen first, the pending tip is dropped and nothing is replayed later. At most one tip is ever pending, and the session limit (D4) means nothing accumulates.

### D4. One tip per session, defined by `sessionStorage`

- **Decision**: A `sessionStorage` flag is written when a tip is actually shown. `decideTip` returns `none("session-limit")` when it is set.
- **Rationale**: Matches clarification Q1 and the spec's definition of session (tab or window lifetime; reload keeps it). `sessionStorage` has exactly those semantics.
- **Alternatives**: In-memory flag (lost on reload, so a reload would re-show; rejected). `localStorage` timestamp (changes the meaning to "per day"; rejected by Q1).

### D5. Dismissal and silencing

- **Decision**: History stores `dismissed` tip ids, `acted` tip ids, and a per-area dismissal count. A tip in `dismissed` or `acted` is never offered again. A count of 2 for an area adds it to `silencedAreas`. Turning the setting off then on clears `silencedAreas` and counts, but keeps `dismissed` and `acted` (FR-022 says a dismissed tip does not return).
- **Rationale**: Straight from FR-021 to FR-025 and the 3427 design.

### D6. Consent: switch plus one-time question

- **Decision**: `tipsEnabled` defaults false. A separate `optInAsked` flag records the one-time question (answered or dismissed). The question shows only when: a goal was chosen (`goalInvitation === "goal"`), the active vault's setup has ended (`outcome` is `finished` or `exited`), `optInAsked` is false, `isHelpAssistantAvailable()`, and no blocker is active. Yes sets `tipsEnabled`; both answers and dismissal set `optInAsked`.
- **Rationale**: Clarification Q1 option B. Reusing `JourneyProgress.outcome` avoids a second "setup ended" record (FR-029).
- **Alternatives**: Put the question inside `JourneyFinish.svelte` (covers finish but not exit, and grows a 400-line neighbour; rejected). A modal (breaks FR-007 spirit; rejected).

### D7. Where the chip sits

- **Decision**: `OnboardingHost` renders `CifTipChip`, positioned with Floating UI against the existing Cif button (`HelpAskButton`), falling back to a fixed bottom corner when the anchor is absent. The chip is a button with a separate dismiss button, not a popover.
- **Rationale**: `OnboardingHost` already owns first-run layering, so tips cannot stack with the invitation or journey card. The activity bar is a narrow rail on desktop and a non-wrapping row on phones, so placing the chip inside it would crowd the tap targets.
- **Alternatives**: Render inside `ActivityBar` (tight on phones; rejected). A toast (competes with the notification system and auto-dismisses; rejected).

### D8. Catalogue size and content

- **Decision**: Three tips per goal, each `{ id, goal, area, featureId, label, prompt }`, where `area` is a `HelpArea`, `featureId` is in `FEATURE_REGISTRY`, and `prompt` is exactly a string in the matching quick-prompt set. The catalogue test fails if any of these drift (F6). Initial candidates:
  - **world** (Build a world): `generators` ("How do I generate a faction?"), `map` ("How do I drop a pin on the map?"), `graph` ("How do I explore how my entries relate on the graph?").
  - **story** (Write a story): `canvas` ("How do I put a character on the canvas?"), `graph` ("What is the graph for?"), `tables` ("How do I roll on a random table?").
  - **campaign** (Prepare an RPG campaign): `map` ("How do I hide parts of the map from my players?"), `tables` ("How do I roll on a random table?"), `generators` ("Should I use a generator or the Oracle to make a new NPC?").
- **Rationale**: Each prompt is already a test-verified question that finds its guide (3427 rule 4). Final tip wording is fixed copy written in tasks, never built from the vault (FR-016).
- **Note**: Tips on the same screen as the journey's own `finish.next` are skipped to avoid suggesting the same thing twice (checked in the catalogue test).

### D9. Telemetry

- **Decision**: None. No events, no counters. Success criteria are verified by tests and review, not by usage data (SC-008).
- **Rationale**: Vault privacy boundary; nothing inside the authenticated app is tracked, including first-party channels.

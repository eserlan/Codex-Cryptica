# Feature Specification: Cif-Guided Onboarding, Phase 1 (Goal-Driven First Success)

**Feature Branch**: `feat/175-cif-guided-onboarding`
**Created**: 2026-10-12
**Status**: Draft
**Input**: Epic #3994, Phase 1: optional goal choice (#3995), deterministic journey engine (#3996), and worldbuilder, writer and RPG GM first-success journeys (#3997), with the evaluation gate (#4000) tested alongside.

## Context

Codex Cryptica already has a first-run orchestrator that decides the single thing a new user sees first, a short `initial-onboarding` tour, a Getting Started checklist, per-device onboarding milestones, and Cif, the in-app product guide, which can open screens, open panels and point at controls without ever changing the vault. Today every new user gets the same generic tour, whatever they came to do.

This feature asks newcomers what they want to do and then walks them through one short, real task to a result they can see. It replaces the generic auto-started tour for brand-new users with a small, dismissible invitation. It does not add a second onboarding or tour system: it extends the existing orchestrator, Getting Started checklist, tour spotlight and Cif guidance actions.

**Cif versus the Oracle**: Cif explains how to use Codex Cryptica. The Oracle and the generators make ideas and content for the user's world. Journeys may point the user at a generator or the Oracle, but the guidance itself never writes world content.

## Clarifications

### Session 2026-10-12

- Q: Where should the running journey (current step, Show me, Back, Skip, Exit) appear on screen? → A: A small journey card of its own, docked bottom-right on desktop and as a short bottom sheet on phone, separate from the Cif panel and never darkening the screen.
- Q: Should the goal invitation also appear for users who have never been onboarded but whose vault already has entries (converted demo, imported world)? → A: Yes. Every user who is not onboarded sees the invitation once, regardless of vault content.
- Q: If the user does a journey's steps out of order, should the later step still count? → A: Yes. Any remaining step completes whenever its action happens after the journey started, and the card always shows the first step not yet done.
- Q: If the page is reloaded or the app reopened mid-journey, should the journey card come back by itself? → A: Only after a reload in the same browser session. On a later visit it stays hidden and the journey continues from Getting Started; resume prompts are left to P3 (#3999).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Choose a goal or explore alone (Priority: P1)

A newcomer opens their first vault. Instead of a tour starting by itself, a small invitation offers four choices: **Build a world**, **Write a story**, **Prepare an RPG campaign**, or **Explore on my own**. The invitation says in one line that Cif helps them use the app and the Oracle helps with ideas. They can pick a goal, pick "Explore on my own", or close the invitation. Nothing else (changelog, theme prompt, tour) appears at the same time.

**Why this priority**: The invitation is the single entry point for everything else, and it is also the opt-out. Shipped alone, it already replaces an unrequested tour with a choice and offers the existing tour on request.

**Independent Test**: Start a fresh device profile, create an empty vault, and confirm the invitation appears alone. Then check each of the four choices and the close action, and confirm the expected outcome with no request sent to any AI service.

**Acceptance Scenarios**:

1. **Given** a user who has not completed or dismissed onboarding, whether their vault is empty, converted from a demo or imported, **When** the vault finishes loading and no dialog is open, **Then** the goal invitation appears and the `initial-onboarding` tour does not start by itself.
2. **Given** the invitation is showing, **When** the user chooses "Explore on my own", **Then** the invitation closes, no journey starts, and the user is offered (not forced) the existing short tour in one tap, with a note that guided setup can be started later from Getting Started.
3. **Given** the invitation is showing, **When** the user closes it (close button or Escape), **Then** it does not reappear on later visits, no tour starts, and guided setup stays available from Getting Started.
4. **Given** the invitation is showing, **When** the user chooses a goal, **Then** the matching journey starts at its first step and the choice is remembered on this device only.
5. **Given** a returning user who already completed or dismissed the existing tour before this feature shipped, **When** they open the app, **Then** they do not see the invitation.
6. **Given** a guest viewing a shared world, a demo session, a `?demo=` link, the welcome landing layer, or the vault switcher, **When** the app evaluates what to show first, **Then** the invitation does not appear.
7. **Given** a user with AI disabled, **When** the invitation shows, **Then** all four choices work and the copy does not promise AI help.

---

### User Story 2 - Complete a guided first-success journey (Priority: P1)

Having picked a goal, the user follows a short sequence of steps shown in a small journey card (bottom-right on desktop, a short bottom sheet on phone) that does not open Cif or darken the screen. Each step says in plain words what to do next, and offers to show where by opening the right screen or highlighting the right control, but only when the user taps to accept. A step completes when the user actually does the thing, as the app can observe it (for example, an entry of the right kind now exists), not when they tap "Next" or Cif says so. Every step has Back, Skip and an exit. At the end the user sees what they achieved and at most one suggested next feature.

**Why this priority**: This is the "first success" the epic is about. The invitation (Story 1) is only worth having if choosing a goal leads somewhere useful.

**Independent Test**: For each goal, start the journey on an empty vault and complete every step using only normal app controls. Confirm that each step advances only after the real action, that the finish screen appears, and that the vault contains only what the user created themselves.

**Acceptance Scenarios**:

1. **Given** a running journey step that asks for a new character, **When** the user creates an entry in the Character category, **Then** the step is marked complete and the next step is shown.
2. **Given** a running journey step, **When** the user taps "Show me", **Then** the app opens the allowed screen or highlights the allowed control for that step, and nothing in the vault changes.
3. **Given** a running journey step, **When** the user does not tap "Show me", **Then** no navigation, highlight or panel change happens by itself.
4. **Given** a step whose highlight target is not on screen at the current screen size (for example, a desktop-only control on a phone), **When** the user taps "Show me", **Then** the step falls back to its written instructions instead of highlighting nothing.
5. **Given** a running journey, **When** the user taps Skip, **Then** that step is recorded as skipped and the next step is shown. **When** they tap Back, **Then** the step before the one on screen (in journey order) is shown again without undoing anything in the vault, and a "Back to current step" button returns to the first step not yet done. Skip is not offered on a step that is already done.
6. **Given** a running journey, **When** the user exits it, **Then** guidance stops immediately, nothing in the vault is changed or removed, and the journey can be restarted from Getting Started.
7. **Given** all steps of a journey are completed or skipped, **When** the last one resolves, **Then** a finish message names what the user did and offers at most one next feature, which they can accept or ignore.
8. **Given** AI is disabled or the device is offline, **When** the user runs any journey, **Then** every step, "Show me" action and completion check still works, using the written instructions.

---

### User Story 3 - Three goal journeys that match real workflows (Priority: P1)

Each goal has its own journey, built only on features that exist today:

- **Build a world (Worldbuilder)**: add a place, add a character, connect the two, and see the connection on the Graph.
- **Write a story (Writer)**: add a character and a place or story note, link them, and find one of them again through search or the explorer. No beat-sheet or manuscript features.
- **Prepare an RPG campaign (RPG GM)**: use an existing generator (for example NPC or Settlement) to prepare an NPC or location and save it to the vault, then add a second NPC or location for it (for example with Generate related).

**Why this priority**: The engine (Story 2) needs real journeys to be worth anything, and the epic's definition of a first release requires all three.

**Independent Test**: Run each journey on desktop, tablet and phone viewports on an empty vault. Each one must reach its finish milestone using only controls that render at that size.

**Acceptance Scenarios**:

1. **Given** the Worldbuilder journey, **When** the user has created a Location entry and a Character entry, connected them, and opened the Graph, **Then** the journey finishes.
2. **Given** the Writer journey, **When** the user has created a Character entry and a Location or Note entry, connected them, and opened one of them from search or the explorer, **Then** the journey finishes.
3. **Given** the RPG GM journey, **When** the user has saved a generator result to the vault and then, in a separate action, created a further Character or Location entry, **Then** the journey finishes. A single save never finishes it.
4. **Given** the RPG GM journey with AI disabled, **When** the user reaches the generator step, **Then** the step works with the generator's non-AI mode.
5. **Given** a vault that already has entries of the required kind when the journey starts, **When** a step is shown, **Then** it still asks for a new action and does not count earlier entries (so a converted demo or imported vault does not finish the journey instantly).
6. **Given** the Worldbuilder journey is showing "add a place", **When** the user creates a Character entry first, **Then** the later "add a character" step is marked complete, the card keeps showing "add a place", and once the place is added it moves straight to the next step not yet done.

---

### User Story 4 - Start or restart guided setup later (Priority: P2)

A user who chose "Explore on my own", closed the invitation, exited a journey or finished one can start guided setup again from the existing Getting Started checklist in Help: pick a goal, change goal, or replay.

**Why this priority**: Without it, dismissing the invitation is permanent, which would make the opt-out costly. It is P2 because the first-run path (Stories 1 to 3) delivers value without it.

**Independent Test**: Dismiss the invitation, open Help, start the Writer journey from Getting Started, exit it, and start it again.

**Acceptance Scenarios**:

1. **Given** the user has dismissed the invitation, **When** they open Getting Started, **Then** they can start any of the three journeys.
2. **Given** a journey was exited partway, **When** the user starts it again from Getting Started, **Then** it starts from the first step that is not yet complete, and offers to start from the beginning instead.
3. **Given** a journey is already running, **When** the user picks a different goal from Getting Started, **Then** the running journey stops and the new one starts. No two journeys or a journey and a tour ever run at once.

---

### Edge Cases

- **Demo conversion**: a user who converts a demo into their own vault and was never onboarded sees the invitation once, like any other user who isn't onboarded. Demo entries never count towards journey steps (see Story 3, scenario 5).
- **Imported or existing vault**: same rule. A user who isn't onboarded sees the invitation once and can decline it. They are never forced into a beginner flow, and existing entries never complete steps.
- **Renamed or removed categories**: if the vault has no Location (or Character, or Note) category, a step that needs that category accepts any new entry instead and changes its wording to match. It never asks for a category the user cannot create.
- **Entry deleted after a step completed**: a completed step stays complete. Journeys record what the user did and do not re-check the vault.
- **Vault switched mid-journey**: the journey pauses. Progress is kept per vault. Journey progress belongs to the vault it started in, not to the device as a whole.
- **Same event repeated** (several entries created in one batch, the same connection reported twice): each step completes at most once. One batch may complete several different steps (for example a place and a character created together), and the card then shows the first step still not done.
- **Dialog opens over a journey** (entity editor, generator, settings): the journey card stays out of the way, does not steal focus, and the step can complete while the dialog is open (for example, saving from the generator).
- **Cif panel open, closed or popped out**: the journey card and its "Show me" actions live in the main window, so journeys work the same way whether the Cif panel is closed, open or popped out into its own window.
- **Journey content updated in a later release**: progress saved against an older version of a journey is mapped to steps that still exist. Unknown steps are dropped, and the user is never stuck on a step that no longer exists.
- **Reload mid-journey**: within the same browser session the journey card comes back on the first step not yet done. On a later visit (new browser session) it does not come back by itself. Progress is kept, and the journey continues from Getting Started.
- **Storage unavailable** (private mode, quota): journeys still run for the session. Progress simply is not kept after reload.
- **Changelog or theme prompt** while onboarding is in progress: they wait until the user is not in the invitation or a journey.
- **Tour started during a journey** (from Help replay): the journey stops, keeps its progress, and can be continued from Getting Started.

## Requirements _(mandatory)_

### Functional Requirements

**Invitation and goal choice**

- **FR-001**: The system MUST show brand-new users a small, dismissible goal invitation in place of the auto-started `initial-onboarding` tour. A brand-new user is someone with no record of completing or dismissing the existing tour or this invitation. How many entries the vault already has does not matter.
- **FR-002**: The invitation MUST offer exactly four choices (Build a world, Write a story, Prepare an RPG campaign, Explore on my own) and a close action, and MUST explain in one plain sentence that Cif helps with using the app and the Oracle helps with ideas.
- **FR-003**: The decision to show the invitation MUST go through the existing single first-run decision point, so the invitation, the tour, the changelog and other first-run prompts never appear at the same time.
- **FR-003a**: Every first-run prompt that today waits for the tour to be completed (for example the vault theme prompt) MUST treat a user as onboarded once they have completed the tour **or** answered, explored or closed the invitation, and MUST wait while the invitation is open or a journey is running.
- **FR-004**: The invitation MUST NOT appear for guests, demo sessions, `?demo=` links, while the welcome landing layer or vault switcher is showing, while any dialog is open, or for users who completed or dismissed onboarding before.
- **FR-005**: "Explore on my own" MUST close the invitation and offer the existing short tour as an optional one-tap action. It MUST NOT start the tour by itself.
- **FR-006**: Closing the invitation or choosing "Explore on my own" MUST be remembered on the device so the invitation does not reappear, and MUST leave guided setup available from Getting Started.
- **FR-007**: The chosen goal MUST be explicitly picked by the user and kept only on this device. It MUST NOT be inferred from vault content.

**Journey engine**

- **FR-008**: Journeys MUST be written as declarative, versioned definitions: a goal, ordered steps, any feature a step needs, the allowed "Show me" action for each step, the observable milestone that completes it, written fallback instructions, and at most one suggested next feature at the end.
- **FR-009**: One journey runner MUST run all three journeys. Adding or changing a journey MUST NOT require changing the first-run decision point or the screens themselves.
- **FR-010**: A step MUST complete only on an observable milestone the app already knows about: an entry of a given category was created, a connection was added, a screen was opened, an entry was opened from search or the explorer, or a generator result was saved. It MUST NOT complete on a "Next" tap or on anything Cif says.
- **FR-011**: Milestones MAY include the category of a new entry. They MUST NOT read or store entry names, text, identifiers or connection labels.
- **FR-012**: Only milestones that happen after the journey started MUST count. Any step not yet done MUST complete when its milestone happens, whatever its position, and the journey card MUST always show the first step that is not yet done or skipped.
- **FR-013**: "Show me" actions MUST be limited to the existing Cif guidance action types (open an allowed screen, open help, open an allowed panel, highlight an allowed control, open the generator workflow). They MUST run only after the user taps to accept, and MUST NOT create, edit or delete vault content, change sharing or table permissions, or start anything external.
- **FR-014**: Before running a "Show me" action, the system MUST check that it is valid for the current screen, screen size and permissions. If not, it MUST show the step's written instructions instead.
- **FR-015**: Each step MUST offer Back, Skip and Exit. Back and Skip MUST NOT change the vault. Exit MUST stop all guidance immediately.
- **FR-016**: Only one journey, or one tour, may run at a time. Starting the tour stops a running journey (its progress is kept, as on Exit). Starting a journey ends a running tour.
- **FR-016a**: The running journey MUST be shown in its own small card, docked bottom-right on desktop and tablet and as a short bottom sheet on phone. The card MUST NOT open the Cif panel, MUST NOT darken or block the rest of the screen, and MUST work the same whether Cif is closed, open or popped out.
- **FR-017**: Journeys MUST be fully usable with AI disabled, with no AI help available, and offline. Showing the invitation, choosing a goal, running steps and completing milestones MUST NOT send any request to an AI service. A request is allowed only when the user explicitly asks Cif a question.
- **FR-018**: A step MAY offer an existing Cif quick prompt as an optional "Ask Cif" link. It MUST be hidden when Cif is unavailable or AI is disabled.

**Journey content**

- **FR-019**: The system MUST provide three journeys (Worldbuilder, Writer, RPG GM) whose steps and finish milestones match User Story 3. They MUST be built only from controls and features that exist in the current app on desktop, tablet and phone.
- **FR-020**: The RPG GM journey's generator step MUST work with the generator's non-AI mode.
- **FR-021**: Journey copy MUST be plain language and MUST keep Cif (how to use the app) distinct from the Oracle and generators (ideas and content).
- **FR-022**: Each step that offers a highlight MUST point at a control registered as an allowed highlight target. New targets needed for onboarding (the Create buttons, including the graph empty-state button, the Graph button in the activity bar, and the search field) MUST be added to that list and tested to render at the screen sizes the step supports.

**Progress and restart**

- **FR-023**: The system MUST keep a minimal journey progress record on the device, per vault: goal, journey version, completed, skipped and current step identifiers, and whether the journey was dismissed, exited or finished. It MUST NOT contain conversation text, vault content, entry names or identifiers.
- **FR-024**: The progress record MUST be readable by later phases (contextual tips, resume and graduation) without a migration, and MUST tolerate journey version changes (see Edge Cases).
- **FR-024a**: After a page reload within the same browser session, a running journey MUST reappear on its first step not yet done. In a new browser session it MUST NOT reappear by itself, and MUST be continued from Getting Started.
- **FR-025**: The existing Getting Started checklist MUST let users start any journey, restart one, or switch goal. These controls MUST work without AI.

**Accessibility**

- **FR-026**: The invitation and journey card MUST use semantic buttons with accessible names and MUST work entirely by keyboard. Escape closes the invitation (as Close). Escape with focus inside the journey card collapses it to its pill and never exits the journey. Both MUST return focus to a sensible place when closed or collapsed.
- **FR-027**: The invitation and journey steps MUST NOT steal focus from an editor or input the user is typing in. Step changes and completions MUST be announced politely to screen readers.
- **FR-028**: Touch targets MUST be at least 44 by 44 pixels. On phones the journey card MUST NOT cover the control the current step points at.

### Key Entities

- **Goal**: what the user wants to do first: world, story, campaign, or explore alone. Chosen explicitly, kept on the device.
- **Journey**: a versioned definition for one goal: ordered steps and an optional suggested next feature.
- **Step**: one thing to do. It has plain-language instructions, an optional "Show me" action, an optional "Ask Cif" quick prompt, a completion milestone, and fallback instructions.
- **Milestone**: an observable, content-free event: an entry of a category was created, a connection was added, a screen was opened, an entry was opened from search or the explorer, a generator result was saved.
- **Journey progress**: per vault, on the device: goal, journey version, step states (complete, skipped, current) and outcome (dismissed, exited, finished).
- **Onboarding choice**: whether the invitation was shown, closed or answered, used to decide whether a user is brand-new.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-002**: In automated tests, all three journeys can be completed on desktop, tablet and phone viewports, with AI enabled and with AI disabled.
- **SC-003**: Zero AI requests are sent during page load, invitation display, goal choice, step display, "Show me" actions or milestone completion, verified by test.
- **SC-004**: Zero vault changes come from the guidance itself. Every entry or connection that exists after a journey was made by a user action, verified by test.
- **SC-005**: In no tested state do two first-run prompts (invitation, tour, changelog, theme prompt) appear at once.
- **SC-006**: Every highlight target used by a journey is confirmed by test to render at each screen size where that step offers "Show me". Where it does not render, the step shows written instructions.
- **SC-007**: Users who dismiss the invitation or choose "Explore on my own" are not shown it again, and can start guided setup from Getting Started in 2 taps or fewer from the Help panel.
- **SC-008**: The stored progress record contains no entry names, text or identifiers, verified by test.
- **SC-009**: The invitation, journey card and Getting Started controls pass an automated accessibility check with no serious or critical violations, and can be completed by keyboard alone.

## Assumptions

- "Brand-new user" uses existing device-local records. A user who already completed or dismissed the `initial-onboarding` tour counts as onboarded and sees nothing new.
- The existing short tour stays available unchanged, from "Explore on my own" and from the existing replay button in Help.
- A step's required category matches the vault's default categories (Character, Location, Note). Custom vaults fall back to "any new entry" (see Edge Cases).
- "Find it again" for the Writer journey counts as opening an entry from search or the explorer. No new search feature is needed.
- The RPG GM journey uses the existing generator workflow and its save-to-vault action. Which generator is suggested first (NPC or Settlement) is a content decision for planning, and the user can pick any.
- Progress is kept per vault on the device. It is not synced and not part of the vault files.
- Measurement of first-success rates uses existing local milestones and optional user testing. No new remote analytics is added. Funnel events stay under the existing privacy rules.
- Out of scope: goal-aware contextual tips and the "Show tips from Cif" setting (#3998), resume prompts on a later visit and gradually quieter guidance (#3999). This phase's progress record is designed so they can build on it.

## Dependencies

- Existing first-run decision point and the `initial-onboarding` tour (#1777, #1780).
- Existing Getting Started checklist and per-device onboarding milestones (#1786, #1791).
- Existing Cif guidance action types, their validation and runner, and the highlight service (#3827).
- Existing Cif quick prompts (#3616).
- Existing generator workflow with non-AI mode.

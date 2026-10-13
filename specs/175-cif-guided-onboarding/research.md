# Research: Cif-Guided Onboarding, Phase 1

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-12

Each item records a decision, why, and what else was considered. All findings come from reading the current code on `staging` (c041a4053).

## R1. Where the journey logic lives

**Decision**: A new framework-free workspace package, `packages/onboarding-journey-engine`. It holds the journey and step types, the Zod schema for journey definitions, the pure progress reducer (start, apply milestone, skip, back, exit, version migration), category-requirement resolution, and the three journey definitions as data modules. It depends on `help-engine` for `GuidanceActionSchema` and `ControlId`, and on `zod`.

**Rationale**: Constitution I (Library-First) and XIV. The state machine and journey content have no Svelte or browser dependency, so they are unit-testable with `bun test` and reach the 70% coverage goal for new packages (X). This follows the precedent of `solo-session-engine` and `session-journal-engine`.

**Alternatives considered**:

- _Inside `help-engine`_: rejected. `help-engine` is Cif's product knowledge (registry, retrieval, prompts, actions) and is bundled for the Worker. Journeys are a client-side onboarding concern, and putting them there widens a package that already has a clear job.
- _Inside `apps/web/src/lib/app/onboarding/`_: rejected for the logic (Library-First). The app keeps only the adapters, the store and the UI.

## R2. How milestones are observed without reading content

Every milestone the spec needs already has a content-free source. The app adapter turns each source into a milestone at once and keeps nothing else.

| Milestone                    | Source today                                                                                                                                                                                                                                                                             | What is read                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `entry-created` + `category` | `vaultEventBus` `BATCH_CREATED` (`apps/web/src/lib/stores/vault/events.svelte.ts`), emitted by `entity-mutations.ts` for manual creates and generator saves                                                                                                                              | `entity.type` only (a category id such as `character`). One milestone per entity in the batch.              |
| `connection-added`           | `vaultEventBus` `CONNECTION_ADDED`                                                                                                                                                                                                                                                       | Event type only. Ids, `connectionType` and `label` are ignored.                                             |
| `generator-saved`            | `appEventBus` `JOURNAL:CAPTURE` published by `publishGeneratedSaved` in `CampaignGeneratorModal.onSave`                                                                                                                                                                                  | `payload.entryType === "generated-saved"` only. `payload.content` (which contains the title) is never read. |
| `entry-found`                | Search result selection and explorer "find in graph" both call `dispatchSearchEntityFocus`, which dispatches the `codex-search-entity-focus` window event (`components/search/search-focus.ts`). Explorer "open" (`EntityExplorer.handleSelect`) does not, so it gets one explicit call. | Event occurrence only. `detail.entityId` is ignored.                                                        |
| `screen-graph`               | `helpContext.current.area === "graph"` (`stores/help-assistant/help-context.svelte.ts`), read reactively                                                                                                                                                                                 | The area string only.                                                                                       |

**Rationale**: Avoids touching `CampaignGeneratorModal.svelte` (847 lines) and `SearchModal.svelte` (598 lines), and avoids `GraphView.svelte` for the graph milestone. The existing `onboardingFunnel` milestones cannot be reused directly: they are per device and fire once ever (spec Context, epic audit gap 2), so a returning user's new vault would already show `first_entity`.

**Alternatives considered**:

- _Extend `onboardingFunnel`_: rejected. Its record is a funnel-completion set with "fire once ever" semantics. Making it per journey would change what #1786 measures.
- _New `ONBOARDING:MILESTONE` app event emitted at each call site_: rejected as more surface for the same signal. Only the explorer "open" path needs a new call.
- _Watch `vault.allEntities` diffs_: rejected. That reads the vault rather than reacting to user actions, and it is harder to keep content-free.

## R3. Graph and "find again" steps cannot complete trivially

New users land on the graph, and steps may complete out of order (clarification Q3). So a bare "graph opened" milestone would complete the Worldbuilder's final step at once.

**Decision**: Steps may declare `after: StepId[]`. A step with `after` only accepts its milestone once those steps are complete. Screen milestones are **state** milestones: the step completes when its screen is showing at any moment after its `after` steps are complete, including the moment they complete. So if a user adds the connection while the graph is already in view, the graph step completes straight away, which is correct because the result is on screen. Writer `find-again` has `after: [add-character, add-place-or-note]`.

**Alternatives considered**: strict ordering only for the final step. Rejected because it is the same idea expressed less generally.

## R4. Matching categories, and vaults without them

**Decision**: A step requires `categories: string[]` (default category ids from `packages/schema/src/entity.ts`: `character`, `location`, `note`). The engine resolves the requirement against the vault's available category ids, passed in by the app from `categories` (`stores/categories.svelte.ts`). If none of the required ids exist, the step accepts any `entry-created` and switches to its `anyEntryCopy`. The resolution happens when the step is displayed and when a milestone is applied, so renaming categories mid-journey stays consistent.

**Rationale**: Edge case "renamed or removed categories". The Guided Mode create menu labels "Place" but maps to the `location` category through the generator. The plan's E2E tests confirm which category id each create path writes.

## R5. "Show me" actions: reusing the Cif runner safely

**Findings**: `HelpActionRunner.run()` (`services/help-assistant/help-action-runner.ts`) calls `validateAction(action, ctx, deps)` from `help-engine`, which only accepts a `highlight` whose control is listed in `ctx.availableActions`. That list is sent to the Cif Worker with help questions, and `HelpHighlightService.show()` already does the real DOM check (visible, not `hidden`/`aria-hidden`/`display:none`), picking the first rendered element among all `[data-help-target=id]` matches.

**Decision**:

1. Add a `shell` group to the `help-engine` control catalogue for app-chrome controls: `create-entry`, `open-search`, `activity-bar-graph`. `ControlSpec.area` gains `"shell"`, which skips the area match the same way `"solo"` does. None of the shell ids has a `requiresFlag`: the Create buttons open the intent menu whatever the flags are (`AppHeader.svelte` calls `modalUIStore.openIntentCreateMenu()` unconditionally).
2. `ActionDeps` gains an optional `extraAvailable?: readonly string[]`, merged into `ctx.availableActions` **for that validation call only**. The journey passes `SHELL_CONTROL_IDS`. The help context and anything sent to the Worker are unchanged, so Cif cannot propose shell controls and an older Worker never sees the new ids.
3. `HelpActionRunner.run(action, options?)` gains `options.extraAvailable` and passes it through. Navigation, panels, help and generator steps keep their existing checks: vault surface, `generators` flag, valid help id.
4. If `run()` returns `false` (validation failed or the control is not on screen), the journey card shows the step's `fallback` text. This is FR-014.

**Rationale**: One closed catalogue of things that can be pointed at (Constitution III, and the #3827 design). No change to what Cif or the Worker can do. Each shell id is placed on **every** responsive variant of its control (the desktop header Create, the phone graph FAB, the graph empty-state CTA all carry `create-entry`), so the highlight finds whichever one is visible at the current width.

**Alternatives considered**:

- _Bypass `validateAction` and call `helpHighlight.show` directly_: rejected because it loses the schema and surface checks for `navigate`/`openGenerator`.
- _Add shell controls to `availableActions` in the help context_: rejected because it changes what the Worker receives and lets the model point at chrome.
- _A journey-only target list_: rejected because it creates a second catalogue.

## R6. The real controls behind each step (desktop, tablet, phone)

| Purpose          | Desktop (lg+)                                                                                                   | Tablet / phone (< lg)                                                                     | Shell id             |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| Create an entry  | `header-create-button` (`AppHeader.svelte`, `hidden lg:flex`); `graph-empty-state-cta` while the vault is empty | `graph-fab-create` (`GraphView.svelte`, `lg:hidden`); `graph-empty-state-cta` while empty | `create-entry`       |
| Search           | `search-input` (`AppHeader.svelte`)                                                                             | `mobile-search-button` (`lg:hidden`)                                                      | `open-search`        |
| Graph view       | `activity-bar-graph` (`ActivityBar.svelte`, rendered at all widths)                                             | same                                                                                      | `activity-bar-graph` |
| Add a connection | `add-connection-button` on the entry's Status tab (existing id, with `openPanel status-tab` first)              | same                                                                                      | existing             |
| Generator        | `openGenerator` action (no highlight needed)                                                                    | same                                                                                      | n/a                  |

All of these Create paths open the Guided Mode intent menu (`modalUIStore.openIntentCreateMenu`). That menu leads into the generator workflow, which saves through `saveDraft` and so emits both `BATCH_CREATED` (with the category) and `generator-saved`. `canOpenGenerators()` depends on the vault being ready, not on AI, and generators run with `useAI: false`. So every journey works with AI disabled (FR-017, FR-020).

## R7. Coexisting with Guided Mode, Quick Start and the mobile coach marks

**Findings**: Guided Mode (#1909, `stores/ui/guided-mode.svelte.ts`) is a browser-wide UI preference that defaults to on. It simplifies the header, routes Create through the intent menu, and shows `StructuralSuggestionBanner` generator suggestions in entity detail. Quick Start (`QuickStartModal.svelte`) generates a starter world, but only from an explicit button on the welcome screen or in the vault switcher. `GraphView.svelte` has its own phone coach marks (`COACH_MARKS`, `onboardingStore.dismissedMobileGraphCoachMarks`).

**Decision**:

- Journeys work identically with Guided Mode on or off. Every shell id exists in both header variants.
- The goal invitation and journey card are suppressed while Quick Start is open. This already comes from `isAnyModalOpen`.
- The mobile graph coach marks do not show while the invitation is open or a journey runs. They stay available to users who chose "Explore on my own". This is a single added condition (`!onboardingStore.firstRunGuidanceActive`) in `GraphView`'s existing `showCoachMarks` derivation. The flag itself is tested in the store and host tests.
- The vault theme prompt (`shouldConsiderVaultThemePrompt` in `(app)/+layout.svelte`) today requires `helpStore.hasSeen("initial-onboarding")`. Users who answer the invitation never take the tour, so it would never appear for them. It switches to `isOnboarded()` and also waits on `firstRunGuidanceActive` (FR-003a). This is an edit to two existing conditions, not new behaviour in the layout.
- Structural suggestion banners are left as they are. #3998 (P2) must reuse or respect them instead of adding a parallel suggestion surface. This is noted for that issue.

## R8. The first-run decision and the "brand-new user" record

**Decision**:

- `FirstRunState` gains `goalInvitationResolved: boolean` (the invitation was answered, explored or dismissed) and `journeyActive: boolean`.
- `FirstRunAction` replaces `tour` and `guided-empty` with `goal-invitation`. The orchestrator returns `goal-invitation` when the user is not onboarded (`!hasSeenTour && !goalInvitationResolved`) and nothing competes: not initialised, guest, demo, `?demo=`, landing, vault switcher, active tour, any modal, an already active journey. It does not look at the entity count (clarification Q2).
- The changelog additionally waits while `journeyActive`.
- `OnboardingStore` (`stores/ui/onboarding.svelte.ts`) gains the persisted `goalInvitation: "goal" | "explore" | "dismissed" | null` and `chosenGoal: Goal | null` through two new `UI_STORAGE_KEYS`. Choosing "Explore on my own" or dismissing also counts as onboarded for the orchestrator. The tour is started only by the user's explicit tap.

**Rationale**: Keeps the single pure decision point (#1780) and its "never stack" guarantee. Users who were onboarded before this feature (`hasSeen("initial-onboarding")`) see nothing new (spec Story 1, scenario 5).

## R9. Persisting progress, and the reload rule

**Decision**:

- Progress lives in `localStorage` under `codex-onboarding-journey:<vaultId>`, through the injected `StorageLike` (`browserStorage`). The vault id appears only in the storage key, following the `codex-solo-session:<vaultId>` precedent (172). The value holds no names, text or entry/connection ids (FR-023, SC-008).
- Clarification Q4 (reload in the same browser session only) uses a `sessionStorage` marker through `browserSessionStorage` (`utils/runtime-deps.ts`): `codex-onboarding-journey-active` = `{ vaultId-scoped key, journeyId }`. On load the store restores the card only if the marker exists and matches the active vault. On a later visit the marker is gone, so the card stays hidden and the journey continues from Getting Started.
- Storage failures are caught. The journey then runs in memory for the session.

**Alternatives considered**: IndexedDB `appSettings`. Rejected because the data is tiny, synchronous reads simplify first paint, and there is precedent for `localStorage`.

## R10. Getting Started entry point and the standalone Help window

**Decision**: `GettingStartedChecklist.svelte` gains a "Guided setup" group: three goal buttons, plus "Continue" and "Start over" for the active vault's journey. It is hidden in the standalone `/help` window, where the main app shell is missing. This matches how `HelpHeader.svelte` hides the tour replay there. A Help article, `guided-setup.md`, and a `help-engine` registry entry, `guided-setup.ts`, describe it (Constitution VII).

## R11. Testing approach

- **Engine (`bun test`, ≥ 70% coverage)**: schema validation of the three journeys; reducer cases for start, out-of-order completion, `after` gating, repeated and batch events, skip, back, exit, finish, version migration with unknown steps, category fallback, and milestones from before the start being ignored.
- **help-engine**: `extraAvailable` accepted only for that call; shell controls never valid without it; `shell` area passes on any screen.
- **App unit (Vitest)**: orchestrator decision table (new kinds, Q2 entity-count independence, changelog waits); milestone adapter (maps each source and never reads `content`, `entityId` or the title, which is a privacy test); journey store (persistence shape, session-marker reload rule, storage failure, vault switch); `HelpActionRunner` `extraAvailable` pass-through; component tests for `GoalInvitation` and `JourneyCard` (keyboard, Escape, focus return, polite live region, 44px targets).
- **Render contract**: every highlight `target` used by a journey resolves to a rendered `[data-help-target]` at each viewport its step supports, or the step declares `fallback` for that viewport (SC-006).
- **E2E (Playwright, extending the #1791 onboarding specs)**: all three journeys on desktop, tablet and phone with AI enabled and disabled; Explore and dismiss; returning user; guest, demo and `?demo=`; converted demo; reload in the same session versus a new context; **zero requests to the help or Oracle endpoints** across load, invitation, goal choice, steps and milestones (SC-003); and vault content after a journey equals only what the test created (SC-004).

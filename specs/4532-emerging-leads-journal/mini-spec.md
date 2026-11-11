# Mini-Spec: Emerging Leads, Conjectures & Outcomes in Adventure Journal (#4532)

> **Parent Epic**: #4528 — Emergent Adventures (Milestone M2 · Priority P1)
> **Foundation**: PR #4697 (initial `AdventureKnownSituation`, `AdventureKnownSituations`, and `AdventureScenarioControls` follow/unfollow & rumour/observed rendering)

---

## 1. Specification

### Goal & Problem Statement

Players exploring an emergent Adventure session can encounter multiple evolving situations (`ScenarioItem` entries in `session.scenarioCollection`). While PR #4697 introduced the initial **Known situations** list with follow/unfollow and basic rumour vs observed event rendering, four capabilities from **#4532** remain to complete the M2 journal experience:

1. **Player conjectures / theories**: Players need to record and distinguish their own theories/conjectures from unverified rumours/hearsay and observed facts/consequences without the UI labelling what is actually true, persisted in the authoritative `AdventureSession` state rather than transient UI flags.
2. **Solo Threads & Vault entity linkage**: Known leads must surface player-visible linked Vault entities (`anchorRefs`) and allow optional linkage/creation in existing Solo Threads (`soloThreads`) without automatic or duplicate thread creation.
3. **Player-safe recaps of lead status & elapsed time**: `buildAdventureRecap` and `AdventureStateSummary` must reflect known lead statuses, active focus, and elapsed fictional world time without exposing unheard leads, `gmOnly` truths, or private `worldTime.events`.
4. **Secrecy & revealed-event consistency**: `AdventureKnownSituation` must project events through `playerScenarioProjection(item)` so GM events whose bound secret was fictionally revealed (`revealedSecretIds`) are shown alongside player-visible events, while unrevealed GM events and `gmOnly` fields never cross the UI boundary.

### Scope Boundaries

- **In Scope**:
  - Extending `ScenarioEvent["kind"]` with `"theory"` (`"discovery" | "consequence" | "status-change" | "theory"`) and adding `recordScenarioTheory` to `@codex/adventure-engine` and `AdventureManager`.
  - Updating `AdventureKnownSituation.svelte`, `AdventureKnownSituations.svelte`, and `AdventureScenarioControls.svelte` to:
    - Use `playerScenarioProjection` for event projection and label `"discovery"` (`Observed`), `"consequence"` (`Consequence`), `"status-change"` (`Status`), and `"theory"` (`Conjecture`).
    - Provide an accessible inline conjecture form to add a player theory to any heard lead.
    - Render resolved player-visible Vault entity names for `item.anchorRefs` (omitting hidden or unresolved entities).
    - Show existing Solo Thread linkage (matched by title or linked thread ID) and offer an explicit **Save to Solo Threads** action that prevents duplicate thread creation.
  - Extending `AdventureRecap` (`buildAdventureRecap` in `packages/adventure-engine/src/session-tools.ts`) and `AdventureStateSummary.svelte` to include player-safe `knownLeads` (lead, status, focused, latest player-known update) and `elapsedTimeLabel`.
- **Out of Scope**:
  - A separate scenario management application or new Play workspace.
  - Replacing Solo Threads or automatically creating Solo Threads without player action.
  - Broad UI redesign outside the existing Adventure Surface / Focus Play loop.

### User Stories & Acceptance Criteria

- **US-1 (Three Leads & Epistemic Distinction)**: As a player, I can inspect three or more active known leads and clearly distinguish unverified rumour (`Reported rumour · not yet verified`), observed facts (`Observed` / `Consequence`), status changes (`Status`), and my own recorded theories (`Conjecture`) without seeing `gmOnly` truth or unrevealed GM events.
- **US-2 (Persisted Player Conjectures)**: As a player, I can record a conjecture on a known lead and have it saved through the revision-checked `AdventureSession` repository boundary; blank conjectures, unheard scenario targets, pending rolls, and read-only sessions are rejected cleanly.
- **US-3 (Solo Threads & Vault Entity Links Without Duplicates)**: As a player, I can see which player-visible Vault entities (`anchorRefs`) relate to a known lead and optionally save the lead to Solo Threads (`kind: "lead"`), linking its visible entities, while the UI prevents duplicate thread creation if an open or closed Solo Thread with that lead title already exists.
- **US-4 (Recap & Elapsed Time Reflection)**: As a player opening Scene Details (`AdventureStateSummary`), I can review elapsed fictional world time and a summary of known leads (including their status and which lead is focused) with zero leakage of unheard scenarios or private `worldTime.events`.

---

## 2. Technical Plan

### Architecture & Design

- **Domain Engine (`packages/adventure-engine`)**:
  - **`src/types.ts`**:
    - Widen `ScenarioEvent["kind"]` to `"discovery" | "consequence" | "status-change" | "theory"`.
    - Add `KnownLeadRecap` interface (`id: string`, `lead: string`, `status: ScenarioStatus`, `focused: boolean`, `lastUpdate?: string`) and optional `elapsedTimeLabel?: string` + `knownLeads?: KnownLeadRecap[]` on `AdventureRecap`.
  - **`src/scenario-schemas.ts` & `src/schemas.ts`**:
    - Add `"theory"` to the `kind` enum in `scenarioEventSchema` and `scenario-schemas.ts` `event`.
  - **`src/scenario-collection.ts` & `src/index.ts`**:
    - Add `recordScenarioTheory(session, scenarioId, text, eventId, expectedRevision, now?)`:
      - Requires `target.knowledge === "heard"` (returns `{ ok: false, reason: "scenario-not-heard" }` if unheard, `{ ok: false, reason: "unknown-scenario" }` if missing).
      - Delegates to `appendScenarioEvent` with `{ id: eventId, kind: "theory", visibility: "player", text: text.trim(), at: now }`, inheriting revision, read-only, pending-roll, 100-event budget, and global ID-collision guards.
  - **`src/session-tools.ts`**:
    - In `buildAdventureRecap(session, recentTurnCount)`:
      - Project known scenarios via `playerScenarioCollectionProjection(session)` to build `knownLeads: KnownLeadRecap[]` (containing `id`, `lead: item.playerVisible.lead`, `status: item.status`, `focused: projected.focusedScenarioId === item.id`, and `lastUpdate: item.events.at(-1)?.text`).
      - Compute `elapsedTimeLabel` via `formatWorldElapsedMinutes(session.worldTime.elapsedMinutes)` when `session.worldTime && session.worldTime.elapsedMinutes > 0`.
- **Store & Web UI (`apps/web`)**:
  - **`src/lib/stores/oracle/adventure-scenarios.ts` & `adventure-manager.svelte.ts`**:
    - Add `recordTheory(scenarioId: string, text: string): Promise<AdventureSession>` on `AdventureScenarios` (generating `eventId = this.deps.idGenerator()`) and `recordScenarioTheory` on `AdventureManager`.
  - **`src/lib/components/oracle/adventure/AdventureKnownSituation.svelte`**:
    - Derive `projected = $derived(playerScenarioProjection(item))` and `visibleEvents = $derived(projected?.events ?? [])`.
    - Map `eventLabel(kind)`: `"discovery"` -> `"Observed"`, `"consequence"` -> `"Consequence"`, `"status-change"` -> `"Status"`, `"theory"` -> `"Conjecture"`.
    - Render linked Vault entity badges when `anchorEntities` (`Array<{ id: string; title: string }>`) is non-empty.
    - Render Solo Thread state: if `linkedThread` (`{ id: string; title: string; status: "open" | "closed" }`) exists, show a badge (`Solo Thread · Open` / `Solo Thread · Closed`); otherwise, if `onSaveThread` is provided, render a `"Save to Solo Threads"` button.
    - Render a compact conjecture form (`input` + `"Save conjecture"` button) when `onRecordTheory` is provided, clearing input on success.
  - **`src/lib/components/oracle/adventure/AdventureKnownSituations.svelte` & `AdventureScenarioControls.svelte`**:
    - Thread `onRecordTheory`, player-visible `entities` (from `oracle.vault.entities` or prop fallback), and `soloThreads` integration down to each `AdventureKnownSituation`.
    - Keep cognitive complexity of all functions and `<template>` blocks strictly `<= 15` (using snippets/helpers where needed).
  - **`src/lib/components/oracle/adventure/AdventureStateSummary.svelte`**:
    - Display `recap.elapsedTimeLabel` in the scene summary header/body when present.
    - Add a `"Known leads"` group formatted from `recap.knownLeads` (e.g. `${lead.lead} (${statusLabel}${lead.focused ? ", following" : ""})${lead.lastUpdate ? ` — ${lead.lastUpdate}` : ""}`).

### Touchpoints & Dependencies

| File                                                                                                                                                                                                          | Action | Purpose                                                                                                                          |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----- | :------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/adventure-engine/src/types.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/types.ts)                                                                                 | Modify | Add `"theory"` to `ScenarioEvent["kind"]`; add `KnownLeadRecap` and `elapsedTimeLabel` / `knownLeads` to `AdventureRecap`.       |
| [`packages/adventure-engine/src/scenario-schemas.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/scenario-schemas.ts)                                                           | Modify | Allow `"theory"` in scenario event `kind` schema.                                                                                |
| [`packages/adventure-engine/src/schemas.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/schemas.ts)                                                                             | Modify | Allow `"theory"` in `scenarioEventSchema`.                                                                                       |
| [`packages/adventure-engine/src/scenario-collection.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/scenario-collection.ts)                                                     | Modify | Implement `recordScenarioTheory` command with heard-only & ID-collision validation.                                              |
| [`packages/adventure-engine/src/session-tools.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/session-tools.ts)                                                                 | Modify | Populate player-safe `knownLeads` and `elapsedTimeLabel` in `buildAdventureRecap`.                                               |
| [`packages/adventure-engine/src/index.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/index.ts)                                                                                 | Modify | Export `recordScenarioTheory` and `KnownLeadRecap`.                                                                              |
| [`packages/adventure-engine/tests/scenario-collection.test.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/tests/scenario-collection.test.ts)                                       | Modify | Unit tests for `recordScenarioTheory` and `buildAdventureRecap` lead/time projection & secrecy.                                  |
| [`apps/web/src/lib/stores/oracle/adventure-scenarios.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/stores/oracle/adventure-scenarios.ts)                                                   | Modify | Add `recordTheory(scenarioId, text)` command.                                                                                    |
| [`apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts)                                         | Modify | Expose `recordScenarioTheory(scenarioId, text)` facade method.                                                                   |
| [`apps/web/src/lib/components/oracle/adventure/AdventureKnownSituation.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureKnownSituation.svelte)       | Modify | Use `playerScenarioProjection`, label `Conjecture`/`Status`, render entity anchors, Solo Thread link/save, and conjecture input. |
| [`apps/web/src/lib/components/oracle/adventure/AdventureKnownSituations.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureKnownSituations.svelte)     | Modify | Pass theory, entity anchor, and Solo Thread props/callbacks to `AdventureKnownSituation`.                                        |
| [`apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.svelte)   | Modify | Wire `manager.recordScenarioTheory`, visible Vault entities, and `soloThreads` deduplicated creation.                            |
| [`apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.svelte)           | Modify | Render `Known leads` and `elapsedTimeLabel` in Scene Details recap.                                                              |
| [`apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.test.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.test.ts) | Modify | Component tests for 3 active leads, theory recording, entity links, Solo Thread deduplication, and revealed secret projection.   |
| [`apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.test.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.test.ts)         | Modify | Component tests for known leads and elapsed time in Scene Details recap.                                                         |

### Constitution & Style Alignment

- **Local-First & Authoritative Persistence**: Conjectures (`kind: "theory"`) and Solo Thread links are persisted to `AdventureSession` and `.codex/threads.json` respectively, never held only in transient component state.
- **Strict Secrecy Boundary**: Both `AdventureKnownSituation` and `buildAdventureRecap` derive scenario data exclusively through `playerScenarioProjection` / `playerScenarioCollectionProjection` and filter Vault entities by `visibility !== "hidden"`.
- **Style Guide & Contrast**: Uses Svelte 5 Runes (`$props`, `$state`, `$derived`), Tailwind 4 semantic tokens (`text-theme-text`, `bg-theme-surface`, `border-theme-border`, `text-theme-primary` — no low-contrast opacity text modifiers), and Iconify utility classes (`icon-[lucide--*]`).
- **Bounded Responsibility (Principle XIV)**: Keeps functions and `<template>` blocks at cognitive complexity `<= 15` using snippets and small pure helpers.

---

## 3. Tasks & Execution Sequence

- [x] **T1: Engine Schema & `recordScenarioTheory` Command (TDD)**
  - Add failing unit tests in [`packages/adventure-engine/tests/scenario-collection.test.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/tests/scenario-collection.test.ts) covering:
    - Recording a player theory (`kind: "theory"`) on a `heard` scenario and projecting it via `playerScenarioProjection`.
    - Rejecting `recordScenarioTheory` on `unheard` or unknown scenarios, blank text, pending rolls, or colliding event IDs.
  - Update [`packages/adventure-engine/src/types.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/types.ts), [`packages/adventure-engine/src/scenario-schemas.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/scenario-schemas.ts), [`packages/adventure-engine/src/schemas.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/schemas.ts), [`packages/adventure-engine/src/scenario-collection.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/scenario-collection.ts), and [`packages/adventure-engine/src/index.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/index.ts).

- [x] **T2: Player-Safe Recap Extension (`buildAdventureRecap`) (TDD)**
  - Add unit tests in [`packages/adventure-engine/tests/scenario-collection.test.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/tests/scenario-collection.test.ts) verifying `buildAdventureRecap` includes `knownLeads` (only `heard` scenarios, with status, focus flag, and last player-visible update) and `elapsedTimeLabel`, while omitting `unheard` leads, `gmOnly` fields, and `worldTime.events`.
  - Implement in [`packages/adventure-engine/src/session-tools.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/session-tools.ts) and [`packages/adventure-engine/src/types.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/types.ts).

- [x] **T3: Store Wiring (`AdventureScenarios` & `AdventureManager`)**
  - Add `recordTheory` to [`apps/web/src/lib/stores/oracle/adventure-scenarios.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/stores/oracle/adventure-scenarios.ts) and `recordScenarioTheory` to [`apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/stores/oracle/adventure-manager.svelte.ts).
  - Add unit test coverage in [`apps/web/src/lib/stores/oracle/tests/adventure-scenarios.test.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/stores/oracle/tests/adventure-scenarios.test.ts).

- [x] **T4: UI Components (`AdventureKnownSituation`, `AdventureKnownSituations`, `AdventureScenarioControls`, `AdventureStateSummary`) (TDD)**
  - Add component tests in [`apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.test.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.test.ts) and [`apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.test.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.test.ts) covering:
    - Inspecting 3 active leads and distinguishing rumour, `Observed`, `Consequence`, `Status`, and `Conjecture` without exposing `gmOnly.truth` or unrevealed GM events.
    - Submitting a player conjecture via the inline form.
    - Displaying player-visible linked Vault entities (`anchorRefs`) while hiding hidden/unresolved IDs.
    - Saving a lead to Solo Threads and preventing duplicate creation when a matching thread already exists.
    - Rendering `Known leads` and elapsed time in `AdventureStateSummary`.
  - Implement updates in [`AdventureKnownSituation.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureKnownSituation.svelte), [`AdventureKnownSituations.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureKnownSituations.svelte), [`AdventureScenarioControls.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureScenarioControls.svelte), and [`AdventureStateSummary.svelte`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/components/oracle/adventure/AdventureStateSummary.svelte).

---

## 4. Verification Gate

- [x] Changed-file lint passes: `bun scripts/lint-changed.mjs`
- [x] Impacted unit & component tests pass: `bun scripts/test-changed.mjs`
- [x] Affected workspace type-check passes: `cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error`
- [x] Fallow complexity & dead-code audit passes: `bunx fallow audit --changed-since origin/staging`

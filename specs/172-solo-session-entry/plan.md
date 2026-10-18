# Implementation Plan: Start Solo Session

**Branch**: `feat/172-solo-session-entry` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/172-solo-session-entry/spec.md`

## Summary

This is Phase 1 of Solo Play Mode (#3839): a way to start, resume and end a solo session, and a solo bar that keeps the solo player's tools within reach on every screen.

- **Play page.** "Play" in the rail opens a new `/play` page. Start or Resume Solo Session is the main action, and Adventure Mode is an optional card below it.
- **Setup.** Starting asks for a map (preselected to the last one open) and whether to run a journal. It then turns SOLO on for that map, starts or continues the journal, and goes to the map.
- **Solo bar.** A one-line strip under the header with:
  - quick roll, which shows the result inline and records it in roll history and the journal;
  - more dice, Ask Oracle, Journal, Map and Add note;
  - the scene, which maps to a journal section;
  - End.
- **No shared play during solo.** While a solo session is active, Player View and hosting are blocked.
- **Help.** Cif can explain all of it.

Technically, a new framework-free package, `solo-session-engine`, holds the session record and its pure rules. A thin `SoloSessionStore` orchestrates calls the map, journal and dice stores already expose. A small `solo-play-guard` replaces the three direct writes to `sharedMode` and the two ways to open Share. Components live in a new `components/solo/` folder. There is no new dependency, no IndexedDB or vault schema change and no network call; the session is about 300 bytes in `localStorage` per vault. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `dice-engine` (parser, roller), `session-journal-engine` via `sessionJournalStore` (start, sections, end), `map-engine` via `mapStore` (`selectMap`, `soloFog`), `help-engine` (registry, context, catalogue), `@codex/events` (journal capture through `diceHistory`), Tailwind 4 semantic tokens, Iconify Lucide classes. New internal package `packages/solo-session-engine`. No new third-party dependency.
**Storage**: `localStorage` through the injected `StorageLike`: `codex-solo-session:<vaultId>` (session record) and `codex-solo-bar-minimised` (preference). No IndexedDB, OPFS or vault changes, so no migration.
**Testing**: Vitest (engine and stores, plus components with jsdom); help-engine tests and the evaluation set.
**Target Platform**: Browser, desktop and phone, offline-capable.
**Project Type**: Web application in a Bun monorepo (`apps/web` plus `packages/*`).
**Performance Goals**: The bar renders on first paint with no flicker, because the read is synchronous. A quick roll's result shows within one frame of Enter. There is no extra work on screens while the bar is idle.
**Constraints**: Local-first; nothing about solo sessions leaves the device (FR-031). With no solo session active, multiplayer, Player View and guest behaviour are unchanged (SC-006). AI is never required (SC-005).
**Scale/Scope**: One user and one session per vault.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                   | Status | How                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First            | PASS   | Session record, validation, default map, scene name and quick-roll resolution are in `packages/solo-session-engine`, which is pure. The app layer only wires stores and UI.                                                                                                                                                |
| II. TDD                     | PASS   | Every contract in [contracts](./contracts/solo-session.md) lists its tests, including failure paths: guest, blocked start, journal error, storage error, invalid roll.                                                                                                                                                     |
| III. Simplicity & YAGNI     | PASS   | Reuses `sessionJournalStore.start` (it already continues an active journal), journal sections for scenes, `diceHistory.addResult` for capture, the existing dice window, `quickNoteStore` and `notificationStore`. Party selection was dropped in clarification.                                                           |
| IV. AI-First Extraction     | N/A    | No extraction.                                                                                                                                                                                                                                                                                                             |
| V. Privacy & Client-Side    | PASS   | Device-local `localStorage` only; no remote storage, so the opt-in exception does not apply. The record holds IDs, a scene name and the last roll expression, nothing else.                                                                                                                                                |
| VI. Clean Implementation    | PASS   | Svelte 5 runes, semantic tokens and Iconify classes per the style guide; injected dependencies. VI.3 (lint and test on every change) is met in two layers: locally, impacted-only checks per AGENTS.md (T067); and the PR is not merged until its CI lint and test jobs (`deploy.yml` on `pull_request`) are green (T071). |
| VII. User Documentation     | PASS   | New `solo-session` article and Cif entry; updates to `adventure-mode`, `vtt-solo-play` and `dice-roller`. See User Help Check.                                                                                                                                                                                             |
| VIII. Dependency Injection  | PASS   | `SoloSessionStore` takes storage, storage events, vault registry, ids, clock, journal, maps, navigate, the guest check and the shared-play check through its constructor, with production defaults, and exports both the class and a singleton.                                                                            |
| IX. Natural Language        | PASS   | Plain labels such as "Start Solo Session", "Let the Oracle run the game", "End session and journal" and "End your solo session to share or preview as a player."                                                                                                                                                           |
| X. Quality & Coverage       | PASS   | The new package targets at least 70%. Changed-file lint, tests and type-check, plus the Fallow gate.                                                                                                                                                                                                                       |
| XI. Agent Protocol          | PASS   | Surgical call-site changes; impacted-only validation.                                                                                                                                                                                                                                                                      |
| XII. Labels over Tags       | N/A    | No categorisation UI.                                                                                                                                                                                                                                                                                                      |
| XIII. Discovery Intent      | N/A    | `/play` is an app route. It is added to the non-indexed app lists, not to the discovery registry.                                                                                                                                                                                                                          |
| XIV. Bounded Responsibility | PASS   | See below.                                                                                                                                                                                                                                                                                                                 |

### Discovery Intent Check

N/A: no public, indexable discovery page is added or repositioned. `/play` is an app route, listed next to `/adventure` as non-indexed.

### Bounded Responsibility Check

- [x] Files over 500 lines this feature touches:
  - `apps/web/src/routes/(app)/+layout.svelte` (803)
  - `apps/web/src/lib/seo/crawler-access.ts` (625)
- [x] What each still holds:
  - The layout keeps its single job, composing the app shell. It gains one component mount (`<SoloSessionBar />`) beside `AppHeader` and no behaviour.
  - `crawler-access.ts` is a data-only route catalogue, so it is exempt from the size trigger. It gains `/play` in the two lists that already hold `/adventure`.
- [x] New behaviour has its own home:
  - `packages/solo-session-engine` (not app-specific);
  - `stores/solo-session.svelte.ts` (orchestration);
  - `stores/ui/shared-play-state.ts` and `stores/ui/solo-play-guard.ts` (the shared-play rule, split so the solo store and the guard don't import each other);
  - `components/solo/*` (one responsibility per component).
  - `map.svelte.ts` (956 lines) is not edited: the store uses its existing `selectMap` and `soloFog`.
- [x] No split is planned, so no tests move.

### User Help Check

- [x] New article `apps/web/src/lib/content/help/solo-session.md`. It covers starting from Play, the setup defaults, the bar and its actions, quick roll (including the repeat on an empty roll), scenes and journal sections, resuming, ending, no shared play while solo, that AI is optional, and that Cif is for product help and the Oracle for in-game questions.
- [x] Updated:
  - `adventure-mode.md` (reached from Play now);
  - `vtt-solo-play.md` (the session turns SOLO on);
  - `dice-roller.md` (quick roll).
- [x] Cif: new `solo-session` registry entry, the `solo-session` flag, solo controls and evaluation questions. Updated `solo-adventure` steps.
- [x] FeatureHint: not used. Hint cards were retired in #3836; the Play page itself is the explanation.

**Post-design re-check**: PASS on all gates. No violations, so Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/172-solo-session-entry/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── solo-session.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/solo-session-engine/              # new package
├── package.json / tsconfig.json / vitest config (mirrors session-journal-engine)
└── src/
    ├── index.ts
    ├── types.ts                           # SoloSession, SoloSetup
    ├── session.ts                         # parse, create, withScene, withLastRoll
    ├── defaults.ts                        # resolveDefaultMap, normaliseSceneName, resolveQuickRoll
packages/solo-session-engine/tests/
    └── session.test.ts, defaults.test.ts

packages/help-engine/src/
├── registry/features/solo-session.ts      # new
├── registry/features/solo-adventure.ts    # steps: reached from Play
├── registry/features/index.ts             # register
├── actions/catalogue.ts                   # SESSION_FLAGS, area "solo", 3 controls
└── context/index.ts                       # "/(app)/play" route; MAX_FLAGS + 1
packages/help-engine/tests/eval/           # solo evaluation questions

apps/web/src/lib/
├── stores/solo-session.svelte.ts          # new: SoloSessionStore + singleton
├── stores/ui/shared-play-state.ts         # new: isSharedPlayOn (shared mode or hosting)
├── stores/ui/solo-play-guard.ts           # new: blocked reasons, toggleSharedMode, requestShare
├── components/layout/VaultActionsMenu.svelte      # Share item uses requestShare
├── stores/help-assistant/help-context.svelte.ts   # report solo-session flag + controls
├── stores/map/map-page-controller.svelte.ts       # openShareModal uses requestShare
├── actions/useGlobalShortcuts.ts          # `p` uses toggleSharedMode
├── components/graph/GraphToolbar.svelte   # shared toggle uses guard, disabled + note
├── components/map/MapVTTControlsHUD.svelte# same
├── components/layout/nav-items.ts         # Play → /play, alsoActiveFor /adventure
├── components/solo/                       # new
│   ├── PlayPage.svelte
│   ├── SoloSetupDialog.svelte
│   ├── SoloSessionBar.svelte
│   ├── SoloQuickRoll.svelte
│   ├── SoloSceneField.svelte
│   ├── SoloSessionSheet.svelte
│   ├── SoloEndDialog.svelte
│   └── *.test.ts
├── seo/crawler-access.ts                  # /play beside /adventure
├── service-worker/routing.ts              # /play beside /adventure
└── content/help/
    ├── solo-session.md                    # new article
    └── adventure-mode.md / vtt-solo-play.md / dice-roller.md   # links

apps/web/src/routes/(app)/
├── +layout.svelte                         # mount <SoloSessionBar /> after AppHeader
└── play/+page.svelte                      # new: renders PlayPage
```

**Structure Decision**: Monorepo web app. The pure session rules go in a new `packages/solo-session-engine`, and Cif knowledge goes in `packages/help-engine`. Orchestration and UI go in `apps/web/src/lib/stores` and a new `apps/web/src/lib/components/solo` folder, mounted from the app layout and a new `/play` route.

## Delivery slices

Each slice can be tested on its own and matches the spec's stories. Slices 1 and 2 together are the MVP.

1. **US1, start a session (P1)**:
   - the engine package;
   - `SoloSessionStore.start`;
   - `solo-play-guard`, so that start is blocked during shared play;
   - `/play` and the nav change;
   - `SoloSetupDialog`;
   - a minimal `SoloSessionBar` (End only arrives in slice 4, so until then the bar shows actions without ending).
2. **US2, tools without leaving (P1)**:
   - `SoloQuickRoll`;
   - more dice, Oracle, Journal, Map and Add note in the bar;
   - `SoloSessionSheet` for phones;
   - minimise.
3. **US3, resume (P2)**: reload and vault-switch restore, the Resume action, and re-applying the scene's section.
4. **US4, end (P2)**: `SoloEndDialog`, and the guard blocking Player View and hosting while active, with its call-site changes.
5. **US5, scenes (P3)**: `SoloSceneField`, with journal section create and rename.
6. **US6, help and Cif (P3)**:
   - the article and its links;
   - the registry entry, flag, controls and evaluation questions;
   - the help bundle;
   - a Worker redeploy.

## Risks

- **Blocking shared play misses a path.** Shared mode is written from three places and Share opens from two today, and more could be added later. Mitigations: the guard is the only sanctioned writer and opener, a test scans for direct `sharedMode =` writes and `openShare()` calls outside the guard (allowing only the guest-only `GuestSessionBootstrap`), and SC-006 checks every toggle and opener.
- **The bar costs vertical space on short screens.** It is one line, it can be minimised to a single control (FR-012), and it is hidden on the full-screen map and pop-outs, like the header.
- **The scene section is lost on reload.** The journal keeps its active section in memory only. The session stores `sceneSectionId` and re-applies it on load (research R5); if the section no longer exists, new entries simply go unsectioned until the next scene.
- **Turning SOLO on without fog.** If the map has fog off, SOLO has no visible effect. The help article says fog must be on, and Cif already knows both states (`vtt-fog-on`, `vtt-solo-fog`).
- **Changing what "Play" means.** People who used Play for Adventure Mode now take one more step. The Adventure card is the first thing under the main action, `/adventure` still works, and the help and Cif entries are updated.

## Complexity Tracking

None.

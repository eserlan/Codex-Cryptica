# Contracts: Start Solo Session

Interfaces this feature adds or changes. Each one is tested before it is implemented (Constitution II), covering the success path and at least one failure or negative path.

## 1. `packages/solo-session-engine` (new, framework-free)

```ts
export interface SoloSession {
  /* see data-model.md */
}

export interface SoloSetup {
  mapId: string | null;
  journal: boolean;
}

export function parseSoloSession(
  raw: unknown,
  vaultId: string,
): SoloSession | null;

export function createSoloSession(
  vaultId: string,
  setup: SoloSetup,
  journalId: string | null,
  deps: { ids: { uuid(): string }; clock: { now(): number } },
): SoloSession;

/** Last open map if still present, else the first map, else null. */
export function resolveDefaultMap(
  lastMapId: string | null,
  mapIds: readonly string[],
): string | null;

/** Trims; rejects empty; clamps to 80 characters. */
export function normaliseSceneName(
  input: string,
): { ok: true; name: string } | { ok: false };

/**
 * Empty input repeats lastRoll; a non-empty input is used as typed (trimmed).
 * Returns null when there is nothing to roll.
 */
export function resolveQuickRoll(
  input: string,
  lastRoll: string | null,
): string | null;

export function withScene(
  session: SoloSession,
  name: string,
  sectionId: string | null,
): SoloSession;
export function withLastRoll(
  session: SoloSession,
  expression: string,
): SoloSession;
```

**Tests**:

- A valid record round-trips.
- Each malformed field, a wrong version and a vault mismatch each return null.
- `resolveDefaultMap` covers last present, last missing, an empty vault and a null last map.
- Scene names: whitespace is rejected and an over-long name is clamped.
- Quick roll: empty input with no last roll gives null, and with a last roll repeats it.

## 2. `SoloSessionStore` (`apps/web/src/lib/stores/solo-session.svelte.ts`)

Constructor dependencies, all defaulted and all injectable:

- `storage: StorageLike`, `vaultRegistry`, `ids`, `clock`;
- `journal: Pick<SessionJournalStore, "start" | "end" | "createSection" | "renameSection" | "setActiveSection" | "current">`;
- `maps: Pick<MapStore, "selectMap" | "activeMapId"> & { setSoloFog(on: boolean): void }`;
- `navigate: (path: string) => Promise<void>`;
- `isGuest: () => boolean`, `isSharedPlayOn: () => boolean` (default from `stores/ui/shared-play-state.ts`; the store never imports the guard);
- `storageEvents: { subscribe(cb: (key: string) => void): () => void }` (default: `window` `storage` events).

```ts
class SoloSessionStore {
  readonly session: SoloSession | null; // reactive, for the active vault
  readonly isActive: boolean;
  readonly journalRunning: boolean;
  defaultMapId(mapIds: readonly string[]): string | null;
  start(setup: SoloSetup): Promise<void>; // throws when guest or blocked
  resume(): Promise<void>;
  setScene(name: string): Promise<void>;
  renameScene(name: string): Promise<void>;
  recordRoll(expression: string): void;
  end(opts: { endJournal: boolean }): Promise<void>;
}
export const soloSessionStore: SoloSessionStore;
```

**Behaviour**:

- The session reloads when `vaultRegistry.activeVaultId` changes, which covers user story 3, scenario 3.
- It also reloads when another tab writes or removes this vault's key (a `storage` event), so tabs stay in step.
- `start` refuses while a session is already active (FR-019) and while `isSharedPlayOn()` is true (FR-028).
- Storage errors are caught and logged, never thrown into the UI.
- A failed journal call during `start` still starts the session with `journalId: null` and shows a notification.
- A failed `createSection` keeps the scene name and sets no section.

**Tests**:

- Start with a map selects it, sets SOLO and navigates to `/map`. Start with no map navigates to `/`.
- Start with the journal option off makes no journal call.
- Start throws for a guest and when blocked.
- A reload restores the session, and so does a vault switch.
- Resume does not touch SOLO.
- `setScene` with an active journal creates a section; with no journal it does not.
- End with `endJournal: false` leaves the journal running. End deletes only the key (a storage spy confirms no other writes).

## 3. Shared play guard (`apps/web/src/lib/stores/ui/solo-play-guard.ts`)

```ts
export const SOLO_SHARED_NOTE =
  "End your solo session to share or preview as a player.";
export const SHARED_SOLO_NOTE = "End shared play to start a solo session.";

export function sharedPlayBlockedReason(): string | null; // solo active → SOLO_SHARED_NOTE
export function soloStartBlockedReason(): string | null; // sharedMode || hosting → SHARED_SOLO_NOTE
export function toggleSharedMode(): boolean; // returns whether the mode changed
export function requestShare(): boolean; // opens Share unless blocked
```

`stores/ui/shared-play-state.ts` exports `isSharedPlayOn(): boolean` (`sessionModeStore.sharedMode || p2pHost.isHosting`).

Leaving shared mode is never blocked.

**Call sites changed**:

- `useGlobalShortcuts.ts` (key `p`);
- `GraphToolbar.svelte` and `MapVTTControlsHUD.svelte` (their shared-mode toggles, disabled with the note as their title while blocked);
- `map-page-controller.svelte.ts` `openShareModal()` and `components/layout/VaultActionsMenu.svelte`'s Share item, which both call `requestShare()`. When blocked it shows the note through `notificationStore` instead of opening.

**Tests**:

- Blocked and unblocked in both directions.
- Toggling off is always allowed.
- Each call site's existing tests still pass with no solo session (SC-006).

## 4. UI components (`apps/web/src/lib/components/solo/`)

| Component                                                    | Responsibility                                                                                                   | Key test ids                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `PlayPage.svelte` (used by `routes/(app)/play/+page.svelte`) | Start or Resume as the main action; the Adventure Mode card shown only when AI is not disabled; the blocked note | `play-start-solo`, `play-resume-solo`, `play-adventure-mode`               |
| `SoloSetupDialog.svelte`                                     | Map choice (maps, plus "No map"), journal option labelled from `controlState`, Start and Cancel                  | `solo-setup-map`, `solo-setup-journal`, `solo-setup-start`                 |
| `SoloSessionBar.svelte`                                      | Desktop strip; minimise; mounts the parts below                                                                  | `solo-bar`, `solo-bar-minimise`                                            |
| `SoloQuickRoll.svelte`                                       | Input, last result and total, inline error, Enter to roll                                                        | `solo-quick-roll-input`, `solo-quick-roll-result`, `solo-quick-roll-error` |
| `SoloSceneField.svelte`                                      | Shows and edits the scene; new scene or rename                                                                   | `solo-scene`                                                               |
| `SoloSessionSheet.svelte`                                    | Phone sheet with the same actions                                                                                | `solo-bar-mobile-trigger`, `solo-sheet`                                    |
| `SoloEndDialog.svelte`                                       | Cancel, End, or End and journal                                                                                  | `solo-end-cancel`, `solo-end-keep-journal`, `solo-end-with-journal`        |

The bar's actions and the existing calls they use:

| Action     | Call                                                                            | Notes                                         |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| More dice  | `modalUIStore.showDiceModal = true`                                             |                                               |
| Ask Oracle | `layoutUIStore.activeSidebarTool = "oracle"`                                    | Hidden when `discoveryPolicyStore.aiDisabled` |
| Journal    | same as the nav item: `open()` if resuming, then `quickNoteStore.openJournal()` |                                               |
| Map        | `selectMap(mapId)` then go to `/map`                                            | Opens setup's map choice when there is no map |
| Add note   | `quickNoteStore.open()`                                                         |                                               |

Every control has an accessible name and can be reached by keyboard (FR-014).

## 5. Navigation and routes

- `nav-items.ts`, item `adventure`: `href` becomes `/play`, `alsoActiveFor: ["/adventure"]`, and the title becomes "Play: start a solo session or an Oracle-run adventure".
- New `routes/(app)/play/+page.svelte`.
- `/play` added to `service-worker/routing.ts` and `seo/crawler-access.ts` next to `/adventure`.

**Tests**: `nav-items` test for the href and active state; route test that `/adventure` still renders.

## 6. Help and Cif (`packages/help-engine`, `apps/web/src/lib/content/help`)

- `registry/features/solo-session.ts` (new), registered in `features/index.ts`; `helpIds: ["solo-session"]`.
- `context/index.ts`: add `/(app)/play` to `HELP_ROUTE_TEMPLATES`.
- `actions/catalogue.ts`:
  - `SESSION_FLAGS = ["solo-session"]` joins `HELP_FLAGS`, and `MAX_FLAGS` rises by one;
  - `ControlSpec.area` gains `"solo"`;
  - new controls `play-start-solo-session` (area `solo`), `solo-quick-roll` and `solo-end-session` (area `solo`, `requiresFlag: "solo-session"`).
- `apps/web/src/lib/stores/help-assistant/help-context.svelte.ts` reports `solo-session` and the reachable solo controls.
- `registry/features/solo-adventure.ts`: steps say "Open Play, then choose Let the Oracle run the game".
- New article `content/help/solo-session.md`, with links from `vtt-solo-play.md`, `adventure-mode.md` and `dice-roller.md`.
- Evaluation questions for "how do I play solo", "what is the solo bar" and an in-game question that must be routed to the Oracle.

**Tests**: registry schema test, context validation test (new flag and route), and the help bundle build.

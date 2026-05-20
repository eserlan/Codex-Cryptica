# `ui.svelte.ts` — God-File Analysis

_(Drafted: 2026-05-19)_

## TL;DR

`UIStore` is a single Svelte 5 class holding **~45 state fields**, **100 methods**, and **57 direct `localStorage` / `window` side-effects**, used by **147 files**. It mixes at least eight unrelated UI concerns into one reactive object. The fix is a **per-concern split with a thin compatibility facade**, migrated incrementally — same playbook as Specs 098/099/100.

---

## What's actually in the file

A reading of the 872 lines surfaces these distinct concerns living on one class:

| #   | Concern                          | Representative state                                                                                                                                  | Representative methods                                                                                                 |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **Layout / sidebars**            | `leftSidebarOpen`, `activeSidebarTool`, `leftSidebarWidth`, `rightSidebarWidth`, `vttSidebarCollapsed`, `vttEntityListCollapsed`, `isMobile`          | `toggleSidebarTool`, `setLeftSidebarWidth`, `setRightSidebarWidth`, `closeSidebar`, `toggleVttSidebar`                 |
| 2   | **Modals / dialogs**             | `showSettings`, `showDiceModal`, `showCanvasSelector`, `mergeDialog`, `bulkLabelDialog`, `lightbox`, `confirmationDialog`, read-mode/zen-mode flags   | `openSettings`, `openLightbox`, `openMergeDialog`, `openCanvasSelection`, `confirm`, `resolveConfirmation`             |
| 3   | **Notifications / global error** | `notification`, `globalError`, `notificationTimeoutId`                                                                                                | `notify`, `clearNotification`, `setGlobalError`, `clearGlobalError`                                                    |
| 4   | **Explorer view state**          | `explorerViewMode`, `explorerCollapsedLabelGroups`, `labelFilters`                                                                                    | `setExplorerViewMode`, `toggleLabelFilter`, `removeLabelFilter`, `toggleExplorerLabelGroup`, `getCollapsedLabelGroups` |
| 5   | **Discovery / AI policy**        | `entityDiscoveryMode`, `connectionDiscoveryMode`, `aiDisabled`, `autoArchive`, `archiveActivityLog`, `oracleAutomationPolicy`                         | `setEntityDiscoveryMode`, `setConnectionDiscoveryMode`, `toggleAiDisabled`, `toggleAutoArchive`                        |
| 6   | **Connection / selection mode**  | `isModifierPressed`, `isConnecting`, `connectingNodeId`, `lastConnectionLabel`, `recentConnectionLabels`, `showSelectionConnector`, `abortController` | `toggleConnectMode`, `startSelectionConnection`, `setLastConnectionLabel`, `abortActiveOperations`                     |
| 7   | **Guest / demo / shared mode**   | `sharedMode`, `isGuestMode`, `guestUsername`, `isDemoMode`, `activeDemoTheme`, `hasPromptedSave`, `wasConverted`                                      | `setGuestUsername`                                                                                                     |
| 8   | **First-run / onboarding**       | `dismissedLandingPage`, `dismissedWorldPage`, `skipWelcomeScreen`, `lastSeenVersion`, `showChangelog`, `isLandingPageVisible`                         | `markVersionAsSeen`, `toggleWelcomeScreen`, `dismissLandingPage`, `dismissWorldPage`, `restoreWorldPage`               |
| 9   | **Focus / navigation**           | `focusedEntityId`, `mainViewMode`, `findNodeCounter`, `readModeNodeId`, `zenModeEntityId`, `zenModeActiveTab`, `showZenMode`                          | `focusEntity`, `findInGraph`, `openZenMode`, `closeZenMode`, `openReadMode`                                            |

---

## Why this is painful

### 1. Blast radius (147 importers)

Every consumer pulls the **whole** `uiStore` even if it touches one field. Top usage frequencies:

```
64  uiStore.notify          ← used as an app-wide toast bus
53  uiStore.isGuestMode     ← read in many guest gating checks
35  uiStore.confirm         ← global confirm() shim
32  uiStore.isDemoMode
20  uiStore.aiDisabled
17  uiStore.activeSettingsTab
…
```

`notify` and `confirm` alone are pulled into ~100 files that have nothing to do with sidebar widths or zen mode. Those files re-evaluate (and re-typecheck) every time `UIStore` changes shape.

### 2. Persistence-and-state tangling

57 direct `localStorage` / `matchMedia` / `window.*` calls sit inline in the class. The constructor alone reads **eight** keys with bespoke parsing logic for each (`codex-cryptica-active-theme`, `codex_vtt_sidebar_collapsed`, `codex_entity_discovery_mode`, etc.). Persistence concerns are interleaved with state mutation, so you can't unit-test the state logic without stubbing `window`.

### 3. No reactive scoping

Svelte 5 fine-grained reactivity gives you per-field tracking, but **only across class instances**. A component that only reads `confirmationDialog.open` still drags the whole `UIStore` proxy through its dependency graph. Splitting into smaller stores lets the compiler shrink the actual reactive surface per consumer.

### 4. Cross-concern method bloat

`focusEntity` (lines 260–300) opens the right sidebar, sets the focused entity, optionally closes the mobile sidebar, and restores prior focus — three concerns tangled in one method. `openZenMode` (lines ~820) reaches into `vault` to check guest content access. Methods like these are why the class has 100 entries and cannot be split mechanically by tooling — they need real refactoring.

### 5. Initialization hazard

The constructor runs ~150 lines of synchronous `localStorage` reads on first instantiation. Any thrown error during one parse aborts initialization of _every_ unrelated piece of state. There's also no clear ordering or invariant — fields are read in whatever order the file grew.

---

## Recommended approach

### Pattern: incremental extract + facade

This is the exact pattern that worked for Specs 098 (host service), 099 (map session), and 100 (guest service). The contract: **public consumers keep importing `uiStore` until every field has been moved**; the facade stays as a thin object that delegates to the new stores. Once the import sweep is done, drop the facade.

```ts
// During migration (apps/web/src/lib/stores/ui.svelte.ts becomes ~80 lines):
export const uiStore = {
  // Layout
  get leftSidebarOpen() {
    return layoutUIStore.leftSidebarOpen;
  },
  set leftSidebarOpen(v) {
    layoutUIStore.leftSidebarOpen = v;
  },
  toggleSidebarTool: (...args) => layoutUIStore.toggleSidebarTool(...args),
  // …
};
```

Consumers' code path is unchanged. The facade is line-for-line mechanical. Risk is contained to one file at a time.

### Proposed split (8 stores)

| New store              | File                                   | Approx lines | Replaces                                                                                             |
| ---------------------- | -------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `LayoutUIStore`        | `stores/ui/layout-ui.svelte.ts`        | ~150         | sidebar open/widths/tool, mobile detection, VTT sidebar/entity-list collapse                         |
| `ModalUIStore`         | `stores/ui/modal-ui.svelte.ts`         | ~150         | settings, dice, canvas selector, merge, bulk label, lightbox, read-mode, zen-mode                    |
| `NotificationStore`    | `stores/ui/notification.svelte.ts`     | ~80          | `notify`, `clearNotification`, `globalError`, `setGlobalError`, `confirm`, `resolveConfirmation`     |
| `ExplorerUIStore`      | `stores/ui/explorer-ui.svelte.ts`      | ~120         | view mode, collapsed label groups, label filters                                                     |
| `DiscoveryPolicyStore` | `stores/ui/discovery-policy.svelte.ts` | ~80          | entity/connection discovery modes, AI-disabled, auto-archive, oracle automation policy, activity log |
| `ConnectionModeStore`  | `stores/ui/connection-mode.svelte.ts`  | ~80          | modifier/connecting state, abort controller, label history                                           |
| `SessionModeStore`     | `stores/ui/session-mode.svelte.ts`     | ~60          | guest / demo / shared mode, guest username                                                           |
| `OnboardingStore`      | `stores/ui/onboarding.svelte.ts`       | ~80          | landing/world dismissal, welcome, version, changelog                                                 |

Plus a **`UIPersistence`** helper module — pull every `localStorage.get/setItem` out into typed `read<T>(key)` / `write<T>(key, value)` helpers. Each new store uses it; nothing inline.

### Special cases

- **`notify` / `confirm`** are app-wide infrastructure, not "UI state." Consider exposing them via a small `useNotify()` / `useConfirm()` helper module instead of forcing every consumer to import a store at all.
- **`focusEntity`** crosses Layout + Focus + Mobile detection. After the split it lives in the Focus/Navigation slice (probably part of `LayoutUIStore` or its own `NavigationStore`) and _calls_ the layout store's `closeSidebar` explicitly.
- **`openZenMode`'s `vault` dependency** should invert: vault decides whether the entity is readable and tells the UI store to open; the store shouldn't reach into vault.

### Ordering (lowest-risk first)

1. **`NotificationStore`** — small, self-contained, but called everywhere; gets the migration pattern proven on the highest-frequency surface.
2. **`OnboardingStore`** — small, ~5 importers, almost zero coupling.
3. **`ModalUIStore`** — bounded surface; opening/closing modals doesn't intersect other concerns.
4. **`DiscoveryPolicyStore`** + **`SessionModeStore`** — independent slices.
5. **`ConnectionModeStore`** — wraps `AbortController` lifecycle, deserves attention but is localized.
6. **`ExplorerUIStore`** — straightforward.
7. **`LayoutUIStore`** — biggest single piece; do it last when you've practiced the pattern.
8. **Delete the facade.** Sweep imports with codemod (`uiStore.foo` → `<newStore>.foo` per field map), drop `ui.svelte.ts`.

Each step is a separately mergeable PR that keeps the app working.

### Constitution checks

- **Library-first** ✓ — each store is a standalone module.
- **DI** ✓ — `UIPersistence` can be injected for tests, eliminating the `vi.stubGlobal` dance the current tests need.
- **TDD** — each new store gets a unit test the same day; the facade migration is verified by the existing 1100+ test suite continuing to pass.
- **Surgical** ✓ — phase boundaries are crisp; rollback is `git revert` of one store.

---

## Risks & mitigations

| Risk                                                 | Mitigation                                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wide import diff (147 files)                         | Facade delegation means imports don't have to change during extraction; only the final sweep PR does the mechanical rename. Codemod with `ts-morph` / `jscodeshift`. |
| Test fallout from `vi.mock("../ui.svelte")` patterns | Keep `ui.svelte.ts` as a re-export shim for one release so existing mocks still resolve, then update mocks in a follow-up.                                           |
| Persistence keys drift                               | Centralize key strings in `UIPersistence` so the migration can't accidentally rename a `localStorage` key and orphan user data.                                      |
| Reactive subscription regressions                    | Each new store gets a smoke test that mutates a field and asserts a subscriber fired; catches accidental loss of reactivity from non-`$state` migrations.            |
| Cross-store dependencies sneak back in               | Lint rule (or just a CODEOWNERS-level review check) forbidding `stores/ui/*` from importing each other. Cross-cutting concerns live in the consumer, not the store.  |

---

## Expected outcome

- `ui.svelte.ts` deleted; 8 stores averaging ~100 lines each.
- Top 10 god-files report drops 872 lines; #1 slot becomes `oracle.svelte.ts` until that's tackled.
- Per-feature stores become independently testable without a `window` stub.
- Import surface in consumer files shrinks (only the slice they actually use), enabling future tree-shaking.
- The pattern earns its third reuse, cementing it as the project's standard god-file remedy.

## Suggested spec scope

A single spec covering the split + facade pattern, mirroring 098/099/100 in shape:

- **US1**: Extract `NotificationStore` behind the facade.
- **US2**: Extract `OnboardingStore`.
- **US3–US7**: One user story per remaining store.
- **US8**: Drop the facade; codemod imports.
- **FR-N**: every new store ≥ 90% coverage; facade behavior identical to current `uiStore` (verified by snapshot tests of public method signatures).
- **SC**: 872 → 0 lines for `ui.svelte.ts`; per-store files all ≤ 200 lines; zero net regressions in 1100+ test suite.

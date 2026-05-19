# Data Model: UI Store Decoupling

## Component: UIPersistence

**Operations**:

- `read<T>(key, parse, fallback): T` — read + parse; on missing or parse failure, return `fallback`.
- `write<T>(key, value, serialize?): void` — `JSON.stringify` by default.
- `remove(key): void` — for reset flows.

**Constructor**: accepts `{ storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> }`. Defaults to `globalThis.localStorage` when present; no-op otherwise (SSR safe).

**Keys it owns** (lifted verbatim from current `ui.svelte.ts`):

- `codex-cryptica-active-theme`
- `codex_vtt_sidebar_collapsed`
- `codex_vtt_entity_list_collapsed`
- `codex_entity_discovery_mode`
- `codex_connection_discovery_mode`
- `codex_last_connection_label`
- `codex_recent_connection_labels`
- `codex_left_sidebar_width`
- `codex_right_sidebar_width`
- `codex_explorer_view_mode`
- `codex_explorer_collapsed_label_groups`
- `codex_dismissed_landing`
- `codex_dismissed_world`
- `codex_world_dismissed_at`
- `codex_skip_welcome`
- `codex_last_seen_version`
- `codex_ai_disabled`
- `codex_lite_mode`
- `codex_auto_archive`

(Full key list locked in `contracts/UIPersistence.ts`; the exact set is verified during Phase 2 by enumerating `localStorage` calls in `ui.svelte.ts`.)

---

## Component: NotificationStore

**State**:

- `notification: { message, type, persistent } | null`
- `globalError: { message, stack? } | null`
- `confirmationDialog: { open, title, message, resolve? }`

**Internal**:

- `notificationTimeoutId: number | null`

**Operations**:

- `notify(message, options?): void` — replaces any current notification; cancels prior timeout.
- `clearNotification(): void`
- `setGlobalError(message, stack?): void`
- `clearGlobalError(): void`
- `confirm({ title, message }): Promise<boolean>`
- `resolveConfirmation(result: boolean): void`

**Persistence**: none.

---

## Component: OnboardingStore

**State**:

- `dismissedLandingPage: boolean`
- `dismissedWorldPage: boolean`
- `worldPageDismissedAt: number | null`
- `skipWelcomeScreen: boolean`
- `lastSeenVersion: string | null`
- `showChangelog: boolean`

**Derived**:

- `get isLandingPageVisible(): boolean` — composition of above.

**Operations**:

- `dismissLandingPage()` / `dismissWorldPage()` / `restoreWorldPage()`
- `toggleWelcomeScreen(skip)`
- `markVersionAsSeen(version)`

**Persistence**: `codex_dismissed_landing`, `codex_dismissed_world`, `codex_world_dismissed_at`, `codex_skip_welcome`, `codex_last_seen_version`.

---

## Component: SessionModeStore

**State**:

- `isGuestMode: boolean`
- `guestUsername: string | null`
- `sharedMode: boolean`
- `isDemoMode: boolean`
- `activeDemoTheme: string | null`
- `hasPromptedSave: boolean`
- `wasConverted: boolean`
- `isStaging: boolean`

**Operations**:

- `setGuestUsername(username)`

**Persistence**: none (session mode is set by routing, not persisted).

---

## Component: ModalUIStore

**State**:

- `showSettings: boolean`, `activeSettingsTab: SettingsTab`
- `showCanvasSelector: boolean`, `pendingCanvasEntities: string[]`
- `showDiceModal: boolean`
- `isImporting: boolean`
- `mergeDialog: { open, sourceIds }`
- `bulkLabelDialog: { open, entityIds }`
- `lightbox: { open, imageUrl, title }`
- `confirmationDialog` — **NOTE**: owned by `NotificationStore`, not duplicated here. ModalUIStore _reads_ it for rendering.
- `showZenMode: boolean`, `zenModeEntityId: string | null`, `zenModeActiveTab`
- `readModeNodeId: string | null`
- `showReadModal: boolean` (derived)

**Operations**:

- `openSettings(tab?)` / `closeSettings()` / `toggleSettings(tab?)`
- `openCanvasSelection(entities)` / `closeCanvasSelection()`
- `openDiceWindow()` / `openImportWindow()`
- `openMergeDialog(sourceIds)` / `closeMergeDialog()`
- `openBulkLabelDialog(entityIds)` / `closeBulkLabelDialog()`
- `openLightbox(url, title)` / `closeLightbox()`
- `openZenMode(entityId, tab?)` / `closeZenMode()` — see Edge Cases (vault must own the gating decision)
- `openReadMode(nodeId)` / `closeReadMode()` / `openReadModal(entityId)` / `closeReadModal()`

**Persistence**: none.

---

## Component: ExplorerUIStore

**State**:

- `explorerViewMode: "list" | "label"`
- `explorerCollapsedLabelGroups: Record<string, string[]>` — keyed by vault id (or `__global__`).
- `labelFilters: Set<string>`

**Operations**:

- `setExplorerViewMode(mode)`
- `toggleLabelFilter(label, isMulti?)` / `removeLabelFilter(label)` / `clearLabelFilters()`
- `getCollapsedLabelGroups(vaultId)` / `toggleExplorerLabelGroup(vaultId, label)`

**Persistence**: `codex_explorer_view_mode`, `codex_explorer_collapsed_label_groups`.

---

## Component: DiscoveryPolicyStore

**State**:

- `aiDisabled: boolean`
- `autoArchive: boolean`
- `entityDiscoveryMode: EntityDiscoveryMode`
- `connectionDiscoveryMode: ConnectionDiscoveryMode`
- `archiveActivityLog: ActivityEvent[]`

**Derived**:

- `get oracleAutomationPolicy(): OracleAutomationPolicy`

**Operations**:

- `toggleAiDisabled(enabled)`
- `toggleAutoArchive(enabled)`
- `setEntityDiscoveryMode(mode)`
- `setConnectionDiscoveryMode(mode)`

**Persistence**: `codex_ai_disabled`, `codex_lite_mode`, `codex_auto_archive`, `codex_entity_discovery_mode`, `codex_connection_discovery_mode`.

---

## Component: ConnectionModeStore

**State**:

- `isModifierPressed: boolean`
- `isConnecting: boolean`
- `connectingNodeId: string | null`
- `lastConnectionLabel: string`
- `recentConnectionLabels: string[]`
- `showSelectionConnector: boolean`
- `abortController: AbortController | null`

**Derived**:

- `get abortSignal(): AbortSignal` — lazy-creates a fresh controller if missing or already aborted.

**Operations**:

- `toggleConnectMode()` / `startSelectionConnection()`
- `setLastConnectionLabel(label)` — updates recent labels list, capped at N.
- `abortActiveOperations()`

**Persistence**: `codex_last_connection_label`, `codex_recent_connection_labels`.

---

## Component: LayoutUIStore

**State**:

- `leftSidebarOpen: boolean`
- `activeSidebarTool: "oracle" | "explorer" | "ai-assessment" | "none"`
- `leftSidebarWidth: number`, `rightSidebarWidth: number`
- `mainViewMode: "visualization" | "focus"`
- `focusedEntityId: string | null`
- `isMobile: boolean`
- `vttSidebarCollapsed: boolean`, `vttEntityListCollapsed: boolean`
- `findNodeCounter: number`

**Operations**:

- `toggleSidebarTool(tool)` / `closeSidebar()`
- `setLeftSidebarWidth(width)` / `setRightSidebarWidth(width)` — both clamp to MIN/MAX constants.
- `toggleVttSidebar(collapsed)` / `toggleVttEntityList(collapsed)`
- `findInGraph()` — bumps `findNodeCounter`.

**Constants exported** (preserve current API):

- `MIN_LEFT_SIDEBAR_WIDTH = 240`
- `MIN_RIGHT_SIDEBAR_WIDTH = 320`
- `MAX_SIDEBAR_VW = 40`

**Persistence**: `codex_left_sidebar_width`, `codex_right_sidebar_width`, `codex_vtt_sidebar_collapsed`, `codex_vtt_entity_list_collapsed`, `codex-cryptica-active-theme` (active-theme detection currently lives in `UIStore`; this may move to `ThemeStore` instead — to clarify).

**Viewport detection**: `matchMedia("(max-width: 768px)")` listener; on change, sets `isMobile`. Lives in the store's `constructor` (only place a non-SSR side effect can run today; ensure cleanup is documented for tests).

---

## Cross-Cutting: Navigation Helper

Today's `focusEntity(entityId)` composes three concerns:

1. Open the right sidebar.
2. Set `focusedEntityId`.
3. If mobile, close the left sidebar.
4. Restore previously focused element on the next animation frame.

After the split, this lives in a small free-function module `apps/web/src/lib/stores/ui/navigation.ts`:

```ts
export function focusEntity(
  entityId: string | null,
  layout: LayoutUIStore = layoutUIStore,
) { … }
```

Consumers call `focusEntity(id)`. The function composes the layout store's primitives without the store reaching across slices.

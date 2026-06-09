# Multiple Mount Audit

Date: 2026-06-09

## Scope

This audit looked for the same UI surface being owned by more than one host at the same time, especially:

- sidebars and drawers
- dialogs and overlays
- lazy-loaded shells
- feature panels with shared global state

It does **not** flag normal reuse where the same presentational component is intentionally used in two different routes or shells.

## Summary

### Confirmed duplicate-owner risks

1. `CanvasSelectionModal`
2. `ShareModal`

### Watchlist

1. `GuestChatPanel`
2. Oracle surfaces (`OracleSidebarPanel` vs `OracleWindow`)

### Cleared as normal reuse

1. `FrontPage`
2. `EntityDetailPanel`
3. `DetailMapTab`
4. `DetailChatsTab`
5. `DiceVault`

## Confirmed Risks

### 1. `CanvasSelectionModal` has two active owners

Evidence:

- Global host: [GlobalModalProvider.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/modals/GlobalModalProvider.svelte:137)
- Local host: [CanvasWorkspace.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/canvas/CanvasWorkspace.svelte:249)
- Shared gate: [modal-ui.svelte.ts](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/stores/ui/modal-ui.svelte.ts:182)

Why this is a real risk:

- Both mounts render the same component.
- Both are driven by the same global flag: `modalUIStore.showCanvasSelector`.
- `CanvasWorkspace` mounts it unconditionally whenever the workspace exists.
- `GlobalModalProvider` also mounts it unconditionally once the lazy import resolves.

Impact:

- Two dialogs can be instantiated from the same store state.
- This can create duplicate focus traps, duplicate Escape handlers, duplicate IDs, and unstable test selectors.

Recommendation:

- Keep `CanvasSelectionModal` in exactly one global owner.
- Remove the local mount from `CanvasWorkspace`, or convert the local usage into a pure trigger that only updates `modalUIStore`.

### 2. `ShareModal` has two active owners

Evidence:

- Global host: [GlobalModalProvider.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/modals/GlobalModalProvider.svelte:182)
- Map-local host: [map/+page.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/routes/(app)/map/+page.svelte:72)
- Global trigger state: [modal-ui.svelte.ts](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/stores/ui/modal-ui.svelte.ts:61)

Why this is a real risk:

- The same modal component is mounted from two different owners.
- The global path uses `modalUIStore.showShare`.
- The map-local path uses `controller.showVttShare`.
- Those state sources are independent, so both can be true on the map route.

Impact:

- Two share dialogs can exist at once with different close handlers and different lifecycle ownership.
- This is the same category of bug as the Oracle sidebar issue: duplicate surface ownership, even though the exact state source differs.

Recommendation:

- Split this into two distinct components if they are truly different UX flows, for example `WorldShareModal` and `VTTShareModal`.
- Otherwise keep `ShareModal` under a single owner and route all entry points through one store.

## Watchlist

### 3. `GuestChatPanel` is mounted in both page content and a modal shell

Evidence:

- Main content route: [routes/(app)/+page.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/routes/(app)/+page.svelte:236)
- Modal shell: [GuestChatModal.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/modals/GuestChatModal.svelte:44)
- Modal gate: [guest-chat.svelte.ts](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/stores/guest-chat.svelte.ts:34)

Why this is only a watchlist item:

- The two mounts are driven by different state:
  - page content uses `layoutUIStore.mainViewMode === "guest-chat"`
  - modal uses `guestChatStore.showChatModal`
- I did not verify a concrete user flow that turns both on together.

Why it still deserves attention:

- If both states become true, the same chat surface can mount twice with shared transcript state.

Recommendation:

- Decide whether guest chat is a page mode or a modal flow.
- If both must exist, add a guard that forces one path closed when the other opens.

### 4. Oracle has two top-level surface systems

Evidence:

- Sidebar path: [SidebarPanelHost.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/layout/SidebarPanelHost.svelte:55)
- Window/modal path: [GlobalModalProvider.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/modals/GlobalModalProvider.svelte:65)
- Window shell: [OracleWindow.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/oracle/OracleWindow.svelte:51)

Why this is a watchlist item rather than a confirmed duplicate:

- These are not the same component.
- The sidebar is driven by `layoutUIStore.activeSidebarTool`.
- The window is driven by `oracle.isOpen`.
- I did not find a normal in-app path that opens `oracle.isOpen` from the current layout flow.

Why it still deserves attention:

- This feature already had one duplicate-owner bug.
- Two independent Oracle surface systems increase the chance of drift or a future double-open bug.

Recommendation:

- Document the intended ownership model:
  - sidebar only
  - window only
  - or explicitly mutually exclusive modes
- If the window path is legacy or inactive, consider removing it or gating it behind a single surface controller.

## Cleared as Normal Reuse

### `FrontPage`

Used in:

- [routes/(app)/+page.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/routes/(app)/+page.svelte:296)
- [routes/(app)/vault/[id]/+page.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/routes/(app)/vault/[id]/+page.svelte:23)

Reason:

- Route-specific reuse, not concurrent ownership inside one shell.

### `EntityDetailPanel`

Used in:

- [routes/(app)/+page.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/routes/(app)/+page.svelte:259)
- [routes/(app)/vault/[id]/+page.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/routes/(app)/vault/[id]/+page.svelte:27)

Reason:

- Same route-family concept rendered in distinct route contexts, not duplicated from two owners in one page.

### `DetailMapTab` and `DetailChatsTab`

Used in:

- [EntityDetailPanel.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/EntityDetailPanel.svelte:487)
- [ZenView.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/zen/ZenView.svelte:445)

Reason:

- Intentional subview reuse inside different parent shells.

### `DiceVault`

Used in:

- [DiceModal.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/lib/components/dice/DiceModal.svelte:67)
- [routes/(app)/dice/+page.svelte](/home/espen/proj/Codex-Cryptica-v2/apps/web/src/routes/(app)/dice/+page.svelte:30)

Reason:

- Standalone page and modal reuse, but each path has its own explicit shell and activation model.

## Recommended Follow-up Order

1. Fix `CanvasSelectionModal` ownership first.
2. Fix `ShareModal` ownership second.
3. Decide whether `GuestChatPanel` needs a guard against modal + page double-open.
4. Decide whether `OracleWindow` is still a supported surface or legacy ballast.

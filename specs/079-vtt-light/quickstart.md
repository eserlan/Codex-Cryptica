# Quickstart: Lightweight VTT Development

## Prerequisites

- Node.js 18+
- Existing Codex-Cryptica development environment (`npm install` already run)
- At least one map uploaded to a vault for testing

## Getting Started

### 1. Create the session store

```bash
# New file: apps/web/src/lib/stores/map-session.svelte.ts
```

Start with the `EncounterSession` class. It should:

- Accept `MapStore` and optional `P2PHostService` via constructor DI
- Manage `$state` for tokens, initiative, turn, round, selection, mode, and chat messages
- Export both the class and a default singleton (`mapSession`)
- Keep the session usable from the docked VTT sidebar, the left chat sidebar, and the initiative pop-out window
- Treat token ownership as a move-permission flag only; visibility stays separate and is host-controlled

Test first: `apps/web/tests/unit/stores/map-session.test.ts`

### 2. Add token rendering to MapView

In `apps/web/src/lib/components/map/MapView.svelte`, inside the `draw()` function, after the `renderMap()` call:

```typescript
// After renderMap()
if (mapSession.activeSession) {
  renderTokens(canvas, mapSession.tokens, mapStore.viewport, canvasSize);
}
```

Create `renderTokens()` in `packages/map-engine/src/renderer.ts` following the same pattern as `drawPins()`.

### 3. Add VTT controls and chat

Create `apps/web/src/lib/components/map/VTTControls.svelte` with:

- VTT mode toggle button
- Tool selector for move, measure, and fog reveal
- Compact icon buttons for explore, combat, add token, and encounters

Create `apps/web/src/lib/components/vtt/VTTChatSidebar.svelte` for the left-side chat panel, and keep the chat input row in `apps/web/src/lib/components/vtt/VTTChat.svelte` with:

- Oracle-style `/roll` command autocomplete
- A dice button that opens the shared dice modal
- A send button that matches the shared sidebar control styling

### 4. Add initiative panel

Create `apps/web/src/lib/components/vtt/InitiativePanel.svelte`.
Subscribe to `mapSession` for `initiativeOrder`, `turnIndex`, `round`.
Render a list with drag-reorder capability, token selection handoff, and an optional pop-out window for detached combat tracking.

### 5. Token drag interaction

Add pointer event handling in `MapView.svelte` (or a new `TokenDragLayer.svelte`):

- On pointer down over a token: start drag
- On pointer move: update token x/y (snap to grid if grid active)
- On pointer up: finalize position, broadcast if host

### 6. Run tests

```bash
npm test
npm test -- --run map-session
```

### 7. Manual testing

```bash
npm run dev
```

1. Open a vault with at least one map
2. Open a map in MapView
3. Click the VTT mode toggle
4. Add a token, drag it around
5. Verify grid snapping when grid is enabled
6. Open the initiative panel, add tokens, advance turns
7. Open the left VTT chat sidebar, type `/roll`, and confirm the Oracle-style command menu inserts the command
8. Click the dice button in the VTT chat input row and verify the shared dice modal opens
9. Roll from the modal and confirm the resolved result appears in the VTT chat transcript for all connected participants
10. Type `+` and `-` in the chat input and confirm the map does not zoom
11. Open a token in the detail panel, change ownership or remove it, and confirm the session updates. Verify that ownership does not hide the token from other participants
12. Open Encounter Snapshots, save a snapshot, delete it, and confirm it disappears from the list
13. Use the host-only Share control at the bottom of the VTT sidebar to start a live shared session without leaving VTT mode

## Key Files to Modify

| File                                                       | Change                                       |
| ---------------------------------------------------------- | -------------------------------------------- |
| `apps/web/src/lib/stores/map-session.svelte.ts`            | New session state store                      |
| `packages/map-engine/src/renderer.ts`                      | Add `renderTokens()` function                |
| `apps/web/src/lib/components/map/MapView.svelte`           | Add VTT overlay rendering and input handling |
| `apps/web/src/lib/components/map/VTTControls.svelte`       | Toolbar and icon-button actions              |
| `apps/web/src/lib/components/vtt/VTTChatSidebar.svelte`    | Left-side chat panel                         |
| `apps/web/src/lib/components/vtt/VTTChat.svelte`           | Chat input, slash commands, dice modal entry |
| `apps/web/src/lib/components/vtt/InitiativePanel.svelte`   | Turn order UI + pop-out                      |
| `apps/web/src/lib/components/vtt/TokenDetail.svelte`       | Token owner/remove actions                   |
| `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts` | Add VTT message handlers                     |
| `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts`       | Add VTT message handlers                     |

## Testing Strategy

1. **Unit tests** for `map-session.svelte.ts` - all CRUD operations, initiative cycling, permission checks, chat message sync
2. **Unit tests** for `renderTokens()` - coordinate transforms, frustum culling for tokens
3. **Integration tests** for P2P message round-trip (host sends -> guest receives)
4. **E2E tests** (Playwright) for:
   - Token placement and movement
   - Turn order advancement
   - Shared session: host moves token -> guest sees update
   - VTT chat roll flow and shared transcript updates

## Common Pitfalls

- **Viewport transform**: Token positions are in image-space, but canvas rendering uses centered coordinates. Always use `mapStore.project()` / `mapStore.unproject()` for coordinate conversion.
- **Svelte 5 reactivity**: Use `$derived` for computed token lists, not `$state` with manual updates.
- **P2P timing**: The host must send `SESSION_SNAPSHOT` only after the guest's data connection is fully open. Use the existing `GUEST_JOIN` flow as a trigger.
- **Grid snapping**: Snap to `mapStore.gridSize` in image-space, not screen-space.
- **Chat focus**: Keep map keyboard shortcuts disabled while the VTT chat textarea is focused so slash commands and math operators work normally.

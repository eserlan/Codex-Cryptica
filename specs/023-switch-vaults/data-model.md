# Data Model: Vault Detachment

## Store State Transitions

The `VaultStore` manages the primary campaign state. Detachment triggers a transition from an "Active" state to a "Clean" state.

### Active State
- `entities`: Populated record of `LocalEntity`.
- `rootHandle`: Valid `FileSystemDirectoryHandle`.
- `isAuthorized`: `true`.
- `inboundConnections`: Populated adjacency map.

### Clean State (Post-Detachment)
- `entities`: `{}` (Empty).
- `rootHandle`: `undefined`.
- `isAuthorized`: `false`.
- `inboundConnections`: `{}` (Empty).
- `status`: `"idle"`.

## External Dependencies Reset

| System | Reset Action |
|--------|--------------|
| FlexSearch | `searchService.clear()` |
| Lore Oracle | `oracle.clearMessages()` |
| Cloud Bridge | `workerBridge.destroy()` followed by re-initialization if needed |
| Persistence | Delete key from LocalStorage/IDB |

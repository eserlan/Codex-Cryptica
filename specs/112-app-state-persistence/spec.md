# Feature Specification: App State Persistence & Restoration

**Feature Branch**: `111-proposal-limit-check` (or corresponding release/feature branch)  
**Created**: 2026-05-22  
**Status**: Completed  
**Input**: User description: "I'm thinking its a good idea that the browser remembers the state of the app when the user leaves, so when he refreshes or returns it is in the same state as when he left. i'm thinking about specifically what view is active (map, graph, canvas), if there's a selected entity in sidebar/graph or an open entity in zen mode, and if from the entity explorer (and if that's open)."

## Architectural Decisions & Scope

### 1. Active View Mode (Routes)

- SvelteKit routes natively govern active application views (`/` for Knowledge Graph, `/map` for Tactical VTT Map, `/canvas` for Spatial Canvas, `/timeline` for World Timeline).
- Browser-native URL path preservation on page refresh handles this state out of the box, ensuring zero-overhead view restoration on re-entry.

### 2. Left Sidebar Layout Preferences (Global)

- Left sidebar openness (`leftSidebarOpen`) and active tool selection (`activeSidebarTool`, e.g., `"explorer"`, `"oracle"`) are global layout preferences.
- These states are persisted globally inside `localStorage` using keys `codex_left_sidebar_open` and `codex_active_sidebar_tool`. This ensures a seamless, consistent layout across all vaults.

### 3. Active Entity Contexts (Per-Vault Scoped)

- Selected Entity ID (`selectedEntityId`) and Zen Mode overlay states (`showZenMode`, `zenModeEntityId`, `zenModeActiveTab`) represent the active writing context.
- To prevent cross-vault contamination, these states are scoped per `activeVaultId` and serialized into `localStorage` under `codex_vault_state_[vaultId]` (e.g. `codex_vault_state_default`).
- On vault initialization or vault-switching events, the system reads the corresponding state from local storage and restores active selection and Zen mode overlays if the referenced entities still exist in the loaded vault.

---

## User Scenarios & Testing

### User Story 1 - Global Layout Persistence

- **Given** the user has the left sidebar open with the Entity Explorer tool active,
- **When** the user refreshes the browser,
- **Then** the page reloads with the left sidebar open and the Entity Explorer active.

### User Story 2 - Vault-Scoped Entity Selection Preservation

- **Given** the user has selected an entity in the Knowledge Graph in Vault A,
- **When** the user switches to Vault B,
- **Then** the previous selection is cleared, and Vault B's last selected entity (if any) is restored.
- **When** the user switches back to Vault A,
- **Then** Vault A's original selected entity is restored.

---

## Functional Requirements

- **FR-001**: `LayoutUIStore` MUST load `leftSidebarOpen` and `activeSidebarTool` from global local storage on construction.
- **FR-002**: `LayoutUIStore` getters/setters MUST write changes to `leftSidebarOpen` and `activeSidebarTool` to local storage immediately.
- **FR-003**: The root layout (`+layout.svelte`) MUST run a Svelte 5 reactive `$effect` to restore `selectedEntityId` and Zen mode states scoped to `activeVaultId` once initialization is complete.
- **FR-004**: The root layout (`+layout.svelte`) MUST run a Svelte 5 reactive `$effect` to serialize and persist any changes to the current vault's `selectedEntityId` or Zen mode states back to the vault-specific storage key.

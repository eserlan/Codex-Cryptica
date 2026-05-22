# Implementation Plan: App State Persistence & Restoration

This plan details the integration of browser-state persistence and restoration for Codex-Cryptica.

## Proposed Changes

### 1. Global Layout Store (`layout-ui.svelte.ts`)

- Leverage Svelte 5 `$state` and ES6 property getters/setters in `LayoutUIStore` to capture all direct and indirect writes.
- Write to `localStorage` via the `UIPersistence` helper.
- Key bindings:
  - `codex_left_sidebar_open`
  - `codex_active_sidebar_tool`

### 2. Root Layout Orchestrator (`+layout.svelte`)

- Register a client-side reactive `$effect` block that watches `vault.activeVaultId` and `vault.isInitialized`.
- Guard against infinite circular writes by maintaining a `lastRestoredVaultId` variable.
- On initialization or switch, restore the last known `selectedEntityId` and Zen Mode details (`showZenMode`, `zenModeEntityId`, `zenModeActiveTab`).
- Serialize active changes into a single JSON object under the key `codex_vault_state_[vaultId]` to preserve clean partitions.

---

## Verification Plan

### Automated Tests

- Run unit tests in `layout-ui.test.ts` verifying that modifications to layout parameters trigger write storage actions, and construction reads from previous values correctly.
- Command: `npm run test src/lib/stores/ui/layout-ui.test.ts -- --run`

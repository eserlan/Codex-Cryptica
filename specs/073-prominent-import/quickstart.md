# Quickstart: Prominent Import Feature

## Implementation Steps

### 1. Update `VaultControls.svelte`

- Add an "IMPORT" button using the `btnSecondary` style.
- Location: Between "NEW ENTITY" and "SYNC".
- Action: `uiStore.openSettings('vault')`.

### 2. Implement Empty State Overlay

- Create a new component `apps/web/src/lib/components/vaults/EmptyVaultOverlay.svelte`.
- Show when `vault.allEntities.length === 0` and not in demo mode.
- Include "Create New Entity" and "Import Archive" buttons.

### 3. Integrate Overlay into `+page.svelte`

- Overlay the `GraphView` with `EmptyVaultOverlay` when conditions are met.

## Verification

### Automated Tests

- **Playwright**: `apps/web/tests/import-prominence.spec.ts`
  - Test 1: "Import" button exists in Vault Controls and opens Settings.
  - Test 2: Empty vault shows the overlay with both actions.
  - Test 3: Non-empty vault does NOT show the overlay.

# UI Action Contracts: Prominent Import

## Action: Open Import Interface

**Trigger**: Global "IMPORT" button or Empty State "Import Archive" button.
**Effect**:

1. `uiStore.showSettings` set to `true`.
2. `uiStore.activeSettingsTab` set to `'vault'`.
3. (Optional) Scroll target set to `#archive-ingestion`.

## Component: `EmptyVaultOverlay`

**Props**: None (uses `vault` and `uiStore` global singletons).
**Slots**: None.
**Events**: None (Internal actions only).

# Data Model: Interactive Demo Mode

## Entities

### DemoState (Updated uiStore)

**New Fields**:

- `isDemoMode`: (Boolean) Global flag indicating if the current session is a transient demo.
- `activeDemoTheme`: (String) The theme name (e.g., "vampire") for the current demo.
- `demoLoreTitle`: (String) The name of the lore/campaign being demonstrated.
- `hasPromptedSave`: (Boolean) Track if the user has been shown the "Save as Campaign" CTA.

### VaultStore (Updated)

**New Methods**:

- `loadDemoData(data: object)`: Resets the store with in-memory data, skipping DB initialization.
- `persistToIndexedDB(vaultId: string)`: Clones the current in-memory state into a persistent database entry.
- `isDemoMode`: (Boolean) Transient flag to gate data-destructive actions (e.g., delete).

## State Transitions

### Demo Activation Flow

1. **Trigger**: User clicks "Try Demo" or visits `?demo=[theme]`.
2. **Setup**:
   - `uiStore.isDemoMode = true`.
   - `themeStore.setTheme([theme])`.
3. **Load**: `vault.loadDemoData(vaultSamples[theme])`.
4. **Display**: Workspace renders with sample entities and graph.

### Persistent Conversion Flow

1. **Trigger**: User clicks "Save as Campaign".
2. **Persist**:
   - Generate `newVaultId`.
   - `vault.persistToIndexedDB(newVaultId)`.
3. **Transition**:
   - `uiStore.isDemoMode = false`.
   - Clear URL `demo` parameter.
   - Show "Campaign Saved" notification.
4. **Result**: User is now in a standard, persistent campaign.

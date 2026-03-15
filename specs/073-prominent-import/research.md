# Research: Prominent Import Feature

## Decisions

### 1. Primary Entry Point: Top Menu (Vault Controls)

- **Decision**: Add a new "IMPORT" button to `VaultControls.svelte`.
- **Rationale**: The top menu is the most visible and accessible global action area. Users expect primary management actions (New, Sync, Share) to be grouped here.
- **Alternatives Considered**:
  - Floating action button (too mobile-centric, might obscure graph nodes).
  - Sidebar (user clarified that sidebars are for specific tools, not general navigation).

### 2. Contextual Entry Point: Empty Graph State

- **Decision**: When the vault is empty (0 entities), overlay a prominent call-to-action in the center of the graph area.
- **Rationale**: An empty graph is a "dead end". Providing an "Import" button here guides users immediately toward their goal.
- **Alternatives Considered**:
  - Relying solely on the top menu (too subtle for new users).

### 3. Implementation of "Open Import" Action

- **Decision**: The action will trigger `uiStore.openSettings('vault')`.
- **Rationale**: Reuses the established `ImportSettings.svelte` component which already has robust parsing, analysis, and review logic.
- **Future Improvement**: We could add a deep-link mechanism to `SettingsModal` to scroll directly to the `Archive Ingestion` section.

## Best Practices

### Lucide Icons for Import

- **Icon**: `lucide--upload` or `lucide--folder-input`.
- **Consistency**: Match the scale and stroke width of existing icons in `VaultControls.svelte` (3.5 h-3.5).

### Svelte 5 (Runes) Integration

- **Pattern**: Use `$derived` for determining if the "Empty State" should be shown based on `vault.allEntities.length`.

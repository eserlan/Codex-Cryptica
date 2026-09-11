# Quickstart: Lightweight Reusable Stat Sheets (149-reusable-stat-sheets)

## Development Workflow & Verification

### 1. Run Unit Tests

```bash
bun --cwd apps/web test StatSheet.test.ts stat-sheet-store.test.ts
```

### 2. Verified Functionality

- **Frontmatter Parsing**: Adding `statSheet` in Markdown YAML header parses fields reactively into Svelte 5 state.
- **Counter Controls**: Clicking `-` / `+` updates counter values reactively within < 50ms.
- **Dice Rolling**: Clicking roll button on a `Dice` field triggers `diceRollerService.roll()` and outputs result.
- **Templates**: Applying layout templates (e.g. "Generic D&D NPC", "Ship Systems") replaces or appends structural fields cleanly.

### 3. Key Component Files

- `apps/web/src/lib/components/stats/StatSheetView.svelte`: Main stats tab view with field controls and sections.
- `apps/web/src/lib/components/stats/StatSheetEditor.svelte`: Modal/Drawer to customize field layout (labels, types, bounds).
- `apps/web/src/lib/components/stats/StatSheetTemplateModal.svelte`: Modal to select, apply, or save layout templates.
- `apps/web/src/lib/stores/stat-sheet-templates.svelte.ts`: Reactive store for campaign vault templates.

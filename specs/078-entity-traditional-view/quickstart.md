# Quickstart: Entity Explorer & Embedded View

## Integration Guide

### 1. Toggle the Explorer

To open the new Entity Explorer sidebar:

```typescript
import { uiStore } from "$lib/stores/ui.svelte";

uiStore.toggleSidebarTool("explorer");
```

### 2. Focus an Entity (Embedded View)

To swap the main visualization for the high-density entity view:

```typescript
uiStore.focusedEntityId = "entity-id";
uiStore.mainViewMode = "focus";
```

### 3. Layout Architecture

The application layout now uses a three-pane split:

- **ActivityBar**: Always visible narrow tool rail.
- **SidebarPanelHost**: Expands when a tool is active.
- **MainContent**: Swaps between route children and focused entity.

## Components to Reuse

- **EntityList**: Use for both Explorer and Canvas Palette.
- **ZenHeader / ZenContent**: Use for Embedded Entity View.

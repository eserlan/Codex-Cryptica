# Data Model: VTT Entity List

## Stores

### MapSessionStore Extensions (`apps/web/src/lib/stores/map-session.svelte.ts`)

| Field         | Type                  | Description                                                                 |
| ------------- | --------------------- | --------------------------------------------------------------------------- |
| `dragPreview` | `DragPreview \| null` | Stores the current entity ID and position during a drag-and-drop operation. |

#### Types

```typescript
export interface DragPreview {
  entityId: string;
  x: number; // Map coordinates (image space)
  y: number; // Map coordinates (image space)
}
```

### UIStore Extensions (`apps/web/src/lib/stores/ui.svelte.ts`)

| Field                    | Type      | Description                                                          | Persistence    |
| ------------------------ | --------- | -------------------------------------------------------------------- | -------------- |
| `vttSidebarCollapsed`    | `boolean` | Whether the VTT sidebar is currently collapsed.                      | `localStorage` |
| `vttEntityListCollapsed` | `boolean` | Whether the entity list section within the VTT sidebar is collapsed. | `localStorage` |

## Components

### VTT Sidebar Integration (`apps/web/src/routes/(app)/map/+page.svelte`)

- Add `EntityList` from `apps/web/src/lib/components/explorer/EntityList.svelte`.
- Wrap `EntityList` in a collapsible section.

### Drag and Drop Payload

- MIME Type: `application/codex-entity`
- Data: `entityId` (string)

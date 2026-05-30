# Research: Spec 109 QuickNote Scratchpad

## Hotkey Management

- **Decision**: Capture `Ctrl+I` / `Cmd+I` globally.
- **Rationale**: standard shortcut for "Idea" capture in similar tools; CC's main editor handles local formatting, so global capture should be safe when not focused on a rich-text input.
- **Alternatives considered**: `Ctrl+Shift+I` (too complex), `Alt+N` (less intuitive).

## Cytoscape Styling

- **Decision**: Implement a custom selector `node[status = 'draft']` or `node.quicknote`.
- **Rationale**: Using a class (`.quicknote`) is more performant than attribute selectors in Cytoscape.
- **Pattern**:
  ```javascript
  {
    selector: 'node.quicknote',
    style: {
      'border-style': 'dotted',
      'border-width': 2,
      'background-color': '#FFBF00', // Amber
      'background-opacity': 0.8
    }
  }
  ```

## AI Elevation Path

- **Decision**: Reuse `DefaultTextGenerationService.generateStructuredEntity`.
- **Rationale**: This method already handles the synthesis/drafting logic required.
- **Integration**: `QuickNoteService` will pass the raw content as the `query` parameter.

## Local Persistence

- **Decision**: Dedicated Dexie table `quick_notes`.
- **Rationale**: Isolates transient data from the primary `graphEntities` table, ensuring high-speed auto-saves without triggering full vault sync cycles until elevation.
- **Schema**: `++id, vaultId, status, createdAt`.

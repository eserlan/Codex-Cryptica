# Spec 010: Flexible Node Categories

## Background
Currently, the Codex Cryptica uses a hardcoded set of categories (`npc`, `location`, `item`, `event`, `faction`). This is restrictive for world-builders who want to define their own ontologies (e.g., "Deity", "Starship", "Ingredient").

## Goals
- Allow users to create custom entity categories.
- Assign custom colors to categories for graph visualization.
- Ensure the graph and creation forms update reactively to category changes.
- Persist categories locally.

## Requirements

### FR-001: Dynamic Category Management
- System MUST allow adding new categories with a label, a color, and an icon (Iconify/Lucide).
- System MUST allow updating existing category labels, colors, and icons.
- System MUST allow deleting categories.
- System MUST provide a base set of categories out-of-the-box:
    - **NPC**: Blue, `lucide:user`
    - **Creature**: Red, `lucide:paw-print`
    - **Location**: Green, `lucide:map-pin`
    - **Item**: Yellow, `lucide:package`
    - **Event**: Fuchsia, `lucide:calendar`
    - **Faction**: Orange, `lucide:users`

### FR-002: Persistence
- Categories MUST be stored in IndexedDB (`settings` store).
- Categories MUST be initialized on application load.

### FR-003: Visual Integration
- Graph node borders MUST use the color defined in the category.
- When a category color is updated, the graph MUST reflect the change immediately without a full reload.
- Tooltips and detail panels SHOULD display the custom category label.

### FR-004: Data Integrity
- Deleting a category SHOULD NOT delete associated entities.
- Entities with "orphaned" categories (IDs that no longer exist) MUST fallback to a default visual style (Scifi Green).

## User Experience (UX)
- The main settings trigger icon will be changed from a cloud to a settings cog.
- A "Manage Categories" button will be added to the main Settings panel.
- Category management (add/edit/delete/reset) will occur in a dedicated Modal, keeping the settings menu clean.
- Inline color pickers and text inputs within the modal for rapid editing.
- Creation forms (VaultControls) will dynamically populate from the active category list.

## Constraints
- **Local-first**: No backend dependency for category definitions.
- **Performance**: Style updates in Cytoscape should be efficient (batched if possible).

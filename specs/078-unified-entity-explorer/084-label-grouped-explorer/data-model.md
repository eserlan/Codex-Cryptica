# Data Model: Label-Grouped Entity Explorer

## Entities

### Explorer View Preference

Represents the saved layout the user wants to use in the Entity Explorer.

- **Mode**: One of `list` or `label`.
- **Persistence Scope**: Browser-local preference for the current user environment.
- **Behavior**: Loaded when the UI store initializes and updated whenever the user changes explorer mode.

### Explorer Group

Represents a rendered explorer section built from the current filtered entity list.

- **Group Key**: The section label shown to the user, such as a label name or `Unlabeled`.
- **Grouping Type**: `label`.
- **Members**: Ordered entity references displayed under the section header.
- **Fallback Role**: Ensures entities without labels remain visible in grouped mode.

### Explorer Group Visibility Preference

Represents the saved collapsed state for label sections in the explorer.

- **Scope Key**: The active vault ID, with a local fallback scope when no vault is active.
- **Collapsed Labels**: A set of label names whose entity lists are currently hidden.
- **Persistence Scope**: Browser-local preference for the current user environment.
- **Behavior**: Updated whenever a label section is collapsed or expanded and restored when the UI store initializes.

### Label Filter Set

Represents the collection of labels currently active as filters in the explorer.

- **Labels**: A set of unique label strings.
- **Filtering Logic**: Matches entities that contain ALL labels in the set ("AND" logic).
- **Behavior**: Clicking a label pill selects it exclusively; Ctrl/Cmd+Click toggles inclusion.

### Filtered Explorer Result

Represents the explorer result set after search, category, and label filters are applied.

- **Source Entities**: The current vault entity collection.
- **Applied Filters**: Search query and selected entity-type filters.
- **Ordering Rule**: Entities are alphabetized before grouped sections are rendered.

## Relationships

- A single **Explorer View Preference** determines whether the **Filtered Explorer Result** is rendered as a flat list or converted into **Explorer Groups**.
- A **Filtered Explorer Result** may produce many **Explorer Groups**.
- A single entity can belong to multiple label-based **Explorer Groups**.
- A single **Explorer Group Visibility Preference** controls whether each label-based **Explorer Group** shows or hides its members for the active vault.

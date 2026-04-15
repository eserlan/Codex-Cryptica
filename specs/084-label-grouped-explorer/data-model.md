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

### Filtered Explorer Result

Represents the existing explorer result set after search and category filters are applied.

- **Source Entities**: The current vault entity collection.
- **Applied Filters**: Search query and selected entity-type filters.
- **Ordering Rule**: Entities are alphabetized before grouped sections are rendered.

## Relationships

- A single **Explorer View Preference** determines whether the **Filtered Explorer Result** is rendered as a flat list or converted into **Explorer Groups**.
- A **Filtered Explorer Result** may produce many **Explorer Groups**.
- A single entity can belong to multiple label-based **Explorer Groups**.

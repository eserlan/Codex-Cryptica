# Data Model: Prominent Import Feature

## Entities

The feature primarily utilizes existing entities and does not introduce new persistent data structures.

### Existing Entities Used

- **Vault**:
  - `entities`: Used to check for empty state (`length === 0`).
- **UIStore**:
  - `showSettings`: Boolean state to open the modal.
  - `activeSettingsTab`: Set to `'vault'` to show the import section.

# Data Model: Oracle Chat Commands

## Entities

### ChatCommand

Represents an available command in the Oracle chat.

- `name`: string (e.g., "/connect")
- `description`: string (e.g., "Link two entities")
- `parameters`: string[] (e.g., ["oracle"])
- `usage`: string (e.g., "/connect oracle")

### ConnectionProposal (Transient)

Used during the `/connect oracle` flow to hold AI-generated suggestions.

- `sourceId`: string
- `targetId`: string
- `type`: string (suggested relationship)
- `label`: string (suggested display label)
- `explanation`: string (why the AI suggested this)

## State Transitions (Wizard Flow)

1. **START**: User types `/connect oracle`.
2. **SELECT_SOURCE**: User selects the "from" entity via autocomplete.
3. **SELECT_TARGET**: User selects the "to" entity via autocomplete.
4. **PROPOSING**: System calls Lore Oracle to analyze entities.
5. **REVIEW**: User reviews the AI suggestion (type/label).
6. **FINALIZE**: User confirms, `vault.createConnection` is called.

## Validation Rules

- `sourceId` cannot equal `targetId`.
- Autocomplete requires at least 3 characters.
- Custom connection types must be non-empty.

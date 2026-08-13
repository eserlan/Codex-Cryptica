# Data Model: VTT Domain Extraction

## Token

- Identity, map position, dimensions, ownership, visibility, visual state, and
  status effects.
- Legacy `owner-only` visibility normalizes to the supported `all` visibility.

## Encounter Session

- Identifies the session and map, records mode, tokens, initiative, selection,
  grid, measurement, chat, timestamps, and optional visual state.
- Normalization copies mutable members, clears a selection for a missing token, and
  bounds the active turn to the available initiative order.

## Normalization Result

- A new session value; the input is never mutated.
- Optional session fields receive safe defaults where needed.

# Data Model: Visual Styling Templates

## Entities

### StylingTemplate (Configuration Object)

Defines the visual tokens for a specific genre.

- `id`: string (e.g., "cyberpunk")
- `name`: string (e.g., "Cyberpunk")
- `tokens`: object
  - `primary`: string (Hex/OKLCH)
  - `background`: string
  - `accent`: string
  - `border`: string
  - `fontBody`: string
  - `fontHeader`: string
  - `textureUrl`: string (Optional)
- `graph`: object
  - `nodeShape`: string (Cytoscape shape)
  - `edgeStyle`: string (solid/dashed/dotted)
  - `nodeBorderWidth`: number

### VaultUpdate (Extension)

The vault configuration is extended to include the theme preference.

- `activeTemplateId`: string (defaults to "scifi")

## Validation Rules

- `id` must be one of: `scifi`, `fantasy`, `modern`, `cyberpunk`, `apocalyptic`.
- `textureUrl` must point to an asset in the `/static/themes/` directory.

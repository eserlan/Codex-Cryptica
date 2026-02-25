# Data Model: Interactive Campaign Mapping & Spatial Lore

## Entities

### `Map`

- **id**: UUID string
- **name**: Display name
- **assetPath**: Local OPFS path to the image file
- **dimensions**: `{ width: number, height: number }`
- **parentEntityId**: (Optional) Link to a "Container" entity for hierarchy
- **pins**: Array of `Pin`
- **fogOfWar**: `MapMask`

### `Pin`

- **id**: UUID string
- **entityId**: Link to core Lore Entity (NPC, Location, etc.)
- **coordinates**: `{ x: number, y: number }` (Percent-based or relative to original image dimensions)
- **visuals**: `{ icon: string, color: string }`

### `MapMask`

- **maskPath**: Local OPFS path to the binary mask file (representing revealed/hidden pixels)

## Validation Rules

- **Pin Bounds**: Pin coordinates MUST be within the [0, width] and [0, height] of the parent Map image.
- **Entity Linkage**: A pin MUST link to an existing Entity ID or be marked as "unlinked".
- **Unique IDs**: Every Map and Pin MUST have a unique ID within the campaign.

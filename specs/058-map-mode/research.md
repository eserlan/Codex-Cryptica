# Research: Interactive Campaign Mapping & Spatial Lore

## Decision: Technology for Map Visualization

### Decision

Use **HTML5 Canvas** as the core engine for Map Mode. The interaction (zoom/pan) and rendering will be managed via a custom Svelte component using a high-performance render loop.

### Rationale

- **Spatial Integrity**: Canvas allows us to work in "Image Coordinates," ensuring pins stay pixel-locked to the background regardless of viewport scaling.
- **Fog of War Architecture**: Canvas is the only way to performantly implement "Masking" (revealing areas of an image) using composite operations.
- **Performance**: High-resolution 4K maps can be drawn and transformed with zero DOM overhead, maintaining 60 FPS during fluid interactions.
- **Future-Proofing**: Provides a direct path for implementing tactical grids, distance measurements, and area-of-effect templates.

### Alternatives Considered

- **Cytoscape.js**:
  - _Rejected because_: Hard to lock nodes to a background image accurately; lacks native masking support for Fog of War.
- **Leaflet.js**:
  - _Rejected because_: Unnecessary complexity for non-geographic, single-image "World-Images."

## Decision: Map Data Persistence

### Decision

Map metadata (pins, masks, map associations) will be stored as a new top-level property in the vault registry or as a hidden `.codex/maps.json` file in each vault.

### Rationale

- **Vault Encapsulation**: Ensures that maps stay with the campaign they belong to.
- **Structure**: Pins will reference Entity IDs to maintain the "Knowledge Web" integrity.

## Decision: Fog of War Implementation

### Decision

Fog of War will be implemented using a persistent binary mask (encoded as a low-res image or bitmask) or an SVG polygon collection stored in the vault metadata.

### Rationale

- **Efficiency**: Bitmasks are extremely fast to compute visibility against.
- **Persistence**: Matches the "Full Persistence" requirement.

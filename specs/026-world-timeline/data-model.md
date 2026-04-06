# Data Model: Graph-Native World Timeline

## Entities

### TemporalMetadata (Value Object)

Represents a point or range in in-world time.

- `year`: number (Required for positioning)
- `month`: number (Optional, for secondary precision)
- `day`: number (Optional)
- `label`: string (Optional, for display override)

### Entity Updates (Package: schema)

Dated metadata stored in YAML frontmatter.

- `date`: TemporalMetadata (Optional)
- `start_date`: TemporalMetadata (Optional)
- `end_date`: TemporalMetadata (Optional)

### Era (Config Object)

Persisted in `settings` (IndexedDB).

- `id`: string
- `name`: string
- `start_year`: number
- `end_year`: number (Optional)
- `color`: string (Hex for canvas shading)

## Graph Layout States

### Organic Mode

Standard force-directed layout (current behavior).

### Timeline Mode (State in `graph.svelte.ts`)

- `axis`: 'x' | 'y' (Horizontal or Vertical)
- `scale`: number (Pixels per year)
- `range`: { start?: number, end?: number } (Filtering window)

## Positioning Logic (Package: graph-engine)

1. **Primary Axis**: Position = `(year - minYear) * scale`.
2. **Secondary Axis**: Position = `baseOffset + (noise/jitter)`.
3. **Concurrent Handling**: Nodes with identical years are spread along the secondary axis to prevent occlusion.

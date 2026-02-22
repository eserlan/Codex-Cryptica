# Data Model: Implement llms.txt standard

## Entities

### `llms.txt` (Static File)

- **Purpose**: Map of the site's documentation for AI agents.
- **Location**: `apps/web/static/llms.txt`
- **Fields**:
  - `title`: H1 Project Title
  - `summary`: Blockquote summary
  - `categories`: H2 sections (e.g., Features, Technical)
  - `links`: Descriptions and URLs to detailed documentation

### `llms-full.txt` (Generated File)

- **Purpose**: Complete knowledge base for AI agents.
- **Location**: `apps/web/static/llms-full.txt`
- **Source Files**:
  - `README.md` (Root)
  - `apps/web/README.md`
  - `packages/editor-core/README.md`
  - `packages/graph-engine/README.md`
  - `docs/adr/*.md` (Selected ADRs)
  - `packages/schema/src/*.ts` (Exported interfaces as reference)

### State Transitions

- **Build-time Generation**: `llms-full.txt` is updated whenever `npm run build` is executed via a pre-build script.

# Research: Intelligent Oracle Data Separation

## Decision: Implementation Location
The parsing logic will be placed in `packages/editor-core/src/parsing/oracle.ts`. This ensures it is a pure, deterministic function as mandated by the Constitution (VI) and can be unit-tested in isolation.

## Decision: Parsing Strategy
We will use a multi-stage parsing approach:
1. **Explicit Markers**: Look for Markdown headers (h2 or h3) or bolded labels.
   - Markers to support: `Chronicle`, `Lore`, `Summary`, `Details`, `History`.
2. **Heuristic Fallback**: If no markers are found, the first paragraph (split by double newline `\n\n`) will be considered the **Chronicle**, and the remainder will be the **Lore**.
3. **Marker Stripping**: If markers are found, the marker text itself (e.g., `## Chronicle`) will be stripped to keep the fields clean.

## Decision: UI Integration
- The existing "COPY TO CHRONICLE" and "COPY TO LORE" buttons will remain as fallback individual actions.
- A new **"INTELLIGENT APPLY"** button (with a magic wand icon) will be added when the parser detects structured data or when the content is long enough to justify splitting.
- **Preview**: When hovering over the Intelligent Apply button, the UI will highlight or tooltip the split content.

## Alternatives Considered
- **Prompt Engineering**: Forcing the AI to always return JSON.
  - *Rejected*: Brittle and might degrade the quality/natural feel of the Oracle's conversational responses.
- **Regex-only**: 
  - *Rejected*: Too rigid. A combination of structural analysis (paragraphs) and keyword detection is more robust.

## Technical Details
- **Parser Signature**: `export function parseOracleResponse(content: string): OracleParseResult`
- **Dependency**: None (Pure TypeScript).

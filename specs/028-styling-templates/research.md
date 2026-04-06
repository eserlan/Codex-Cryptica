# Research: Visual Styling Templates

## Decision: CSS Variable Injection via Svelte Store

**Rationale**: Using a Svelte 5 Rune-based store (`theme.svelte.ts`) allows for high-performance reactivity. We will inject CSS variables into the `:root` or a top-level wrapper div. This avoids the overhead of CSS-in-JS and leverages native Tailwind 4.x variable support.
**Alternatives considered**: Multiple static CSS files (rejected: hard to manage transitions), Styled components (rejected: violation of "System-Agnostic Core").

## Decision: Cytoscape Style Layers

**Rationale**: We will structure the Cytoscape stylesheet as a collection of base styles, genre-specific overrides (shapes, line styles), and category-specific colors. The `graph-theme.ts` will be refactored to a functional generator: `getGraphStyle(templateId, categories)`.
**Alternatives considered**: Full stylesheet replacement (rejected: duplicates category logic).

## Decision: Static Asset Bundling for Textures

**Rationale**: To comply with Law VIII (PWA Integrity), textures like `parchment.png` or `carbon-fiber.svg` will be bundled in the `static/` directory and added to the Service Worker's precache list. This ensures they are available offline.
**Alternatives considered**: Dynamic fetching (rejected: breaks offline functionality).

## Decision: Font Strategy

**Rationale**: Use standard web-safe or bundled open-source fonts (e.g., 'Courier Prime' for Post-Apocalyptic, 'Cinzel' for Fantasy) to ensure consistent genre feel without layout shift.

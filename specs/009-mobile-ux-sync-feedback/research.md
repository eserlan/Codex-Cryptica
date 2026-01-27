# Research: Mobile UX & Sync Feedback

## Mobile Header & Control Wrapping
- **Decision**: Use Tailwind's `flex-wrap` and `hidden/sm:inline` classes to collapse the header on small screens.
- **Rationale**: Avoids the complexity of a separate hamburger menu for now while keeping the core "Open Vault" and "Sync" actions accessible.
- **Alternatives considered**: A dedicated mobile drawer. Rejected because it increases click depth for frequent actions like "Sync".

## Synchronization Visual Feedback
- **Decision**: Implement a two-tier feedback system:
  1. A "pulse" animation on the cloud icon during active background sync.
  2. A "flash" effect (ring and scale) when sync is manually triggered.
  3. A temporary "SYNCING" status text visible on small screens where the pulse might be missed.
- **Rationale**: Provides both ambient awareness (pulse) and active confirmation (flash/text) as per FR-002 and FR-003.
- **Alternatives considered**: A global progress bar. Rejected as it blocks the UI and violates Constitution III (Non-blocking UI).

## Entity Panel Responsiveness
- **Decision**: Transition from a 25% width sidebar to a 100% width overlay on screens < 768px.
- **Rationale**: Ensures readability of entity content (lore/chronicle) on narrow screens without horizontal scrolling.
- **Alternatives considered**: Bottom sheets. Rejected because the entity content is often long-form text, which is better suited for a full-height slide-over.

## Svelte 5 Viewport Detection
- **Decision**: Rely primarily on CSS media queries for layout transitions. Use `$derived` in stores if logical branching is needed in JS.
- **Rationale**: Standard web practice; CSS is more performant for layout than JS-driven resize listeners.

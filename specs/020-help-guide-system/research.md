# Research: Help and Guide System

## Decision: Custom Svelte 5 Onboarding Engine
**Rationale**: Using a third-party library like Intro.js or Driver.js adds unnecessary weight and might not integrate smoothly with Svelte 5's fine-grained reactivity and the app's "Sub-100ms" mandate. A custom engine allows for precise control over the overlay and spotlight effect using CSS variables and `$state`.

**Alternatives Considered**: 
- **Driver.js**: Powerful but 12KB gzipped. Might be overkill for a static walkthrough.
- **Svelte-shepherd**: Too heavy and not yet optimized for Svelte 5 snippets/runes.

## Decision: CSS `mask-image` for Spotlight Effect
**Rationale**: Creating a "dimmed" background with a "punched-out" hole for the UI element is best achieved via an SVG mask or CSS `mask-image`. This allows for rounded corners and smooth transitions between steps without complex DOM manipulation of the target elements.

**Alternatives Considered**:
- **`box-shadow` with massive spread**: Fast but doesn't handle rounded corners or multiple highlights well.
- **`z-index` manipulation**: Brittle and requires changing target element styles, which violates modularity.

## Decision: Inline Help Articles (JSON/Markdown)
**Rationale**: Storing help articles as a JSON structure (pre-parsed Markdown) within the app ensures zero-latency access and perfect offline support. No external fetch is required.

**Alternatives Considered**:
- **Static files in `/static`**: Requires fetching at runtime, which might be blocked or slow in offline mode if not cached by the service worker immediately.
- **Dedicated Help Store**: Best for state management and searchability.

## Decision: FlexSearch for Help Indexing
**Rationale**: Since `flexsearch` is already a dependency, leveraging it for help articles ensures consistent search behavior across the app without adding new libraries.

**Alternatives Considered**:
- **Simple regex/string matching**: Sufficient for small article counts but lacks fuzzy matching.

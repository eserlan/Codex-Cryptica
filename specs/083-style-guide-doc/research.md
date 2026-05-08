# Research: Design Guide and Styleguide

## Technical Decisions

### Location of Documentation

- **Decision**: Primary documentation in `docs/STYLE_GUIDE.md`.
- **Rationale**: Standard repository practice, easily discoverable by developers, and low maintenance.
- **Alternatives Considered**:
  - **Storybook**: Rejected for Phase 1 due to high setup overhead and potential "over-engineering" (Principle III: Simplicity & YAGNI).
  - **Custom Help Page**: To be considered as a Phase 2 "Living" enhancement.

### Component Implementation Patterns

- **Decision**: Strictly enforce Svelte 5 Runes ($state, $derived, $props) and Tailwind 4 theme variables.
- **Rationale**: Aligns with existing project standards discovered in `apps/web/src`.
- **Key Patterns identified**:
  - State management using `$state` and `$derived`.
  - Component communication via `$props`.
  - Theming via Tailwind 4 `--color-theme-*` variables defined in `app.css`.

### Visual Guidelines

- **Decision**: Define standard color palettes, typography scales, and spacing based on `app.css`.
- **Rationale**: Ensures visual consistency across all apps and packages.

## Integration Strategy

- **Markdown-to-Help**: Investigate if `apps/web` can parse `docs/STYLE_GUIDE.md` to display it in the help system automatically.
- **Code Snippets**: All snippets must be valid TypeScript/Svelte code and follow the `_` prefix rule for unused variables (Principle VI).

## Unresolved [NEEDS CLARIFICATION]

- None. All initial clarifications from the spec have been resolved (e.g., static vs interactive snippets).

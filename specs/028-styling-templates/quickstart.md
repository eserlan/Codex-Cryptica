# Quickstart: Visual Styling Templates

## UI Integration

1. **Initialize Store**: Import `theme` store in `+layout.svelte`.
2. **Apply Classes**: Use Tailwind variables (e.g., `text-theme-primary`) in core components.
3. **Settings Entry**: Add template grid to Intelligence or Schema settings (or a new 'Aesthetics' tab).

## Graph Integration

1. **Refactor Theme**: Update `apps/web/src/lib/themes/graph-theme.ts` to accept `StylingTemplate`.
2. **Update Listener**: Ensure `GraphView.svelte` re-runs `cy.style()` when the theme store updates.

## Local Development

- Add new textures to `apps/web/static/themes/`.
- Register the template in `apps/web/src/lib/config/themes.ts`.

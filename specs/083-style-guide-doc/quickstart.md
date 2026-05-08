# Quickstart: Design Guide and Styleguide

## For Project Maintainers

1.  **Adding a Core Component**:
    - Build the component in `apps/web/src/lib/components/ui/`.
    - Document its design pattern and implementation details in `docs/STYLE_GUIDE.md`.
    - Include a static code snippet for correct usage.

2.  **Updating Existing Guidelines**:
    - When a component evolves, update the corresponding section in `docs/STYLE_GUIDE.md`.
    - Ensure code snippets match the latest Svelte 5 (Runes) and Tailwind 4 standards.

## For Contributors

1.  **Referring to the Guide**:
    - Open `docs/STYLE_GUIDE.md` to see the project's design language.
    - Copy static snippets to use as a starting point for new features.

2.  **Proposing Changes**:
    - If a design requirement is not covered, propose a new **Design Pattern** or **Component Guideline** as part of your pull request.

## Core Rules

- Use `$state` and `$derived` (Runes) for all local reactivity.
- Use Tailwind 4 tokens (e.g., `text-theme-primary`, `bg-theme-surface`) for all styling.
- Prefix unused variables with `_` to satisfy linter rules.
- Maintain consistency with the standard spacing and typography scales defined in the guide.

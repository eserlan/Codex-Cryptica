# Codex-Cryptica Style Guide

## Introduction

This document establishes the core design principles and component implementation patterns for the Codex-Cryptica project. It serves as the "source of truth" for all UI development to ensure visual and functional consistency.

## Core Principles

1.  **Library-First**: UI components should be built as reusable units.
2.  **Svelte 5 Runes**: Strictly use `$state`, `$derived`, and `$props` for reactivity and component communication.
3.  **Tailwind 4 Theming**: Use semantic theme variables (e.g., `--color-theme-primary`) for all styling to support dynamic themes.
4.  **Accessibility**: Components must be navigable and usable by everyone, following standard ARIA patterns.
5.  **Simplicity**: Prefer established patterns and avoid over-engineering (YAGNI).

## Naming Conventions

Consistent naming is critical for maintainability and readability across our large codebase.

### Files and Components

- **Components**: PascalCase (e.g., `Button.svelte`, `EntityExplorer.svelte`).
- **Styles**: kebab-case (e.g., `main.css`, `tailwind.css`).
- **Scripts**: kebab-case (e.g., `entity-cache.ts`, `use-edit-state.svelte.ts`).
- **Tests**: `*.test.ts` or `*.test.js`.

### Svelte Variables and Props

- **Reactive State ($state)**: camelCase (e.g., `let isEditing = $state(false)`).
- **Derived Values ($derived)**: camelCase (e.g., `let totalCount = $derived(items.length)`).
- **Props ($props)**: Standard camelCase destructured from the macro.
- **Private Class Fields**: Use `#` or `private` prefix for store internals.

## Architectural Approach (Svelte 5)

We follow the **Red-Green-Refactor** cycle for all core logic.

### Component Composition

- **Decoupled Stores**: Favor injecting store instances through props or context (DI) for easier unit testing.
- **Svelte 5 Runes**:
  - **$state**: Use for local component-only state.
  - **$derived**: Use for reactive computations. Avoid initializing `$state` directly from props.
  - **$effect**: Use sparingly for side-effects (e.g., DOM interactions).
- **Clean Logic**: Components should primarily be UI layers. Move complex business logic into separate `.svelte.ts` files as stateful classes or standalone utility packages.

### Tailwind 4 Syntax

- All theme configuration must reside in `app.css` within the `@theme` block.
- Use `@apply` in Svelte component `<style>` blocks only when necessary to clean up repeated complex utility sets.
- Reference theme variables directly in classes whenever possible (e.g., `text-theme-primary`).

## Theming

Codex-Cryptica supports multiple visual modes (e.g., the default "Fantasy" theme). Theming is achieved through CSS variable overrides within the `@theme` and `@layer base` blocks in `app.css`.

### How it Works

1.  **Semantic Tokens**: We define semantic tokens (e.g., `--color-theme-primary`) that components use.
2.  **Theme Overrides**: Specific themes (e.g., `[data-theme="fantasy"]`) override these tokens to change colors, fonts, and textures.
3.  **Typography Theming**: Font families (`--font-header`, `--font-body`) are included in this system, ensuring the typeface matches the thematic era.

## Common Design Patterns

For detailed specifications and usage examples of core components, refer to the following sub-documents:

- **[Buttons](design/components/button.md)**: Primary, secondary, and danger styles.
- **[Inputs](design/components/input.md)**: Text inputs, textareas, and checkboxes.
- **[Modals and Dialogs](design/components/dialog.md)**: Centralized modal system patterns.

## Living Examples

These snippets represent the most common UI building blocks used across the application.

### Entity Action Card

```svelte
<div
  class="p-6 border border-theme-border bg-theme-surface rounded-2xl shadow-sm"
>
  <h4 class="font-header text-lg text-theme-primary uppercase tracking-wide">
    Entity Name
  </h4>
  <p class="mt-2 text-sm text-theme-muted">
    Brief description of the entity goes here.
  </p>

  <div class="mt-6 flex justify-end">
    <button
      class="bg-theme-primary text-theme-bg px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest"
    >
      Edit Entity
    </button>
  </div>
</div>
```

### Search Bar

```svelte
<div class="relative w-full max-w-xl">
  <span
    class="absolute left-4 top-1/2 -translate-y-1/2 icon-[lucide--search] h-5 w-5 text-theme-muted"
  ></span>
  <input
    type="text"
    class="w-full pl-12 pr-4 py-3 bg-theme-bg/50 border border-theme-border rounded-full text-sm text-theme-text"
    placeholder="Search the codex..."
  />
</div>
```

## State Management Best Practices ($state, $derived)

Leveraging Svelte 5 Runes effectively is key to a performance and bug-free UI.

### Prefer $derived over $state

Never create a local `$state` if the value can be computed from existing reactive variables.

```svelte
<!-- WRONG -->
<script>
  let { items } = $props();
  let count = $state(items.length); // Won't stay in sync!
</script>

<!-- CORRECT -->
<script>
  let { items } = $props();
  let count = $derived(items.length); // Always in sync
</script>
```

### Use $state.snapshot() for non-reactive copies

When passing reactive objects to external functions or saving to a database, use `$state.snapshot()` to get a plain JSON-serializable object.

```ts
const saveToDB = (entity) => {
  const plainEntity = $state.snapshot(entity);
  db.save(plainEntity);
};
```

### Prefix unused variables with `_`

To ensure CI passes and maintain clean code, always prefix unused variables or parameters with an underscore.

```ts
const _handleUnusedEvent = (e) => {
  console.log("Action triggered");
};
```

## How to Contribute

To extend the Codex-Cryptica design system, follow these steps:

1.  **Build Your Component**: Implement your new component in a feature-specific directory under `apps/web/src/lib/components/` (e.g., `lib/components/import/`).
2.  **Follow the Standards**: Ensure your component uses Svelte 5 runes and Tailwind 4 theme tokens.
3.  **Propose a Pattern**: If your component introduces a new reusable pattern, document it in `docs/design/components/`.

### Proposing a New Design Pattern

A design pattern proposal should include:

- **Problem Statement**: Why is this pattern needed?
- **Visual Specification**: Colors, typography, and spacing from the token system.
- **Behavioral Specification**: Interactive rules (e.g., how it reacts to hover, focus, or keyboard).
- **Code Example**: A clean, static Markdown snippet of the implementation.

Submit your proposal as part of your pull request, updating `docs/STYLE_GUIDE.md` to reference the new pattern in the "Common Design Patterns" section.

---

_Generated: 2026-04-15_

# Codex-Cryptica Style Guide

## Introduction

This document establishes the core design principles and component implementation patterns for the Codex-Cryptica project. It serves as the "source of truth" for all UI development to ensure visual and functional consistency.

## Core Principles

1.  **Library-First**: UI components should be built as reusable units.
2.  **Svelte 5 Runes**: Strictly use `$state`, `$derived`, and `$props` for reactivity and component communication.
3.  **Tailwind 4 Theming**: Use semantic theme variables (e.g., `--color-theme-primary`) for all styling to support dynamic themes.
4.  **Iconography**: NEVER use `lucide-svelte` components. ALWAYS use Iconify utility classes (e.g., `icon-[lucide--name]`) to maintain styling consistency and reduce bundle size.
5.  **Accessibility**: Components must be navigable and usable by everyone, following standard ARIA patterns.
6.  **Simplicity**: Prefer established patterns and avoid over-engineering (YAGNI).

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

- **Decoupled Stores & Dependency Injection**: Favor injecting store and service instances through props or context (DI) for easier unit testing. Always use constructor-based DI with sensible defaults for all services and stores. Export both the service class and a default singleton instance to avoid tight coupling.
- **Decomposed Store Architecture**: Identify the correct domain-specific reactive manager (e.g., within `apps/web/src/lib/stores/oracle/` like `chat`, `ui`, or `reconciliation`) instead of adding functionality directly to a monolithic facade.
- **Svelte 5 Runes**:
  - **$state**: Use for local component-only state.
  - **$derived**: Use for reactive computations. Avoid initializing `$state` directly from props.
  - **$effect**: Use sparingly for side-effects (e.g., DOM interactions).
- **Clean Logic**: Components should primarily be UI layers. Move complex business logic into separate `.svelte.ts` files as stateful classes or standalone utility packages.

### Tailwind 4 Syntax

- All theme configuration must reside in `app.css` within the `@theme` block.
- Use `@apply` in Svelte component `<style>` blocks only when necessary to clean up repeated complex utility sets.
- Reference theme variables directly in classes whenever possible (e.g., `text-theme-primary`).
- **Scoped Styles in Svelte Components**: When writing component `<style>` blocks that use Tailwind utility classes or directives (like `@apply`), import the theme configuration using `@reference` (e.g., `@reference "../../../app.css";`) at the top of the style block. Ignore standard CSS linter warnings for these specific v4 at-rules.

## Theming

Codex-Cryptica uses a dual-layer theming architecture that separates the visual frame of the application (App Chrome) from the creative mood of the specific campaign world (World Theme).

### Dual-Layer Theming Model

1. **App Appearance (`data-app-appearance` & `data-app-appearance-choice`)**
   - **Purpose**: Controls the application frame (headers, footers, sidebars, settings shells, search modals).
   - **Modes**: Neutral `neutral-light`, `neutral-dark`, or `system` (resolving dynamically based on media queries).
   - **Styling**: Always texture-free, high-legibility, clean layout using neutral app chrome tokens (e.g., `--color-chrome-*` and neutral grays).

2. **World Theme (`data-world-theme`)**
   - **Purpose**: Scopes the visual genre mood (e.g. `workspace`, `fantasy`, `blood_noir`) to world-specific areas (campaign front pages, graph nodes/edges, entity detail cards).
   - **Defaults**: The default world theme is `workspace` (a clean neutral aesthetic adapting to the current app appearance).
   - **Mood Styling**: Genre-specific borders, textures, Alegreya headers, and parchment backgrounds are strictly scoped to world/content surfaces using `data-world-theme` attribute selectors.

### Scoping Rules for Developers

- **App Chrome Components**: Header, sidebar outer shells, footers, search shells, settings panels, and popout hosts MUST remain neutral and stable. Any nested buttons, selectors, database stats, or control indicators placed inside these chrome shells (such as `VaultControls` in the header) MUST use chrome tokens (`chrome-*`) and cannot inherit or use world/genre tokens. Do not use texture variables (`--bg-texture-overlay`) or genre-based accents on these surfaces.
- **World Canvas Components**: Cytoscape viewports, world front pages, entity cards, and inner entity detail tabs can consume world theme tokens (e.g., `--color-theme-*`, `--font-header`, and `--bg-texture-overlay`) to project the campaign's visual genre.
- **Typography Role**: The app interface uses high-legibility sans-serif fonts for utility controls. Author-written content and world headers may leverage themed fonts like Alegreya, serif styles, or other genre typefaces.

## Common Design Patterns

For detailed specifications and usage examples of core components, refer to the following sub-documents:

- **[Buttons](design/components/button.md)**: Primary, secondary, and danger styles with theme-agnostic guidance plus notes on applying the active theme.
- **[Inputs](design/components/input.md)**: Text inputs, textareas, and checkboxes with theme-agnostic guidance plus notes on applying the active theme.
- **[Modals and Dialogs](design/components/dialog.md)**: Centralized modal system patterns with theme-agnostic guidance plus notes on applying the active theme.

For the full token reference, see:

- **[Colors](design/tokens/colors.md)**: Semantic color token table (`--color-theme-*`), feedback tokens, and domain-specific variants.
- **[Typography and Spacing](design/tokens/typography.md)**: Font tokens (`--font-header`, `--font-body`), type scale, and layout constants.

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
    aria-label="Search the codex"
    class="w-full pl-12 pr-4 py-3 bg-theme-bg/50 border border-theme-border rounded-full text-sm text-theme-text"
    placeholder="Search the codex..."
  />
</div>
```

### Label Badge

A compact inline badge used to tag entities. The optional remove button uses `e.stopPropagation()` to prevent the click from bubbling to a parent card or link.

```svelte
<div
  class="inline-flex items-center gap-1 px-2 py-0.5 bg-theme-accent/10 border border-theme-accent/30 rounded text-[10px] font-bold text-theme-accent uppercase font-header tracking-wider whitespace-nowrap group"
>
  <span>{label}</span>
  {#if removable}
    <button
      onclick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      class="hover:text-theme-primary transition-colors flex items-center justify-center -mr-1 p-0.5"
      aria-label="Remove label {label}"
    >
      <span class="icon-[heroicons--x-mark] w-3 h-3"></span>
    </button>
  {/if}
</div>
```

### Icon Action Button

Small icon-only toolbar buttons. Use Iconify utility classes and always provide an `aria-label` and `title`.

```svelte
<button
  type="button"
  onclick={handleAction}
  class="flex items-center justify-center p-1 transition text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]"
  aria-label="Enter Zen Mode"
  title="Zen Mode (Full Screen)"
>
  <span class="icon-[lucide--maximize-2] w-5 h-5"></span>
</button>
```

### Tab Bar

Accessible tab navigation using ARIA roles and keyboard arrow-key support. The active tab is distinguished by a bottom border; inactive tabs use a hover state.

```svelte
<div
  role="tablist"
  aria-label="Entity detail sections"
  class="flex gap-x-6 text-[10px] font-bold tracking-widest text-theme-muted border-b border-theme-border pb-2 font-header"
  onkeydown={handleTabKeydown}
>
  {#each tabs as tab}
    <button
      id="tab-{tab}"
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls="panel-{tab}"
      tabindex={activeTab === tab ? 0 : -1}
      class={activeTab === tab
        ? "text-theme-primary border-b-2 border-theme-primary pb-2 -mb-2.5"
        : "hover:text-theme-text transition"}
      onclick={() => (activeTab = tab)}
    >
      {tab.toUpperCase()}
    </button>
  {/each}
</div>
```

### Empty State

Used when a list or panel has no content. Keep the message brief, muted, and uppercase.

```svelte
{#if items.length === 0}
  <div
    class="text-theme-muted text-[10px] text-center py-8 italic uppercase tracking-widest opacity-50"
  >
    No entries yet
  </div>
{/if}
```

### World Entity Card

Used on the front page to display recently modified entities. Single-click opens in the graph; double-click opens Zen Mode. Supports optional thumbnail images with a fallback icon placeholder.

```svelte
<article
  class="group relative overflow-hidden rounded-2xl border border-theme-border/80 bg-theme-surface text-theme-text shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:border-theme-primary/55 hover:shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
>
  <!-- Optional image layer -->
  {#if imageUrl}
    <div
      class="absolute inset-0 bg-cover bg-center opacity-100"
      style="background-image: url('{imageUrl}')"
    ></div>
    <div
      class="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.68))]"
    ></div>
  {:else}
    <!-- Placeholder with category icon -->
    <div
      class="absolute inset-x-0 top-[12%] h-[58%] flex items-center justify-center"
    >
      <div
        class="flex h-28 w-28 items-center justify-center rounded-full border border-theme-primary/30 bg-theme-primary/10 text-theme-primary/75 backdrop-blur-sm"
      >
        <span class="{categoryIconClass} h-14 w-14"></span>
      </div>
    </div>
  {/if}

  <!-- Invisible full-surface click target -->
  <button
    type="button"
    class="absolute inset-0 z-30 cursor-pointer focus:outline-none"
    aria-label="Open {title} in the graph"
    onclick={handleCardClick}
    ondblclick={handleCardDoubleClick}
  >
    <span class="sr-only">Open {title} in the graph</span>
  </button>

  <!-- Card content -->
  <div class="relative z-20 flex min-h-[17rem] flex-col justify-between">
    <div class="p-3">
      <header
        class="flex items-center justify-between gap-3 rounded-2xl border border-theme-primary/15 bg-theme-bg/75 backdrop-blur-md px-3 py-2"
      >
        <h3
          class="font-header text-sm uppercase tracking-[0.14em] text-theme-text truncate"
        >
          {title}
        </h3>
        <span class="text-[10px] text-theme-muted whitespace-nowrap"
          >{relativeTime}</span
        >
      </header>
    </div>

    <div class="p-3">
      <div
        class="rounded-xl border border-theme-border/50 bg-theme-surface/75 backdrop-blur-md p-3"
      >
        <p
          class="text-sm leading-relaxed min-h-[4.5rem] text-theme-text/95 line-clamp-4"
        >
          {excerpt}
        </p>
        {#if labels.length > 0}
          <div class="mt-4 flex flex-wrap gap-2">
            {#each labels as label}
              <span
                class="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-theme-secondary"
              >
                {label}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</article>
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

### Avoid initializing `$state` directly from props

Do not initialize `$state` directly from props (e.g., `let x = $state(prop)`). Use `$derived` for data that should stay in sync, or ensure the intent of a local-only copy is clear (e.g. tracking local draft changes) to prevent compiler warnings.

```svelte
<!-- WRONG: Causes out-of-sync state and warnings -->
<script>
  let { title } = $props();
  let localTitle = $state(title);
</script>

<!-- CORRECT: Using $derived for synchronized values -->
<script>
  let { title } = $props();
  let uppercaseTitle = $derived(title.toUpperCase());
</script>

<!-- CORRECT: Clear local draft/edit copy intent -->
<script>
  let { title, onSave } = $props();
  // initialized once as local scratchpad state for editing
  let draftTitle = $state(title);
</script>
```

## Animation and Transition Standards

Immersive animations are a core pillar of Codex-Cryptica's premium design aesthetic. Use these standards to maintain a weighted, tactile, and professional motion feel:

### Timing & Duration Rules

- **UI Micro-interactions**: `150ms` – `250ms` (e.g., tooltips, button hover states, small dropdown toggles). Requires fast, crisp feedback.
- **Large Drawer Side Sheets**: `500ms` – `550ms` (e.g., entity detail panels, sidebar slide-outs).
- **Immersive Full-Screen Modals**: `550ms` – `650ms` (e.g., Zen Mode). Larger surfaces cover more visual distance and require longer durations to prevent eye strain and feel premium.

### Easing Standards

- NEVER use linear or robotic, jarring transitions for large elements.
- **`quintOut`**: The default deceleration easing for immersive screen elements (cards, modal screens, drawer panels). It starts instantly to give immediate feedback on tap/click, and then spends the remainder of its duration smoothly drifting and settling into place, producing a satisfying "weighted" feel.

### Technical Implementation (Avoid Broken Exit Transitions)

Svelte's built-in exit transitions (`out:fade`, `transition:fly`, etc.) will NOT execute if a parent component wraps the element in a conditional check that unmounts immediately (e.g., `{#if showModal}`).

To ensure entrance and exit transitions run fully:

1. **Render the component persistently** in its parent provider or layouts (e.g. `<ZenModeModal />` always rendered inside `GlobalModalProvider.svelte`).
2. **Move the conditional block inside** the component itself as its root-level template:
   ```svelte
   <!-- ZenModeModal.svelte -->
   {#if modalUIStore.showZenMode && entityId}
     <div transition:fade={{ duration: 500 }}>
       <div transition:fly={{ y: 50, duration: 550, easing: quintOut }}>
         ...
       </div>
     </div>
   {/if}
   ```
   This gives the Svelte transition engine full control over element lifecycles, ensuring exit animations always play perfectly before removal.

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

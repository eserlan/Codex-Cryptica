# ADR 017: Eliminate lucide-svelte Components in Favor of Iconify Utility Class Pattern

## Context and Problem Statement

To optimize production bundle sizes and loading performance, we audited the icon imports within Codex Cryptica. Although modern bundlers (Vite/Rollup) support tree-shaking for `lucide-svelte`, we identified the following issues:

1. **Compilation and Runtime Overhead**: Compiling and instantiating Svelte component wrappers for every icon adds rendering cycles and bundle overhead compared to pure CSS class icons.
2. **Style Guide Non-Compliance**: The repository styling guide explicitly mandates using the Tailwind 4 Iconify utility pattern (`class="icon-[lucide--name]"`) to keep icon rendering lightweight and consistent.
3. **Lingering Component Imports**: We audited the codebase and located 7 component files that still directly imported and rendered Svelte components from the `lucide-svelte` library.

We needed to systematically eliminate the remaining `lucide-svelte` imports to ensure full compliance with the style guide and optimize production asset size.

## Decision Drivers

- **Performance**: Minimize JavaScript parsing and execution times for UI icons.
- **Consistency**: Enforce a single, unified styling pattern for icons across all UI modules.
- **Bundle Optimization**: Ensure that unused icons are never bundled, with zero reliance on complex JS tree-shaking configurations.

## Considered Options

- **Option 1: Audit and Tune lucide-svelte Tree-Shaking (Status Quo)** - Keep using Svelte components but verify bundler output. This leaves runtime JS instantiation overhead and violates style guide rules.
- **Option 2: Replace with Iconify CSS Utility Classes** - Convert all lingering components to the `<span class="icon-[lucide--icon-name]"></span>` pattern, eliminating JS imports entirely.

## Decision Outcome

Chosen option: **Option 2: Replace with Iconify CSS Utility Classes**.

We converted all 7 identified Svelte components under `apps/web/src/lib/components/` to use the Tailwind 4 Iconify utility class pattern, removing the `lucide-svelte` JS imports completely from these sites.

### Affected Files:

1. `apps/web/src/lib/components/canvas/CanvasContextMenu.svelte`
2. `apps/web/src/lib/components/canvas/CanvasSelectionModal.svelte`
3. `apps/web/src/lib/components/canvas/EdgeLabelModal.svelte`
4. `apps/web/src/lib/components/canvas/EntityNode.svelte`
5. `apps/web/src/lib/components/explorer/EntityExplorer.svelte`
6. `apps/web/src/lib/components/labels/CategoryFilter.svelte`
7. `apps/web/src/lib/components/oracle/InlineKeySetup.svelte`

## Consequences

### Positive

- **Bundle Size Reduction**: Removing `lucide-svelte` from the main component chunks guarantees that icons are resolved purely via CSS, completely bypassing JS tree-shaking risks.
- **Rendering Performance**: Reusing static CSS-driven icons eliminates Svelte component mounting overhead for icons, reducing CPU time during hot path renders (e.g. node dragging, list filtering).
- **Style Guide Alignment**: Achieved 100% compliance with repository icon requirements.

### Negative

- **No Significant Negatives**: The CSS utility classes map directly to the same SVG shapes under the hood, preserving visual appearance and accessibility.

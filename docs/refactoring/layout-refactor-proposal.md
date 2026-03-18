# Refactoring Proposal: Root Layout (`+layout.svelte`)

## Current Analysis

The root layout (`+layout.svelte`) is currently a "God Component" with approximately 750 lines of code. It violates the Single Responsibility Principle by managing multiple disparate concerns:

1.  **Global App Initialization**: Environment checks, service worker registration, and bootstrapping of heavy stores.
2.  **Global Event Listeners**: Handling `error`, `unhandledrejection`, and custom `vault-switched` events.
3.  **Window Globals**: Attaching stores and services to the `window` object for development and E2E testing.
4.  **Route & UI State Logic**: Identifying popup vs. marketing vs. workspace routes and managing mobile menu state.
5.  **Side Panel Management**: Lazy-loading and rendering the Oracle sidebar.
6.  **Modal Orchestration**: (Partially redundant with `GlobalModalProvider.svelte`) Lazy-loading and rendering all global modals and dialogs.
7.  **Global Keyboard Shortcuts**: Managing `Cmd+K` for search and `Escape` for closing UI elements.
8.  **Layout Shell**: Rendering the Header, Main content, Footer, and Error Overlay.
9.  **Onboarding & Demo Logic**: Triggering the initial tour and starting the demo mode based on URL parameters.

## Proposed Refactoring Strategy

The goal is to reduce `+layout.svelte` to a clean orchestration shell (< 200 lines) by extracting logic into specialized modules and components.

### 1. Extract Initialization Logic (`lib/app/init/`)

Create an `AppInitializationService` (or a set of functions in `app-init.ts`) to handle:

- `bootSystem()`: Initializing categories, timeline, graph, and calendar stores.
- `initializeGlobalListeners()`: Setting up global error and promise rejection handlers.
- `setupWindowGlobals()`: Attaching debugging tools to the window object.
- Service Worker registration.

**Dependency Injection**: The initialization logic should accept instances of stores (`vault`, `oracle`, `graph`, etc.) rather than relying on global imports, facilitating easier testing and isolation.

### 2. Consolidate Global Modals (`GlobalModalProvider.svelte`)

Move all modal-related logic, including lazy-loading and conditional rendering, into the existing `GlobalModalProvider.svelte`.

- Remove the duplicate modal logic from `+layout.svelte`.
- Pass necessary props (like `isMobileMenuOpen`) if binding is required.

### 3. Extract Keyboard Shortcuts (`lib/hooks/useGlobalShortcuts.svelte.ts`)

Create a custom Svelte 5 hook to manage global keyboard events.

- This hook will handle `Cmd+K` and `Escape`.
- It can be easily extended for future shortcuts (e.g., `C` for create, `/` for search).

### 4. Extract Sidebar Orchestration (`OracleSidebarProvider.svelte`)

The logic for lazy-loading the `OracleSidebarPanel` should be moved into its own provider or managed within the sidebar layout component itself.

### 5. Modularize the Layout Shell

Break down the large template into functional sub-components:

- `AppHeader.svelte`: Contains the existing `<header>` logic, search input, and right-side controls.
- `AppFooter.svelte`: Contains the existing `<footer>` logic and legal links.
- `FatalErrorOverlay.svelte`: Extracted from the bottom of the layout.
- `NotificationToast.svelte`: For rendering `uiStore.notification`.

## Proposed Component Architecture

```text
apps/web/src/routes/
└── +layout.svelte             # Main shell, uses providers and structural components

apps/web/src/lib/app/init/
└── app-init.ts                # Pure logic for bootstrapping

apps/web/src/lib/components/layout/
├── AppHeader.svelte           # Focused header component
├── AppFooter.svelte           # Focused footer component
├── FatalErrorOverlay.svelte   # Isolated error UI
└── OracleSidebarProvider.svelte # Manages lazy-loading of sidebar

apps/web/src/lib/components/modals/
└── GlobalModalProvider.svelte # (Existing) Central modal registry

apps/web/src/lib/hooks/
└── useGlobalShortcuts.svelte.ts # Shortcut management logic
```

## Implementation Plan

1.  **Phase 1: Foundations**: Implement `app-init.ts` and `useGlobalShortcuts`.
2.  **Phase 2: Modal Cleanup**: Fully migrate all modal logic to `GlobalModalProvider` and remove redundancy from layout.
3.  **Phase 3: Structural Extraction**: Create `AppHeader`, `AppFooter`, and `FatalErrorOverlay`.
4.  **Phase 4: Orchestration**: Finalize `+layout.svelte` by integrating the new components and logic modules.

## Detailed Task List

### Phase 1: Foundations

- [x] Create `apps/web/src/lib/app/init/app-init.ts` with `bootSystem`, `initializeGlobalListeners`, and `setupWindowGlobals`.
- [x] Create `apps/web/src/lib/hooks/useGlobalShortcuts.svelte.ts` to handle global keyboard events.
- [x] Implement `NotificationToast.svelte` to isolate notification rendering.

### Phase 2: Component Extraction

- [x] Create `apps/web/src/lib/components/layout/AppHeader.svelte` (Move `<header>` block).
- [x] Create `apps/web/src/lib/components/layout/AppFooter.svelte` (Move `<footer>` block).
- [x] Create `apps/web/src/lib/components/layout/FatalErrorOverlay.svelte` (Move system failure UI).
- [x] Create `apps/web/src/lib/components/layout/OracleSidebarProvider.svelte` (Handle lazy-loading logic).

### Phase 3: Consolidation

- [x] Update `GlobalModalProvider.svelte` to ensure it handles all global dialogs correctly.
- [x] Remove duplicate lazy-loading logic and `{#if}` blocks from `+layout.svelte`.

### Phase 4: Final Orchestration

- [x] Refactor `+layout.svelte` to use the new providers and components.
- [x] Verify that all global shortcuts, initializations, and modals still function as expected.
- [x] Final cleanup of unused imports and variables in `+layout.svelte`.

### Phase 5: Testing

- [x] Create unit tests for `app-init.ts` logic.
- [x] Create unit tests for `useGlobalShortcuts.svelte.ts` hook logic.
- [x] Run full test suite to ensure no regressions in layout-dependent features.

## Expected Outcomes

- **Improved Maintainability**: Logic is isolated into files with clear responsibilities.
- **Faster HMR**: Smaller component files lead to faster hot module replacement during development.
- **Better Testability**: Logic in `app-init.ts` and hooks can be unit tested without mounting the entire layout.
- **Reduced Complexity**: The root layout becomes a readable map of the application's structure rather than a dump of all global logic.

# Research & Technical Decisions: Pop-out Help Window

## Analyzed Pattern: Standalone Route Whitelisting

### 1. Existing `isPopup` Logic

- **File**: `apps/web/src/routes/+layout.svelte`
- **Current State**: The application uses a derived rune `isPopup` to determine if it should render the main application shell (sidebar, navigation, padding).
- **Current implementation**: `const isPopup = $derived(page.url.pathname === "${base}/oracle");`
- **Effect**: If `isPopup` is true, components like `<Sidebar />`, navigation bars, and global layout padding are omitted, allowing the route to fill the entire window.

### 2. Help Component Decoupling

- **File**: `apps/web/src/lib/components/help/HelpTab.svelte`
- **Analysis**: The help component is currently designed to live within a modal or a sidebar tab.
- **Decision**: We will reuse `HelpTab.svelte` as the primary content for the `/help` route. To ensure it looks correct as a standalone page, it needs a property to handle its own padding and background when not contained by a modal.

## Technical Decisions

### 1. Route Whitelisting vs. Layout Nesting

- **Decision**: Continue using the `isPopup` whitelist in the root `+layout.svelte`.
- **Rationale**: While SvelteKit supports nested layouts, the CC app shell is heavily integrated into the root layout. Adding `/help` to the existing `isPopup` derived rune is the least invasive way to achieve a "clean" window.

### 2. Window Trigger

- **Decision**: Use `window.open` with a specific feature string: `width=800,height=900,toolbar=0,location=0,menubar=0`.
- **Rationale**: This provides a focused, app-like experience for the documentation window without browser chrome cluttering the view.

### 3. State Synchronization

- **Decision**: Leverage existing `helpStore` (singleton).
- **Rationale**: Since the pop-out is a separate browser window, it will have its own JS heap. The `helpStore` will re-initialize from `LocalStorage`, ensuring that search history and recently viewed articles are consistent across windows without needing complex cross-window messaging (SharedWorkers).

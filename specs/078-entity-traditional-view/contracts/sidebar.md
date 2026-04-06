# UI Contract: Sidebar Panel Tool

Any component intended to be hosted within the `SidebarPanelHost` SHOULD follow consistent internal patterns, though they are currently managed via direct dynamic imports.

## Sidebar Tool Integration

Tools are dynamically imported and rendered based on `uiStore.activeSidebarTool`.

## Supported Tools

- **Oracle**: `OracleSidebarPanel.svelte` (Sparkles icon, provides AI chat and generation).
- **Explorer**: `EntityExplorer.svelte` (Database icon, provides searchable entity catalog).

## Layout Constraints

- **Width**: Tools MUST be responsive to their container width (default `md:w-96`).
- **Height**: Tools MUST occupy 100% of the available vertical height.
- **Overflow**: Tools SHOULD manage their own scrolling for internal content (e.g., using `flex-1 overflow-y-auto`).

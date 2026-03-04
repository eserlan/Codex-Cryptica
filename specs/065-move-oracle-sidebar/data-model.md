# Data Model: Move Oracle to Left Sidebar

## UI Store Additions (`UIStore`)

| Field               | Type                 | Description                                           |
| ------------------- | -------------------- | ----------------------------------------------------- |
| `leftSidebarOpen`   | `boolean`            | Whether the left sidebar panel is currently expanded. |
| `activeSidebarTool` | `'oracle' \| 'none'` | The tool currently active/visible in the sidebar.     |
| `isMobile`          | `boolean`            | Reactive state derived from window width (< 768px).   |

## State Transitions

1. **Toggle Oracle**:
   - If `activeSidebarTool === 'oracle'`, set `leftSidebarOpen = false` and `activeSidebarTool = 'none'`.
   - Else, set `leftSidebarOpen = true` and `activeSidebarTool = 'oracle'`.

2. **Responsive Shift**:
   - If `isMobile` becomes `true`, the vertical sidebar component unmounts or transforms into a bottom-anchored panel.

# UI Contract: Sidebar Panel Tool

Any component intended to be hosted within the `SidebarPanelHost` MUST adhere to the following interface.

## Sidebar Tool Props

```typescript
export interface SidebarToolProps {
  /**
   * Whether the tool is currently focused (optional).
   */
  active?: boolean;

  /**
   * Callback to request closing the panel.
   */
  onClose?: () => void;
}
```

## Supported Tools

- **Oracle**: Sparkles icon, provides AI chat and generation.
- **Explorer**: List icon, provides searchable entity catalog.

## Layout Constraints

- **Width**: Tools MUST be responsive to their container width (default 300px).
- **Height**: Tools MUST occupy 100% of the available vertical height.
- **Overflow**: Tools SHOULD manage their own scrolling for internal content.

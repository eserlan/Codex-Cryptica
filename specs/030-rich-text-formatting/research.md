# Research: Rich Text Formatting Controls

## Unknowns & Clarifications

### 1. Tiptap Formatting Controls

- **Context**: The `MarkdownEditor.svelte` component currently initializes Tiptap with `StarterKit` and `Markdown` extensions but provides no UI controls for formatting.
- **Research**:
  - How to implement a fixed toolbar (for Detail Panel) and a floating/bubble menu (for text selection) using Tiptap's Vue/Svelte wrappers or vanilla JS?
  - Which Tiptap extensions are required for the requested features (Headings, Lists, Links, Blockquotes)? `StarterKit` covers most. `Link` might need to be added.
  - **Findings**: Tiptap provides both `BubbleMenu` and `FloatingMenu` extensions, but for this implementation we will only use `BubbleMenu` for selection-based formatting. `FloatingMenu` was evaluated but is not required for the current UX, so it is deferred and out of scope for now. For a fixed toolbar, we can simply bind buttons to `editor.chain().focus().toggleBold().run()`, etc. Svelte integration is straightforward using the `editor` instance.

### 2. Zen Mode Implementation

- **Context**: The spec mentions "Zen Mode". Currently, `NodeReadModal` exists but is read-only. There is no dedicated "Zen Editor".
- **Research**:
  - Should "Zen Mode" be an expansion of `MarkdownEditor` within its current parent, or a global overlay?
  - Can we reuse `NodeReadModal` infrastructure for a "Zen Edit Mode" or should we create a `NodeEditModal` / generic `ZenEditorModal`?
  - **Decision**: "Zen Mode" will be implemented as a fullscreen state for the `MarkdownEditor`. This avoids state duplication. We can add a "Expand/Zen" button to the `EntityDetailPanel` toolbar that toggles a fullscreen CSS class or moves the editor to a modal layer.
  - **Alternative**: A dedicated route/modal. Given the "Sub-100ms" mandate and "Local-First", keeping it in the DOM and just expanding it via CSS/State is most performant and simplest.

### 3. Icon System

- **Context**: The codebase uses Tailwind CSS classes for icons (e.g., `icon-[lucide--book-open]`).
- **Research**:
  - Confirm availability of formatting icons (bold, italic, list, link, etc.) in the existing setup.
  - **Findings**: The project seems to use `unocss` or a Tailwind plugin for icons (likely `iconify`). We can use standard Lucide icons: `bold`, `italic`, `list`, `link`, `heading`, `quote`, `code`.

## Technology Decisions

| Decision          | Selected Technology               | Rationale                                                                                                                                                |
| :---------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Editor Core**   | **Tiptap**                        | Already installed and running in `MarkdownEditor.svelte`. Extensible, headless, perfect for custom UI.                                                   |
| **Icons**         | **Lucide (via Tailwind/Iconify)** | Consistent with existing UI (`EntityDetailPanel`).                                                                                                       |
| **Toolbar State** | **Svelte Reactive State**         | Use `$state` or `$derived` to track editor selection/active marks for button highlighting (e.g., highlighting "Bold" button when bold text is selected). |
| **Zen Mode**      | **CSS-based Fullscreen Overlay**  | Simplest transition. Toggle a class on a wrapper component that uses `fixed inset-0 z-50` to cover the screen.                                           |

## Implementation Strategy

1.  **Refactor `MarkdownEditor.svelte`**:
    - Extract the editor initialization logic if needed, or just augment it.
    - Create a `EditorToolbar.svelte` component that takes the `editor` instance as a prop.
    - Implement buttons for: Bold, Italic, H1-H3, Lists (Bullet/Ordered), Blockquote, Code Block, Link.
    - Add "Bubble Menu" for quick formatting on selection.

2.  **Zen Mode**:
    - Add a "Zen Mode" toggle button to the editor's toolbar (or the parent panel).
    - When active, the `MarkdownEditor` container expands to fill the viewport (`fixed inset-0`).
    - Ensure the toolbar remains accessible in Zen Mode (maybe floating at the top or bottom).

3.  **Shortcuts**:
    - Tiptap handles most shortcuts (Cmd+B, Cmd+I) out of the box with `StarterKit`. Verify/Configure specific ones if needed.

4.  **Link Handling**:
    - Need a small UI popover or prompt to enter URLs when the Link button is clicked.

## UI/UX Considerations

- **Toolbar Visibility**: Should be sticky in the Detail Panel so it doesn't scroll away.
- **Mobile**: Toolbar should remain accessible.
- **Styling**: Match the "hacker/cyberpunk" aesthetic (green/black terminal look) defined in `app.css` and existing components.

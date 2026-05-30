# Reddit Post Draft: Entity Explorer Nested Folders & Drag-and-Drop Organization

**Subreddit:** r/codexcryptica  
**Date:** 2026-05-26

---

## Title Options

1. `Devlog: Reorganizing your campaign lore with nested folders and drag-and-drop`
2. `I added nested subfolders (up to 8 levels deep) and drag-and-drop organization to Codex Cryptica`
3. `Devlog: Organizing deep campaign hierarchies in the Entity Explorer`
4. `A devlog on how nested folders, inline creation, and tree organization behave in Codex Cryptica`

---

## Body Draft

Hey everyone,

I spent the last couple of days rebuilding how you organize campaign notes and lore structures in the Entity Explorer sidebar (the folder tree on the left of your workspace).

While it worked okay for flat campaign structures, it needed to be much better at handling deep hierarchies and quick reorganizations during session prep.

Here is how the new folder structure behaves:

### Deeper campaign folders

The explorer tree now supports logical nesting up to 8 levels deep (previously limited to 5). This means you can model deep location structures and hierarchies like: World → Continent → Kingdom → City → District → Building → Room → Pinned Item, keeping everything neatly collapsed when you don't need it.

### Smooth drag-and-drop organization

You can now drag and drop notes or folders to rearrange your campaign structure:

- **Drop to nest:** Dragging an entity and dropping it directly on top of another entity nested it as a child.
- **Move back to root:** If you drag an item, a dedicated zone appears at the top of the tree allowing you to drop it and immediately promote it back to the root level.
- **Sturdy drag response:** The explorer handles fast dragging and hovering over deep hierarchies without the UI stuttering or dropping states mid-move.
- **Safety checking:** The system automatically checks for cycles. If you try to drag a parent folder into one of its own subfolders, it won't let you create an invalid infinite loop.
- **Consistent reloads:** Nested relations are saved directly into the note files, so your custom folder structures and visibility settings persist perfectly across page reloads.

### Inline child creation

To speed up note-taking, you don't need to open separate creation menus to add sub-items. Hovering over any folder shows a quick "+" button. Clicking it lets you type a name and choose a category (NPC, location, item, etc.) to create and nest the new sub-item instantly right inside the tree.

---

### A quick note on the technical side

Under the hood, the hierarchy is built using Svelte 5 runes (`$state` and `$derived`) to calculate nested relationships reactively on the client side. Drag stability is managed via `requestAnimationFrame` guards on drag starts to prevent browser-level cancellations, and hover flicker is solved by temporarily disabling pointer events on non-dragged elements. I also cleaned up the HTML semantics, switching the outer rows to `role="listitem"` and moving row selection to an inner button so screen readers don't see nested buttons inside focusable rows.

---

**Question:** How do you prefer to organize your campaign vaults? Do you keep things relatively flat and rely on search, or do you prefer a deep nested structure?

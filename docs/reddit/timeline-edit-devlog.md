# Reddit Devlog: Interactive Timeline Editing, Precise Drag-and-Drop, and Local Dev Fixes

## Subreddit Title Options

1. **[Problem-First]** My timeline layout kept shifting until I synced the global year coordinates
2. **[I built]** I built a local-first editable campaign timeline in Svelte 5
3. **[Devlog]** Codex Cryptica Devlog: Direct Timeline Dragging, Semantic Date Popovers, and Dev-Server SW Bypass

---

## Recommended Post Body

For context: I’m building Codex Cryptica, a local-first campaign manager for GMs, written in Svelte 5. I've been working on turning the read-only timeline visualization into an interactive editor where you can drag and drop campaign events, place characters, and manage temporal anchors.

Here is what I just shipped and what I learned resolving layout sync bugs along the way.

### What’s New

- **Direct Timeline Placement & Drag-and-Drop**: GMs can now drag undated entities from the sidebar explorer and drop them directly onto the campaign timeline axis to date them.
- **Semantic Placement Popover**: When you drop an entity, a popover dynamically determines the entity's type and prompts you for the specific meaning of that date (e.g., "Born" or "Died" for characters, "Founded" or "Dissolved" for factions) or lets you create a new linked event at that location.
- **Grid and Layout Synchronization**: Fixed a frustrating bug where dropping an explorer entity between two visually close nodes (like years 616 and 617) resolved to 610. The layout engine was generating coordinates using only the active nodes on screen, while the drop target and ruler were using the global set of campaign entities. I unified the year-coordinate mappings across the layout manager, ruler overlay, and mouse projection to ensure drops resolve to the exact visual year under the cursor.
- **Development Service Worker Bypass**: Solved a pesky dev-server issue where dynamic component imports (like the confirmation modals) would result in a `TypeError: Failed to fetch`. If a developer had previously run a production preview on the same port, the browser's registered service worker would stay active and intercept dev-server source file requests. I added logic in the app bootstrapper to automatically detect and unregister any active service worker in development mode.

### Under the Hood

Under Svelte 5, local states in dynamically mounted modals can easily lose reactivity to changing props if they are untracked on mount. I resolved this in the placement popover by wrapping the target year changes in a reactive `$effect` block that updates the local binding state whenever a new drop occurs.

On the layout side, our timeline utilizes sequential gap compression (`getSequentialYearPositions`). It places years close in sequence at standard scale distances (100px) and compresses large gaps so that centuries of empty space don't force infinite scrolling. Reusing the same gap-compressed year positioning registry across the Cytoscape preset layout, the SVG ruler overlay, and the coordinate resolver was key to aligning the mouse drop projection.

### What's to Come

Next up, I'm working on:

- **Multiple Temporal Anchors**: Allowing entities to have multiple appearances or events on the timeline, with each anchor rendering as a grabbable handle.
- **Timeline Controls**: Fine-tuning zoom and range filters to dynamically hide/reveal eras without resetting the layout.
- **Vague Dates**: Supporting temporal uncertainty (like "mid-reign" or "circa 600 P.C.").

---

## Closing Discussion Question

**How do you prefer to represent temporal uncertainty or vague dates (e.g., "late spring, 616" or "around 590") on a visual campaign timeline?** Do you prefer keeping them as simple approximate years or having a visual "fuzziness" range indicator?

# Graph Stability & Layout Management

Codex Cryptica provides a "Stable Layout" feature to ensure that your node arrangements remain exactly where you put them.

## Stable Layout (The "Pin" Icon)

The **Stable Layout** toggle (represented by a pin icon in the Graph Toolbar) controls how the layout engine behaves when changes occur in the graph.

### When ON (Pinned)

- **Manual Persistence:** Any nodes you drag will stay at their new coordinates. These positions are saved directly into the entity's markdown frontmatter under `metadata.coordinates`.
- **No Auto-Redraw:** Adding new connections or entities will _not_ trigger a full graph re-simulation. New nodes will be placed at a stable default position, and existing nodes will not move.
- **Performance:** This mode is highly recommended for large vaults (100+ nodes) as it prevents expensive force-directed calculations on every change.

### When OFF (Unpinned)

- **Force-Directed Simulation:** The graph uses a physics-based simulation (powered by `fcose`) to automatically space out nodes.
- **Auto-Arrangement:** Every time the graph structure significantly changes (e.g., adding a connection or a new node), the engine will briefly run a simulation to find an optimal aesthetic arrangement.
- **Initial Setup:** This is useful for new campaigns or when you want the AI to suggest a logical spatial structure for your lore.

## Redraw Layout (The "Refresh" Icon)

Regardless of whether **Stable Layout** is ON or OFF, you can always click the **Redraw Layout** button (the circular arrows icon). This action bypasses the stability setting to perform a one-time "forced" simulation of the graph.

### Why Redraw?

- **De-Cluttering:** Over time, especially when adding many new entities or connections, the graph might become visually dense or overlap. Redrawing uses the physics engine to find a fresh, balanced distribution.
- **New Entities:** When Stable Layout is ON, new nodes are placed in a default "safe" zone. If you add several at once, they may appear grouped too closely. A Manual Redraw will space them out relative to their connections.
- **Layout Recovery:** If you've manually dragged nodes into a messy arrangement, a redraw will reset them based on the current force-directed algorithm.

## Connecting Nodes (The "Link" Icon)

The **Link** button (chain icon) allows you to quickly create a relationship between two selected nodes.

- **Impact on Stability**: If **Stable Layout** is OFF, creating a new connection will trigger a brief simulation to pull the two related nodes closer together. If **Stable Layout** is ON, the nodes will remain in their current positions despite the new link.
- **Selection Required**: This button only becomes active when exactly two nodes are selected in the graph.

## Interaction with Modes

- **Timeline Mode:** Bypasses stability settings to arrange nodes chronologically along an X or Y axis based on their associated dates. Clicking redraw in this mode will re-calculate the temporal distribution, which is useful if you've filtered the range and want to maximize screen space.
- **Orbit Mode:** Centers the graph around a specific "Focus Node," arranging immediate connections in a circular pattern. Stability is partially maintained for distant nodes, but the focus area is always recalculated for clarity. Redrawing will re-center the graph and re-arrange the surrounding "satellites" for optimal clarity.
- **Position Saving:** Note that redrawing will overwrite any manually set positions. If you have spent a long time hand-crafting a specific layout, use the button with caution!

---

> **Tip:** The `Stable Layout` is particularly useful when you have a specific arrangement of lore nodes that you want to preserve for visual storytelling.

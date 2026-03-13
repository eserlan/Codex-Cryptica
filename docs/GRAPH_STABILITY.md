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

## Manual Redraw

Regardless of whether Stable Layout is ON or OFF, you can always click the **Redraw Layout** (refresh icon) to force a one-time simulation. This is useful if your graph has become cluttered and you want the engine to clean it up without permanently enabling auto-redraw.

## Timeline & Orbit Modes

- **Timeline Mode:** Bypasses stability settings to arrange nodes chronologically along an X or Y axis based on their associated dates.
- **Orbit Mode:** Centers the graph around a specific "Focus Node," arranging immediate connections in a circular pattern. Stability is partially maintained for distant nodes, but the focus area is always recalculated for clarity.

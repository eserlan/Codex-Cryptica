---
id: spatial-canvas
title: Spatial Canvas
description: Arrange campaign entities and hand-drawn notes on a free-form board with a persistent layout.
tags: [layout, connections, workspace]
rank: 4
---

## Designing Your Desk

The **Spatial Canvas** is a free-form workspace that keeps your chosen layout. Unlike the automated Knowledge Graph, every node position and connection here is manually placed and preserved.

### Canvas or map?

A canvas is a planning board for entity cards, notes and visual links. Use it to
arrange an investigation, plot outline or scene. A map places pins on a geographic
or tactical image, with fog of war and optional VTT tokens. Choose a map when
positions represent places or distances in the world.
See [Map Mode](/help#help/map-mode).

### Core Features

- **Infinite Workspace**: Pan and zoom across an unlimited board to organize your narrative.
- **Persistent Layouts**: Card positions, sizes, rotations, locks, layer order, links and drawings are saved with the canvas in your vault. Changes save automatically; reopen the same canvas to continue where you left off.
- **Freehand Annotations**: Select **Draw on canvas**, choose a color, and sketch notes, routes, or highlights directly on the board. Drawings stay aligned while you pan and zoom and are saved with the canvas. Use the eraser and select a stroke to remove it.
- **Rotatable Cards**: Twist two fingers over a card to rotate it. On desktop, select a card and drag the rotation handle above it. Rotation is free-form and can continue through multiple turns.
- **Themed Components**: The **MiniMap** and all UI elements adapt to your active theme (Fantasy, Sci-Fi, etc.), ensuring a cohesive aesthetic.
- **Readable URLs**: Each canvas uses a name-based **slug** in its URL (e.g., `/canvas/battle-at-the-docks`), making it easy to bookmark and identify specific workspaces.

### Adding Entities

The fastest way to populate a canvas is to drag entities directly from the **Entity Explorer** sidebar onto the board. Open the Explorer, find the entity you want, and drag it onto the canvas — it will be placed wherever you drop it.

You can also right-click nodes in the **Knowledge Graph** and use **Add to Canvas** to send one or more entities to any of your boards without leaving the graph.

### Managing Canvases

Click the **workspace name** in the top-left HUD to open the **Canvas Manager**. Create a canvas by choosing **New Canvas** and entering a name. Select a canvas to switch to it; use its rename or delete control to manage it. Each canvas keeps its own layout, so you can use separate boards for different topics.

## Positioning, ordering and layout

### Move cards freely

Drag a card to place it anywhere on the board. Drag an entity from the Entity Explorer onto the canvas to add it at the drop point. Canvas placement is freeform: the background grid is a visual guide, and cards are not snapped to grid positions. There are no general alignment guides or automatic sorting by name, type or date.

When multiple cards are selected, dragging one selected card moves the selected cards together. Use the canvas selection gesture for your platform to add cards to the selection. You can also select multiple entities in the Knowledge Graph with **Shift-click**, then right-click and choose **Add to Canvas** to add them together.

### Overlap and layer order

Cards can overlap. If one hides another, right-click the card you want to adjust and choose **Bring to Front** or **Send to Back**. This changes which card appears on top; it does not change its position. These commands apply to one card at a time.

### Lock a card

To keep a card from being moved accidentally, right-click it and choose **Lock in Place**. Right-click it again and choose **Unlock** when you want to move it. Locking disables dragging; it does not remove the card or its links.

### Auto-arrange

Select the wand-shaped **Auto-arrange** button beside the canvas name to rearrange the board's cards. This is an explicit layout command, not continuous sorting: after it runs, you can move cards manually again. Auto-arrange lays out the current board's supported nodes; it does not provide rules such as sorting alphabetically or aligning only a selected subset. If you prefer to keep a hand-built layout, use the command only when you want to replace that arrangement.

### Mouse, keyboard and touch

- Drag a card with a mouse or touch pointer to reposition it. Drag the empty board to pan; use the wheel or a pinch gesture to zoom.
- Right-click a card to open its context menu on desktop. On touch devices, use the device's context-menu gesture (usually a long press) for locking and layer-order commands.
- Canvas supports touch pan, pinch-to-zoom and two-finger card rotation. On desktop, rotate a selected card using its handle; focus that handle and use the arrow keys for 15-degree steps, or hold **Shift** for 45-degree steps.
- The minimap is hidden on narrow/mobile screens. Canvas gestures share the same surface, so if a gesture is interpreted as drawing or connecting, leave that tool mode before dragging cards.

The board is a freeform workspace rather than a diagram editor: it has no general align/distribute commands, configurable grid snapping, or automatic alphabetical/date sorting. Use Auto-arrange for a one-time layout, then reposition cards as needed.

### Save a report from your board

When a board contains entity cards, use **Generate report** in the canvas header
to collect their information into a document. Review the report, then choose
**Save as note** to keep it as a Note entity, or **Cancel** to close without saving.
This control is unavailable in guest vaults and on Adventure boards.

In the preview, choose **Brief** or **Standard** detail and which information to
include. **Entire canvas** includes the board's entities; **Selected nodes only**
uses the selected entity cards. If nothing is selected, the preview explains
that there is nothing to report on rather than saving an empty note.

For report scope, options, and saving behaviour across Canvas, Knowledge Graph,
and Table, see [Entity Reports](/help#help/entity-reports).

### Managing Connections

- **Custom Labels**: Double-click any connection (edge) to open a themed modal and enter a name for the relationship.
- **Hidden Labels**: To hide a label, simply clear the text in the modal. Empty labels are not rendered, keeping your canvas clean.
- **Visual Links**: Create lines between any two entities to map out conspiracy boards, family trees, or quest flowcharts.

### Drawing on the Canvas

1. Select the pencil button in the canvas toolbar.
2. Choose a color with the color picker next to it.
3. Draw with a mouse, stylus, or touch pointer. Existing node and canvas controls are paused while drawing mode is active.
4. Select the eraser button, then select an individual stroke to remove it.
5. Select the pencil button again, or press **Escape**, to leave drawing mode. Completed strokes are saved automatically.

### Rotating Canvas Cards

- **Touch**: Place two fingers over the same card and twist.
- **Desktop**: Select a card, then drag the circular rotation handle above it around the card's center. Focus the handle and use the arrow keys for 15-degree steps, or hold Shift for 45-degree steps.
- Cards can rotate through any angle, including more than one complete turn.

### Tips for Organization

1. **Use Multiple Canvases**: Create separate boards for different regions, plot lines, or character groups to avoid clutter.
2. **Drag from Explorer**: Open the Entity Explorer sidebar and drag lore directly onto the board for the fastest workflow.
3. **Zen Integration**: Double-click any entity card to open it in **Zen Mode** (the full detail panel) for quick editing.

### Related Blog Posts

- [Introducing the Canvas: Visual Brainstorming Meets Structured Lore](/blog/introducing-the-canvas) — Practical workflows, worked examples, and tips for organizing freeform visual workspaces.
- [Spatial Intelligence & Map Navigation](/blog/spatial-intelligence) — How spatial layouts reduce cognitive load and reveal hidden lore connections.

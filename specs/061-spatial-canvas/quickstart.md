# Quickstart: @codex/canvas-engine

## Installation

The package is internal to the monorepo.

```bash
pnpm install @codex/canvas-engine --workspace=web
```

## Basic Usage

### 1. Initialize the Engine

In your Svelte component:

```typescript
import { CanvasEngine } from "@codex/canvas-engine";

const engine = new CanvasEngine();
```

### 2. Rendering with Svelte Flow

The engine provides a rune-based store that plugs directly into `@xyflow/svelte`.

```svelte
<script>
  import { SvelteFlow } from "@xyflow/svelte";
  const { nodes, edges } = engine.store;
</script>

<div class="h-full w-full">
  <SvelteFlow {nodes} {edges} on:nodeDragStop={engine.handleDrag} />
</div>
```

### 3. Drag and Drop from Entity Explorer

Entities are dragged onto the canvas from the **Entity Explorer** sidebar using the `application/codex-entity` dataTransfer format.

```typescript
function onDrop(event) {
  const entityId = event.dataTransfer.getData("application/codex-entity");
  const position = { x: event.clientX, y: event.clientY };
  engine.addNode(entityId, position);
}
```

### 4. Persistence

```typescript
async function saveCanvas() {
  const data = engine.export();
  await vault.saveFile("my-board.canvas", JSON.stringify(data));
}
```

# Quickstart Guide: Dungeon & Delve Structural Builder (#1843)

## Developer Quickstart

### 1. Generating a Delve Canvas Programmatically

```typescript
import { DelveTopologyGenerator } from "@codex/generator-engine";

const generator = new DelveTopologyGenerator();

const delveCanvas = generator.generateFromConcept({
  conceptId: "dungeon-123",
  title: "The Sunken Crypts",
  size: "medium",
  sectors: [
    {
      id: "s1",
      name: "Upper Entrance Vaults",
      theme: "Flooded Masonry",
      order: 1,
    },
    {
      id: "s2",
      name: "The Silent Tombs",
      theme: "Ancient Sarcophagi",
      order: 2,
    },
  ],
  factions: ["Drowned Cultists", "Grave Rats"],
  hazards: ["Rising Water", "Rotting Stairs"],
});

console.log(
  `Generated ${delveCanvas.nodes.length} nodes and ${delveCanvas.edges.length} passage edges.`,
);
```

### 2. Single-Room AI Regeneration

```typescript
import { DelveStockingService } from "@codex/generator-engine";

const stockingService = new DelveStockingService();

const updatedRoom = await stockingService.regenerateSingleRoom({
  room: existingRoomNode.data,
  conceptLore: dungeonConceptLoreText,
  aiClientManager, // Optional Gemini client
});

console.log("Regenerated room stocking:", updatedRoom.stocking);
```

### 3. Running Unit Tests

```bash
bun test packages/generator-engine/src/dungeon/
bun test apps/web/src/lib/components/canvas/
```

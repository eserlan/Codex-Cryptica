import type {
  DelveCanvasDocument,
  DelveCanvasEdge,
  DelveCanvasNode,
  DelveRoomNodeData,
} from "./delve-builder-types";

export class DelveFlowLayout {
  private readonly roomWidth = 220;
  private readonly roomHeight = 120;
  private readonly nodePaddingX = 60;
  private readonly nodePaddingY = 50;
  private readonly sectorPaddingTop = 60;
  private readonly sectorPaddingBottom = 40;
  private readonly sectorPaddingSide = 40;
  private readonly sectorGapY = 80;

  private roomLevels(
    rooms: DelveCanvasNode[],
    edges: DelveCanvasEdge[],
  ): DelveCanvasNode[][] {
    if (rooms.length === 0) return [];
    const roomIds = new Set(rooms.map((room) => room.id));
    const adjacency = new Map<string, string[]>(
      rooms.map((room) => [room.id, []]),
    );

    // Hidden passages are shortcuts and should cross the primary layout rather
    // than pulling distant rooms onto the same hierarchy level.
    for (const edge of edges) {
      if (
        !roomIds.has(edge.source) ||
        !roomIds.has(edge.target) ||
        edge.data?.type === "hidden"
      ) {
        continue;
      }
      adjacency.get(edge.source)?.push(edge.target);
      adjacency.get(edge.target)?.push(edge.source);
    }

    const entrance =
      rooms.find(
        (room) => (room.data as DelveRoomNodeData).role === "entrance",
      ) ?? rooms[0];
    const depth = new Map([[entrance.id, 0]]);
    const pending = [entrance.id];
    while (pending.length > 0) {
      const current = pending.shift()!;
      const currentDepth = depth.get(current) ?? 0;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (depth.has(neighbor)) continue;
        depth.set(neighbor, currentDepth + 1);
        pending.push(neighbor);
      }
    }

    let nextDisconnectedDepth = Math.max(0, ...depth.values()) + 1;
    for (const room of rooms) {
      if (!depth.has(room.id)) {
        depth.set(room.id, nextDisconnectedDepth);
        nextDisconnectedDepth += 1;
      }
    }

    const levels: DelveCanvasNode[][] = [];
    for (const room of rooms) {
      const roomDepth = depth.get(room.id) ?? 0;
      (levels[roomDepth] ??= []).push(room);
    }
    return levels;
  }

  public applyLayout(doc: DelveCanvasDocument): DelveCanvasDocument {
    const clonedNodes = JSON.parse(
      JSON.stringify(doc.nodes),
    ) as DelveCanvasNode[];
    const sectorNodes = clonedNodes.filter(
      (n) => n.type === "delveSectorGroup",
    );

    let currentSectorY = 0;

    sectorNodes.forEach((secNode) => {
      const childRooms = clonedNodes.filter(
        (n) =>
          n.type === "delveRoom" &&
          (n.parentId === secNode.id ||
            (n.data as DelveRoomNodeData).sectorId === secNode.id),
      );

      const levels = this.roomLevels(childRooms, doc.edges);
      const cols = Math.max(1, ...levels.map((level) => level.length));
      const rows = Math.max(1, levels.length);

      const sectorInnerWidth =
        cols * this.roomWidth + (cols - 1) * this.nodePaddingX;
      const sectorInnerHeight =
        rows * this.roomHeight + (rows - 1) * this.nodePaddingY;

      const totalSectorWidth = sectorInnerWidth + this.sectorPaddingSide * 2;
      const totalSectorHeight =
        sectorInnerHeight + this.sectorPaddingTop + this.sectorPaddingBottom;

      secNode.position = { x: 0, y: currentSectorY };
      secNode.width = totalSectorWidth;
      secNode.height = totalSectorHeight;

      // Position each graph depth on its own centered row. Branch siblings sit
      // side-by-side while descendants continue downward.
      levels.forEach((level, row) => {
        const rowWidth =
          level.length * this.roomWidth +
          Math.max(0, level.length - 1) * this.nodePaddingX;
        const rowStartX =
          this.sectorPaddingSide + (sectorInnerWidth - rowWidth) / 2;

        level.forEach((roomNode, col) => {
          const relX = rowStartX + col * (this.roomWidth + this.nodePaddingX);
          const relY =
            this.sectorPaddingTop + row * (this.roomHeight + this.nodePaddingY);

          roomNode.position = { x: relX, y: relY };
          roomNode.parentId = secNode.id;
          roomNode.extent = "parent";
          roomNode.width = this.roomWidth;
          roomNode.height = this.roomHeight;
        });
      });

      currentSectorY += totalSectorHeight + this.sectorGapY;
    });

    return {
      ...doc,
      nodes: clonedNodes,
    };
  }
}

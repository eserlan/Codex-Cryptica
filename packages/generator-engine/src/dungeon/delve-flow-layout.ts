import type {
  DelveCanvasDocument,
  DelveCanvasEdge,
  DelveCanvasNode,
  DelveRoomNodeData,
} from "./delve-builder-types";
import { calculateGraphLevels } from "../graph-flow-layout";

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
    const entrance =
      rooms.find(
        (room) => (room.data as DelveRoomNodeData).role === "entrance",
      ) ?? rooms[0];
    return calculateGraphLevels({
      nodes: rooms,
      edges,
      isRoot: (room) => room.id === entrance.id,
      direction: "undirected",
      // Hidden passages cross the primary layout as shortcuts.
      includeEdge: (edge) => edge.data?.type !== "hidden",
      disconnectedLevel: (_room, nextLevel) => nextLevel,
    });
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

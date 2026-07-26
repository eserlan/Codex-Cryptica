import type {
  DelveCanvasDocument,
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

      // Determine grid layout per sector (e.g. 2 or 3 columns per row)
      const cols = childRooms.length <= 4 ? 2 : 3;
      const rows = Math.ceil(childRooms.length / cols);

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

      // Position rooms inside sector relative to sector origin
      childRooms.forEach((roomNode, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const relX =
          this.sectorPaddingSide + col * (this.roomWidth + this.nodePaddingX);
        const relY =
          this.sectorPaddingTop + row * (this.roomHeight + this.nodePaddingY);

        roomNode.position = { x: relX, y: relY };
        roomNode.parentId = secNode.id;
        roomNode.extent = "parent";
        roomNode.width = this.roomWidth;
        roomNode.height = this.roomHeight;
      });

      currentSectorY += totalSectorHeight + this.sectorGapY;
    });

    return {
      ...doc,
      nodes: clonedNodes,
    };
  }
}

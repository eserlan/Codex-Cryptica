import type { AdventureCanvasDocument } from "./adventure-graph-types";
import { calculateGraphLevels } from "../graph-flow-layout";

export interface AdventureLayoutOptions {
  cardWidth?: number;
  cardMinHeight?: number;
  gapX?: number;
  gapY?: number;
}

export class AdventureFlowLayout {
  private readonly cardWidth: number;
  private readonly cardMinHeight: number;
  private readonly gapX: number;
  private readonly gapY: number;

  constructor(options: AdventureLayoutOptions = {}) {
    this.cardWidth = options.cardWidth ?? 260;
    this.cardMinHeight = options.cardMinHeight ?? 180;
    this.gapX = options.gapX ?? 80;
    this.gapY = options.gapY ?? 100;
  }

  /**
   * Apply dynamic top-to-bottom layout algorithm to an AdventureCanvasDocument.
   */
  public applyLayout(doc: AdventureCanvasDocument): AdventureCanvasDocument {
    const clonedDoc: AdventureCanvasDocument = JSON.parse(JSON.stringify(doc));

    const typeRanks: Record<string, number> = {
      situation: 0,
      location: 1,
      npc: 2,
      clue: 3,
      threat: 3,
      outcome: 4,
    };
    const levels = calculateGraphLevels({
      nodes: clonedDoc.nodes,
      edges: clonedDoc.edges,
      isRoot: (node) => node.type === "situation",
      minimumLevel: (node) => typeRanks[node.type] ?? 1,
      disconnectedLevel: (node) => typeRanks[node.type] ?? 1,
    });
    if (levels.length === 0) return clonedDoc;

    // Estimate row widths to align levels centered horizontally
    const rowWidths = levels.map(
      (lvl) => lvl.length * this.cardWidth + (lvl.length - 1) * this.gapX,
    );
    const maxRowWidth = Math.max(...rowWidths);

    let currentY = 0;

    for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
      const levelNodes = levels[levelIdx];
      const currentRowWidth = rowWidths[levelIdx];
      const startX = Math.max(0, (maxRowWidth - currentRowWidth) / 2);

      let maxLevelHeight = this.cardMinHeight;

      levelNodes.forEach((node, idx) => {
        const x = startX + idx * (this.cardWidth + this.gapX);
        node.position = { x, y: currentY };

        // Estimate height based on data complexity
        let estHeight = this.cardMinHeight;
        if (node.data) {
          if (node.data.description || node.data.summary) estHeight += 40;
          if (node.data.role) estHeight += 20;
          if (node.data.wants) estHeight += 20;
          if (node.data.secret) estHeight += 20;
          if (node.data.leverage) estHeight += 20;
          if (node.data.dilemma) estHeight += 20;
        }
        if (estHeight > maxLevelHeight) {
          maxLevelHeight = estHeight;
        }
      });

      currentY += maxLevelHeight + this.gapY;
    }

    return clonedDoc;
  }
}

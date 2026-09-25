import type { Core } from "cytoscape";

/**
 * Tracks the node carrying the selection pulse, so clearing it touches only
 * that node (plus anything still animating).
 *
 * The pulse is the only style bypass the graph view applies. Clearing it with
 * `cy.nodes().stop().removeStyle()` instead forced a style recompute of every
 * rendered node — over 300 ms at 500 nodes even with no bypass present, and
 * several seconds once styles were dirty — on every selection change.
 */
export class NodeHighlight {
  private nodeId: string | null = null;

  /** Records the node about to receive the pulse. */
  mark(nodeId: string): void {
    this.nodeId = nodeId;
  }

  /** Stops running animations and clears the previous pulse's bypass styles. */
  clear(cy: Core): void {
    cy.nodes(":animated").stop();
    if (this.nodeId === null) return;
    const previous = cy.$id(this.nodeId);
    if (previous.length > 0) previous.stop().removeStyle();
    this.nodeId = null;
  }
}

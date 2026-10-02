import type { Core } from "cytoscape";

/**
 * Extent to fit the view to: the nodes' own boxes, without label text, edge
 * curves, overlays or underlays. Cytoscape's default fit measures every
 * element's full bounds, which on first load means measuring every label and
 * edge: 3.1 s for a 1,625-node vault, repeated by each later fit. Labels are
 * not drawn when zoomed out that far and edges stay between their nodes, so
 * the padding passed with the fit covers the difference.
 */
export function nodeFitBounds(cy: Core): any {
  const nodes = cy.nodes();
  if (typeof nodes.boundingBox !== "function") return cy.elements();
  const bb = nodes.boundingBox({
    includeLabels: false,
    includeOverlays: false,
    includeUnderlays: false,
    includeOutlines: false,
  } as any);
  // Nothing displayed (all filtered out): fall back to Cytoscape's own fit.
  return bb && bb.w > 0 && bb.h > 0 ? bb : cy.elements();
}

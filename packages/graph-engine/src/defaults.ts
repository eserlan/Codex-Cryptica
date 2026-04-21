export const DEFAULT_LAYOUT_OPTIONS = {
  name: "fcose",
  animate: false,
  animationDuration: 800,
  quality: "default",
  randomize: true,
  packComponents: true,
  tile: true,
  tilingPaddingVertical: 60,
  tilingPaddingHorizontal: 60,
  // gravity/repulsion/separation/edgeLength are always overridden by getDynamicLayoutOptions
  gravity: 0.25,
  nodeRepulsion: 18000,
  idealEdgeLength: 55,
  nodeSeparation: 55,
  numIter: 3500,
  nodeDimensionsIncludeLabels: true,
  nestingReprGrpFactor: 1.2,
  initialEnergyOnIncremental: 0.3,
};

/**
 * Generates layout options tuned for the specific size of the graph.
 * Targets an Obsidian-like layout: stronger gravity pulls the graph into a
 * cohesive circular shape while moderate repulsion still lets clusters form.
 */
export const getDynamicLayoutOptions = (nodeCount: number) => {
  const quality = nodeCount > 500 ? "draft" : "default";

  // Moderate repulsion — enough to prevent overlap without blowing clusters apart
  const repulsion = Math.min(130000, 18000 + nodeCount * 250);

  // Tighter separation and edge length so connected nodes cluster visibly
  const separation = Math.min(220, 55 + Math.sqrt(nodeCount) * 8);
  const edgeLength = Math.min(180, 55 + Math.sqrt(nodeCount) * 6);

  // Stronger gravity creates the characteristic circular pull toward the center
  const gravity = Math.max(0.08, 0.4 - nodeCount * 0.001);

  return {
    ...DEFAULT_LAYOUT_OPTIONS,
    quality,
    nodeRepulsion: repulsion,
    nodeSeparation: separation,
    idealEdgeLength: edgeLength,
    gravity,
  };
};

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

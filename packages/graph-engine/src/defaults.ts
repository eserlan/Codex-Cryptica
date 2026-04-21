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
  numIter: 5000,
  nodeDimensionsIncludeLabels: true,
  nestingReprGrpFactor: 1.2,
  initialEnergyOnIncremental: 0.3,
};

/**
 * Generates layout options tuned for the specific size of the graph.
 * Targets an Obsidian-like layout: short edges keep connected nodes in tight
 * clouds, strong gravity pulls all clouds into one circular ball.
 */
export const getDynamicLayoutOptions = (nodeCount: number) => {
  const quality = nodeCount > 500 ? "draft" : "default";

  // Shorter edges pull connected nodes into tight huddles around their hub
  const edgeLength = Math.min(70, 15 + Math.sqrt(nodeCount) * 1.5);

  const separation = Math.min(100, 20 + Math.sqrt(nodeCount) * 2.5);

  // Higher repulsion pushes non-connected nodes further apart while
  // short edges still keep directly-connected nodes in tight clusters
  const repulsion = Math.min(200000, 30000 + nodeCount * 500);

  // Lower gravity lets clusters drift into their own regions of space
  // rather than being forced into one mixed ball
  const gravity = Math.max(0.08, 0.25 - nodeCount * 0.0005);

  return {
    ...DEFAULT_LAYOUT_OPTIONS,
    quality,
    nodeRepulsion: repulsion,
    nodeSeparation: separation,
    idealEdgeLength: edgeLength,
    gravity,
    gravityRange: 5.5,
  };
};

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

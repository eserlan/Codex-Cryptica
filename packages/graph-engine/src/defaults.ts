export const DEFAULT_LAYOUT_OPTIONS = {
  name: "fcose",
  animate: false,
  animationDuration: 800,
  quality: "default",
  randomize: true,
  packComponents: true,
  tile: true,
  tilingPaddingVertical: 100,
  tilingPaddingHorizontal: 100,
  gravity: 0.1,
  nodeRepulsion: 35000, // Reduced baseline repulsion for tighter groups
  idealEdgeLength: 80, // Tighter from 120
  nodeSeparation: 80, // Tighter from 120
  numIter: 3500, // Balanced iterations for speed/quality
  nodeDimensionsIncludeLabels: true, // Essential for large entity cards to prevent overlap
  nestingReprGrpFactor: 1.2, // Default value is more stable
  initialEnergyOnIncremental: 0.3,
};

/**
 * Generates layout options tuned for the specific size of the graph.
 */
export const getDynamicLayoutOptions = (nodeCount: number) => {
  // Always use 'default' quality unless it's a massive graph (> 500 nodes)
  const quality = nodeCount > 500 ? "draft" : "default";

  // Scale repulsion significantly to prevent clumping in dense areas
  const repulsion = Math.min(200000, 35000 + nodeCount * 400);

  // Increase separation and edge length to give large cards room
  const separation = Math.min(300, 80 + Math.sqrt(nodeCount) * 10);
  const edgeLength = Math.min(250, 80 + Math.sqrt(nodeCount) * 8);

  // Very light gravity to prevent the "hairball" effect
  const gravity = Math.max(0.01, 0.15 - nodeCount * 0.0003);

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

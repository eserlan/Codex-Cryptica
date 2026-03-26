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
  nodeRepulsion: 45000,
  idealEdgeLength: 150,
  nodeSeparation: 150,
  numIter: 2500, // Reduced from 5000 for faster convergence
  nodeDimensionsIncludeLabels: false, // Significant speed boost
  nestingReprGrpFactor: 1.1,
  initialEnergyOnIncremental: 0.3,
};

/**
 * Generates layout options tuned for the specific size of the graph.
 */
export const getDynamicLayoutOptions = (nodeCount: number) => {
  // Use 'default' for most, 'draft' for very large graphs. Avoid 'proof' as it's too slow.
  const quality = nodeCount > 300 ? "draft" : "default";

  // Scale repulsion significantly to prevent clumping
  const repulsion = Math.min(250000, 45000 + nodeCount * 500);

  // Increase separation and edge length to give cards room
  const separation = Math.min(500, 150 + Math.sqrt(nodeCount) * 15);
  const edgeLength = Math.min(400, 150 + Math.sqrt(nodeCount) * 12);

  // Very light gravity to prevent "the ball" effect
  const gravity = Math.max(0.01, 0.2 - nodeCount * 0.0005);

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

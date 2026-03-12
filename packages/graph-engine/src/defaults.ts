export const DEFAULT_LAYOUT_OPTIONS = {
  name: "fcose",
  animate: false,
  animationDuration: 800,
  quality: "default",
  randomize: true,
  packComponents: true, // Enable tiling to manage disconnected components efficiently
  nodeDimensionsIncludeLabels: true,
  nodeRepulsion: 25000, // Base maximum repulsion
  idealEdgeLength: 80,
  nodeSeparation: 100,
  gravity: 0.5,
  gravityRange: 3.8,
  numIter: 3500, // Reverted for better complex graph quality
  tile: true,
};

/**
 * Generates layout options tuned for the specific size of the graph.
 */
export const getDynamicLayoutOptions = (nodeCount: number) => {
  // Scale repulsion and separation based on density
  // More nodes -> need more repulsion to prevent overlap
  const repulsion = Math.min(80000, 15000 + nodeCount * 150);
  const separation = Math.min(300, 60 + Math.sqrt(nodeCount) * 10);
  const edgeLength = Math.min(250, 60 + Math.sqrt(nodeCount) * 8);

  return {
    ...DEFAULT_LAYOUT_OPTIONS,
    nodeRepulsion: repulsion,
    nodeSeparation: separation,
    idealEdgeLength: edgeLength,
    // Reduce gravity for larger graphs to allow them to breathe
    gravity: Math.max(0.1, 0.8 - nodeCount * 0.001),
  };
};

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

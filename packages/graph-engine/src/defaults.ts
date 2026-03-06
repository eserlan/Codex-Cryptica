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

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

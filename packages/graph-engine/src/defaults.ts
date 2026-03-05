export const DEFAULT_LAYOUT_OPTIONS = {
  name: "fcose",
  animate: false,
  animationDuration: 800,
  quality: "default",
  randomize: true,
  packComponents: false, // Disable tiling to allow gravity to pull islands closer
  nodeDimensionsIncludeLabels: true,
  nodeRepulsion: 25000, // Base maximum repulsion
  idealEdgeLength: 80,
  nodeSeparation: 100,
  gravity: 0.5,
  gravityRange: 3.8,
  numIter: 3500, // Reverted for better complex graph quality
  tile: false,
};

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

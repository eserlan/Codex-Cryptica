export const DEFAULT_LAYOUT_OPTIONS = {
  name: "fcose",
  animate: false,
  animationDuration: 800,
  quality: "default",
  randomize: true,
  packComponents: true,
  nodeDimensionsIncludeLabels: true,
  nodeRepulsion: 180000, // Strong repulsion
  idealEdgeLength: 150, // Good spacing
  nodeSeparation: 100, // Explicit gap
  gravity: 0.1,
  gravityRange: 3.8,
  numIter: 3500,
  tile: true,
  tilingPaddingVertical: 100,
  tilingPaddingHorizontal: 100,
};

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

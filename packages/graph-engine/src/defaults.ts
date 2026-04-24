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
  edgeElasticity: 0.45,
  nodeSeparation: 55,
  numIter: 2200,
  nodeDimensionsIncludeLabels: true,
  nestingReprGrpFactor: 1.2,
  initialEnergyOnIncremental: 0.3,
};

/**
 * Generates layout options tuned for the specific size of the graph.
 * Short edges keep connected nodes in tight clusters around their hubs;
 * repulsion/separation spread unrelated nodes apart. Gravity is reduced as
 * graphs grow so clusters can drift into distinct regions instead of
 * collapsing into one mixed ball, with gravityRange keeping the overall
 * layout loosely cohesive.
 */
export const getDynamicLayoutOptions = (nodeCount: number) => {
  const quality = nodeCount > 500 ? "draft" : "default";

  const edgeLength = Math.min(450, 90 + Math.sqrt(nodeCount) * 9);

  const separation = Math.min(600, 120 + Math.sqrt(nodeCount) * 15);

  const repulsion = Math.min(1600000, 250000 + nodeCount * 2400);

  // Lower gravity so clusters spread into their own regions rather than
  // collapsing into one mixed ball; floor is low so large graphs stay cohesive
  const gravity = Math.max(0.005, 0.05 - nodeCount * 0.00015);

  // Draft quality uses a coarser algorithm — fewer iterations still converge
  const numIter = nodeCount > 200 ? 1200 : DEFAULT_LAYOUT_OPTIONS.numIter;

  return {
    ...DEFAULT_LAYOUT_OPTIONS,
    quality,
    numIter,
    nodeRepulsion: repulsion,
    nodeSeparation: separation,
    idealEdgeLength: edgeLength,
    gravity,
    gravityRange: 1.5,
  };
};

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

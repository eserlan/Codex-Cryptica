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
 * Layout tuning for fcose, community-aware.
 *
 * Profiled on a 1,625-node vault: the previous tuning stretched every
 * hub-to-hub edge to 3.5x the ideal length (36% of edges there), flinging hubs
 * apart so their edges crossed the whole graph, and used fcose's draft
 * quality. Instead, edges inside a community (see `detectCommunities`) are
 * short and stiff, edges between communities long and loose, so each
 * community settles into its own region and the long lines are the
 * meaningful links between groups.
 */
export const COMMUNITY_EDGE_LENGTH = 160;
export const LEAF_EDGE_LENGTH = 100;
export const BRIDGE_EDGE_LENGTH = 520;
// Spread so the dense core keeps readable gaps: on the profiled vault the
// median gap between neighbouring nodes went from 10px to 46px.
const BASE_NODE_REPULSION = 96000;

export const getDynamicLayoutOptions = (nodeCount: number) => {
  // Graphs above the large-graph limit are culled to a focus view first, so
  // full quality is affordable for anything that reaches the worker in full.
  const quality = nodeCount > 3000 ? "draft" : "default";
  return {
    ...DEFAULT_LAYOUT_OPTIONS,
    quality,
    numIter: 2500,
    nodeRepulsion: BASE_NODE_REPULSION,
    nodeSeparation: 200,
    idealEdgeLength: COMMUNITY_EDGE_LENGTH,
    gravity: 0.15,
    gravityRange: 3.8,
  };
};

/** Ideal length and stiffness of an edge, given its endpoints' community and degree. */
export function communityEdgeShape(
  sameCommunity: boolean,
  minDegree: number,
): { idealLength: number; elasticity: number } {
  if (!sameCommunity)
    return { idealLength: BRIDGE_EDGE_LENGTH, elasticity: 0.08 };
  return {
    idealLength: minDegree <= 1 ? LEAF_EDGE_LENGTH : COMMUNITY_EDGE_LENGTH,
    elasticity: 0.6,
  };
}

/** Hubs repel harder so their neighbours have room around them. */
export function degreeRepulsion(degree: number): number {
  return BASE_NODE_REPULSION * (1 + Math.min(3, Math.sqrt(degree) * 0.4));
}

export const CONNECTION_COLORS = {
  friendly: "#3b82f6", // Blue-500
  enemy: "#ef4444", // Red-500
  neutral: "#f59e0b", // Amber-500
};

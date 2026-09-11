export interface GraphLayoutNode {
  id: string;
}

export interface GraphLayoutEdge {
  source: string;
  target: string;
}

export interface CalculateGraphLevelsOptions<
  TNode extends GraphLayoutNode,
  TEdge extends GraphLayoutEdge,
> {
  nodes: TNode[];
  edges: TEdge[];
  isRoot?: (node: TNode) => boolean;
  direction?: "directed" | "undirected";
  includeEdge?: (edge: TEdge) => boolean;
  minimumLevel?: (node: TNode) => number;
  disconnectedLevel?: (node: TNode, nextLevel: number) => number;
}

/**
 * Groups graph nodes by breadth-first depth for canvas layout adapters.
 *
 * Domain adapters choose roots, edge direction, shortcut exclusions, and
 * fallback levels. Nodes are visited once so cyclic canvases terminate safely.
 */
export function calculateGraphLevels<
  TNode extends GraphLayoutNode,
  TEdge extends GraphLayoutEdge,
>(options: CalculateGraphLevelsOptions<TNode, TEdge>): TNode[][] {
  const {
    nodes,
    edges,
    isRoot,
    direction = "directed",
    includeEdge = () => true,
    minimumLevel = () => 0,
    disconnectedLevel,
  } = options;
  if (nodes.length === 0) return [];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const inDegree = new Map(nodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    if (
      !includeEdge(edge) ||
      !nodeById.has(edge.source) ||
      !nodeById.has(edge.target)
    ) {
      continue;
    }
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    if (direction === "undirected") {
      adjacency.get(edge.target)?.push(edge.source);
    }
  }

  let roots = isRoot
    ? nodes.filter(isRoot)
    : direction === "directed"
      ? nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0)
      : [];
  if (roots.length === 0) roots = [nodes[0]];

  const levelById = new Map<string, number>();
  const pending: string[] = [];
  for (const root of roots) {
    if (levelById.has(root.id)) continue;
    levelById.set(root.id, Math.max(0, minimumLevel(root)));
    pending.push(root.id);
  }

  while (pending.length > 0) {
    const currentId = pending.shift()!;
    const currentLevel = levelById.get(currentId) ?? 0;
    for (const neighborId of adjacency.get(currentId) ?? []) {
      if (levelById.has(neighborId)) continue;
      const neighbor = nodeById.get(neighborId)!;
      levelById.set(
        neighborId,
        Math.max(currentLevel + 1, minimumLevel(neighbor)),
      );
      pending.push(neighborId);
    }
  }

  let nextLevel = Math.max(0, ...levelById.values()) + 1;
  for (const node of nodes) {
    if (levelById.has(node.id)) continue;
    const fallback = disconnectedLevel
      ? disconnectedLevel(node, nextLevel)
      : Math.max(minimumLevel(node), nextLevel);
    levelById.set(node.id, fallback);
    nextLevel = Math.max(nextLevel, fallback + 1);
  }

  const levels: TNode[][] = [];
  for (const node of nodes) {
    const level = levelById.get(node.id) ?? 0;
    (levels[level] ??= []).push(node);
  }
  return levels.filter((level) => level.length > 0);
}

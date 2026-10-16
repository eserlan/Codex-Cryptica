import type {
  PointCrawlDuration,
  PointCrawlNetwork,
  PointCrawlNode,
  PointCrawlRoute,
  PointCrawlStructuralRole,
} from "./point-crawl-state";

export type PointCrawlDensity = PointCrawlNetwork["density"];

export function pointCrawlRouteBudget(
  pointCount: number,
  density: PointCrawlDensity,
): number {
  if (/highly/i.test(density))
    return Math.min(24, Math.ceil(pointCount * 1.75));
  if (/linear/i.test(density)) return pointCount + 1;
  return Math.ceil(pointCount * 1.35);
}

export function routesIncidentTo(
  nodeId: string,
  routes: readonly PointCrawlRoute[],
): PointCrawlRoute[] {
  return routes.filter(
    (route) =>
      route.fromNodeId === nodeId ||
      (route.direction === "bidirectional" && route.toNodeId === nodeId),
  );
}

export function usableRouteDegree(
  nodeId: string,
  routes: readonly PointCrawlRoute[],
): number {
  return routesIncidentTo(nodeId, routes).length;
}

export function parsePointCrawlDuration(
  label: string,
): PointCrawlDuration | null {
  const match = label
    .trim()
    .match(
      /^(\d+(?:\.\d+)?)\s*(min(?:ute)?s?|hrs?|hours?|days?|turns?|jumps?)$/i,
    );
  if (!match) return null;
  const value = Number(match[1]);
  const unitText = match[2].toLowerCase();
  const unit: PointCrawlDuration["unit"] = unitText.startsWith("min")
    ? "minute"
    : unitText.startsWith("h")
      ? "hour"
      : unitText.startsWith("d")
        ? "day"
        : unitText.startsWith("t")
          ? "turn"
          : "jump";
  return Number.isFinite(value) && value > 0 ? { value, unit } : null;
}

export function formatPointCrawlDuration(duration: PointCrawlDuration): string {
  const shortUnit: Record<PointCrawlDuration["unit"], string> = {
    minute: "min",
    hour: "hr",
    day: "day",
    turn: "turn",
    jump: "jump",
  };
  const plural = duration.value === 1 ? "" : "s";
  return `${duration.value} ${shortUnit[duration.unit]}${plural}`;
}

export function durationInComparableUnits(
  duration: PointCrawlDuration,
): number | null {
  switch (duration.unit) {
    case "minute":
      return duration.value;
    case "hour":
      return duration.value * 60;
    case "day":
      return duration.value * 1440;
    case "turn":
      return duration.value;
    case "jump":
      return duration.value;
  }
}

export function convertDuration(
  duration: PointCrawlDuration,
  unit: PointCrawlDuration["unit"],
): number | null {
  const physical = ["minute", "hour", "day"];
  if (physical.includes(duration.unit) && physical.includes(unit)) {
    const minutesByUnit: Record<string, number> = {
      minute: 1,
      hour: 60,
      day: 1440,
    };
    const minutes = duration.value * minutesByUnit[duration.unit];
    return minutes / minutesByUnit[unit];
  }
  return duration.unit === unit ? duration.value : null;
}

function routeTargetFrom(
  route: PointCrawlRoute,
  nodeId: string,
): string | undefined {
  if (route.fromNodeId === nodeId) return route.toNodeId;
  if (route.direction === "bidirectional" && route.toNodeId === nodeId) {
    return route.fromNodeId;
  }
}

function routeTimeWeight(
  route: PointCrawlRoute,
  unit?: PointCrawlDuration["unit"],
): number | null {
  const duration = route.duration ?? parsePointCrawlDuration(route.travelTime);
  if (!duration) return null;
  return unit
    ? convertDuration(duration, unit)
    : durationInComparableUnits(duration);
}

function nextStateMask(
  currentMask: number,
  nodeId: string,
  gates: PointCrawlRoute[],
): number {
  return gates.reduce(
    (mask, route, index) =>
      route.gate?.unlockedByNodeId === nodeId ? mask | (1 << index) : mask,
    currentMask,
  );
}

interface WeightedTravelState {
  nodeId: string;
  mask: number;
  cost: number;
}

function weightedNextState(
  route: PointCrawlRoute,
  nodeId: string,
  mask: number,
  cost: number,
  unit: PointCrawlDuration["unit"] | undefined,
  gateIndex: ReadonlyMap<string, number>,
  gates: PointCrawlRoute[],
): WeightedTravelState | null {
  const target = routeTargetFrom(route, nodeId);
  if (!target) return null;
  const weight = routeTimeWeight(route, unit);
  if (weight === null) return null;
  const lockIndex = route.gate ? gateIndex.get(route.id) : undefined;
  if (lockIndex !== undefined && !(mask & (1 << lockIndex))) return null;
  return {
    nodeId: target,
    mask: nextStateMask(mask, target, gates),
    cost: cost + weight,
  };
}

function relaxTravelState(
  candidate: WeightedTravelState,
  distances: Map<string, number>,
  pending: Set<string>,
  stateNodes: Map<string, { nodeId: string; mask: number }>,
): void {
  const key = `${candidate.nodeId}:${candidate.mask}`;
  if (candidate.cost >= (distances.get(key) ?? Number.POSITIVE_INFINITY))
    return;
  distances.set(key, candidate.cost);
  stateNodes.set(key, { nodeId: candidate.nodeId, mask: candidate.mask });
  pending.add(key);
}

function expandTravelState(
  current: { nodeId: string; mask: number },
  cost: number,
  routes: PointCrawlRoute[],
  unit: PointCrawlDuration["unit"] | undefined,
  gateIndex: ReadonlyMap<string, number>,
  gates: PointCrawlRoute[],
  distances: Map<string, number>,
  pending: Set<string>,
  stateNodes: Map<string, { nodeId: string; mask: number }>,
): void {
  for (const route of routes) {
    const candidate = weightedNextState(
      route,
      current.nodeId,
      current.mask,
      cost,
      unit,
      gateIndex,
      gates,
    );
    if (candidate) relaxTravelState(candidate, distances, pending, stateNodes);
  }
}

// fallow-ignore-next-line complexity -- This single Dijkstra pass must carry gate-acquisition state with travel cost.
export function fastestPlayableTravelTime(
  crawl: Pick<PointCrawlNetwork, "startNodeId" | "goalNodeIds" | "routes">,
  startNodeId = crawl.startNodeId,
  unit?: PointCrawlDuration["unit"],
): number | null {
  const gates = crawl.routes.filter((route) => route.gate);
  const gateIndex = new Map(gates.map((route, index) => [route.id, index]));
  const initialMask = nextStateMask(0, startNodeId, gates);
  const stateKey = (nodeId: string, mask: number) => `${nodeId}:${mask}`;
  const distances = new Map<string, number>([
    [stateKey(startNodeId, initialMask), 0],
  ]);
  const pending = new Set<string>([stateKey(startNodeId, initialMask)]);
  const stateNodes = new Map([
    [
      stateKey(startNodeId, initialMask),
      { nodeId: startNodeId, mask: initialMask },
    ],
  ]);
  const goalDistances: number[] = [];
  while (pending.size > 0) {
    let currentKey: string | undefined;
    let best = Number.POSITIVE_INFINITY;
    for (const key of pending) {
      const distance = distances.get(key) ?? Number.POSITIVE_INFINITY;
      if (distance < best) {
        best = distance;
        currentKey = key;
      }
    }
    if (!currentKey) break;
    pending.delete(currentKey);
    const current = stateNodes.get(currentKey)!;
    if (crawl.goalNodeIds.includes(current.nodeId)) goalDistances.push(best);
    expandTravelState(
      current,
      best,
      crawl.routes,
      unit,
      gateIndex,
      gates,
      distances,
      pending,
      stateNodes,
    );
  }
  return goalDistances.length ? Math.min(...goalDistances) : null;
}

function goalsReachableWithoutNode(
  crawl: Pick<
    PointCrawlNetwork,
    "startNodeId" | "goalNodeIds" | "nodes" | "routes"
  >,
  candidateId: string,
): boolean {
  const visited = new Set<string>([crawl.startNodeId]);
  const queue = [crawl.startNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const route of crawl.routes) {
      let next: string | undefined;
      if (route.fromNodeId === current) next = route.toNodeId;
      else if (
        route.direction === "bidirectional" &&
        route.toNodeId === current
      )
        next = route.fromNodeId;
      if (!next || next === candidateId || visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return crawl.goalNodeIds.every((goalId) => visited.has(goalId));
}

/** Returns true when removing the node separates the Start from every Goal. */
export function dominatesAllGoals(
  crawl: Pick<
    PointCrawlNetwork,
    "startNodeId" | "goalNodeIds" | "nodes" | "routes"
  >,
  candidateId: string,
): boolean {
  if (
    candidateId === crawl.startNodeId ||
    crawl.goalNodeIds.includes(candidateId)
  )
    return false;
  return !goalsReachableWithoutNode(crawl, candidateId);
}

export function isNodeOptional(
  crawl: Pick<
    PointCrawlNetwork,
    "startNodeId" | "goalNodeIds" | "nodes" | "routes"
  >,
  candidateId: string,
): boolean {
  if (
    candidateId === crawl.startNodeId ||
    crawl.goalNodeIds.includes(candidateId)
  )
    return false;
  return goalsReachableWithoutNode(crawl, candidateId);
}

export function pointCrawlStructuralRole(
  node: PointCrawlNode,
  crawl: Pick<
    PointCrawlNetwork,
    "startNodeId" | "goalNodeIds" | "nodes" | "routes"
  >,
): PointCrawlStructuralRole {
  const incident = routesIncidentTo(node.id, crawl.routes);
  if (node.id === crawl.startNodeId) return "start";
  if (crawl.goalNodeIds.includes(node.id)) return "goal";
  if (dominatesAllGoals(crawl, node.id)) return "chokepoint";
  if (
    incident.length &&
    incident.every((route) => route.visibility !== "obvious")
  )
    return "secret";
  if (incident.length >= 3) return "hub";
  // Preserve the legacy side-site intent only when the final graph proves it optional.
  if (node.role === "side" && isNodeOptional(crawl, node.id)) return "optional";
  return "connector";
}

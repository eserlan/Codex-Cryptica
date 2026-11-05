/**
 * Topology construction and normalization for the Point Crawl Generator
 * (#2479, 177-point-crawl-generator).
 *
 * Guarantees that every point crawl (6–15 nodes, local or AI) satisfies:
 * - Exactly 1 `start` node (layer 0) and >= 1 `goal` node (max layer)
 * - >= 2 branching decision nodes (`outDegree >= 2`)
 * - All nodes reachable from `start`
 * - >= 1 cycle/loop (`routes.length >= nodes.length`)
 * - >= 1 `hidden` or `rumoured` shortcut route
 * - >= 1 gated route whose `gate.unlockedByNodeId` is reachable from `start`
 *   WITHOUT traversing the gated route itself (zero key-behind-lock softlocks)
 */

import { type Rng, defaultRng } from "./random-utils";
import {
  fastestPlayableTravelTime,
  isNodeOptional,
  parsePointCrawlDuration,
  pointCrawlStructuralRole,
  routesIncidentTo,
} from "./point-crawl-graph-analysis";
import {
  getGateTemplates,
  getScaleVocabulary,
  type ScaleVocabulary,
} from "./point-crawl-tables";
import type {
  PointCrawlDangerLevel,
  PointCrawlDensity,
  PointCrawlNetwork,
  PointCrawlNode,
  PointCrawlNodeRole,
  PointCrawlRoute,
  PointCrawlScale,
  PointCrawlSecretFrequency,
} from "./point-crawl-state";
import { pointCrawlRouteBudget } from "./point-crawl-graph-analysis";

export function clampPointCount(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 8;
  return Math.min(15, Math.max(6, n));
}

/**
 * Returns the set of node IDs reachable from `startNodeId` when any route in
 * `excludedRouteIds` (or any gated route whose unlocking node is not yet in
 * `unlockedSet`) cannot be traversed.
 */
export function reachableNodesBfs(
  startNodeId: string,
  routes: readonly PointCrawlRoute[],
  excludedRouteIds: ReadonlySet<string> = new Set(),
): Set<string> {
  const visited = new Set<string>([startNodeId]);
  const queue: string[] = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const route of routes) {
      if (excludedRouteIds.has(route.id)) continue;
      if (route.fromNodeId === current && !visited.has(route.toNodeId)) {
        visited.add(route.toNodeId);
        queue.push(route.toNodeId);
      } else if (
        route.direction === "bidirectional" &&
        route.toNodeId === current &&
        !visited.has(route.fromNodeId)
      ) {
        visited.add(route.fromNodeId);
        queue.push(route.fromNodeId);
      }
    }
  }
  return visited;
}

/**
 * Progressive reachability simulation: starts at `startNodeId` with no keys,
 * collects `unlocksRouteIds` from every visited node, and unlocks gated routes
 * as their `unlockedByNodeId` is reached. Returns all nodes reachable under
 * true key-before-lock play.
 */
export function simulateKeyLockReachability(
  startNodeId: string,
  routes: readonly PointCrawlRoute[],
): { reachableNodeIds: Set<string>; softlockedRouteIds: string[] } {
  const reachable = new Set<string>([startNodeId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const route of routes) {
      if (route.gate && !reachable.has(route.gate.unlockedByNodeId)) {
        continue;
      }
      if (reachable.has(route.fromNodeId) && !reachable.has(route.toNodeId)) {
        reachable.add(route.toNodeId);
        changed = true;
      } else if (
        route.direction === "bidirectional" &&
        reachable.has(route.toNodeId) &&
        !reachable.has(route.fromNodeId)
      ) {
        reachable.add(route.fromNodeId);
        changed = true;
      }
    }
  }

  const softlockedRouteIds = routes
    .filter((r) => r.gate && !reachable.has(r.gate.unlockedByNodeId))
    .map((r) => r.id);

  return { reachableNodeIds: reachable, softlockedRouteIds };
}

function assignLayersAndRoles(count: number): Array<{
  id: string;
  role: PointCrawlNodeRole;
  layer: number;
  rail: number;
}> {
  const specs: Array<{
    id: string;
    role: PointCrawlNodeRole;
    layer: number;
    rail: number;
  }> = [];

  // Layer 0: Start
  specs.push({ id: "node-1", role: "start", layer: 0, rail: 0 });

  const middleCount = count - 2; // excluding start and primary goal
  const maxLayer = count <= 7 ? 3 : count <= 11 ? 4 : 5;
  const middleLayers = maxLayer - 1;

  const rolePool: PointCrawlNodeRole[] = [
    "hub",
    "obstacle",
    "hazard",
    "secret",
    "side",
    "hub",
    "side",
    "hazard",
    "obstacle",
    "secret",
    "side",
    "hub",
    "goal",
  ];

  const perLayerCounts = new Array<number>(middleLayers).fill(0);
  for (let i = 0; i < middleCount; i++) {
    const layerIdx = i % middleLayers;
    perLayerCounts[layerIdx]++;
  }

  let nodeIndex = 2;
  for (let l = 1; l <= middleLayers; l++) {
    const inLayer = perLayerCounts[l - 1];
    for (let k = 0; k < inLayer; k++) {
      const role = rolePool[(nodeIndex - 2) % rolePool.length];
      const rail = k - (inLayer - 1) / 2;
      specs.push({
        id: `node-${nodeIndex}`,
        role,
        layer: l,
        rail,
      });
      nodeIndex++;
    }
  }

  // Final Layer: Primary Goal
  specs.push({
    id: `node-${count}`,
    role: "goal",
    layer: maxLayer,
    rail: 0,
  });

  return specs;
}

function pickDistinct<T>(items: readonly T[], index: number, rng: Rng): T {
  const offset = Math.floor(rng() * items.length);
  return items[(index + offset) % items.length];
}

export interface TopologyBuildOptions {
  title?: string;
  premise?: string;
  genre?: string;
  scale?: PointCrawlScale;
  pointCount?: number;
  density?: PointCrawlDensity;
  dangerLevel?: PointCrawlDangerLevel;
  secretFrequency?: PointCrawlSecretFrequency;
  avoidNames?: string[];
}

// fallow-ignore-next-line complexity
export function buildPointCrawlTopology(
  options: TopologyBuildOptions = {},
  rng: Rng = defaultRng,
): PointCrawlNetwork {
  const pointCount = clampPointCount(options.pointCount);
  const genre = options.genre?.trim() || "Classic Fantasy";
  const scale = options.scale?.trim() || "Wilderness";
  const density = options.density?.trim() || "Balanced branching";
  const dangerLevel = options.dangerLevel?.trim() || "Moderate / Hazardous";
  const secretFrequency =
    options.secretFrequency?.trim() || "Standard (1-2 secret routes)";

  const vocab: ScaleVocabulary = getScaleVocabulary(scale);
  const gateTemplates = getGateTemplates(genre);
  const specs = assignLayersAndRoles(pointCount);
  const avoidSet = new Set(
    (options.avoidNames ?? []).map((n) => n.toLowerCase().trim()),
  );

  const nodes: PointCrawlNode[] = specs.map((spec, idx) => {
    let baseName = vocab.nodePrefixes[idx % vocab.nodePrefixes.length];
    if (avoidSet.has(baseName.toLowerCase())) {
      baseName = `${baseName} (${spec.id.toUpperCase()})`;
    }
    return {
      id: spec.id,
      name: baseName,
      role: spec.role,
      layer: spec.layer,
      rail: spec.rail,
      summary: `A ${spec.role} location at layer ${spec.layer} of the ${scale.toLowerCase()} crawl.`,
      sensoryDescription: `Weathered stone, shifting shadows, and the unmistakable atmosphere of ${baseName}.`,
      whyVisit:
        spec.role === "goal"
          ? `The primary objective of the expedition lies within ${baseName}.`
          : `Offers vantage points, shelter, or a vital lead deeper into the ${scale.toLowerCase()}.`,
      encounterOrHazard: `${vocab.risks[idx % vocab.risks.length]}.`,
      clueOrReward: `Signposts pointing toward adjacent routes and salvageable supplies.`,
      unlocksRouteIds: [],
    };
  });

  const routes: PointCrawlRoute[] = [];
  const edgeKeys = new Set<string>();
  const routeBudget = pointCrawlRouteBudget(nodes.length, density);
  // fallow-ignore-next-line complexity
  const addEdge = (
    fromId: string,
    toId: string,
    overrides: Partial<PointCrawlRoute> = {},
  ): PointCrawlRoute | null => {
    if (fromId === toId || routes.length >= routeBudget) return null;
    const key = [fromId, toId].sort().join("--");
    if (edgeKeys.has(key)) return null;
    edgeKeys.add(key);
    const idx = routes.length;
    const travelTime =
      overrides.travelTime ?? pickDistinct(vocab.travelTimes, idx, rng);
    const route: PointCrawlRoute = {
      id: `route-${idx + 1}`,
      fromNodeId: fromId,
      toNodeId: toId,
      direction: overrides.direction ?? "bidirectional",
      visibility: overrides.visibility ?? "obvious",
      travelTime,
      terrain: overrides.terrain ?? pickDistinct(vocab.terrains, idx, rng),
      risk: overrides.risk ?? pickDistinct(vocab.risks, idx + 1, rng),
      signpost:
        overrides.signpost ?? pickDistinct(vocab.signposts, idx + 2, rng),
      ...(overrides.gate ? { gate: overrides.gate } : {}),
      duration: overrides.duration ??
        parsePointCrawlDuration(travelTime) ?? { value: 1, unit: "hour" },
      ...(overrides.isLoopOrShortcut
        ? { isLoopOrShortcut: overrides.isLoopOrShortcut }
        : {}),
    };
    routes.push(route);
    return route;
  };

  // Build a connected, layered backbone before spending the remaining edge budget.
  const startNode = nodes[0];
  const ordered = [...nodes].sort(
    (a, b) => a.layer - b.layer || a.rail - b.rail,
  );
  for (let index = 0; index < ordered.length - 1; index++) {
    addEdge(ordered[index].id, ordered[index + 1].id);
  }

  // Guarantee two real choices and a cycle before adding optional cross-links.
  addEdge(startNode.id, ordered[2].id, { isLoopOrShortcut: true });
  addEdge(ordered[1].id, ordered[3].id, { isLoopOrShortcut: true });

  const candidates: Array<[PointCrawlNode, PointCrawlNode]> = [];
  for (let left = 0; left < ordered.length; left++) {
    for (let right = left + 2; right < ordered.length; right++) {
      candidates.push([ordered[left], ordered[right]]);
    }
  }
  candidates.sort((a, b) => {
    const layerGapA = a[1].layer - a[0].layer;
    const layerGapB = b[1].layer - b[0].layer;
    return layerGapA - layerGapB || a[0].id.localeCompare(b[0].id);
  });
  for (const [from, to] of candidates) {
    if (routes.length >= routeBudget) break;
    addEdge(from.id, to.id, { isLoopOrShortcut: true });
  }

  if (routes.length > 0) {
    const secretCount = /frequent/i.test(secretFrequency)
      ? 3
      : /rare/i.test(secretFrequency)
        ? 1
        : 2;
    for (const candidate of [...routes].reverse()) {
      if (
        routes.filter((r) => r.visibility !== "obvious").length >= secretCount
      )
        break;
      if (candidate.fromNodeId !== startNode.id) {
        candidate.visibility = "hidden";
        candidate.isLoopOrShortcut = true;
      }
    }
  }

  // ⚡ Bolt Optimization: Replace chained .filter().map() with an imperative loop
  const goalNodeIds: string[] = [];
  for (const n of nodes) {
    if (n.role === "goal") goalNodeIds.push(n.id);
  }

  const network: PointCrawlNetwork = {
    title:
      options.title?.trim() || `The ${nodes[nodes.length - 1].name} Expedition`,
    premise:
      options.premise?.trim() ||
      `An interconnected ${scale.toLowerCase()} point crawl in a ${genre} setting leading from ${startNode.name} to ${nodes[nodes.length - 1].name}.`,
    genre,
    scale,
    pointCount: nodes.length,
    density,
    dangerLevel,
    secretFrequency,
    startNodeId: startNode.id,
    goalNodeIds,
    nodes,
    routes,
    adventurePlan: {
      objective: `Reach and resolve the objective at ${nodes[nodes.length - 1].name}.`,
      travelAssumption:
        "Travel durations are route estimates under ordinary conditions; route risks may add delay.",
      discoveries: [],
      outcomes: [
        {
          id: "reach-goal",
          name: "Resolve the primary objective",
          requirementDiscoveryIds: [],
          requirementRouteIds: [],
        },
      ],
      detourPayoffs: nodes
        .filter((node) =>
          isNodeOptional(
            { startNodeId: startNode.id, goalNodeIds, nodes, routes },
            node.id,
          ),
        )
        .map((node) => ({
          nodeId: node.id,
          benefit: `Offers a useful lead or resource before the final approach.`,
        })),
    },
    warnings: [],
  };

  return normalizePointCrawlTopology(network, gateTemplates, vocab, rng);
}

/**
 * Deterministic normalization pass that repairs any local or AI-returned
 * PointCrawlNetwork so it strictly satisfies all FR-003 and FR-006 graph
 * invariants (connectedness, >=1 loop, >=1 secret/shortcut, >=1 gated route,
 * and 0 key-behind-lock softlocks).
 */
// fallow-ignore-next-line complexity
export function normalizePointCrawlTopology(
  crawl: PointCrawlNetwork,
  gateTemplates = getGateTemplates(crawl.genre),
  vocab = getScaleVocabulary(crawl.scale),
  rng: Rng = defaultRng,
): PointCrawlNetwork {
  const nodes = crawl.nodes.map((n) => ({
    ...n,
    unlocksRouteIds: [...(n.unlocksRouteIds ?? [])],
  }));
  const routes = crawl.routes.map((r) => ({
    ...r,
    duration: r.duration ?? parsePointCrawlDuration(r.travelTime) ?? undefined,
    ...(r.gate ? { gate: { ...r.gate } } : {}),
  }));

  if (nodes.length === 0) return crawl;

  // 1. Ensure exactly one start node and at least one goal node
  const startNode = nodes.find((n) => n.role === "start") ?? nodes[0];
  startNode.role = "start";
  startNode.layer = 0;
  for (const n of nodes) {
    if (n.id !== startNode.id && n.role === "start") {
      n.role = "hub";
    }
  }
  if (!nodes.some((n) => n.role === "goal")) {
    nodes[nodes.length - 1].role = "goal";
  }
  // ⚡ Bolt Optimization: Replace chained .filter().map() with an imperative loop
  const goalNodeIds: string[] = [];
  for (const n of nodes) {
    if (n.role === "goal") goalNodeIds.push(n.id);
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  // Drop routes referencing non-existent nodes or self-loops
  const validRoutes = routes.filter(
    (r) =>
      nodeIds.has(r.fromNodeId) &&
      nodeIds.has(r.toNodeId) &&
      r.fromNodeId !== r.toNodeId,
  );

  // 2. Ensure all nodes are reachable from startNode (ignoring gates first)
  let reachable = reachableNodesBfs(startNode.id, validRoutes);
  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      const anchorId = [...reachable][reachable.size - 1] ?? startNode.id;
      const idx = validRoutes.length;
      validRoutes.push({
        id: `route-repair-${idx + 1}`,
        fromNodeId: anchorId,
        toNodeId: node.id,
        direction: "bidirectional",
        visibility: "obvious",
        travelTime: vocab.travelTimes[idx % vocab.travelTimes.length],
        duration:
          parsePointCrawlDuration(
            vocab.travelTimes[idx % vocab.travelTimes.length],
          ) ?? undefined,
        terrain: vocab.terrains[idx % vocab.terrains.length],
        risk: vocab.risks[idx % vocab.risks.length],
        signpost: vocab.signposts[idx % vocab.signposts.length],
      });
      reachable = reachableNodesBfs(startNode.id, validRoutes);
    }
  }

  // 3. Ensure at least 1 loop (undirected edges >= nodes.length)
  const pairKey = (a: string, b: string) => [a, b].sort().join("--");
  const existingPairs = new Set(
    validRoutes.map((r) => pairKey(r.fromNodeId, r.toNodeId)),
  );
  for (let i = 1; i < nodes.length && validRoutes.length < nodes.length; i++) {
    for (
      let j = i + 1;
      j < nodes.length && validRoutes.length < nodes.length;
      j++
    ) {
      const key = pairKey(nodes[i].id, nodes[j].id);
      if (!existingPairs.has(key)) {
        existingPairs.add(key);
        const idx = validRoutes.length;
        validRoutes.push({
          id: `route-loop-${idx + 1}`,
          fromNodeId: nodes[i].id,
          toNodeId: nodes[j].id,
          direction: "bidirectional",
          visibility: "obvious",
          travelTime: vocab.travelTimes[idx % vocab.travelTimes.length],
          duration:
            parsePointCrawlDuration(
              vocab.travelTimes[idx % vocab.travelTimes.length],
            ) ?? undefined,
          terrain: vocab.terrains[idx % vocab.terrains.length],
          risk: vocab.risks[idx % vocab.risks.length],
          signpost: vocab.signposts[idx % vocab.signposts.length],
          isLoopOrShortcut: true,
        });
      }
    }
  }

  // 4. Ensure secret route count matches secretFrequency (at least 1 hidden/rumoured shortcut)
  const desiredSecrets = /frequent/i.test(crawl.secretFrequency)
    ? 3
    : /standard/i.test(crawl.secretFrequency)
      ? 2
      : 1;
  let currentSecrets = validRoutes.filter(
    (r) => r.visibility !== "obvious",
  ).length;
  for (
    let i = validRoutes.length - 1;
    i >= 0 && currentSecrets < desiredSecrets;
    i--
  ) {
    const candidate = validRoutes[i];
    if (
      candidate.visibility === "obvious" &&
      candidate.fromNodeId !== startNode.id
    ) {
      candidate.visibility = currentSecrets % 2 === 0 ? "hidden" : "rumoured";
      candidate.isLoopOrShortcut = true;
      currentSecrets++;
    }
  }

  // 5. Ensure at least one gated route exists (preferring a route entering a goal or late-layer node)
  if (!validRoutes.some((r) => Boolean(r.gate))) {
    const candidate =
      validRoutes.find((r) => goalNodeIds.includes(r.toNodeId)) ??
      validRoutes[validRoutes.length - 1];
    if (candidate) {
      const tpl = gateTemplates[Math.floor(rng() * gateTemplates.length)];
      const preGateReachable = reachableNodesBfs(
        startNode.id,
        validRoutes,
        new Set([candidate.id]),
      );
      const keyHolderId =
        [...preGateReachable].find(
          (id) => id !== startNode.id && id !== candidate.toNodeId,
        ) ?? startNode.id;
      candidate.gate = {
        kind: tpl.kind,
        unlockedByNodeId: keyHolderId,
        requirement: tpl.requirement,
      };
    }
  }

  // 6. Enforce Key-Before-Lock invariant on ALL gated routes
  // ⚡ Bolt Optimization: Replace chained .filter().map() passed to Set with an imperative loop
  const gatedIds = new Set<string>();
  for (const r of validRoutes) {
    if (r.gate) {
      gatedIds.add(r.id);
    }
  }
  for (const route of validRoutes) {
    if (!route.gate) continue;
    // Nodes reachable without crossing THIS gated route (or other gated routes)
    const reachableWithoutThisGate = reachableNodesBfs(
      startNode.id,
      validRoutes,
      new Set([route.id]),
    );
    const currentKeyNode = route.gate.unlockedByNodeId;
    if (
      !nodeIds.has(currentKeyNode) ||
      !reachableWithoutThisGate.has(currentKeyNode) ||
      currentKeyNode === route.toNodeId
    ) {
      // Relocate the key to a node guaranteed reachable without any gated route
      const safeNodes = reachableNodesBfs(startNode.id, validRoutes, gatedIds);
      const fallbackHolderId =
        [...safeNodes].find(
          (id) => id !== startNode.id && id !== route.toNodeId,
        ) ?? startNode.id;
      route.gate.unlockedByNodeId = fallbackHolderId;
    }
  }

  // 7. Synchronize `unlocksRouteIds` and clue text on key-holding nodes
  for (const node of nodes) {
    node.unlocksRouteIds = [];
  }
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  for (const route of validRoutes) {
    if (!route.gate) continue;
    const holder = nodesById.get(route.gate.unlockedByNodeId);
    if (holder) {
      if (!holder.unlocksRouteIds.includes(route.id)) {
        holder.unlocksRouteIds.push(route.id);
      }
      if (
        !holder.clueOrReward
          .toLowerCase()
          .includes(route.gate.requirement.toLowerCase())
      ) {
        const targetName =
          nodesById.get(route.toNodeId)?.name ?? route.toNodeId;
        holder.clueOrReward = `${holder.clueOrReward.replace(/\.$/, "")}. Holds ${route.gate.requirement} (unlocks the route to ${targetName}).`;
      }
    }
  }

  // 8. Final progressive simulation check: if a chain of gates still leaves any node unreachable,
  // re-anchor the offending gate's key to a universally reachable node.
  const sim = simulateKeyLockReachability(startNode.id, validRoutes);
  if (sim.softlockedRouteIds.length > 0) {
    const safeNodeId =
      [...sim.reachableNodeIds].find((id) => id !== startNode.id) ??
      startNode.id;
    for (const softId of sim.softlockedRouteIds) {
      const r = validRoutes.find((route) => route.id === softId);
      if (r?.gate) {
        r.gate.unlockedByNodeId = safeNodeId;
      }
    }
  }

  // Prune only ordinary cross-links. Gates, hidden/rumoured access, and
  // explicitly marked loops are structural content and remain protected.
  const routeBudget = pointCrawlRouteBudget(nodes.length, crawl.density);
  const planRequiredRouteIds = new Set(
    crawl.adventurePlan?.outcomes.flatMap(
      (outcome) => outcome.requirementRouteIds,
    ) ?? [],
  );
  for (
    let index = validRoutes.length - 1;
    validRoutes.length > routeBudget && index >= 0;
    index--
  ) {
    const candidate = validRoutes[index];
    if (
      candidate.gate ||
      candidate.visibility !== "obvious" ||
      candidate.isLoopOrShortcut ||
      planRequiredRouteIds.has(candidate.id)
    )
      continue;
    const trial = validRoutes.filter((_, routeIndex) => routeIndex !== index);
    if (
      trial.length < nodes.length ||
      reachableNodesBfs(startNode.id, trial).size !== nodes.length ||
      simulateKeyLockReachability(startNode.id, trial).softlockedRouteIds
        .length > 0 ||
      nodes.filter((node) => routesIncidentTo(node.id, trial).length >= 2)
        .length < 2
    )
      continue;
    validRoutes.splice(index, 1);
  }

  const existingDiscoveries = new Map(
    crawl.adventurePlan?.discoveries.map((discovery) => [
      discovery.id,
      discovery,
    ]) ?? [],
  );
  const gateDiscoveries = validRoutes.flatMap((route) => {
    if (!route.gate) return [];
    const holder = nodesById.get(route.gate.unlockedByNodeId);
    if (!holder) return [];
    const previous = existingDiscoveries.get(`discovery-${route.id}`);
    return [
      {
        ...previous,
        id: `discovery-${route.id}`,
        name: previous?.name ?? route.gate.requirement,
        nodeId: holder.id,
        enablesOutcomeIds: previous?.enablesOutcomeIds ?? [],
      },
    ];
  });
  const gateDiscoveryIds = new Set(gateDiscoveries.map((entry) => entry.id));
  const discoveries = [
    ...gateDiscoveries,
    ...(crawl.adventurePlan?.discoveries ?? []).filter(
      (entry) => !gateDiscoveryIds.has(entry.id) && nodesById.has(entry.nodeId),
    ),
  ];
  const outcomes = crawl.adventurePlan?.outcomes ?? [
    {
      id: "reach-goal",
      name: "Resolve the primary objective",
      requirementDiscoveryIds: [],
      requirementRouteIds: [],
    },
  ];
  const adventurePlan = {
    objective:
      crawl.adventurePlan?.objective ??
      `Reach and resolve the objective at ${nodes[nodes.length - 1].name}.`,
    travelAssumption:
      crawl.adventurePlan?.travelAssumption ??
      "Travel durations are route estimates under ordinary conditions; route risks may add delay.",
    discoveries: discoveries.map((discovery) => ({
      ...discovery,
      enablesOutcomeIds: discovery.enablesOutcomeIds.filter((id) =>
        outcomes.some((outcome) => outcome.id === id),
      ),
    })),
    outcomes: outcomes.map((outcome) => ({
      ...outcome,
      requirementDiscoveryIds: outcome.requirementDiscoveryIds.filter((id) =>
        discoveries.some((entry) => entry.id === id),
      ),
      requirementRouteIds: outcome.requirementRouteIds.filter((id) =>
        validRoutes.some((route) => route.id === id),
      ),
    })),
    detourPayoffs:
      crawl.adventurePlan?.detourPayoffs.filter((payoff) =>
        nodesById.has(payoff.nodeId),
      ) ?? [],
    ...(crawl.adventurePlan?.clock ? { clock: crawl.adventurePlan.clock } : {}),
  };
  if (adventurePlan.clock) {
    const trigger =
      adventurePlan.clock.startsAt === "crawl-start"
        ? startNode.id
        : adventurePlan.clock.startsAt.nodeId;
    const fastest = nodesById.has(trigger)
      ? fastestPlayableTravelTime(
          { startNodeId: trigger, goalNodeIds, routes: validRoutes },
          trigger,
          adventurePlan.clock.budget.unit,
        )
      : null;
    if (fastest === null || fastest > adventurePlan.clock.budget.value)
      delete adventurePlan.clock;
  }

  const normalized: PointCrawlNetwork = {
    ...crawl,
    pointCount: nodes.length,
    startNodeId: startNode.id,
    goalNodeIds,
    nodes,
    routes: validRoutes,
    adventurePlan,
  };
  return {
    ...normalized,
    nodes: nodes.map((node) => deriveStructuralNode(node, normalized)),
  };
}

// fallow-ignore-next-line complexity -- Role precedence is the canonical graph-derived classification rule.
function deriveStructuralNode(
  node: PointCrawlNode,
  crawl: PointCrawlNetwork,
): PointCrawlNode {
  return {
    ...node,
    structuralRole: pointCrawlStructuralRole(node, crawl),
    traits: [
      ...(node.role === "hazard" ? ["hazard" as const] : []),
      ...(node.role === "obstacle" ? ["obstacle" as const] : []),
    ],
  };
}

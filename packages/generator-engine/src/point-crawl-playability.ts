/**
 * Deterministic playability and graph integrity checks for the Point Crawl
 * Generator (#2479, 177-point-crawl-generator).
 *
 * Enforces FR-006 across both local and AI-generated crawls:
 * 1. Reachability from Start to all nodes (including Goal nodes).
 * 2. Key-before-lock BFS verification (zero softlocks).
 * 3. Loops (`routes.length >= nodes.length`) and >= 1 secret/shortcut route.
 * 4. Distinct route trade-offs (`textOverlap < 0.6` across sibling routes).
 * 5. Concrete facts / anti-vagueness (`!isVague` on gate requirements & clues).
 */

import { textOverlap } from "./one-shot-dedupe";
import {
  fastestPlayableTravelTime,
  pointCrawlRouteBudget,
  pointCrawlStructuralRole,
  routesIncidentTo,
} from "./point-crawl-graph-analysis";
import { isVague } from "./one-shot-playability";
import { getGateTemplates, getScaleVocabulary } from "./point-crawl-tables";
import {
  normalizePointCrawlTopology,
  reachableNodesBfs,
  simulateKeyLockReachability,
} from "./point-crawl-topology";
import type { PointCrawlNetwork, PointCrawlRoute } from "./point-crawl-state";

export type PointCrawlIssueCode =
  | "missing-start"
  | "missing-goal"
  | "unreachable-node"
  | "missing-loop"
  | "missing-secret-or-shortcut"
  | "missing-gate"
  | "key-behind-lock"
  | "overlapping-sibling-routes"
  | "vague-gate-or-clue"
  | "invalid-adventure-plan"
  | "density-exceeded"
  | "structural-role-mismatch";

export interface PointCrawlIssue {
  code: PointCrawlIssueCode;
  message: string;
  nodeId?: string;
  routeId?: string;
}

const VAGUE_GATE_PLACEHOLDERS =
  /\b(?:the (?:secret|correct|right|proper|true|hidden|missing) (?:key|password|passphrase|code|word|clue|token|item|tool))\b/i;

export function isVaguePointCrawlFact(text: string | undefined): boolean {
  if (!text?.trim()) return true;
  if (isVague(text)) return true;
  if (VAGUE_GATE_PLACEHOLDERS.test(text)) {
    const afterColon = text.split(":")[1]?.trim() ?? "";
    const hasQuotedConcrete = /['"][^'"]{2,}['"]/.test(text);
    return !afterColon && !hasQuotedConcrete;
  }
  return false;
}

export interface SiblingOverlapResult {
  overlapFound: boolean;
  routeA?: PointCrawlRoute;
  routeB?: PointCrawlRoute;
  routeToUpdate?: PointCrawlRoute;
  altIndex: number;
}

export function findSiblingRouteOverlap(
  siblings: readonly PointCrawlRoute[],
): SiblingOverlapResult {
  for (let i = 0; i < siblings.length; i++) {
    for (let j = i + 1; j < siblings.length; j++) {
      const a = siblings[i];
      const b = siblings[j];
      const sharedTradeOffCount = [
        textOverlap(a.terrain, b.terrain),
        textOverlap(a.risk, b.risk),
        textOverlap(a.signpost, b.signpost),
      ].filter((score) => score >= 0.6).length;
      if (sharedTradeOffCount >= 2) {
        return {
          overlapFound: true,
          routeA: a,
          routeB: b,
          routeToUpdate: b,
          altIndex: j,
        };
      }
    }
  }
  return { overlapFound: false, altIndex: 0 };
}

/**
 * Checks a `PointCrawlNetwork` for structural or playability flaws and returns
 * a list of concrete `PointCrawlIssue` findings.
 */
// fallow-ignore-next-line complexity
export function checkPointCrawlPlayability(
  crawl: PointCrawlNetwork,
): PointCrawlIssue[] {
  const issues: PointCrawlIssue[] = [];
  const nodesById = new Map(crawl.nodes.map((n) => [n.id, n]));

  // 1. Start & Goal presence
  const startNodes = crawl.nodes.filter((n) => n.role === "start");
  if (startNodes.length !== 1 || !nodesById.has(crawl.startNodeId)) {
    issues.push({
      code: "missing-start",
      message: "Point crawl must have exactly one valid Start node.",
    });
  }

  const goalNodes = crawl.nodes.filter((n) => n.role === "goal");
  if (goalNodes.length === 0) {
    issues.push({
      code: "missing-goal",
      message: "Point crawl must have at least one Goal / Destination node.",
    });
  }

  for (const node of crawl.nodes) {
    const expected = pointCrawlStructuralRole(node, crawl);
    if (node.structuralRole !== expected) {
      issues.push({
        code: "structural-role-mismatch",
        nodeId: node.id,
        message: `Location "${node.name}" is labelled ${node.structuralRole ?? "without a structural role"}, but its graph role is ${expected}.`,
      });
    }
  }

  const routeBudget = pointCrawlRouteBudget(crawl.nodes.length, crawl.density);
  if (crawl.routes.length > routeBudget) {
    issues.push({
      code: "density-exceeded",
      message: `Point crawl has ${crawl.routes.length} routes, exceeding the ${crawl.density} route budget of ${routeBudget}.`,
    });
  }

  // 2. Reachability from Start (ignoring gates first, then with progressive gates)
  const rawReachable = reachableNodesBfs(crawl.startNodeId, crawl.routes);
  for (const node of crawl.nodes) {
    if (!rawReachable.has(node.id)) {
      issues.push({
        code: "unreachable-node",
        nodeId: node.id,
        message: `Location "${node.name}" (${node.id}) is disconnected from the Start node.`,
      });
    }
  }

  // 3. Loop & Secret/Shortcut checks
  if (crawl.routes.length < crawl.nodes.length) {
    issues.push({
      code: "missing-loop",
      message:
        "Point crawl has no loops (fewer routes than nodes); add at least one cycle so the network is not a strict tree.",
    });
  }

  if (!crawl.routes.some((r) => r.visibility !== "obvious")) {
    issues.push({
      code: "missing-secret-or-shortcut",
      message:
        "Point crawl must include at least one hidden or rumoured route/shortcut.",
    });
  }

  if (!crawl.routes.some((r) => Boolean(r.gate))) {
    issues.push({
      code: "missing-gate",
      message:
        "Point crawl must include at least one gated/blocked route with an unlocking requirement.",
    });
  }

  // 4. Key-Before-Lock BFS check
  const sim = simulateKeyLockReachability(crawl.startNodeId, crawl.routes);
  for (const route of crawl.routes) {
    if (!route.gate) continue;
    const withoutGate = reachableNodesBfs(
      crawl.startNodeId,
      crawl.routes,
      new Set([route.id]),
    );
    const keyNodeId = route.gate.unlockedByNodeId;
    if (
      !nodesById.has(keyNodeId) ||
      !withoutGate.has(keyNodeId) ||
      sim.softlockedRouteIds.includes(route.id)
    ) {
      const fromName =
        nodesById.get(route.fromNodeId)?.name ?? route.fromNodeId;
      const toName = nodesById.get(route.toNodeId)?.name ?? route.toNodeId;
      issues.push({
        code: "key-behind-lock",
        routeId: route.id,
        nodeId: keyNodeId,
        message: `Gated route "${fromName} → ${toName}" requires a key placed at "${nodesById.get(keyNodeId)?.name ?? keyNodeId}", which is not reachable before the lock.`,
      });
    }
  }

  // 5. Distinct Route Trade-offs (sibling routes leaving the same node)
  for (const node of crawl.nodes) {
    const originId = node.id;
    const siblings = routesIncidentTo(originId, crawl.routes);
    const overlap = findSiblingRouteOverlap(siblings);
    if (overlap.overlapFound && overlap.routeA && overlap.routeB) {
      const originName = nodesById.get(originId)?.name ?? originId;
      issues.push({
        code: "overlapping-sibling-routes",
        nodeId: originId,
        routeId: overlap.routeB.id,
        message: `Routes leaving "${originName}" (${overlap.routeA.id} and ${overlap.routeB.id}) have near-duplicate terrain/risk/signpost trade-offs.`,
      });
    }
  }

  // Validate structured narrative references and any deadline against route time.
  const plan = crawl.adventurePlan;
  if (plan) {
    const nodeIds = new Set(crawl.nodes.map((node) => node.id));
    const routeIds = new Set(crawl.routes.map((route) => route.id));
    const discoveryIds = new Set(plan.discoveries.map((entry) => entry.id));
    const outcomeIds = new Set(plan.outcomes.map((entry) => entry.id));
    for (const discovery of plan.discoveries) {
      if (
        !nodeIds.has(discovery.nodeId) ||
        discovery.enablesOutcomeIds.some((id) => !outcomeIds.has(id))
      ) {
        issues.push({
          code: "invalid-adventure-plan",
          nodeId: discovery.nodeId,
          message: `Discovery "${discovery.id}" refers to a missing node or outcome.`,
        });
      }
    }
    for (const outcome of plan.outcomes) {
      if (
        outcome.requirementDiscoveryIds.some((id) => !discoveryIds.has(id)) ||
        outcome.requirementRouteIds.some((id) => !routeIds.has(id))
      ) {
        issues.push({
          code: "invalid-adventure-plan",
          message: `Outcome "${outcome.id}" refers to a missing discovery or route.`,
        });
      }
    }
    for (const payoff of plan.detourPayoffs) {
      if (!nodeIds.has(payoff.nodeId))
        issues.push({
          code: "invalid-adventure-plan",
          nodeId: payoff.nodeId,
          message: `Detour payoff refers to missing node "${payoff.nodeId}".`,
        });
    }
    if (plan.clock) {
      const trigger =
        plan.clock.startsAt === "crawl-start"
          ? crawl.startNodeId
          : plan.clock.startsAt.nodeId;
      const fastest = nodeIds.has(trigger)
        ? fastestPlayableTravelTime(crawl, trigger, plan.clock.budget.unit)
        : null;
      if (fastest === null || fastest > plan.clock.budget.value) {
        issues.push({
          code: "invalid-adventure-plan",
          message: `Clock "${plan.clock.label}" cannot be met from its trigger using the route durations.`,
        });
      }
    }
  }

  // 6. Concrete Facts (Anti-Vagueness) on gates and clues
  for (const route of crawl.routes) {
    if (route.gate && isVaguePointCrawlFact(route.gate.requirement)) {
      issues.push({
        code: "vague-gate-or-clue",
        routeId: route.id,
        message: `Route "${route.id}" has a vague gate requirement ("${route.gate.requirement}"); state the concrete key, passphrase, or tool.`,
      });
    }
  }
  for (const node of crawl.nodes) {
    if (isVaguePointCrawlFact(node.clueOrReward)) {
      issues.push({
        code: "vague-gate-or-clue",
        nodeId: node.id,
        message: `Location "${node.name}" has a vague clue or reward ("${node.clueOrReward}"); state the concrete discovery.`,
      });
    }
  }

  return issues;
}

function routeTradeOffOverlapCount(
  first: PointCrawlRoute,
  second: PointCrawlRoute,
): number {
  return [
    textOverlap(first.terrain, second.terrain),
    textOverlap(first.risk, second.risk),
    textOverlap(first.signpost, second.signpost),
  ].filter((score) => score >= 0.6).length;
}

function bestDistinctTradeOff(
  prior: PointCrawlRoute[],
  vocab: ReturnType<typeof getScaleVocabulary>,
): Pick<PointCrawlRoute, "terrain" | "risk" | "signpost"> | undefined {
  let best:
    | { terrain: string; risk: string; signpost: string; score: number }
    | undefined;
  for (const terrain of vocab.terrains) {
    for (const risk of vocab.risks) {
      for (const signpost of vocab.signposts) {
        const candidate = { terrain, risk, signpost };
        const score = Math.max(
          ...prior.map((sibling) =>
            routeTradeOffOverlapCount({ ...sibling, ...candidate }, sibling),
          ),
        );
        if (!best || score < best.score)
          best = { terrain, risk, signpost, score };
      }
    }
  }
  return best;
}

function buildSiblingRouteAdjacency(
  routes: PointCrawlRoute[],
): Map<string, Set<string>> {
  const neighbours = new Map<string, Set<string>>();
  const nodeIds = new Set(
    routes.flatMap((route) => [route.fromNodeId, route.toNodeId]),
  );
  for (const nodeId of nodeIds) {
    const siblings = routesIncidentTo(nodeId, routes);
    for (const route of siblings) {
      const adjacent = neighbours.get(route.id) ?? new Set<string>();
      for (const sibling of siblings) {
        if (route.id !== sibling.id) adjacent.add(sibling.id);
      }
      neighbours.set(route.id, adjacent);
    }
  }
  return neighbours;
}

function overlapsPriorTradeOffs(
  route: PointCrawlRoute,
  prior: PointCrawlRoute[],
): boolean {
  return prior.some(
    (sibling) => routeTradeOffOverlapCount(route, sibling) >= 2,
  );
}

function differentiateSiblingRoutes(
  routeList: PointCrawlRoute[],
  vocab: ReturnType<typeof getScaleVocabulary>,
): void {
  const neighbours = buildSiblingRouteAdjacency(routeList);
  const assigned = new Map<string, PointCrawlRoute>();
  for (const route of routeList) {
    const prior = [...(neighbours.get(route.id) ?? [])]
      .map((id) => assigned.get(id))
      .filter((sibling): sibling is PointCrawlRoute => Boolean(sibling));
    if (overlapsPriorTradeOffs(route, prior)) {
      const best = bestDistinctTradeOff(prior, vocab);
      if (best) {
        route.terrain = best.terrain;
        route.risk = best.risk;
        route.signpost = best.signpost;
      }
    }
    assigned.set(route.id, route);
  }
}

/**
 * Deterministic repair pass: fixes topology/key-before-lock issues, replaces
 * vague gate requirements with concrete genre templates, and differentiates
 * overlapping sibling routes so 100% of returned crawls pass `SC-001`.
 */
export function repairPointCrawlPlayability(
  crawl: PointCrawlNetwork,
): PointCrawlNetwork {
  const vocab = getScaleVocabulary(crawl.scale);
  const gateTemplates = getGateTemplates(crawl.genre);

  // First normalize topology, loops, secrets, and key-before-lock
  let repaired = normalizePointCrawlTopology(crawl, gateTemplates, vocab);

  const routes = repaired.routes.map((r, idx) => {
    const nextRoute = { ...r, ...(r.gate ? { gate: { ...r.gate } } : {}) };
    if (nextRoute.gate && isVaguePointCrawlFact(nextRoute.gate.requirement)) {
      const tpl = gateTemplates[idx % gateTemplates.length];
      nextRoute.gate.kind = tpl.kind;
      nextRoute.gate.requirement = tpl.requirement;
    }
    return nextRoute;
  });

  // Differentiate any overlapping sibling routes
  differentiateSiblingRoutes(routes, vocab);

  // Ensure concrete clueOrReward on all nodes
  const nodes = repaired.nodes.map((n, idx) => {
    const nextNode = { ...n };
    if (isVaguePointCrawlFact(nextNode.clueOrReward)) {
      nextNode.clueOrReward = `Contains a weathered dispatch map and ${gateTemplates[idx % gateTemplates.length].requirement}.`;
    }
    return nextNode;
  });

  repaired = normalizePointCrawlTopology(
    { ...repaired, nodes, routes },
    gateTemplates,
    vocab,
  );

  // If normalizePointCrawlTopology added any new loop routes, guarantee distinctness again
  differentiateSiblingRoutes(repaired.routes, vocab);

  const remainingIssues = checkPointCrawlPlayability(repaired);
  return {
    ...repaired,
    warnings: remainingIssues.map((i) => i.message),
  };
}

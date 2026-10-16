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
  | "vague-gate-or-clue";

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

/**
 * Checks a `PointCrawlNetwork` for structural or playability flaws and returns
 * a list of concrete `PointCrawlIssue` findings.
 */
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
  const routesByOrigin = new Map<string, PointCrawlRoute[]>();
  for (const route of crawl.routes) {
    const list = routesByOrigin.get(route.fromNodeId) ?? [];
    list.push(route);
    routesByOrigin.set(route.fromNodeId, list);
  }
  for (const [originId, siblings] of routesByOrigin.entries()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i];
        const b = siblings[j];
        const textA = `${a.terrain} ${a.risk} ${a.signpost}`;
        const textB = `${b.terrain} ${b.risk} ${b.signpost}`;
        if (textOverlap(textA, textB) >= 0.6) {
          const originName = nodesById.get(originId)?.name ?? originId;
          issues.push({
            code: "overlapping-sibling-routes",
            nodeId: originId,
            routeId: b.id,
            message: `Routes leaving "${originName}" (${a.id} and ${b.id}) have near-duplicate terrain/risk/signpost trade-offs.`,
          });
        }
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

function hasSiblingOverlap(siblings: readonly PointCrawlRoute[]): {
  overlapFound: boolean;
  routeToUpdate?: PointCrawlRoute;
  altIndex: number;
} {
  for (let i = 0; i < siblings.length; i++) {
    for (let j = i + 1; j < siblings.length; j++) {
      const a = siblings[i];
      const b = siblings[j];
      const textA = `${a.terrain} ${a.risk} ${a.signpost}`;
      const textB = `${b.terrain} ${b.risk} ${b.signpost}`;
      if (textOverlap(textA, textB) >= 0.6) {
        return { overlapFound: true, routeToUpdate: b, altIndex: j };
      }
    }
  }
  return { overlapFound: false, altIndex: 0 };
}

function differentiateSiblingRoutes(
  routeList: PointCrawlRoute[],
  vocab: ReturnType<typeof getScaleVocabulary>,
): void {
  const routesByOrigin = new Map<string, PointCrawlRoute[]>();
  for (const route of routeList) {
    const list = routesByOrigin.get(route.fromNodeId) ?? [];
    list.push(route);
    routesByOrigin.set(route.fromNodeId, list);
  }
  let altCounter = 0;
  for (const siblings of routesByOrigin.values()) {
    if (siblings.length <= 1) continue;
    let attempts = 0;
    while (attempts < 50) {
      attempts++;
      const { overlapFound, routeToUpdate, altIndex } =
        hasSiblingOverlap(siblings);
      if (!overlapFound || !routeToUpdate) break;
      altCounter++;
      routeToUpdate.terrain =
        vocab.terrains[(altIndex + altCounter + 2) % vocab.terrains.length];
      routeToUpdate.travelTime =
        vocab.travelTimes[
          (altIndex + altCounter + 1) % vocab.travelTimes.length
        ];
      routeToUpdate.risk =
        vocab.risks[(altIndex + altCounter + 3) % vocab.risks.length];
      routeToUpdate.signpost =
        vocab.signposts[(altIndex + altCounter + 4) % vocab.signposts.length];
    }
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

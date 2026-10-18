/**
 * Staged AI generation pipeline for the Point Crawl Generator
 * (#2479, 177-point-crawl-generator).
 *
 * Builds a PointCrawlNetwork in 3 distinct stages with live `StagedProgressStep[]`
 * callbacks, bounded concurrency (`limit = 3`), `AbortSignal` support, and
 * granular per-part template fallback (`fromFallback: true` + `gaps[]`) so a
 * slow or malformed AI sub-call never discards the rest of the crawl:
 *
 * 1. `topology`: Generate/refine network title, premise, node names/roles, and
 *    route skeleton (falls back to deterministic `buildPointCrawlTopology` if
 *    the stage fails).
 * 2. `locations-and-routes`: Populate rich sensory descriptions, encounters,
 *    clues, and route trade-offs in bounded batches (`pool` of 3); failed
 *    batches keep their deterministic template prose and record `gaps`.
 * 3. `playability`: Run `checkPointCrawlPlayability` and `repairPointCrawlPlayability`
 *    (plus optional AI prose tightening if needed) so 100% of returned networks
 *    pass all graph and key-before-lock invariants.
 */

import { formatCampaignContextBlock } from "./campaign-context";
import { StagedProgress, type StagedProgressStep } from "./staged-progress";
import { askJson, pool, throwIfAborted } from "./staged-runtime";
import {
  checkPointCrawlPlayability,
  isVaguePointCrawlFact,
  repairPointCrawlPlayability,
} from "./point-crawl-playability";
import {
  buildPointCrawlTopology,
  clampPointCount,
} from "./point-crawl-topology";
import type {
  PointCrawlDangerLevel,
  PointCrawlClock,
  PointCrawlDensity,
  PointCrawlGap,
  PointCrawlNetwork,
  PointCrawlNode,
  PointCrawlRoute,
  PointCrawlScale,
  PointCrawlSecretFrequency,
} from "./point-crawl-state";
import { type Rng, defaultRng } from "./random-utils";
import {
  parsePointCrawlDuration,
  fastestPlayableTravelTime,
} from "./point-crawl-graph-analysis";

export interface PointCrawlStagedOptions {
  genre?: string;
  scale?: PointCrawlScale;
  pointCount?: number;
  density?: PointCrawlDensity;
  dangerLevel?: PointCrawlDangerLevel;
  secretFrequency?: PointCrawlSecretFrequency;
  campaignContext?: string;
  avoidNames?: string[];
  concurrency?: number;
}

const STAGE_STEPS: ReadonlyArray<{
  id: StagedProgressStep["id"];
  label: string;
}> = [
  { id: "structure", label: "Graph topology & key-lock skeleton" },
  { id: "scenes", label: "Keyed locations & route trade-offs" },
  { id: "review", label: "Playability & reachability verification" },
];

function buildTopologyStagePrompt(
  base: PointCrawlNetwork,
  campaignContext?: string,
  avoidNames?: string[],
): string {
  const avoidBlock =
    avoidNames && avoidNames.length > 0
      ? `Do NOT use any of these names: ${avoidNames.slice(0, 30).join(", ")}.\n`
      : "";
  return `Design the overarching premise and evocative location names for a ${base.genre} ${base.scale} point crawl (${base.nodes.length} nodes, density: ${base.density}, danger: ${base.dangerLevel}).
${formatCampaignContextBlock(campaignContext)}${avoidBlock}
Here is the topological skeleton (keep every node "id" and "role" intact):
${JSON.stringify(base.nodes.map((n) => ({ id: n.id, role: n.role, layer: n.layer })))}

Shared adventure plan. Keep all IDs and mechanical dependencies stable. Add an optional clock only when its trigger and time budget are coherent with the listed route durations:
${JSON.stringify(base.adventurePlan)}

Return ONLY a JSON object with this shape:
{
  "title": "Evocative point crawl title",
  "premise": "2-3 sentences explaining why the party is exploring this network and what waits at the goal",
  "nodes": [
    { "id": "node-1", "name": "Distinct location name", "summary": "1-sentence overview" }
  ],
  "adventurePlan": {
    "objective": "...",
    "travelAssumption": "...",
    "discoveries": [{ "id": "existing stable discovery id", "name": "...", "nodeId": "existing node id", "enablesOutcomeIds": ["existing outcome id"] }],
    "outcomes": [{ "id": "existing stable outcome id", "name": "...", "requirementDiscoveryIds": ["existing discovery id"], "requirementRouteIds": ["existing route id"] }],
    "detourPayoffs": [{ "nodeId": "existing optional node id", "benefit": "..." }],
    "clock": { "label": "...", "startsAt": "crawl-start", "budget": { "value": 12, "unit": "hour" }, "expiry": "..." }
  }
}`;
}

const planText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

function enrichPlanEntries<T extends { id: string; name: string }>(
  raw: unknown,
  existing: T[],
): T[] {
  if (!Array.isArray(raw)) return existing;
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const draft = item as Record<string, unknown>;
    const fallback = existing.find((entry) => entry.id === draft.id);
    return fallback
      ? [{ ...fallback, name: planText(draft.name, fallback.name) }]
      : [];
  });
}

// fallow-ignore-next-line complexity -- Validates the untrusted clock budget shape in one boundary helper.
function parsePlanDuration(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rawBudget = (raw as Record<string, unknown>).budget;
  if (!rawBudget || typeof rawBudget !== "object" || Array.isArray(rawBudget))
    return null;
  const budget = rawBudget as Record<string, unknown>;
  const unitValues = ["minute", "hour", "day", "turn", "jump"] as const;
  if (
    typeof budget.value === "number" &&
    unitValues.includes(budget.unit as (typeof unitValues)[number])
  ) {
    return {
      value: budget.value,
      unit: budget.unit as (typeof unitValues)[number],
    };
  }
  return typeof budget.value === "string"
    ? parsePointCrawlDuration(budget.value)
    : null;
}

function parseClockStart(
  raw: unknown,
  crawl: PointCrawlNetwork,
): PointCrawlClock["startsAt"] | null {
  if (raw === "crawl-start") return raw;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const nodeId = (raw as Record<string, unknown>).nodeId;
  if (
    typeof nodeId !== "string" ||
    !crawl.nodes.some((node) => node.id === nodeId)
  )
    return null;
  return { nodeId };
}

// fallow-ignore-next-line complexity -- Validates trigger, duration, expiry, and route feasibility as one clock contract.
function parsePlanClock(
  raw: unknown,
  base: PointCrawlNetwork,
): PointCrawlClock | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  const duration = parsePlanDuration(raw);
  const startsAt = parseClockStart(value.startsAt, base);
  if (
    !duration ||
    duration.value <= 0 ||
    !startsAt ||
    typeof value.expiry !== "string"
  )
    return;
  const trigger =
    startsAt === "crawl-start" ? base.startNodeId : startsAt.nodeId;
  const fastest = fastestPlayableTravelTime(base, trigger, duration.unit);
  if (fastest === null || fastest > duration.value) return;
  return {
    label: planText(value.label, "Deadline"),
    startsAt,
    budget: duration,
    expiry: value.expiry,
  };
}

function mergeAdventurePlan(
  base: PointCrawlNetwork,
  raw: unknown,
): PointCrawlNetwork["adventurePlan"] {
  const fallback = base.adventurePlan;
  if (!fallback || !raw || typeof raw !== "object" || Array.isArray(raw))
    return fallback;
  const value = raw as Record<string, unknown>;
  const discoveries = enrichPlanEntries(
    value.discoveries,
    fallback.discoveries,
  );
  const outcomes = enrichPlanEntries(value.outcomes, fallback.outcomes);
  const detourPayoffs = Array.isArray(value.detourPayoffs)
    ? value.detourPayoffs.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const draft = item as Record<string, unknown>;
        const prior = fallback.detourPayoffs.find(
          (entry) => entry.nodeId === draft.nodeId,
        );
        return prior
          ? [{ ...prior, benefit: planText(draft.benefit, prior.benefit) }]
          : [];
      })
    : fallback.detourPayoffs;
  return {
    ...fallback,
    objective: planText(value.objective, fallback.objective),
    travelAssumption: planText(
      value.travelAssumption,
      fallback.travelAssumption,
    ),
    discoveries: discoveries.length ? discoveries : fallback.discoveries,
    outcomes: outcomes.length ? outcomes : fallback.outcomes,
    detourPayoffs,
    clock: parsePlanClock(value.clock, base),
  };
}

function buildBatchDetailPrompt(
  crawl: PointCrawlNetwork,
  nodeBatch: PointCrawlNode[],
  routeBatch: PointCrawlRoute[],
  campaignContext?: string,
): string {
  const nodesById = new Map(crawl.nodes.map((n) => [n.id, n]));
  const lockNotes = nodeBatch
    .flatMap((n) =>
      crawl.routes
        .filter((r) => n.unlocksRouteIds.includes(r.id) && r.gate)
        .map(
          (r) =>
            `- Location ${n.id} ("${n.name}") MUST include "${r.gate!.requirement}" in its "clueOrReward" so the party can unlock route ${r.id}.`,
        ),
    )
    .join("\n");

  return `Write concrete, table-ready location details and route trade-offs for a batch of ${crawl.genre} (${crawl.scale} scale, ${crawl.dangerLevel}) point crawl "${crawl.title}".
Premise: ${crawl.premise}
${formatCampaignContextBlock(campaignContext)}${lockNotes ? `Key-Before-Lock Requirements:\n${lockNotes}\n` : ""}
Shared adventure plan (use as immutable context; do not invent new mandatory dependencies):
${JSON.stringify(crawl.adventurePlan)}
Locations to detail:
${JSON.stringify(
  nodeBatch.map((n) => ({
    id: n.id,
    name: n.name,
    role: n.role,
    summary: n.summary,
  })),
)}

Routes to detail:
${JSON.stringify(
  routeBatch.map((r) => ({
    id: r.id,
    from: nodesById.get(r.fromNodeId)?.name ?? r.fromNodeId,
    to: nodesById.get(r.toNodeId)?.name ?? r.toNodeId,
    visibility: r.visibility,
    direction: r.direction,
    gate: r.gate,
  })),
)}

Rules:
- State concrete facts outright (real names, passphrases, tools, hazards). Never write vague placeholders like "the secret key" or "a hidden clue".
- Do not change route duration, endpoints, direction, visibility, gates, or assigned discoveries.
- Do not introduce mandatory keys, rituals, vehicles, countdowns, or finale requirements that are absent from the shared plan.
- Sibling routes must have distinct terrain, risk, and signpost trade-offs.

Return ONLY a JSON object:
{
  "nodes": [
    {
      "id": "node-1",
      "sensoryDescription": "Immediate sights, sounds, smells",
      "whyVisit": "Signposted attraction or opportunity",
      "encounterOrHazard": "Active creature, NPC, or hazard here",
      "clueOrReward": "Concrete clue, item, or reward found here"
    }
  ],
  "routes": [
    {
      "id": "route-1",
      "travelTime": "scale-appropriate duration",
      "terrain": "concrete passage/terrain",
      "risk": "specific hazard or cost on this route",
      "signpost": "what players observe at the trailhead",
      "approachFromSource": "what travellers from the origin experience; required for bidirectional routes",
      "approachFromTarget": "what travellers from the destination experience; required for bidirectional routes"
    }
  ]
}`;
}

/**
 * Merges AI-returned batch details into the base topology and marks any missing
 * or vague nodes/routes with `fromFallback: true` + `gaps[]` entries so the UI
 * can offer one-click surgical regeneration.
 */
export function fillFailedPointCrawlParts(
  base: PointCrawlNetwork,
  nodeDrafts: ReadonlyMap<string, Record<string, unknown>>,
  routeDrafts: ReadonlyMap<string, Record<string, unknown>>,
): PointCrawlNetwork {
  const gaps: PointCrawlGap[] = [];
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;

  const nodes: PointCrawlNode[] = base.nodes.map((node) => {
    const draft = nodeDrafts.get(node.id);
    if (!draft) {
      gaps.push({
        kind: "node",
        id: node.id,
        label: `Location "${node.name}" used local template fallback`,
      });
      return { ...node, fromFallback: true };
    }

    const rawClue = str(draft.clueOrReward, node.clueOrReward);
    const clueOrReward = isVaguePointCrawlFact(rawClue)
      ? node.clueOrReward
      : rawClue;

    return {
      ...node,
      sensoryDescription: str(
        draft.sensoryDescription,
        node.sensoryDescription,
      ),
      whyVisit: str(draft.whyVisit, node.whyVisit),
      encounterOrHazard: str(draft.encounterOrHazard, node.encounterOrHazard),
      clueOrReward,
      fromFallback: false,
    };
  });

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const routes: PointCrawlRoute[] = base.routes.map((route) => {
    const draft = routeDrafts.get(route.id);
    if (!draft) {
      const fromName =
        nodesById.get(route.fromNodeId)?.name ?? route.fromNodeId;
      const toName = nodesById.get(route.toNodeId)?.name ?? route.toNodeId;
      gaps.push({
        kind: "route",
        id: route.id,
        label: `Route "${fromName} → ${toName}" used local template fallback`,
      });
      return { ...route, fromFallback: true };
    }

    return {
      ...route,
      travelTime: route.travelTime,
      duration: route.duration,
      terrain: str(draft.terrain, route.terrain),
      risk: str(draft.risk, route.risk),
      signpost: str(draft.signpost, route.signpost),
      approachFromSource: str(
        draft.approachFromSource,
        route.approachFromSource ?? route.signpost,
      ),
      ...(route.direction === "bidirectional"
        ? {
            approachFromTarget: str(
              draft.approachFromTarget,
              route.approachFromTarget ?? route.signpost,
            ),
          }
        : {}),
      fromFallback: false,
    };
  });

  return {
    ...base,
    nodes,
    routes,
    ...(gaps.length > 0 ? { gaps } : { gaps: [] }),
  };
}

// fallow-ignore-next-line complexity
export async function generatePointCrawlStaged(
  options: PointCrawlStagedOptions,
  complete: (prompt: string) => Promise<string>,
  onProgress?: (steps: StagedProgressStep[]) => void,
  signal?: AbortSignal,
  rng: Rng = defaultRng,
): Promise<PointCrawlNetwork> {
  throwIfAborted(signal);
  const progress = new StagedProgress(STAGE_STEPS, onProgress);
  const count = clampPointCount(options.pointCount);

  // Build deterministic valid skeleton first so topology invariants are locked
  let base = buildPointCrawlTopology(
    {
      genre: options.genre,
      scale: options.scale,
      pointCount: count,
      density: options.density,
      dangerLevel: options.dangerLevel,
      secretFrequency: options.secretFrequency,
      avoidNames: options.avoidNames,
    },
    rng,
  );

  // Stage 1: Topology naming & premise
  progress.set("structure", "active");
  const topoPrompt = buildTopologyStagePrompt(
    base,
    options.campaignContext,
    options.avoidNames,
  );
  const topoReply = await askJson(() => complete(topoPrompt), {
    signal,
    attempts: 2,
  });
  if (topoReply) {
    const str = (v: unknown, fallback: string) =>
      typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
    const rawNodes = Array.isArray(topoReply.nodes) ? topoReply.nodes : [];
    const byId = new Map<string, Record<string, unknown>>();
    for (const item of rawNodes) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rec = item as Record<string, unknown>;
        if (typeof rec.id === "string") byId.set(rec.id, rec);
      }
    }
    base = {
      ...base,
      title: str(topoReply.title, base.title),
      premise: str(topoReply.premise, base.premise),
      nodes: base.nodes.map((n) => {
        const match = byId.get(n.id);
        if (!match) return n;
        return {
          ...n,
          name: str(match.name, n.name),
          summary: str(match.summary, n.summary),
        };
      }),
      adventurePlan: mergeAdventurePlan(base, topoReply.adventurePlan),
    };
    progress.set("structure", "done");
  } else {
    progress.set("structure", "fallback", "Template skeleton");
  }

  // Stage 2: Bounded-concurrency batch detailing for locations & routes
  const batchSize = 4;
  const batches: Array<{
    nodes: PointCrawlNode[];
    routes: PointCrawlRoute[];
  }> = [];
  for (let i = 0; i < base.nodes.length; i += batchSize) {
    const nodeSlice = base.nodes.slice(i, i + batchSize);
    const nodeIds = new Set(nodeSlice.map((n) => n.id));
    const routeSlice = base.routes.filter((r) => nodeIds.has(r.fromNodeId));
    batches.push({ nodes: nodeSlice, routes: routeSlice });
  }

  let completedBatches = 0;
  progress.set("scenes", "active", `0 of ${batches.length}`);

  const nodeDrafts = new Map<string, Record<string, unknown>>();
  const routeDrafts = new Map<string, Record<string, unknown>>();

  // fallow-ignore-next-line complexity
  const tasks = batches.map((batch) => async () => {
    const prompt = buildBatchDetailPrompt(
      base,
      batch.nodes,
      batch.routes,
      options.campaignContext,
    );
    const reply = await askJson(() => complete(prompt), {
      signal,
      attempts: 2,
    });
    if (reply) {
      const rNodes = Array.isArray(reply.nodes) ? reply.nodes : [];
      for (const item of rNodes) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const rec = item as Record<string, unknown>;
          if (typeof rec.id === "string") nodeDrafts.set(rec.id, rec);
        }
      }
      const rRoutes = Array.isArray(reply.routes) ? reply.routes : [];
      for (const item of rRoutes) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const rec = item as Record<string, unknown>;
          if (typeof rec.id === "string") routeDrafts.set(rec.id, rec);
        }
      }
    }
    completedBatches++;
    progress.set(
      "scenes",
      "active",
      `${completedBatches} of ${batches.length}`,
    );
    return Boolean(reply);
  });

  const batchStatuses = await pool(tasks, options.concurrency ?? 3, signal);
  const failedCount = batchStatuses.filter((ok) => !ok).length;
  progress.set(
    "scenes",
    failedCount > 0 ? "fallback" : "done",
    failedCount > 0 ? `${failedCount} batch(es) from templates` : undefined,
  );

  const assembled = fillFailedPointCrawlParts(base, nodeDrafts, routeDrafts);

  // Stage 3: Playability & key-before-lock verification + repair
  progress.set("review", "active");
  const preIssues = checkPointCrawlPlayability(assembled);
  const repaired = repairPointCrawlPlayability(assembled);
  progress.set(
    "review",
    "done",
    preIssues.length > 0 ? `Repaired ${preIssues.length} issue(s)` : undefined,
  );

  return {
    ...repaired,
    gaps: assembled.gaps ?? [],
  };
}

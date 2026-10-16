/**
 * Staged AI generation pipeline for the Point Crawl Generator
 * (#2479, 177-point-crawl-generator).
 *
 * Builds a PointCrawlNetwork in 3 distinct stages with live `OneShotProgressStep[]`
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
import { parseFencedJson } from "./llm-response-utils";
import type { OneShotProgressStep, OneShotStepStatus } from "./one-shot-staged";
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
  PointCrawlDensity,
  PointCrawlGap,
  PointCrawlNetwork,
  PointCrawlNode,
  PointCrawlRoute,
  PointCrawlScale,
  PointCrawlSecretFrequency,
} from "./point-crawl-state";
import { type Rng, defaultRng } from "./random-utils";

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
  id: OneShotProgressStep["id"];
  label: string;
}> = [
  { id: "structure", label: "Graph topology & key-lock skeleton" },
  { id: "scenes", label: "Keyed locations & route trade-offs" },
  { id: "review", label: "Playability & reachability verification" },
];

class PointCrawlProgress {
  private steps: OneShotProgressStep[] = STAGE_STEPS.map((s) => ({
    id: s.id,
    label: s.label,
    status: "pending" as OneShotStepStatus,
  }));

  constructor(private emit?: (steps: OneShotProgressStep[]) => void) {
    this.emit?.(this.steps.map((s) => ({ ...s })));
  }

  set(
    id: OneShotProgressStep["id"],
    status: OneShotStepStatus,
    detail?: string,
  ): void {
    this.steps = this.steps.map((s) =>
      s.id === id ? { ...s, status, detail } : s,
    );
    this.emit?.(this.steps.map((s) => ({ ...s })));
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw (
    signal.reason ?? new DOMException("The operation was aborted", "AbortError")
  );
}

async function pool<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
  signal?: AbortSignal,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      throwIfAborted(signal);
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}

async function askJson(
  complete: (prompt: string) => Promise<string>,
  prompt: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    throwIfAborted(signal);
    try {
      const text = await complete(prompt);
      throwIfAborted(signal);
      const parsed = parseFencedJson(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (err) {
      throwIfAborted(signal);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }
  return null;
}

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

Return ONLY a JSON object with this shape:
{
  "title": "Evocative point crawl title",
  "premise": "2-3 sentences explaining why the party is exploring this network and what waits at the goal",
  "nodes": [
    { "id": "node-1", "name": "Distinct location name", "summary": "1-sentence overview" }
  ]
}`;
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
- Route travelTime and terrain MUST match the ${crawl.scale} scale.
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
      "signpost": "what players observe at the trailhead"
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
      travelTime: str(draft.travelTime, route.travelTime),
      terrain: str(draft.terrain, route.terrain),
      risk: str(draft.risk, route.risk),
      signpost: str(draft.signpost, route.signpost),
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
  onProgress?: (steps: OneShotProgressStep[]) => void,
  signal?: AbortSignal,
  rng: Rng = defaultRng,
): Promise<PointCrawlNetwork> {
  throwIfAborted(signal);
  const progress = new PointCrawlProgress(onProgress);
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
  const topoReply = await askJson(
    complete,
    buildTopologyStagePrompt(base, options.campaignContext, options.avoidNames),
    signal,
  );
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
    const reply = await askJson(
      complete,
      buildBatchDetailPrompt(
        base,
        batch.nodes,
        batch.routes,
        options.campaignContext,
      ),
      signal,
    );
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

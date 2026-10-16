/**
 * Surgical single-node and single-route regeneration for the Point Crawl
 * Generator (#2479, 177-point-crawl-generator).
 *
 * Allows regenerating any individual `PointCrawlNode` or `PointCrawlRoute`
 * (locally or via AI with an optional steering instruction) while strictly
 * locking topology, route endpoints, and `unlocksRouteIds` key-before-lock
 * invariants.
 */

import { parseFencedJson } from "./llm-response-utils";
import {
  checkPointCrawlPlayability,
  isVaguePointCrawlFact,
} from "./point-crawl-playability";
import { getGateTemplates, getScaleVocabulary } from "./point-crawl-tables";
import { normalizePointCrawlTopology } from "./point-crawl-topology";
import type {
  PointCrawlNetwork,
  PointCrawlNode,
  PointCrawlRegenTarget,
  PointCrawlRoute,
} from "./point-crawl-state";
import { type Rng, defaultRng } from "./random-utils";

export interface RegeneratePointCrawlPartOptions {
  useAI?: boolean;
  instruction?: string;
  complete?: (prompt: string) => Promise<string>;
  signal?: AbortSignal;
  rng?: Rng;
}

export interface RegeneratePointCrawlPartResult {
  crawl: PointCrawlNetwork;
  warnings: string[];
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw (
    signal.reason ?? new DOMException("The operation was aborted", "AbortError")
  );
}

export function cleanString(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
}

export function commitNodeUpdate(
  crawl: PointCrawlNetwork,
  nodeId: string,
  updatedNode: PointCrawlNode,
  gateTemplates: ReturnType<typeof getGateTemplates>,
  vocab: ReturnType<typeof getScaleVocabulary>,
  rng: Rng,
): RegeneratePointCrawlPartResult {
  const nextCrawl = normalizePointCrawlTopology(
    {
      ...crawl,
      nodes: crawl.nodes.map((n) => (n.id === nodeId ? updatedNode : n)),
    },
    gateTemplates,
    vocab,
    rng,
  );
  const warnings = checkPointCrawlPlayability(nextCrawl).map((i) => i.message);
  return { crawl: { ...nextCrawl, warnings }, warnings };
}

export function commitRouteUpdate(
  crawl: PointCrawlNetwork,
  routeId: string,
  updatedRoute: PointCrawlRoute,
  gateTemplates: ReturnType<typeof getGateTemplates>,
  vocab: ReturnType<typeof getScaleVocabulary>,
  rng: Rng,
): RegeneratePointCrawlPartResult {
  const nextCrawl = normalizePointCrawlTopology(
    {
      ...crawl,
      routes: crawl.routes.map((r) => (r.id === routeId ? updatedRoute : r)),
    },
    gateTemplates,
    vocab,
    rng,
  );
  const warnings = checkPointCrawlPlayability(nextCrawl).map((i) => i.message);
  return { crawl: { ...nextCrawl, warnings }, warnings };
}

/**
 * Local deterministic regeneration of a single node or route using a fresh
 * index offset so the regenerated fields differ from the current ones.
 */
export function regeneratePointCrawlPartLocal(
  crawl: PointCrawlNetwork,
  target: PointCrawlRegenTarget,
  instruction = "",
  rng: Rng = defaultRng,
): RegeneratePointCrawlPartResult {
  const vocab = getScaleVocabulary(crawl.scale);
  const gateTemplates = getGateTemplates(crawl.genre);
  const hint = instruction.trim();

  if (target.kind === "node") {
    const idx = crawl.nodes.findIndex((n) => n.id === target.id);
    if (idx < 0) {
      return {
        crawl,
        warnings: [`Location "${target.id}" no longer exists in this crawl.`],
      };
    }
    const existing = crawl.nodes[idx];
    // Pick a different prefix than the current name
    const candidates = vocab.nodePrefixes.filter((p) => p !== existing.name);
    const pool = candidates.length > 0 ? candidates : vocab.nodePrefixes;
    const pickIdx =
      (idx + 3 + Math.floor(rng() * Math.max(1, pool.length - 1))) %
      pool.length;
    const newName = pool[pickIdx];
    const riskPick =
      vocab.risks[
        (idx + 2 + Math.floor(rng() * vocab.risks.length)) % vocab.risks.length
      ];
    const signpostPick =
      vocab.signposts[
        (idx + 3 + Math.floor(rng() * vocab.signposts.length)) %
          vocab.signposts.length
      ];

    // Preserve any required gate unlock references in clueOrReward
    const unlockedRequirements = crawl.routes
      .filter((r) => existing.unlocksRouteIds.includes(r.id) && r.gate)
      .map((r) => r.gate!.requirement);
    const unlockClause =
      unlockedRequirements.length > 0
        ? ` Holds ${unlockedRequirements.join(" and ")}.`
        : "";
    const instructionClause = hint ? ` (${hint})` : "";

    const updatedNode: PointCrawlNode = {
      ...existing,
      name: newName,
      summary: `A ${existing.role} site at ${newName} within the ${crawl.scale.toLowerCase()} network${instructionClause}.`,
      sensoryDescription: `${signpostPick}; weathered surfaces and tense silence around ${newName}.`,
      whyVisit:
        existing.role === "goal"
          ? `The primary objective of the crawl is secured inside ${newName}.`
          : `Provides a strategic vantage point and bypasses hazards along the main ${crawl.scale.toLowerCase()} approach.`,
      encounterOrHazard: `${riskPick}${instructionClause}.`,
      clueOrReward: `Reveals a survey cache and route markers for adjacent passages.${unlockClause}`,
      fromFallback: false,
    };

    return commitNodeUpdate(
      crawl,
      existing.id,
      updatedNode,
      gateTemplates,
      vocab,
      rng,
    );
  }

  // Route regeneration
  const rIdx = crawl.routes.findIndex((r) => r.id === target.id);
  if (rIdx < 0) {
    return {
      crawl,
      warnings: [`Route "${target.id}" no longer exists in this crawl.`],
    };
  }
  const existingRoute = crawl.routes[rIdx];
  const terrainPool = vocab.terrains.filter((t) => t !== existingRoute.terrain);
  const tCandidates = terrainPool.length > 0 ? terrainPool : vocab.terrains;
  const newTerrain =
    tCandidates[
      (rIdx + 2 + Math.floor(rng() * tCandidates.length)) % tCandidates.length
    ];
  const newTime =
    vocab.travelTimes[
      (rIdx + 1 + Math.floor(rng() * vocab.travelTimes.length)) %
        vocab.travelTimes.length
    ];
  const newRisk =
    vocab.risks[
      (rIdx + 3 + Math.floor(rng() * vocab.risks.length)) % vocab.risks.length
    ];
  const newSignpost =
    vocab.signposts[
      (rIdx + 2 + Math.floor(rng() * vocab.signposts.length)) %
        vocab.signposts.length
    ];
  const instructionSuffix = hint ? ` (${hint})` : "";

  const updatedRoute: PointCrawlRoute = {
    ...existingRoute,
    travelTime: newTime,
    terrain: newTerrain,
    risk: `${newRisk}${instructionSuffix}`,
    signpost: newSignpost,
    fromFallback: false,
  };

  return commitRouteUpdate(
    crawl,
    existingRoute.id,
    updatedRoute,
    gateTemplates,
    vocab,
    rng,
  );
}

export function buildPointCrawlRegenPrompt(
  crawl: PointCrawlNetwork,
  target: PointCrawlRegenTarget,
  instruction = "",
): string {
  const hint = instruction.trim().slice(0, 500);
  if (target.kind === "node") {
    const node = crawl.nodes.find((n) => n.id === target.id);
    const unlockedRoutes = crawl.routes.filter(
      (r) => node?.unlocksRouteIds.includes(r.id) && r.gate,
    );
    const lockNote =
      unlockedRoutes.length > 0
        ? `CRITICAL: This location MUST still provide: ${unlockedRoutes.map((r) => r.gate!.requirement).join(", ")}. Mention it explicitly in "clueOrReward".`
        : "";
    return `Rewrite ONLY location "${node?.name ?? target.id}" (${target.id}, role: ${node?.role}) in the ${crawl.genre} ${crawl.scale} point crawl "${crawl.title}".
Premise: ${crawl.premise}
Current node JSON: ${JSON.stringify(node)}
${lockNote}
${hint ? `GM steering instruction: ${hint}\n` : ""}Return ONLY a JSON object with concrete, table-ready fields:
{
  "name": "Evocative concrete location name",
  "summary": "One-sentence overview",
  "sensoryDescription": "Immediate sights, sounds, smells",
  "whyVisit": "Clear reason or attraction for players",
  "encounterOrHazard": "Active obstacle, NPC, or threat here",
  "clueOrReward": "Concrete clue, item, or reward found here"
}`;
  }

  const route = crawl.routes.find((r) => r.id === target.id);
  const fromNode = crawl.nodes.find((n) => n.id === route?.fromNodeId);
  const toNode = crawl.nodes.find((n) => n.id === route?.toNodeId);
  return `Rewrite ONLY route "${target.id}" connecting "${fromNode?.name ?? route?.fromNodeId}" to "${toNode?.name ?? route?.toNodeId}" in the ${crawl.genre} ${crawl.scale} point crawl "${crawl.title}".
Current route JSON: ${JSON.stringify(route)}
${hint ? `GM steering instruction: ${hint}\n` : ""}Keep the endpoints, direction, visibility, and gate lock structure intact. Return ONLY a JSON object with scale-matched (${crawl.scale}), concrete fields:
{
  "travelTime": "e.g. 20 min / 2 hrs / 1 day",
  "terrain": "Concrete passage or terrain type",
  "risk": "Active hazard, patrol, or cost along this route",
  "signpost": "Observable clue or trailhead sign"
}`;
}

// fallow-ignore-next-line complexity
export async function regeneratePointCrawlPart(
  crawl: PointCrawlNetwork,
  target: PointCrawlRegenTarget,
  options: RegeneratePointCrawlPartOptions = {},
): Promise<RegeneratePointCrawlPartResult> {
  const rng = options.rng ?? defaultRng;
  const instruction = options.instruction?.trim() ?? "";
  throwIfAborted(options.signal);

  if (!options.useAI || !options.complete) {
    return regeneratePointCrawlPartLocal(crawl, target, instruction, rng);
  }

  try {
    const prompt = buildPointCrawlRegenPrompt(crawl, target, instruction);
    const rawText = await options.complete(prompt);
    throwIfAborted(options.signal);
    const parsed = parseFencedJson(rawText) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return regeneratePointCrawlPartLocal(crawl, target, instruction, rng);
    }

    const vocab = getScaleVocabulary(crawl.scale);
    const gateTemplates = getGateTemplates(crawl.genre);

    if (target.kind === "node") {
      const existing = crawl.nodes.find((n) => n.id === target.id);
      if (!existing) {
        return {
          crawl,
          warnings: [`Location "${target.id}" no longer exists.`],
        };
      }

      let clueOrReward = cleanString(
        parsed.clueOrReward,
        existing.clueOrReward,
      );
      if (isVaguePointCrawlFact(clueOrReward)) {
        clueOrReward = existing.clueOrReward;
      }

      const updatedNode: PointCrawlNode = {
        ...existing,
        name: cleanString(parsed.name, existing.name),
        summary: cleanString(parsed.summary, existing.summary),
        sensoryDescription: cleanString(
          parsed.sensoryDescription,
          existing.sensoryDescription,
        ),
        whyVisit: cleanString(parsed.whyVisit, existing.whyVisit),
        encounterOrHazard: cleanString(
          parsed.encounterOrHazard,
          existing.encounterOrHazard,
        ),
        clueOrReward,
        fromFallback: false,
      };

      return commitNodeUpdate(
        crawl,
        existing.id,
        updatedNode,
        gateTemplates,
        vocab,
        rng,
      );
    }

    const existingRoute = crawl.routes.find((r) => r.id === target.id);
    if (!existingRoute) {
      return {
        crawl,
        warnings: [`Route "${target.id}" no longer exists.`],
      };
    }

    const updatedRoute: PointCrawlRoute = {
      ...existingRoute,
      travelTime: cleanString(parsed.travelTime, existingRoute.travelTime),
      terrain: cleanString(parsed.terrain, existingRoute.terrain),
      risk: cleanString(parsed.risk, existingRoute.risk),
      signpost: cleanString(parsed.signpost, existingRoute.signpost),
      fromFallback: false,
    };

    return commitRouteUpdate(
      crawl,
      existingRoute.id,
      updatedRoute,
      gateTemplates,
      vocab,
      rng,
    );
  } catch (err) {
    throwIfAborted(options.signal);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    return regeneratePointCrawlPartLocal(crawl, target, instruction, rng);
  }
}

/**
 * Public Point Crawl Generator (#2479, 177-point-crawl-generator) — framework-free.
 *
 * Builds an interconnected, non-linear point crawl network (6–15 locations) with
 * branching routes, loops, secret/rumoured shortcuts, and key-before-lock gates.
 */

import { formatCampaignContextBlock } from "./campaign-context";
import { parseFencedJson } from "./llm-response-utils";
import type { StagedProgressStep } from "./staged-progress";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { repairPointCrawlPlayability } from "./point-crawl-playability";
import {
  POINT_CRAWL_DANGER_LEVELS,
  POINT_CRAWL_DENSITIES,
  POINT_CRAWL_SCALES,
  POINT_CRAWL_SECRET_FREQUENCIES,
  renderPointCrawlGmSheet,
  renderPointCrawlMarkdown,
  type PointCrawlDangerLevel,
  type PointCrawlDensity,
  type PointCrawlNetwork,
  type PointCrawlNode,
  type PointCrawlRoute,
  type PointCrawlScale,
  type PointCrawlSecretFrequency,
} from "./point-crawl-state";
import {
  buildPointCrawlTopology,
  clampPointCount,
} from "./point-crawl-topology";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import { withPublicCreativeCue } from "./public-creative-diversity";

export const pointCrawlConfig = {
  genres: [
    "Classic Fantasy",
    "Dark Fantasy",
    "Sci-Fi / Space Opera",
    "Cosmic Horror",
    "Cyberpunk / Corporate",
    "Post-Apocalyptic",
    "Weird West / Frontier",
    "Swashbuckling / Nautical",
  ],
  scales: [...POINT_CRAWL_SCALES],
  pointCounts: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  densities: [...POINT_CRAWL_DENSITIES],
  dangerLevels: [...POINT_CRAWL_DANGER_LEVELS],
  secretFrequencies: [...POINT_CRAWL_SECRET_FREQUENCIES],
};

export interface PointCrawlGeneratorOptions {
  genre?: string;
  scale?: PointCrawlScale;
  pointCount?: number;
  density?: PointCrawlDensity;
  dangerLevel?: PointCrawlDangerLevel;
  secretFrequency?: PointCrawlSecretFrequency;
  campaignContext?: string;
  instruction?: string;
  useAI?: boolean;
  avoidNames?: string[];
  onProgress?: (steps: StagedProgressStep[]) => void;
  signal?: AbortSignal;
}

export interface ResolvedPointCrawl {
  genre: string;
  scale: PointCrawlScale;
  pointCount: number;
  density: PointCrawlDensity;
  dangerLevel: PointCrawlDangerLevel;
  secretFrequency: PointCrawlSecretFrequency;
  campaignContext?: string;
  instruction?: string;
  avoidNames?: string[];
}

export interface PointCrawlPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedPointCrawl;
}

export function resolvePointCrawl(
  options: PointCrawlGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedPointCrawl {
  return {
    genre: options.genre?.trim() || pickFrom(pointCrawlConfig.genres, rng),
    scale: options.scale?.trim() || "Wilderness",
    pointCount: clampPointCount(options.pointCount),
    density: options.density?.trim() || "Balanced branching",
    dangerLevel: options.dangerLevel?.trim() || "Moderate / Hazardous",
    secretFrequency:
      options.secretFrequency?.trim() || "Standard (1-2 secret routes)",
    campaignContext: options.campaignContext?.trim() || undefined,
    instruction: options.instruction?.trim() || undefined,
    avoidNames: options.avoidNames,
  };
}

export function pointCrawlToOutput(
  crawl: PointCrawlNetwork,
): PublicGeneratorOutput {
  return {
    type: "note",
    kind: "point-crawl",
    title: crawl.title,
    summary: crawl.premise,
    content: renderPointCrawlMarkdown(crawl),
    lore: renderPointCrawlGmSheet(crawl),
    labels: [
      "point-crawl",
      "point-crawl-generator",
      crawl.scale.toLowerCase().replace(/\s+/g, "-"),
      "imported-draft",
    ],
    status: "active",
    pointCrawl: crawl,
  };
}

export function generatePointCrawlNetworkLocal(
  options: PointCrawlGeneratorOptions = {},
  rng: Rng = defaultRng,
): PointCrawlNetwork {
  const resolved = resolvePointCrawl(options, rng);
  const raw = buildPointCrawlTopology(
    {
      genre: resolved.genre,
      scale: resolved.scale,
      pointCount: resolved.pointCount,
      density: resolved.density,
      dangerLevel: resolved.dangerLevel,
      secretFrequency: resolved.secretFrequency,
      avoidNames: resolved.avoidNames,
    },
    rng,
  );
  return repairPointCrawlPlayability(raw);
}

export function generatePointCrawlLocal(
  options: PointCrawlGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  return pointCrawlToOutput(generatePointCrawlNetworkLocal(options, rng));
}

export function buildPointCrawlPrompt(
  options: PointCrawlGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): PointCrawlPrompt {
  const resolved = resolvePointCrawl(options, rng);
  const skeleton = generatePointCrawlNetworkLocal(resolved, rng);

  const userMessage = `Generate a playable, interconnected RPG Point Crawl network as JSON.

Options:
- Genre: ${resolved.genre}
- Scale: ${resolved.scale}
- Number of Locations: ${resolved.pointCount}
- Route Interconnection: ${resolved.density}
- Danger Level: ${resolved.dangerLevel}
- Secret Route Frequency: ${resolved.secretFrequency}
${resolved.instruction ? `- Steering Instruction: ${resolved.instruction}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}${sessionContext}

Topological Skeleton (keep these node IDs, layers, roles, and route endpoints so all loops and key-before-lock paths hold):
- Nodes: ${JSON.stringify(skeleton.nodes.map((n) => ({ id: n.id, role: n.role, layer: n.layer, rail: n.rail, unlocksRouteIds: n.unlocksRouteIds })))}
- Routes: ${JSON.stringify(skeleton.routes.map((r) => ({ id: r.id, fromNodeId: r.fromNodeId, toNodeId: r.toNodeId, direction: r.direction, visibility: r.visibility, gate: r.gate, isLoopOrShortcut: r.isLoopOrShortcut })))}

Rules:
1. Every node needs a concrete "name", 1-sentence "summary", "sensoryDescription", "whyVisit", "encounterOrHazard", and "clueOrReward".
2. Route duration, endpoints, direction, visibility, and gates are mechanical and MUST remain exactly as supplied. Enrich terrain, risk, signpost, and directional approach prose only.
3. For any route with a "gate", state the concrete key, passphrase, tool, or clearance in "gate.requirement" AND explicitly mention that item/clue in the "clueOrReward" of the node at "gate.unlockedByNodeId". Never use vague placeholders like "the secret key".

Return ONLY a JSON object with this exact shape:
{
  "title": "...",
  "premise": "...",
  "nodes": [
    {
      "id": "node-1",
      "name": "...",
      "role": "start",
      "layer": 0,
      "rail": 0,
      "summary": "...",
      "sensoryDescription": "...",
      "whyVisit": "...",
      "encounterOrHazard": "...",
      "clueOrReward": "...",
      "unlocksRouteIds": []
    }
  ],
  "routes": [
    {
      "id": "route-1",
      "fromNodeId": "node-1",
      "toNodeId": "node-2",
      "direction": "bidirectional",
      "visibility": "obvious",
      "terrain": "...",
      "risk": "...",
      "signpost": "...",
      "gate": { "kind": "key", "unlockedByNodeId": "node-2", "requirement": "..." }
    }
  ]
}`;

  return {
    systemInstruction:
      "You are an expert tabletop RPG adventure designer creating concrete, interconnected point crawl networks in JSON format.",
    userMessage: withPublicCreativeCue(userMessage, "landscape", rng),
    resolved,
  };
}

export function parsePointCrawlNetwork(
  text: string,
  resolved: ResolvedPointCrawl,
  rng: Rng = defaultRng,
): PointCrawlNetwork {
  const data = parseFencedJson(text) as Record<string, unknown>;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Point crawl response is not a JSON object.");
  }

  const base = generatePointCrawlNetworkLocal(resolved, rng);
  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;

  const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
  const rawRoutes = Array.isArray(data.routes) ? data.routes : [];
  if (rawNodes.length === 0) {
    throw new Error("Point crawl response contained no nodes.");
  }

  const nodes: PointCrawlNode[] = base.nodes.map((fallbackNode, idx) => {
    const raw =
      (rawNodes.find(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>).id === fallbackNode.id,
      ) as Record<string, unknown> | undefined) ??
      (rawNodes[idx] as Record<string, unknown> | undefined);

    if (!raw || typeof raw !== "object") return fallbackNode;
    return {
      id: fallbackNode.id,
      name: str(raw.name, fallbackNode.name),
      // Node roles are fixed by the mechanical topology; AI only enriches prose.
      role: fallbackNode.role,
      structuralRole: fallbackNode.structuralRole,
      traits: fallbackNode.traits,
      layer: fallbackNode.layer,
      rail: fallbackNode.rail,
      summary: str(raw.summary, fallbackNode.summary),
      sensoryDescription: str(
        raw.sensoryDescription,
        fallbackNode.sensoryDescription,
      ),
      whyVisit: str(raw.whyVisit, fallbackNode.whyVisit),
      encounterOrHazard: str(
        raw.encounterOrHazard,
        fallbackNode.encounterOrHazard,
      ),
      clueOrReward: str(raw.clueOrReward, fallbackNode.clueOrReward),
      unlocksRouteIds: fallbackNode.unlocksRouteIds,
    };
  });

  const routes: PointCrawlRoute[] = base.routes.map((fb, idx) => {
    const raw =
      rawRoutes.find(
        (item) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          (item as Record<string, unknown>).id === fb.id,
      ) ?? rawRoutes[idx];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fb;
    const details = raw as Record<string, unknown>;
    return {
      ...fb,
      terrain: str(details.terrain, fb.terrain),
      risk: str(details.risk, fb.risk),
      signpost: str(details.signpost, fb.signpost),
      approachFromSource: str(
        details.approachFromSource,
        fb.approachFromSource ?? fb.signpost,
      ),
      ...(fb.direction === "bidirectional"
        ? {
            approachFromTarget: str(
              details.approachFromTarget,
              fb.approachFromTarget ?? fb.signpost,
            ),
          }
        : {}),
    };
  });

  const candidate: PointCrawlNetwork = {
    ...base,
    title: str(data.title, base.title),
    premise: str(data.premise, base.premise),
    nodes,
    routes,
  };

  return repairPointCrawlPlayability(candidate);
}

export function parsePointCrawlResponse(
  text: string,
  resolved: ResolvedPointCrawl,
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  return pointCrawlToOutput(parsePointCrawlNetwork(text, resolved, rng));
}

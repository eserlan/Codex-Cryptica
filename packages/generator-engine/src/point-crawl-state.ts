/**
 * Structured state, formatting, and deterministic markdown rendering for the
 * Point Crawl Generator (#2479, 177-point-crawl-generator).
 *
 * Topology, node roles, route mechanics, and key-before-lock dependencies are
 * stored as structured data first. Both the graph connection labels and the
 * playable markdown prose are derived deterministically from this data so the
 * visual graph and text never contradict each other.
 */

export const POINT_CRAWL_SCALES = [
  "Dungeon",
  "Settlement",
  "City",
  "Wilderness",
  "Region",
  "Planet / System",
] as const;

export type PointCrawlScale = (typeof POINT_CRAWL_SCALES)[number] | string;

export const POINT_CRAWL_DENSITIES = [
  "Linear-leaning",
  "Balanced branching",
  "Highly interconnected",
] as const;

export type PointCrawlDensity = (typeof POINT_CRAWL_DENSITIES)[number] | string;

export const POINT_CRAWL_DANGER_LEVELS = [
  "Low / Exploratory",
  "Moderate / Hazardous",
  "High / Deadly",
  "Lethal / Survival",
] as const;

export type PointCrawlDangerLevel =
  (typeof POINT_CRAWL_DANGER_LEVELS)[number] | string;

export const POINT_CRAWL_SECRET_FREQUENCIES = [
  "Rare (1 secret route)",
  "Standard (1-2 secret routes)",
  "Frequent (3+ secret routes)",
] as const;

export type PointCrawlSecretFrequency =
  (typeof POINT_CRAWL_SECRET_FREQUENCIES)[number] | string;

export const POINT_CRAWL_NODE_ROLES = [
  "start",
  "hub",
  "hazard",
  "obstacle",
  "secret",
  "side",
  "goal",
] as const;

export type PointCrawlNodeRole = (typeof POINT_CRAWL_NODE_ROLES)[number];

export type PointCrawlStructuralRole =
  "start" | "goal" | "hub" | "chokepoint" | "secret" | "optional" | "connector";

export type PointCrawlSiteTrait = "hazard" | "obstacle";

export const POINT_CRAWL_ROUTE_VISIBILITIES = [
  "obvious",
  "hidden",
  "rumoured",
] as const;

export type PointCrawlRouteVisibility =
  (typeof POINT_CRAWL_ROUTE_VISIBILITIES)[number];

export const POINT_CRAWL_ROUTE_DIRECTIONS = [
  "bidirectional",
  "one-way",
] as const;

export type PointCrawlRouteDirection =
  (typeof POINT_CRAWL_ROUTE_DIRECTIONS)[number];

export const POINT_CRAWL_GATE_KINDS = [
  "key",
  "clue",
  "tool",
  "guide",
  "clearance",
] as const;

export type PointCrawlGateKind = (typeof POINT_CRAWL_GATE_KINDS)[number];

export interface PointCrawlGate {
  kind: PointCrawlGateKind;
  /** Must reference a PointCrawlNode.id reachable from Start without traversing this route. */
  unlockedByNodeId: string;
  /** Concrete name of the item, passphrase, tool, or NPC clearance (validated by !isVague). */
  requirement: string;
}

export type PointCrawlDurationUnit =
  "minute" | "hour" | "day" | "turn" | "jump";

export interface PointCrawlDuration {
  value: number;
  unit: PointCrawlDurationUnit;
}

export interface PointCrawlClock {
  label: string;
  startsAt: "crawl-start" | { nodeId: string };
  budget: PointCrawlDuration;
  expiry: string;
}

export interface PointCrawlDiscovery {
  id: string;
  name: string;
  nodeId: string;
  enablesOutcomeIds: string[];
}

export interface PointCrawlOutcome {
  id: string;
  name: string;
  requirementDiscoveryIds: string[];
  requirementRouteIds: string[];
}

export interface PointCrawlDetourPayoff {
  nodeId: string;
  benefit: string;
}

export interface PointCrawlAdventurePlan {
  objective: string;
  travelAssumption: string;
  discoveries: PointCrawlDiscovery[];
  outcomes: PointCrawlOutcome[];
  detourPayoffs: PointCrawlDetourPayoff[];
  clock?: PointCrawlClock;
}

export interface PointCrawlNode {
  /** Stable identifier within the crawl, e.g. "node-1" .. "node-15". */
  id: string;
  /** Evocative, concrete location title. */
  name: string;
  /** Structural role in the point crawl topology. */
  role: PointCrawlNodeRole;
  /** Derived from the final graph and used for structural badges. */
  structuralRole?: PointCrawlStructuralRole;
  /** Fictional site qualities, independent of graph structure. */
  // fallow-ignore-next-line code-duplication -- This interface intentionally mirrors the public API contract in specs/177-point-crawl-generator.
  traits?: PointCrawlSiteTrait[];
  /** Depth layer from start (0 = start), used for deterministic topological layout. */
  layer: number;
  /** Vertical rail index within its layer (-1, 0, +1, etc.) for initial SVG layout. */
  rail: number;
  /** One-sentence overview of the location. */
  summary: string;
  /** Immediate sights, sounds, smells, and atmosphere on arrival. */
  sensoryDescription: string;
  /** Signposted attraction, rumour, or opportunity that makes players want to visit. */
  whyVisit: string;
  /** Active creature, NPC, environmental hazard, or complication at this point. */
  encounterOrHazard: string;
  /** Clue, resource, treasure, or unlocking key/leverage found here. */
  clueOrReward: string;
  /** IDs of gated routes whose unlocking key/clue/leverage is placed at this node. */
  unlocksRouteIds: string[];
  /** True when this node fell back to local templates during a partial AI failure. */
  fromFallback?: boolean;
}

export interface PointCrawlRoute {
  /** Stable route identifier, e.g. "route-1". */
  id: string;
  /** Origin node ID. */
  fromNodeId: string;
  /** Destination node ID. */
  toNodeId: string;
  /** Whether travel works both ways or only from -> to. */
  direction: PointCrawlRouteDirection;
  /** Whether the route is immediately visible, hidden until searched/clued, or rumoured. */
  visibility: PointCrawlRouteVisibility;
  /** Scale-appropriate travel duration or distance (e.g. "20 min", "2 hrs", "2 days"). */
  travelTime: string;
  /** Mechanical duration; `travelTime` remains its display label. */
  duration?: PointCrawlDuration;
  /** Concrete passage or terrain type (e.g. "Sunken causeway", "Maintenance duct"). */
  terrain: string;
  /** Hazard, patrol, toll, or resource cost risked along this route. */
  risk: string;
  /** What players can observe at the trailhead or discover along the way. */
  signpost: string;
  approachFromSource?: string;
  approachFromTarget?: string;
  /** Optional lock/blocker requiring leverage from an earlier reachable node. */
  gate?: PointCrawlGate;
  /** True when this route is a loop or shortcut edge. */
  isLoopOrShortcut?: boolean;
  /** True when this route fell back to local templates during a partial AI failure. */
  fromFallback?: boolean;
}

export interface PointCrawlGap {
  kind: "node" | "route";
  id: string;
  label: string;
}

export type PointCrawlRegenTarget =
  { kind: "node"; id: string } | { kind: "route"; id: string };

export interface PointCrawlNetwork {
  title: string;
  premise: string;
  genre: string;
  scale: PointCrawlScale;
  pointCount: number;
  density: PointCrawlDensity;
  dangerLevel: PointCrawlDangerLevel;
  secretFrequency: PointCrawlSecretFrequency;
  startNodeId: string;
  goalNodeIds: string[];
  nodes: PointCrawlNode[];
  routes: PointCrawlRoute[];
  adventurePlan?: PointCrawlAdventurePlan;
  /** Playability & structural warnings (empty when all checks pass or are auto-repaired). */
  warnings: string[];
  /** Parts that used local template fallback during staged AI generation. */
  gaps?: PointCrawlGap[];
}

export const ROLE_LABELS: Record<PointCrawlNodeRole, string> = {
  start: "Start Point",
  hub: "Junction Hub",
  hazard: "Hazard Site",
  obstacle: "Obstacle",
  secret: "Secret Site",
  side: "Side Landmark",
  goal: "Destination / Goal",
};

export const STRUCTURAL_ROLE_LABELS: Record<PointCrawlStructuralRole, string> =
  {
    start: "Start Point",
    goal: "Destination / Goal",
    hub: "Junction Hub",
    chokepoint: "Chokepoint",
    secret: "Secret Site",
    optional: "Optional Site",
    connector: "Connector",
  };

const ROLE_SYMBOLS: Record<
  PointCrawlNodeRole | PointCrawlStructuralRole,
  string
> = {
  start: "◎",
  goal: "★",
  hub: "✣",
  chokepoint: "◆",
  secret: "◇",
  optional: "○",
  connector: "●",
  hazard: "▲",
  obstacle: "◆",
  side: "○",
};

/** Symbol supplements, rather than replaces, the point's role label. */
export function pointCrawlNodeRoleSymbol(
  node: Pick<PointCrawlNode, "role" | "structuralRole">,
): string {
  return ROLE_SYMBOLS[node.structuralRole ?? node.role] ?? "●";
}

export function pointCrawlRouteSymbol(
  direction: PointCrawlRouteDirection,
): string {
  return direction === "one-way" ? "→" : "⇄";
}

export function pointCrawlNodeRoleLabel(node: PointCrawlNode): string {
  return node.structuralRole
    ? STRUCTURAL_ROLE_LABELS[node.structuralRole]
    : (ROLE_LABELS[node.role] ?? node.role);
}

/**
 * Formats a concise connection label for entity relationship edges in the vault
 * and graph badges, e.g. `"2 hrs · Mountain Pass [Locked: Iron Seal]"` or
 * `"20 min · Flooded Culvert [Hidden, One-Way]"`.
 */
export function formatRouteConnectionLabel(route: PointCrawlRoute): string {
  const tags: string[] = [];
  if (route.visibility === "hidden") tags.push("Hidden");
  else if (route.visibility === "rumoured") tags.push("Rumoured");
  if (route.direction === "one-way") tags.push("One-Way");
  if (route.gate) {
    tags.push(`Locked: ${route.gate.requirement}`);
  }
  const tagSuffix = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
  return `${route.travelTime} · ${route.terrain}${tagSuffix}`;
}

/** Render a route as a table-ready Markdown section from its structured fields. */
export function renderPointCrawlRouteSummary(
  route: PointCrawlRoute,
  nodesById: ReadonlyMap<string, PointCrawlNode>,
  fromNodeId?: string,
): string {
  const fromName = nodesById.get(route.fromNodeId)?.name ?? route.fromNodeId;
  const toName = nodesById.get(route.toNodeId)?.name ?? route.toNodeId;
  const arrow = pointCrawlRouteSymbol(route.direction);
  const visibilityNote =
    route.visibility === "obvious" ? "" : ` (${route.visibility} route)`;
  const reverse = fromNodeId === route.toNodeId;
  const originName = reverse ? toName : fromName;
  const approach = reverse
    ? route.approachFromTarget
    : route.approachFromSource;
  const lines = [
    `### ${fromName} ${arrow} ${toName}${visibilityNote}`,
    "",
    `**Travel:** ${route.travelTime}  `,
    `**Terrain:** ${route.terrain}`,
    "",
    `**Signpost from ${originName}:** ${approach ?? route.signpost}`,
    "",
    `**Risk:** ${route.risk}`,
  ];
  if (
    fromNodeId === undefined &&
    route.direction === "bidirectional" &&
    route.approachFromTarget
  ) {
    lines.push("", `**Approach from ${toName}:** ${route.approachFromTarget}`);
  }
  if (route.gate) {
    const gateNodeName =
      nodesById.get(route.gate.unlockedByNodeId)?.name ??
      route.gate.unlockedByNodeId;
    lines.push(
      "",
      `**Locked (${route.gate.kind}):** requires ${route.gate.requirement} (found at **${gateNodeName}**).`,
    );
  }
  return lines.join("\n");
}

function renderPointCrawlLocations(crawl: PointCrawlNetwork): string[] {
  return crawl.nodes.flatMap((node, idx) => {
    const roleLabel = pointCrawlNodeRoleLabel(node);
    return [
      `### ${idx + 1}. ${node.name} (${pointCrawlNodeRoleSymbol(node)} ${roleLabel})`,
      node.summary,
      "",
      `- **Sights & Atmosphere:** ${node.sensoryDescription}`,
      `- **Why Visit:** ${node.whyVisit}`,
      `- **Encounter / Complication:** ${node.encounterOrHazard}`,
      `- **Clue / Reward:** ${node.clueOrReward}`,
      "",
    ];
  });
}

function renderPointCrawlRoutes(
  crawl: PointCrawlNetwork,
  nodesById: ReadonlyMap<string, PointCrawlNode>,
): string[] {
  return crawl.routes.flatMap((route) => [
    "",
    renderPointCrawlRouteSummary(route, nodesById),
  ]);
}

function renderPointCrawlClock(
  crawl: PointCrawlNetwork,
  nodesById: ReadonlyMap<string, PointCrawlNode>,
): string[] {
  const clock = crawl.adventurePlan?.clock;
  if (!clock) return [];
  const start =
    clock.startsAt === "crawl-start"
      ? "when the crawl begins"
      : `at ${nodesById.get(clock.startsAt.nodeId)?.name ?? clock.startsAt.nodeId}`;
  const plural = clock.budget.value === 1 ? "" : "s";
  return [
    `- **Clock**: ${clock.label} starts ${start}; ${clock.budget.value} ${clock.budget.unit}${plural}. Expiry: ${clock.expiry}`,
  ];
}

/**
 * Renders the player/table-facing markdown (`content`) for a Point Crawl Network.
 */
export function renderPointCrawlMarkdown(crawl: PointCrawlNetwork): string {
  const nodesById = new Map(crawl.nodes.map((n) => [n.id, n]));
  const startNode = nodesById.get(crawl.startNodeId) ?? crawl.nodes[0];
  const goalNames = crawl.goalNodeIds
    .map((id) => nodesById.get(id)?.name)
    .filter((name): name is string => Boolean(name));

  const lines: string[] = [
    "## Crawl Premise & Entry",
    crawl.premise,
    "",
    `- **Scale**: ${crawl.scale} (${crawl.pointCount} locations, ${crawl.routes.length} routes)`,
    `- **Interconnection**: ${crawl.density} · **Danger**: ${crawl.dangerLevel}`,
    `- **Starting Point**: **${startNode?.name ?? "Point 1"}**`,
    `- **Primary Goal${goalNames.length > 1 ? "s" : ""}**: ${goalNames.map((n) => `**${n}**`).join(", ") || "None"}`,
    ...(crawl.adventurePlan?.objective
      ? [`- **Objective**: ${crawl.adventurePlan.objective}`]
      : []),
    ...renderPointCrawlClock(crawl, nodesById),
    "",
    "## Keyed Locations",
  ];

  lines.push(...renderPointCrawlLocations(crawl));

  lines.push(
    "## Route Network & Trade-Offs",
    ...renderPointCrawlRoutes(crawl, nodesById),
  );

  return lines.join("\n").trim();
}

/**
 * Renders the GM-facing reference & cheat sheet (`lore`) for a Point Crawl Network.
 */
// fallow-ignore-next-line complexity
export function renderPointCrawlGmSheet(crawl: PointCrawlNetwork): string {
  const nodesById = new Map(crawl.nodes.map((n) => [n.id, n]));
  const gatedRoutes = crawl.routes.filter((r) => Boolean(r.gate));
  const secretRoutes = crawl.routes.filter((r) => r.visibility !== "obvious");

  const lines: string[] = [
    "## GM Navigation & Key-Lock Reference",
    `- **Title**: ${crawl.title}`,
    `- **Scale & Density**: ${crawl.scale} · ${crawl.density} · ${crawl.dangerLevel}`,
    ...(crawl.adventurePlan?.clock
      ? [
          `- **Clock**: ${crawl.adventurePlan.clock.label} starts ${crawl.adventurePlan.clock.startsAt === "crawl-start" ? "at the beginning" : `at ${nodesById.get(crawl.adventurePlan.clock.startsAt.nodeId)?.name ?? crawl.adventurePlan.clock.startsAt.nodeId}`}; ${crawl.adventurePlan.clock.budget.value} ${crawl.adventurePlan.clock.budget.unit}${crawl.adventurePlan.clock.budget.value === 1 ? "" : "s"}. Expiry: ${crawl.adventurePlan.clock.expiry}`,
        ]
      : []),
    "",
    "### Locks, Gates & Where Keys Are Found",
  ];

  if (gatedRoutes.length === 0) {
    lines.push("- No locked routes in this crawl.");
  } else {
    for (const route of gatedRoutes) {
      const fromName =
        nodesById.get(route.fromNodeId)?.name ?? route.fromNodeId;
      const toName = nodesById.get(route.toNodeId)?.name ?? route.toNodeId;
      const unlockNode = route.gate
        ? nodesById.get(route.gate.unlockedByNodeId)
        : undefined;
      lines.push(
        `- **${fromName} ${pointCrawlRouteSymbol(route.direction)} ${toName}** (${route.terrain}): requires **${route.gate?.requirement}** (${route.gate?.kind}) obtained at **${unlockNode?.name ?? route.gate?.unlockedByNodeId}** before crossing.`,
      );
    }
  }

  lines.push("", "### Secret & Rumoured Shortcuts");
  if (secretRoutes.length === 0) {
    lines.push("- All routes are obvious.");
  } else {
    for (const route of secretRoutes) {
      const fromName =
        nodesById.get(route.fromNodeId)?.name ?? route.fromNodeId;
      const toName = nodesById.get(route.toNodeId)?.name ?? route.toNodeId;
      lines.push(
        `- **${fromName} ${pointCrawlRouteSymbol(route.direction)} ${toName}** (*${route.visibility}*, ${route.travelTime} via ${route.terrain}): ${route.signpost}`,
      );
    }
  }

  return lines.join("\n").trim();
}

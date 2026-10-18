# Data Model: Point Crawl Generator (`177-point-crawl-generator`)

**Date**: 2026-10-16  
**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

---

## 1. Core Domain Types (`packages/generator-engine/src/point-crawl-state.ts`)

### `PointCrawlScale`

Defines the spatial scale of the point crawl and drives default travel-time units and terrain vocabulary:

```ts
export type PointCrawlScale =
  | "Dungeon"
  | "Settlement"
  | "City"
  | "Wilderness"
  | "Region"
  | "Planet / System"
  | string; // Supports custom scale input
```

| Scale             | Default Travel Time Unit                           | Example Terrains / Passages                                |
| :---------------- | :------------------------------------------------- | :--------------------------------------------------------- |
| `Dungeon`         | Minutes / delves (`10 min`, `20 min`, `1 turn`)    | Flooded gallery, collapsed stair, ventilation shaft        |
| `Settlement`      | Minutes (`5 min`, `15 min`, `30 min`)              | Back-alley boardwalk, sewer culvert, bell-tower catwalk    |
| `City`            | Minutes / hours (`30 min`, `1 hr`, `2 hrs`)        | Canal barge route, rooftop toll-bridge, undercity tram     |
| `Wilderness`      | Hours / watches (`2 hrs`, `4 hrs`, `1 watch`)      | Ridge trail, bog causeway, gorge rope-bridge               |
| `Region`          | Days (`1 day`, `2 days`, `4 days`)                 | Old imperial road, mountain pass, river ferry              |
| `Planet / System` | Hours / days / jumps (`6 hrs`, `2 days`, `1 jump`) | Orbital transfer lane, dust-ring drift corridor, jump gate |

### `PointCrawlDensity`

Controls edge-to-node ratio and branching factor:

```ts
export type PointCrawlDensity =
  | "Linear-leaning" // ~1.15x edges-to-nodes, 1 loop, 1 shortcut
  | "Balanced branching" // ~1.35x edges-to-nodes, 2+ loops, 1-2 shortcuts
  | "Highly interconnected"; // ~1.60x edges-to-nodes, 3+ loops, 2+ shortcuts
```

### `PointCrawlDangerLevel`

```ts
export type PointCrawlDangerLevel =
  | "Low / Exploratory"
  | "Moderate / Hazardous"
  | "High / Deadly"
  | "Lethal / Survival"
  | string;
```

### `PointCrawlSecretFrequency`

```ts
export type PointCrawlSecretFrequency =
  | "Rare (1 secret route)"
  | "Standard (1-2 secret routes)"
  | "Frequent (3+ secret routes)"
  | string;
```

### `PointCrawlNodeRole`

```ts
export type PointCrawlNodeRole =
  | "start" // Exactly 1 entry point (depth 0)
  | "hub" // Major branching junction (outDegree >= 2)
  | "hazard" // High-risk chokepoint or dangerous landmark
  | "obstacle" // Site guarding or preceding a gated route
  | "secret" // Hidden or rumoured location off the main path
  | "side" // Optional landmark, cache, or faction outpost
  | "goal"; // 1 or more primary destinations / objectives
```

### `PointCrawlNode`

Represents a single location point in the network:

```ts
export interface PointCrawlNode {
  /** Stable identifier within the crawl, e.g. "node-1" .. "node-15". */
  id: string;
  /** Evocative, concrete location title (checked against banned/overused naming rules). */
  name: string;
  /** Structural role in the point crawl topology. */
  role: PointCrawlNodeRole;
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
```

### `PointCrawlRouteVisibility` & `PointCrawlRouteDirection`

```ts
export type PointCrawlRouteVisibility = "obvious" | "hidden" | "rumoured";
export type PointCrawlRouteDirection = "bidirectional" | "one-way";
```

### `PointCrawlGateKind` & `PointCrawlGate`

```ts
export type PointCrawlGateKind =
  "key" | "clue" | "tool" | "guide" | "clearance";

export interface PointCrawlGate {
  kind: PointCrawlGateKind;
  /** Must reference a PointCrawlNode.id reachable from Start without traversing this route. */
  unlockedByNodeId: string;
  /** Concrete name of the item, passphrase, tool, or NPC clearance (validated by !isVague). */
  requirement: string;
}
```

### `PointCrawlRoute`

Represents a connection between two `PointCrawlNode`s:

```ts
export interface PointCrawlRoute {
  /** Stable route identifier, e.g. "route-1". */
  id: string;
  /** Origin node ID. */
  fromNodeId: string;
  /** Destination node ID. */
  toNodeId: string;
  /** Whether travel works both ways or only from -> to (e.g. chute, waterfall, one-way portal). */
  direction: PointCrawlRouteDirection;
  /** Whether the route is immediately visible, hidden until searched/clued, or rumoured. */
  visibility: PointCrawlRouteVisibility;
  /** Scale-appropriate travel duration or distance (e.g. "20 min", "2 hrs", "2 days"). */
  travelTime: string;
  /** Concrete passage or terrain type (e.g. "Sunken causeway", "Maintenance duct"). */
  terrain: string;
  /** Hazard, patrol, toll, or resource cost risked along this route. */
  risk: string;
  /** What players can observe at the trailhead or discover along the way. */
  signpost: string;
  /** Optional lock/blocker requiring leverage from an earlier reachable node. */
  gate?: PointCrawlGate;
  /** True when this route is the designated loop/shortcut edge. */
  isLoopOrShortcut?: boolean;
  /** True when this route fell back to local templates during a partial AI failure. */
  fromFallback?: boolean;
}
```

### `PointCrawlNetwork`

The complete structured state attached to `GeneratorOutput.pointCrawl` and `GeneratedDraft.pointCrawl`:

```ts
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
  /** Playability & structural warnings (empty when all checks pass or are auto-repaired). */
  warnings: string[];
  /** Parts that used local template fallback during staged AI generation. */
  gaps?: PointCrawlGap[];
}
```

---

## 2. Validation, Staged Progress & Surgical Regeneration Types

### `PointCrawlIssue` (`point-crawl-playability.ts`)

```ts
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
```

### `PointCrawlGap` & `PointCrawlRegenTarget` (`point-crawl-staged.ts`, `point-crawl-repair.ts`)

```ts
export type PointCrawlRegenTarget =
  { kind: "node"; id: string } | { kind: "route"; id: string };

export interface PointCrawlGap {
  kind: "node" | "route";
  id: string;
  label: string;
}
```

---

## 3. Interactive SVG Layout Model (`packages/generator-engine/src/point-crawl-layout.ts`)

```ts
export interface PointCrawlNodeLayout {
  id: string;
  x: number;
  y: number;
  radius: number;
  role: PointCrawlNodeRole;
  name: string;
  indexLabel: string; // e.g. "1", "2" .. "15"
}

export interface PointCrawlEdgeLayout {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  /** SVG path `d` attribute (straight or gently curved quadratic bezier when parallel/looping). */
  path: string;
  /** Midpoint for placing route badge (lock icon, hidden icon, travel time pill). */
  labelX: number;
  labelY: number;
  visibility: PointCrawlRouteVisibility;
  direction: PointCrawlRouteDirection;
  isGated: boolean;
  shortLabel: string;
}

export interface PointCrawlDiagramLayout {
  width: number;
  height: number;
  nodes: PointCrawlNodeLayout[];
  edges: PointCrawlEdgeLayout[];
}
```

---

## 4. Multi-Entity Vault Save & Import Payload (`packages/generator-engine/src/point-crawl-save.ts`)

When saving a point crawl (either all nodes or a user-toggled `selectedNodeIds` subset):

1. **Selected Location Entities (`N` entities, `type: "location"`)**:
   - **Title**: `node.name`
   - **Summary / Content**:
     - Summary sentence (`node.summary`)
     - `## Sensory Details` (`node.sensoryDescription`)
     - `## Why Visit` (`node.whyVisit`)
   - **Lore (`GM Reference & Exits`)**:
     - `## Encounter & Hazard` (`node.encounterOrHazard`)
     - `## Clue & Reward` (`node.clueOrReward` + note of any route it unlocks)
     - `## Routes & Exits` (Markdown list of every incident route whose other endpoint is also in `selectedNodeIds`, with `[[Target Node Name]]`, travel time, terrain, visibility, directionality, risk, signpost, and gate requirement)
   - **Labels**: `["point-crawl", "location", node.role, genreSlug, scaleSlug]`
   - **Connections**:
     - For each incident route to another selected node:
       - `targetTitle`: `targetNode.name`
       - `type`: `"route"`
       - `label`: `formatRouteConnectionLabel(route)` → e.g. `"20 min · Flooded Gallery [Hidden]"` or `"2 hrs · Mountain Pass [Locked: Iron Seal]"`
2. **Master Overview Note Entity (`1` entity, `type: "note"`, `kind: "point-crawl"`)**:
   - **Title**: `crawl.title`
   - **Content**: Premise, scale/danger summary, and an ordered directory of `[[Selected Location Name]]` links with their roles and summaries.
   - **Lore**: Complete route matrix and key-before-lock playability notes for the selected subset.
   - **Labels**: `["point-crawl", "overview", genreSlug, scaleSlug]`
   - **Connections**: Links (`type: "contains"`, `label: node.role`) to each selected `Location` entity.
   - **Map Image (`mapImageDataUrl`)**: Rasterized PNG of the `PointCrawlGraph` SVG attached to the overview Note's Map tab.

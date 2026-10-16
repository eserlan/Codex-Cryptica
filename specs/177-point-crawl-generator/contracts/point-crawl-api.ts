/**
 * Contract definitions for the Point Crawl Generator (`177-point-crawl-generator`).
 *
 * Canonical implementation target: `packages/generator-engine/src/point-crawl-*.ts`
 */

import type { OneShotProgressStep } from "generator-engine";

export type PointCrawlScale =
  | "Dungeon"
  | "Settlement"
  | "City"
  | "Wilderness"
  | "Region"
  | "Planet / System"
  | string;

export type PointCrawlDensity =
  "Linear-leaning" | "Balanced branching" | "Highly interconnected";

export type PointCrawlDangerLevel =
  | "Low / Exploratory"
  | "Moderate / Hazardous"
  | "High / Deadly"
  | "Lethal / Survival"
  | string;

export type PointCrawlSecretFrequency =
  | "Rare (1 secret route)"
  | "Standard (1-2 secret routes)"
  | "Frequent (3+ secret routes)"
  | string;

export type PointCrawlNodeRole =
  "start" | "hub" | "hazard" | "obstacle" | "secret" | "side" | "goal";

export type PointCrawlRouteVisibility = "obvious" | "hidden" | "rumoured";
export type PointCrawlRouteDirection = "bidirectional" | "one-way";
export type PointCrawlGateKind =
  "key" | "clue" | "tool" | "guide" | "clearance";

export interface PointCrawlGate {
  kind: PointCrawlGateKind;
  unlockedByNodeId: string;
  requirement: string;
}

export interface PointCrawlNode {
  id: string;
  name: string;
  role: PointCrawlNodeRole;
  layer: number;
  rail: number;
  summary: string;
  sensoryDescription: string;
  whyVisit: string;
  encounterOrHazard: string;
  clueOrReward: string;
  unlocksRouteIds: string[];
  fromFallback?: boolean;
}

export interface PointCrawlRoute {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  direction: PointCrawlRouteDirection;
  visibility: PointCrawlRouteVisibility;
  travelTime: string;
  terrain: string;
  risk: string;
  signpost: string;
  gate?: PointCrawlGate;
  isLoopOrShortcut?: boolean;
  fromFallback?: boolean;
}

export interface PointCrawlGap {
  kind: "node" | "route";
  id: string;
  label: string;
}

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
  warnings: string[];
  gaps?: PointCrawlGap[];
}

export interface PointCrawlGeneratorOptions {
  genre: string;
  scale: PointCrawlScale;
  pointCount: number;
  density: PointCrawlDensity;
  dangerLevel: PointCrawlDangerLevel;
  secretFrequency: PointCrawlSecretFrequency;
  campaignContext?: string;
  useAI?: boolean;
  avoidNames?: string[];
  onProgress?: (steps: OneShotProgressStep[]) => void;
  signal?: AbortSignal;
}

export type PointCrawlRegenTarget =
  { kind: "node"; id: string } | { kind: "route"; id: string };

export interface PointCrawlBatchSaveDraft {
  type: "location" | "note";
  kind?: string;
  title: string;
  content: string;
  lore: string;
  labels: string[];
  status: "active" | "draft";
  relationships: Array<{
    title: string;
    type: string;
    label: string;
  }>;
  mapImageDataUrl?: string;
}

export interface PointCrawlEngineContract {
  /** Synchronous deterministic local generation (<200ms). */
  generatePointCrawlLocal(
    options: PointCrawlGeneratorOptions,
  ): PointCrawlNetwork;

  /** Staged AI generation with bounded concurrency (3) and per-part template fallback. */
  generatePointCrawlStaged(
    options: PointCrawlGeneratorOptions,
    complete: (prompt: string) => Promise<string>,
    onProgress?: (steps: OneShotProgressStep[]) => void,
    signal?: AbortSignal,
  ): Promise<PointCrawlNetwork>;

  /** Surgical single-node or single-route regeneration preserving topology & key-lock invariants. */
  regeneratePointCrawlPart(
    crawl: PointCrawlNetwork,
    target: PointCrawlRegenTarget,
    options?: {
      useAI?: boolean;
      instruction?: string;
      complete?: (prompt: string) => Promise<string>;
      signal?: AbortSignal;
    },
  ): Promise<{ crawl: PointCrawlNetwork; warnings: string[] }>;

  /** Build the N Location drafts + 1 master overview Note draft for full or subset Vault Save. */
  buildPointCrawlSaveDrafts(
    crawl: PointCrawlNetwork,
    options?: {
      selectedNodeIds?: Iterable<string>;
      mapImageDataUrl?: string;
      status?: "active" | "draft";
    },
  ): PointCrawlBatchSaveDraft[];
}

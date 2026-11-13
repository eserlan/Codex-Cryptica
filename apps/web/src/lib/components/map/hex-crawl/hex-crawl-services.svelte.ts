import {
  formatHexLabel,
  getTokenCenter,
  pointToHex,
  type HexCoord,
} from "map-engine";
import { HexDiscoveryService, formatSeed } from "hex-crawl-engine";
import { aiClientManager } from "@codex/ai-engine";
import { HexCrawlStore } from "#lib/stores/hex-crawl/hex-crawl.svelte.js";
import { HexCrawlMoveObserver } from "#lib/stores/hex-crawl/hex-crawl-move-observer.js";
import { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
import { GeographyGenerationStore } from "#lib/stores/hex-crawl/geography-generation.svelte.js";
import { HexJourneyStore } from "#lib/stores/hex-crawl/hex-journey.svelte.js";
import { HexDiscoveryController } from "#lib/services/hex-discovery.js";
import { mapStore } from "#lib/stores/map.svelte.js";
import { mapSession } from "#lib/stores/map-session.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { oracle } from "#lib/stores/oracle.svelte.js";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
import { browserStorage, systemClock } from "#lib/utils/runtime-deps.js";
import { publishSoloMapMove } from "../solo-exploration-recorder.svelte";
import { activeHexGridConfig, hexOnMap } from "./hex-crawl-view";
import { pinAtHex as pinAtHexOnScreen } from "./hex-map-port";

const REGION_CONTEXT_LIMIT = 1_500;

/** The solo "explore this hex" offer currently shown, if any (FR-035). */
class ExploreOfferState {
  current = $state<{ mapId: string; hex: HexCoord } | null>(null);
}

export interface HexCrawlServices {
  store: HexCrawlStore;
  observer: HexCrawlMoveObserver;
  controller: HexDiscoveryController;
  offer: ExploreOfferState;
  journey: HexJourneyStore;
  region: RegionGenerationStore;
  geography: GeographyGenerationStore;
}

/** Orientation of the active map's hex grid, for labels. */
function activeOrientation(): "pointy" | "flat" {
  return mapStore.gridType === "hex-f...[truncated]
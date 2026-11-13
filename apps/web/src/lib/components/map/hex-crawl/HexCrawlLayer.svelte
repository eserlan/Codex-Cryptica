<script lang="ts">
  import { onDestroy } from "svelte";
  /**
   * Mounts the hex crawl UI over the map: records, the GM panel, Go to hex,
   * the terrain-icon toggle and the solo explore offer. Visible to the GM only.
   * MapView passes the services in, so this layer holds no singletons.
   */
  import { hexToPoint, type HexCoord } from "map-engine";
  import type { Point } from "schema";
  import { normalizeHexCrawlState } from "hex-crawl-engine";
  import { mapStore } from "#lib/stores/map.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
  import type { MapFogPainter } from "../map-fog-painter";
  import type { HexCrawlServices } from "./hex-crawl-services.svelte";
  import { buildDiscoveryWiring } from "./hex-discovery-wiring";
  import {
    activeHexGridConfig,
    canSeeHexCrawl,
    hexLabelFor,
    isHexGridType,
  } from "./hex-crawl-view";
  import HexCrawlOverlay from "./HexCrawlOverlay.svelte";
  import HexCrawlPanel from "./HexCrawlPanel.svelte";
  import HexGoTo from "./HexGoTo.svelte";
  import HexCrawlDisplayToggle from "./HexCrawlDisplayToggle.svelte";
  import HexExploreOffer from "./HexExploreOffer.svelte";
  import HexJourneyControls from "./HexJourneyControls.svelte";
  import HexJourneyOverlay from "./HexJourneyOverlay.svelte";
  import RegionProposalOverlay from "./region/RegionProposalOverlay.svelte";
  import RegionReviewBar from "./region/RegionReviewBar.svelte";
  import RegionUndoBar from "./region/RegionUndoBar.svelte";
  import HexGeographyOverlay from "./topology/HexGeographyOverlay.svelte";
  import GeographyReviewBar from "./topology/GeographyReviewBar.svelte";
  import type { NoticeStorage } from "./hex-discovery-notice";
  import { browserStorage } from "#lib/utils/runtime-deps.js";

  let {
    services,
    painter,
    isGM,
    isGuest,
    viewportSize,
    storage = browserStorage,
  }: {
    services: HexCrawlServices;
 ...[truncated]
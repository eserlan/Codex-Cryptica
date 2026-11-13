<script lang="ts">
  import { onMount, untrack } from "svelte";
  import {
    hexToPoint,
    type HexCoord,
    type HexGridConfig,
    type HexLabelConfig,
    type HexOrientation,
  } from "map-engine";
  import {
    deriveHexState,
    hasPendingParts,
    type Terrain,
  } from "hex-crawl-engine";
  import type { HexCrawlStore } from "#lib/stores/hex-crawl/hex-crawl.svelte.js";
  import type { HexJourneyStore } from "#lib/stores/hex-crawl/hex-journey.svelte.js";
  import { mapStore } from "#lib/stores/map.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
  import { canSeeHexCrawl, hexLabelFor } from "./hex-crawl-view";
  import HexTerrainPicker from "./HexTerrainPicker.svelte";
  import HexNotes from "./HexNotes.svelte";
  import HexContentsList from "./HexContentsList.svelte";
  import HexDiscoveryReview from "./HexDiscoveryReview.svelte";
  import HexExploreControls from "./HexExploreControls.svelte";
  import RegionGenerateMenu from "./region/RegionGenerateMenu.svelte";
  import type { RegionGenerationStore } from "#lib/stores/hex-crawl/region-generation.svelte.js";
  import type { GeographyGenerationStore } from "#lib/stores/hex-crawl/geography-generation.svelte.js";
  import type {
    HexDiscoveryControls,
    HexDiscoveryWiring,
  } from "./discovery-controls";
  import type { NoticeStorage } from "./hex-discovery-notice";
  import {
    AI_NOTICE_TEXT,
    dismissAiNotice,
    isAiNoticeDismissed,
  } from "./hex-discovery-notice";
  import {
    HEX_HINT_TEXT,
    isHexHintSeen,
    markHexHintSeen,
  } from "./hex-crawl-hint";

  let {
    store,
    journey,
    mapId,
    hex,
    isGM,
    isGuest,
    revealed,
    labelConfig,
    orientation,
    gridConfig,
    pins,
    entities,
    discovery,
    storage,
    region,
    geography,
  }: {
    store: HexCrawlStore;
    journey?: HexJourneyStore;
    region?: RegionGenerationStore;
    geography?: GeographyG...[truncated]
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
    painter: MapFogPainter;
    isGM: boolean;
    isGuest: boolean;
    viewportSize: { width: number; height: number };
    storage?: NoticeStorage;
  } = $props();

  const mapId = $derived(mapStore.activeMapId);
  const config = $derived(activeHexGridConfig(mapStore));
  const hexMode = $derived(
    mapId !== null &&
      isHexGridType(mapStore.gridType) &&
      services.store.isEnabled(mapId),
  );
  const visible = $derived(canSeeHexCrawl({ isGM, isGuest }) && hexMode);
  const orientation = $derived(
    mapStore.gridType === "hex-flat" ? "flat" : "pointy",
  );
  const labelConfig = $derived(mapStore.hexLabelConfig);
  const crawl = $derived(
    mapId && visible
      ? normalizeHexCrawlState(vault.maps[mapId]?.hexCrawl)
      : null,
  );
  const records = $derived(crawl?.hexes ?? {});
  const topology = $derived(crawl?.topology);
  const selected = $derived(
    services.store.selectedHex && services.store.selectedHex.mapId === mapId
      ? services.store.selectedHex
      : null,
  );
  const pins = $derived(mapId ? (vault.maps[mapId]?.pins ?? []) : []);
  const entities = $derived(
    Object.values(vault.entities).map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
    })),
  );
  const factions = $derived(
    entities
      .filter((e) => e.type === "faction")
      .map((e) => ({ id: e.id, title: e.title })),
  );
  const aiEnabled = $derived(!isGuest && !discoveryPolicyStore.aiDisabled);

  // Discovery is built only for the GM's own vault (guests never reach it).
  const discovery = $derived(
    selected && visible && !isGuest && mapId
      ? buildDiscoveryWiring({
          controller: services.controller,
          store: services.store,
          mapId,
          hex: selected.hex,
          factions,
          aiEnabled,
        })
      : null,
  );

  const offered = $derived(
    services.offer.current &&
      services.offer.current.mapId === mapId &&
      visible &&
      !(
        selected &&
        selected.hex.q === services.offer.current.hex.q &&
        selected.hex.r === services.offer.current.hex.r
      )
      ? services.offer.current
      : null,
  );

  function revealedAt(hex: HexCoord): boolean {
    if (!mapStore.showFog || !config) return true;
    return painter.isRevealedAt(hexToPoint(hex, config));
  }

  /** Centre the map on a hex (FR-003a), keeping the current zoom. */
  function centreOn(hex: HexCoord) {
    if (!config) return;
    const point: Point = hexToPoint(hex, config);
    const zoom = mapStore.viewport.zoom;
    mapStore.updateViewport({ x: -point.x * zoom, y: -point.y * zoom }, zoom);
  }

  function openOffered(opener: HTMLElement) {
    if (!offered) return;
    services.store.openHex(offered.mapId, offered.hex, opener);
    services.offer.current = null;
  }

  function goTo(hex: HexCoord, opener: HTMLElement) {
    if (!mapId) return;
    centreOn(hex);
    services.store.openHex(mapId, hex, opener);
  }

  const project = (point: Point) => mapStore.project(point);
  const zoom = $derived(mapStore.viewport.zoom);
  const journeyVisible = $derived(visible && !isGuest && isGM);

  $effect(() => {
    if (services.journey.route || services.journey.pendingArrival) {
      void services.journey.busy;
      services.journey.validateIdentity();
    }
  });
  $effect(() => {
    const currentOffer = services.offer.current;
    if (
      currentOffer &&
      selected &&
      currentOffer.mapId === selected.mapId &&
      currentOffer.hex.q === selected.hex.q &&
      currentOffer.hex.r === selected.hex.r
    ) {
      services.offer.current = null;
    }
  });
  let regionPick = $state<string | null>(null);
  const review = $derived(
    services.region.review && services.region.review.mapId === mapId
      ? services.region.review
      : null,
  );
  const geographyReview = $derived(
    services.geography?.review && services.geography.review.mapId === mapId
      ? services.geography.review
      : null,
  );
  const hasReview = $derived(Boolean(review || geographyReview));
  const showRegionUndo = $derived(!review && !geographyReview);
  const showPanel = $derived(Boolean(selected && mapId && !hasReview));
  const canAuthor = $derived(isGM && !isGuest);
  const authorRegion = $derived(canAuthor ? services.region : undefined);
  const authorGeography = $derived(canAuthor ? services.geography : undefined);
  const onToggleEdge = $derived(
    geographyReview
      ? (key: string, kind: "river" | "road" | "coast") =>
          services.geography.toggleEdge(key, kind)
      : undefined,
  );
  const onToggleSite = $derived(
    geographyReview
      ? (key: string) => services.geography.toggleSite(key)
      : undefined,
  );
  const regionLabelFor = (key: string) => {
    const [q, r] = key.split(",").map(Number);
    return hexLabelFor({ q, r }, labelConfig, orientation);
  };
  const pickRegionHex = (key: string) => {
    regionPick = key;
  };
  const toggleTerrainIcons = (next: boolean) => {
    mapStore.showTerrainIcons = next;
  };
  const dismissOffer = () => {
    services.offer.current = null;
  };
  const unprojectPoint = (point: Point) => mapStore.unproject(point);

  function leaveIfInactive(
    service: { mapId?: string | null; leave: () => void } | undefined,
    active: string | null,
  ) {
    if (service?.mapId && service.mapId !== active) service.leave();
  }

  function syncActiveReviewServices(active: string | null) {
    leaveIfInactive(services.region, active);
    if (!services.region.review) regionPick = null;
    leaveIfInactive(services.geography, active);
    // A tap on the map during either review must not open the hex panel behind it.
    const reviewing = Boolean(
      services.region.review || services.geography?.review,
    );
    if (reviewing && services.store.selectedHex) services.store.closeHex();
  }

  $effect(() => {
    // Leaving the map or turning the mode off drops the preview, the message and the undo.
    syncActiveReviewServices(visible ? mapId : null);
  });
  onDestroy(() => {
    services.journey.dispose();
    services.region.leave();
    services.geography?.leave();
  });
</script>

{#if visible && config}
  <HexCrawlOverlay
    {records}
    {visible}
    showTerrainIcons={mapStore.showTerrainIcons}
    gridConfig={config}
    {project}
    unproject={unprojectPoint}
    viewport={viewportSize}
    {zoom}
  />

  <HexGeographyOverlay
    {topology}
    proposal={geographyReview?.proposal}
    disabledEdgeFeatures={geographyReview?.disabledEdgeFeatures}
    disabledSites={geographyReview?.disabledSites}
    gridConfig={config}
    {project}
    viewport={viewportSize}
    {zoom}
    onToggleEdgeFeature={onToggleEdge}
    {onToggleSite}
  />

  <HexJourneyOverlay
    route={services.journey.route}
    completedSteps={services.journey.committedSteps}
    gridConfig={config}
    {project}
    viewport={viewportSize}
    visible={journeyVisible}
  />

  {#if review}
    <RegionProposalOverlay
      proposal={review.proposal}
      adjustments={review.adjustments}
      gridConfig={config}
      {project}
      {zoom}
      selectedKey={regionPick}
      onPick={pickRegionHex}
      labelFor={regionLabelFor}
    />
    <RegionReviewBar
      store={services.region}
      selectedKey={regionPick}
      {labelConfig}
      {orientation}
      onSelect={pickRegionHex}
    />
  {:else if showRegionUndo}
    <RegionUndoBar store={services.region} />
  {/if}

  {#if geographyReview}
    <GeographyReviewBar store={services.geography} />
  {/if}

  <div
    class="pointer-events-auto absolute left-2 top-2 z-20 flex flex-wrap items-center gap-2"
  >
    <HexGoTo {labelConfig} {orientation} onGo={goTo} />
    <HexCrawlDisplayToggle
      checked={mapStore.showTerrainIcons}
      onChange={toggleTerrainIcons}
      {isGM}
      {isGuest}
      modeOn={hexMode}
    />
  </div>

  <div
    class="pointer-events-auto absolute left-2 top-24 z-40 w-72 max-w-[calc(100%-1rem)]"
  >
    <HexJourneyControls store={services.journey} visible={journeyVisible} />
  </div>

  {#if offered}
    <div
      class="pointer-events-auto absolute bottom-16 left-1/2 z-20 -translate-x-1/2"
    >
      <HexExploreOffer onExplore={openOffered} onDismiss={dismissOffer} />
    </div>
  {/if}

  {#if showPanel && selected && mapId}
    <HexCrawlPanel
      store={services.store}
      journey={services.journey}
      {mapId}
      hex={selected.hex}
      {isGM}
      {isGuest}
      revealed={revealedAt(selected.hex)}
      {labelConfig}
      {orientation}
      gridConfig={config}
      {pins}
      {entities}
      {discovery}
      {storage}
      region={authorRegion}
      geography={authorGeography}
    />
  {/if}
{/if}

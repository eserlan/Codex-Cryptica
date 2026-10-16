<script lang="ts">
  /**
   * Mounts the hex crawl UI over the map: records, the GM panel, Go to hex,
   * the terrain-icon toggle and the solo explore offer. Visible to the GM only.
   * MapView passes the services in, so this layer holds no singletons.
   */
  import { hexToPoint, type HexCoord } from "map-engine";
  import type { Point } from "schema";
  import { normalizeHexCrawlState } from "hex-crawl-engine";
  import { mapStore } from "$lib/stores/map.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import type { MapFogPainter } from "../map-fog-painter";
  import type { HexCrawlServices } from "./hex-crawl-services.svelte";
  import { buildDiscoveryWiring } from "./hex-discovery-wiring";
  import {
    activeHexGridConfig,
    canSeeHexCrawl,
    isHexGridType,
  } from "./hex-crawl-view";
  import HexCrawlOverlay from "./HexCrawlOverlay.svelte";
  import HexCrawlPanel from "./HexCrawlPanel.svelte";
  import HexGoTo from "./HexGoTo.svelte";
  import HexCrawlDisplayToggle from "./HexCrawlDisplayToggle.svelte";
  import HexExploreOffer from "./HexExploreOffer.svelte";
  import type { NoticeStorage } from "./hex-discovery-notice";

  let {
    services,
    painter,
    isGM,
    isGuest,
    viewportSize,
  }: {
    services: HexCrawlServices;
    painter: MapFogPainter;
    isGM: boolean;
    isGuest: boolean;
    viewportSize: { width: number; height: number };
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
  const records = $derived(
    mapId && visible
      ? normalizeHexCrawlState(vault.maps[mapId]?.hexCrawl).hexes
      : {},
  );
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

  const storage: NoticeStorage | null =
    typeof window !== "undefined" ? window.localStorage : null;

  const offered = $derived(
    services.offer.current && services.offer.current.mapId === mapId && visible
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
</script>

{#if visible && config}
  <HexCrawlOverlay
    {records}
    {visible}
    showTerrainIcons={mapStore.showTerrainIcons}
    gridConfig={config}
    {project}
    unproject={(point) => mapStore.unproject(point)}
    viewport={viewportSize}
    {zoom}
  />

  <div
    class="pointer-events-auto absolute left-2 top-2 z-20 flex flex-wrap items-center gap-2"
  >
    <HexGoTo {labelConfig} {orientation} onGo={goTo} />
    <HexCrawlDisplayToggle
      checked={mapStore.showTerrainIcons}
      onChange={(next: boolean) => (mapStore.showTerrainIcons = next)}
      {isGM}
      {isGuest}
      modeOn={hexMode}
    />
  </div>

  {#if offered}
    <div
      class="pointer-events-auto absolute bottom-16 left-1/2 z-20 -translate-x-1/2"
    >
      <HexExploreOffer
        onExplore={openOffered}
        onDismiss={() => (services.offer.current = null)}
      />
    </div>
  {/if}

  {#if selected && mapId}
    <HexCrawlPanel
      store={services.store}
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
    />
  {/if}
{/if}

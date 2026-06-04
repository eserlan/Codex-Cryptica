<script lang="ts">
  import { type Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { oracle } from "../../stores/oracle.svelte";
  import { MapFogPainter } from "./map-fog-painter";
  import { MapViewAssetLoader } from "./map-view-loader";
  import { MapInteractionManager } from "./map-interactions.svelte";
  import MapCanvas from "./MapCanvas.svelte";
  import MapOverlays from "./MapOverlays.svelte";
  import MapContextMenu from "./MapContextMenu.svelte";
  import { measureDistance } from "$lib/utils/vtt-helpers";
  import { mapSession } from "../../stores/map-session.svelte";

  function hashToColor(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 75% 55%)`;
  }

  let {
    children,
    onMapDragOver,
    onMapDragLeave,
    onMapDrop,
  }: {
    children?: Snippet;
    onMapDragOver?: (event: DragEvent) => void;
    onMapDragLeave?: (event: DragEvent) => void;
    onMapDrop?: (event: DragEvent) => void;
  } = $props();

  let container = $state<HTMLDivElement | null>(null);
  let mapImage = $state<HTMLImageElement | null>(null);
  let maskCanvas = $state<HTMLCanvasElement | null>(null);

  const painter = new MapFogPainter({
    mapStore,
    oracle,
    getMaskCanvas: () => maskCanvas,
    getMapImage: () => mapImage,
    createCanvas: () => document.createElement("canvas"),
  });

  const interactions = new MapInteractionManager({
    painter,
    getContainer: () => container,
  });

  const mapAssets = new MapViewAssetLoader({
    vault,
    mapStore,
    createImage: () => new Image(),
    onClear: () => {
      painter.cancel();
      mapImage = null;
      maskCanvas = null;
    },
    onImageLoaded: (img) => {
      mapImage = img;
    },
    onMaskLoaded: (mask) => {
      maskCanvas = mask;
    },
    onDimensionsLoaded: async (width, height) => {
      const activeMap = mapStore.activeMap;
      if (
        activeMap &&
        mapStore.activeMapId === activeMap.id &&
        activeMap.dimensions.width === 0
      ) {
        vault.maps[activeMap.id].dimensions = {
          width,
          height,
        };
        await vault.saveMaps();
      }
    },
    onError: (message, err) => {
      console.error(message, err);
    },
  });

  const activeMapSignature = $derived.by(() => {
    const activeMap = mapStore.activeMap;
    if (!activeMap) return null;
    return `${activeMap.id}:${activeMap.assetPath}:${activeMap.dimensions.width}x${activeMap.dimensions.height}`;
  });
  let lastMapSignature: string | null = null;
  let loadedMaskPath = $state<string | null>(null);

  const vttMeasurement = $derived.by(() => {
    const measurement = mapSession.measurement;
    if (!measurement.active || !measurement.start || !measurement.end) {
      return null;
    }

    const pixelDist = measureDistance(measurement.start, measurement.end);
    const gridSize = mapStore.gridSize || 50;
    const units = (pixelDist / gridSize) * mapSession.gridDistance;
    const label = `${Math.round(units)}${mapSession.gridUnit}`;

    return {
      ...measurement,
      label,
    };
  });
  // ⚡ Bolt Optimization: Replace inline Object.values().find() with pre-cached property
  const vttPings = $derived(mapSession.allPings);
  const remoteMeasurement = $derived.by(() => {
    const rm = mapSession.activeMeasurement;
    if (!rm || !rm.start || !rm.end) return null;

    const pixelDist = measureDistance(rm.start, rm.end);
    const gridSize = mapStore.gridSize || 50;
    const units = (pixelDist / gridSize) * mapSession.gridDistance;
    const label = `${Math.round(units)}${mapSession.gridUnit}`;
    const color = hashToColor(rm.peerId);

    return {
      start: rm.start,
      end: rm.end,
      label,
      color,
      peerId: rm.peerId,
    };
  });

  let tokenImageCache = $state<Record<string, HTMLImageElement | null>>({});
  let tokenImageSourceCache = $state<Record<string, string>>({});

  const vttTokens = $derived.by(() => {
    const isHost = mapStore.isGMMode;
    const peerId = mapSession.myPeerId;
    const selected = mapSession.selectedTokens;
    const tokens = mapSession.allTokens;
    const result = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (mapSession.canViewToken(token.id, peerId, isHost)) {
        result.push({
          ...token,
          label: token.name,
          image: tokenImageCache[token.id] ?? null,
          selected: mapSession.selection === token.id || selected.has(token.id),
          active: mapSession.activeTokenId === token.id,
          visible: true,
        });
      }
    }
    return result;
  });
  const vttDragPreview = $derived.by(() => {
    const preview = mapSession.dragPreview;
    const activeMap = mapStore.activeMap;
    if (!preview || !activeMap) {
      return null;
    }

    const dimensions = activeMap.dimensions;
    const valid =
      preview.x >= 0 &&
      preview.y >= 0 &&
      preview.x <= dimensions.width &&
      preview.y <= dimensions.height;

    return {
      ...preview,
      label: vault.entities[preview.entityId]?.title ?? "Entity",
      valid,
    };
  });

  $effect(() => {
    const currentTokens = mapSession.allTokens;
    for (const token of currentTokens) {
      const source =
        token.imageUrl ||
        (token.entityId
          ? (vault.entities[token.entityId]?.image ?? null)
          : null);
      if (!source) continue;

      if (
        tokenImageSourceCache[token.id] === source &&
        tokenImageCache[token.id]
      ) {
        continue;
      }

      tokenImageSourceCache[token.id] = source;
      void vault
        .resolveImageUrl(source)
        .then((resolved) => {
          const img = new Image();
          img.onload = () => {
            tokenImageCache[token.id] = img;
          };
          img.onerror = () => {
            tokenImageCache[token.id] = null;
          };
          img.src = resolved;
        })
        .catch(() => {
          tokenImageCache[token.id] = null;
        });
    }
  });

  $effect(() => {
    if (activeMapSignature === lastMapSignature) {
      return;
    }
    lastMapSignature = activeMapSignature;
    return mapAssets.sync(mapStore.activeMap);
  });

  $effect(() => {
    const activeMap = mapStore.activeMap;
    const fogMaskPath = activeMap?.fogOfWar?.maskPath ?? null;
    const image = mapImage;

    if (!activeMap || !fogMaskPath || !image) {
      loadedMaskPath = null;
      return;
    }

    if (fogMaskPath === loadedMaskPath) {
      return;
    }

    let cancelled = false;
    void mapStore.loadMask(image.width, image.height).then((mask) => {
      if (cancelled) return;
      maskCanvas = mask;
      loadedMaskPath = fogMaskPath;
    });

    return () => {
      cancelled = true;
    };
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={container}
  class="flex-1 min-h-0 w-full h-full bg-theme-bg overflow-hidden relative select-none"
  style:background-image="var(--bg-texture)"
  role="application"
  aria-roledescription="map"
  aria-label="Interactive map. Use arrow keys to pan and plus or minus keys to zoom."
  tabindex="0"
  onmouseenter={interactions.onMouseEnter}
  onmouseleave={interactions.onMouseLeave}
  onmousedown={interactions.onMouseDown}
  onmousemove={interactions.onMouseMove}
  onmouseup={interactions.onMouseUp}
  ondblclick={interactions.onDoubleClick}
  oncontextmenu={interactions.onContextMenu}
  onwheel={interactions.onWheel}
  onkeydown={interactions.onKeyDown}
  onkeyup={interactions.onKeyUp}
  ondragover={onMapDragOver}
  ondragleave={onMapDragLeave}
  ondrop={onMapDrop}
>
  <MapCanvas
    {mapImage}
    {maskCanvas}
    {vttTokens}
    {vttMeasurement}
    {remoteMeasurement}
    {vttPings}
    {vttDragPreview}
    {interactions}
  />

  {#if !mapImage}
    <div
      class="absolute inset-0 flex items-center justify-center bg-theme-bg/40 backdrop-blur-sm z-50 pointer-events-none"
      transition:fade
    >
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"
        ></div>
        <div
          class="text-[10px] font-mono text-theme-primary uppercase tracking-[0.3em] animate-pulse"
        >
          Synthesizing Spatial Asset...
        </div>
      </div>
    </div>
  {/if}

  <div aria-live="polite" aria-atomic="true" class="sr-only">
    {interactions.mapAnnouncement}
  </div>

  <MapOverlays {interactions} />

  {#if interactions.contextMenu}
    <MapContextMenu
      x={interactions.contextMenu.x}
      y={interactions.contextMenu.y}
      imgX={interactions.contextMenu.imgX}
      imgY={interactions.contextMenu.imgY}
      tokenId={interactions.contextMenu.tokenId}
      onClose={() => (interactions.contextMenu = null)}
    />
  {/if}

  {@render children?.()}
</div>

<svelte:window onkeydown={interactions.onGlobalKeyDown} />

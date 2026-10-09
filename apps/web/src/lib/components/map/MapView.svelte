<script lang="ts">
  import { type Snippet, setContext, untrack } from "svelte";
  import { fade } from "svelte/transition";
  import { isNoteCollapsed, mapLayerRank } from "map-engine";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { oracle } from "../../stores/oracle.svelte";
  import { MapFogPainter } from "./map-fog-painter";
  import { resolveVisionSourceTokens } from "./vtt-vision";
  import { broadcastActiveMapFogSync } from "./interactions/interaction-adapters";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { MapViewAssetLoader } from "./map-view-loader";
  import { MapInteractionManager } from "./map-interactions.svelte";
  import MapCanvas from "./MapCanvas.svelte";
  import MapOverlays from "./MapOverlays.svelte";
  import MapContextMenu from "./MapContextMenu.svelte";
  import { clampPointToBounds } from "$lib/utils/vtt-helpers";
  import { mapSession } from "../../stores/map-session.svelte";
  import {
    SOLO_EXPLORATION_CONTEXT,
    createSoloExplorationRecorder,
    publishSoloMapMove,
  } from "./solo-exploration-recorder.svelte";
  import {
    resolveHealthBar,
    mapAssetSignature,
    resolveRemoteMeasurement,
    getMapDisplayDimensions,
    formatMeasurementLabel,
    visionRevealSignature,
  } from "./map-view-helpers";

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
  // Marks an unreadable map image so the loading overlay can offer a retry.
  let imageLoadFailed = $state(false);
  let retryNonce = $state(0);
  let maskCanvas = $state<HTMLCanvasElement | null>(null);

  const painter = new MapFogPainter({
    mapStore,
    oracle,
    getMaskCanvas: () => maskCanvas,
    getMapImage: () => mapImage,
    createCanvas: () => document.createElement("canvas"),
  });

  const soloRecorder = createSoloExplorationRecorder({
    mapStore,
    mapSession,
    sessionModeStore,
    oracle,
    painter,
    getMaskCanvas: () => maskCanvas,
    getMapImage: () => mapImage,
    publishCapture: publishSoloMapMove,
  });
  setContext(SOLO_EXPLORATION_CONTEXT, soloRecorder);

  const interactions = new MapInteractionManager({
    painter,
    getContainer: () => container,
    onMoveSettled: (ids) => {
      const sources = visionSourceTokens.filter((token) =>
        ids.includes(token.id),
      );
      void soloRecorder
        .onVisionChanged(sources)
        .then(() => soloRecorder.onMoveSettled(sources));
    },
  });

  const mapAssets = new MapViewAssetLoader({
    vault,
    mapStore,
    createImage: () => new Image(),
    onClear: () => {
      painter.cancel();
      mapImage = null;
      maskCanvas = null;
      imageLoadFailed = false;
    },
    onImageLoaded: (img) => {
      mapImage = img;
    },
    onMaskLoaded: (mask) => {
      maskCanvas = mask;
      mapStore.fogRevision++;
    },
    onDimensionsLoaded: async (width, height) => {
      const activeMap = mapStore.activeMap;
      if (
        activeMap &&
        mapStore.activeMapId === activeMap.id &&
        activeMap.dimensions.width === 0
      ) {
        vault.maps[activeMap.id].dimensions = getMapDisplayDimensions(
          width,
          height,
        );
        await vault.saveMaps();
      }
    },
    onError: (message, err) => {
      console.error(message, err);
      imageLoadFailed = true;
    },
  });

  const activeMapSignature = $derived(mapAssetSignature(mapStore.activeMap));
  let lastMapSignature: string | null = null;
  let loadedMaskPath = $state<string | null>(null);

  const vttMeasurement = $derived.by(() => {
    const measurement = mapSession.measurement;
    if (!measurement.active || !measurement.start || !measurement.end) {
      return null;
    }

    const label = formatMeasurementLabel(measurement.start, measurement.end, {
      gridType: mapStore.gridType,
      gridSize: mapStore.gridSize,
      gridDistance: mapSession.gridDistance,
      gridUnit: mapSession.gridUnit,
      gridOffsetX: mapStore.gridOffsetX,
      gridOffsetY: mapStore.gridOffsetY,
    });

    return {
      ...measurement,
      label,
    };
  });
  const vttPings = $derived(mapSession.allPings);
  const remoteMeasurement = $derived(
    resolveRemoteMeasurement(mapSession.activeMeasurement, {
      gridType: mapStore.gridType,
      gridSize: mapStore.gridSize,
      gridDistance: mapSession.gridDistance,
      gridUnit: mapSession.gridUnit,
      gridOffsetX: mapStore.gridOffsetX,
      gridOffsetY: mapStore.gridOffsetY,
    }),
  );

  let tokenImageCache = $state<Record<string, HTMLImageElement | null>>({});
  let tokenImageSourceCache = $state<Record<string, string>>({});

  const visionSourceTokens = $derived.by(() =>
    resolveVisionSourceTokens(
      mapSession.allTokens,
      mapStore.visionMode,
      mapSession.selection,
    ),
  );

  const vttTokens = $derived.by(() => {
    const isHost = mapStore.isGMMode;
    const peerId = mapSession.myPeerId;
    const selected = mapSession.selectedTokens;
    const tokens = mapSession.allTokens;
    const visionSourceIds = new Set(
      mapStore.visionMode === "selected"
        ? visionSourceTokens.map((token) => token.id)
        : [],
    );
    const result = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const layer = token.layer ?? "token";
      if (
        mapSession.canViewToken(token.id, peerId, isHost) &&
        mapStore.layerVisibility[layer] !== false
      ) {
        result.push({
          ...token,
          // Tiles are terrain/room pieces, not combatants — no name label.
          label: token.kind === "tile" ? "" : token.name,
          // A collapsed note keeps its label: the name is all there is to
          // tell one folded-away note from another.
          noteCollapsed: isNoteCollapsed(token),
          image: tokenImageCache[token.id] ?? null,
          selected: mapSession.selection === token.id || selected.has(token.id),
          primarySelected: mapSession.selection === token.id,
          active: mapSession.activeTokenId === token.id,
          visible: true,
          visionActive: visionSourceIds.has(token.id),
          healthBar: resolveHealthBar(
            token.entityId
              ? vault.entities[token.entityId]?.statSheet?.fields
              : undefined,
          ),
        });
      }
    }
    return result.sort(
      (first, second) =>
        mapLayerRank(first.layer ?? "token") -
          mapLayerRank(second.layer ?? "token") || first.zIndex - second.zIndex,
    );
  });
  const vttDragPreview = $derived.by(() => {
    const preview = mapSession.dragPreview;
    const activeMap = mapStore.activeMap;
    if (!preview || !activeMap) {
      return null;
    }

    const dimensions = activeMap.dimensions;
    const tokenSize = mapStore.gridSize || 50;
    const bounded = clampPointToBounds(
      { x: preview.x, y: preview.y },
      dimensions,
      { width: tokenSize, height: tokenSize },
    );
    const valid = bounded.x === preview.x && bounded.y === preview.y;

    return {
      ...preview,
      label: vault.entities[preview.entityId]?.title ?? "Entity",
      valid,
    };
  });
  const tilePlacementPreview = $derived(
    mapSession.tileDeckManager.pendingPlacement,
  );
  // A separate primitive-valued derived: pendingPlacement is replaced with a
  // new object on every mousemove during placement (x/y/valid churn), but
  // this string only actually changes when the tile itself changes — so the
  // image-loading effect below (keyed off this) doesn't get its in-flight
  // load cancelled by every mousemove tick.
  const pendingPlacementImagePath = $derived(
    tilePlacementPreview?.tile.imagePath ?? null,
  );
  let tilePlacementImage = $state<HTMLImageElement | null>(null);
  // Plain (non-reactive) on purpose: the loading effect below both reads and
  // writes this to track "have we already started loading this path", and if
  // it were $state, that write would make the effect depend on its own
  // output — Svelte schedules a self-triggered re-run to settle, whose
  // cleanup cancels the in-flight load before it can ever resolve. Nothing
  // needs to *react* to this changing, both read sites just need the current
  // value at the time some other trigger reruns them.
  let tilePlacementImagePath: string | null = null;
  const enrichedTilePlacementPreview = $derived.by(() =>
    tilePlacementPreview
      ? { ...tilePlacementPreview, image: tilePlacementImage }
      : null,
  );

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

      // A tile just placed from the pending-placement preview already has
      // its image decoded — reuse it instead of re-fetching/re-decoding,
      // which otherwise causes a visible blank flash on the new tile.
      if (
        token.kind === "tile" &&
        source === tilePlacementImagePath &&
        tilePlacementImage
      ) {
        tokenImageSourceCache[token.id] = source;
        tokenImageCache[token.id] = tilePlacementImage;
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
    const path = pendingPlacementImagePath;
    if (!path || path === tilePlacementImagePath) return;
    tilePlacementImagePath = path;
    tilePlacementImage = null;
    let cancelled = false;
    void vault
      .resolveImageUrl(path)
      .then((source) => {
        const image = new Image();
        image.onload = () => {
          if (!cancelled) tilePlacementImage = image;
        };
        image.onerror = () => {
          if (!cancelled) tilePlacementImage = null;
        };
        image.src = source;
      })
      .catch(() => {
        if (!cancelled) tilePlacementImage = null;
      });
    return () => {
      cancelled = true;
    };
  });

  let replacementInput = $state<HTMLInputElement | null>(null);
  let replacingImage = $state(false);

  async function replaceActiveMapImage(file: File) {
    const mapId = mapStore.activeMapId;
    if (!mapId) return;

    replacingImage = true;
    try {
      if (!(await mapStore.replaceMapImage(mapId, file))) {
        notificationStore.notify(
          "That image could not be used. Try a different file.",
          "error",
        );
      }
    } finally {
      replacingImage = false;
    }
  }

  function handleReplacementSelected(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) void replaceActiveMapImage(file);
  }

  function retryImageLoad() {
    // Forget the last synced signature so the effect below reloads the asset.
    lastMapSignature = null;
    retryNonce += 1;
  }

  $effect(() => {
    void retryNonce;
    if (activeMapSignature === lastMapSignature) {
      return;
    }
    lastMapSignature = activeMapSignature;
    return mapAssets.sync(mapStore.activeMap);
  });

  $effect(() => {
    const activeMap = mapStore.activeMap;
    const fogMaskPath = activeMap?.fogOfWar?.maskPath ?? null;

    if (!activeMap || !fogMaskPath) {
      loadedMaskPath = null;
      return;
    }

    if (fogMaskPath === loadedMaskPath) {
      return;
    }

    let cancelled = false;
    void mapStore
      .loadMask(activeMap.dimensions.width, activeMap.dimensions.height)
      .then((mask) => {
        if (cancelled) return;
        maskCanvas = mask;
        mapStore.fogRevision++;
        loadedMaskPath = fogMaskPath;
      });

    return () => {
      cancelled = true;
    };
  });

  const hasBackgroundImage = $derived(Boolean(mapStore.activeMap?.assetPath));

  $effect(() => {
    const tokens = visionSourceTokens;
    const revealSignature = visionRevealSignature(
      tokens,
      mapStore.visionRange,
      mapSession.gridDistance,
      mapStore.gridSize,
      mapStore.gridType,
      mapStore.showGrid,
      mapStore.isGMMode,
      sessionModeStore.isGuestMode,
      mapStore.activeMapId,
      mapStore.soloFog,
      mapStore.showFog,
      mapSession.gridUnit,
      Boolean(maskCanvas),
      Boolean(mapImage),
    );
    if (!revealSignature) return;

    void untrack(() => soloRecorder.onVisionChanged(tokens)).then(
      async (revealed) => {
        if (!interactions.tokenDrag.dragState)
          await soloRecorder.onMoveSettled(tokens);
        if (revealed && mapSession.vttEnabled) {
          void broadcastActiveMapFogSync();
        }
      },
    );
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={container}
  class="flex-1 min-h-0 w-full h-full bg-theme-bg overflow-hidden relative select-none"
  style:background-image="var(--bg-texture)"
  style:touch-action="none"
  role="application"
  aria-roledescription="map"
  aria-label="Interactive map. Use arrow keys to pan and plus or minus keys to zoom."
  tabindex="0"
  onmouseenter={interactions.onMouseEnter}
  onmouseleave={interactions.onMouseLeave}
  onpointerdown={interactions.onPointerDown}
  onpointermove={interactions.onPointerMove}
  onpointerup={interactions.onPointerUp}
  onpointercancel={interactions.onPointerCancel}
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
    tilePlacementPreview={enrichedTilePlacementPreview}
    {interactions}
  />

  {#if hasBackgroundImage && !mapImage}
    <div
      class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-theme-bg/40 px-6 backdrop-blur-sm"
      transition:fade
    >
      {#if imageLoadFailed}
        <div
          class="pointer-events-auto flex max-w-sm flex-col items-center gap-3 text-center"
          role="alert"
          data-testid="map-image-error"
        >
          <span
            class="icon-[lucide--image-off] h-10 w-10 text-theme-muted"
            aria-hidden="true"
          ></span>
          <p class="text-sm text-theme-text">
            This map's image could not be loaded. It may be missing from this
            device or the connection may have dropped. You can try again, or
            choose a new image to keep this map's pins and notes.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              class="touch-target rounded-lg bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-bg hover:bg-theme-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50"
              onclick={retryImageLoad}
              disabled={replacingImage}
            >
              Try again
            </button>
            {#if !sessionModeStore.isGuestMode}
              <button
                type="button"
                class="touch-target rounded-lg border border-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:opacity-50"
                onclick={() => replacementInput?.click()}
                disabled={replacingImage}
                data-testid="map-image-replace"
              >
                {replacingImage ? "Replacing…" : "Choose a new image"}
              </button>
              <input
                bind:this={replacementInput}
                type="file"
                accept="image/*"
                class="sr-only"
                tabindex="-1"
                aria-hidden="true"
                data-testid="map-image-replace-input"
                onchange={handleReplacementSelected}
              />
            {/if}
          </div>
        </div>
      {:else}
        <div class="flex flex-col items-center gap-4" role="status">
          <div
            class="h-12 w-12 animate-spin rounded-full border-4 border-theme-primary border-t-transparent"
          ></div>
          <div
            class="animate-pulse text-center font-mono text-micro uppercase tracking-[0.2em] text-theme-primary"
          >
            Synthesizing Spatial Asset...
          </div>
        </div>
      {/if}
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
      hex={interactions.contextMenu.hex}
      onToggleHexFog={(hex) =>
        void interactions.fogInteractions.paintHex(hex, !hex.fogged)}
      onClose={() => (interactions.contextMenu = null)}
    />
  {/if}

  {@render children?.()}
</div>

<svelte:window onkeydown={interactions.onGlobalKeyDown} />

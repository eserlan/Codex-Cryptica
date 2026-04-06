<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { uiStore } from "../../stores/ui.svelte";
  import { themeStore } from "../../stores/theme.svelte";
  import { oracle } from "../../stores/oracle.svelte";
  import { mapSession } from "../../stores/map-session.svelte";
  import { p2pGuestService } from "../../cloud-bridge/p2p/guest-service";
  import { p2pHost } from "../../cloud-bridge/p2p/host-service.svelte";
  import { hexToRgb } from "../../utils/color";
  import { renderMap } from "map-engine";
  import PinLinker from "./PinLinker.svelte";
  import {
    findClickedPin,
    getKeyboardViewportUpdate,
    getZoomViewportUpdate,
    isClickGesture,
  } from "./map-view-helpers";
  import { MapFogPainter } from "./map-fog-painter";
  import { MapViewAssetLoader } from "./map-view-loader";
  import MapPinPopover from "./MapPinPopover.svelte";
  import { hitTestToken, measureDistance } from "$lib/utils/vtt-helpers";

  let { children }: { children?: Snippet } = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let container = $state<HTMLDivElement | null>(null);
  let mapImage = $state<HTMLImageElement | null>(null);
  let maskCanvas = $state<HTMLCanvasElement | null>(null);
  let selectedPinId = $state<string | null>(null);
  let animationFrameId: number;
  let mapAnnouncement = $state("");
  // Plain (non-reactive) mirrors for the rAF draw loop — Svelte 5 $state
  // signals may not be reliably readable from requestAnimationFrame callbacks.
  let _drawImage: HTMLImageElement | null = null;
  let _drawMask: HTMLCanvasElement | null = null;
  let painter: MapFogPainter;

  painter = new MapFogPainter({
    mapStore,
    oracle,
    getMaskCanvas: () => maskCanvas,
    getMapImage: () => mapImage,
    createCanvas: () => document.createElement("canvas"),
  });

  const mapAssets = new MapViewAssetLoader({
    vault,
    mapStore,
    createImage: () => new Image(),
    onClear: () => {
      painter.cancel();
      mapImage = null;
      _drawImage = null;
      maskCanvas = null;
      _drawMask = null;
    },
    onImageLoaded: (img) => {
      _drawImage = img;
      mapImage = img;
    },
    onMaskLoaded: (mask) => {
      maskCanvas = mask;
      _drawMask = mask;
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

  let selectedPin = $derived(mapStore.pins.find((p) => p.id === selectedPinId));
  let subMapForSelected = $derived(
    selectedPin?.entityId
      ? mapStore.getEntitySubMap(selectedPin.entityId)
      : null,
  );
  const activeMapSignature = $derived.by(() => {
    const activeMap = mapStore.activeMap;
    if (!activeMap) return null;
    return `${activeMap.id}:${activeMap.assetPath}:${activeMap.dimensions.width}x${activeMap.dimensions.height}`;
  });
  let lastMapSignature: string | null = null;
  let loadedMaskPath = $state<string | null>(null);

  const fogColor = $derived(
    `rgba(${hexToRgb(themeStore.activeTheme.tokens.secondary)}, ${mapStore.isGMMode ? 0.6 : 1.0})`,
  );
  const gridColor = $derived.by(() => {
    const baseColor =
      mapStore.gridColor || themeStore.activeTheme.tokens.primary;
    const rgb = baseColor.startsWith("#") ? hexToRgb(baseColor) : baseColor;
    return `rgba(${rgb}, 0.55)`;
  });
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
  const vttPings = $derived.by(() => Object.values(mapSession.pings));
  const vttTokens = $derived.by(() =>
    Object.values(mapSession.tokens).map((token) => ({
      ...token,
      label: token.name,
      image: tokenImageCache[token.id] ?? null,
      selected: mapSession.selection === token.id,
      active: mapSession.activeTokenId === token.id,
      visible: true,
    })),
  );

  $effect(() => {
    const currentTokens = Object.values(mapSession.tokens);
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
    handleResize();
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
      _drawMask = mask;
      loadedMaskPath = fogMaskPath;
    });

    return () => {
      cancelled = true;
    };
  });

  function handleResize() {
    if (container && canvas) {
      const w = container.clientWidth;
      const h = container.clientHeight;

      canvas.width = w;
      canvas.height = h;
      mapStore.setCanvasSize(w, h);
    }
  }

  function draw() {
    if (canvas) {
      const canvasSize = {
        width: canvas.width || 1,
        height: canvas.height || 1,
      };

      // Sync non-reactive mirror variables for the render loop
      _drawMask = maskCanvas;

      // Keep mapStore in sync so project/unproject calls stay accurate
      if (
        canvasSize.width !== mapStore.canvasSize.width ||
        canvasSize.height !== mapStore.canvasSize.height
      ) {
        mapStore.setCanvasSize(canvasSize.width, canvasSize.height);
      }

      renderMap({
        canvas: canvas,
        image: _drawImage,
        transform: mapStore.viewport,
        canvasSize,
        pins: mapStore.pins,
        maskCanvas: _drawMask,
        showFog: mapStore.showFog,
        fogColor,
        grid: {
          type: mapStore.showGrid ? "square" : "none",
          size: mapStore.gridSize,
          color: gridColor,
          opacity: 0.65,
        },
        tokens: vttTokens,
        measurement: vttMeasurement,
      });

      if (vttPings.length > 0) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const now = Date.now();
          const PING_DURATION = 3000;
          for (const ping of vttPings) {
            const elapsed = now - ping.timestamp;
            if (elapsed > PING_DURATION) continue;

            const progress = elapsed / PING_DURATION; // 0 to 1
            const pingPoint = mapStore.project({
              x: ping.x,
              y: ping.y,
            });

            ctx.save();

            // Single expanding wave
            // Start radius: if it was a token ping (centered on token), we want it to start at the edge.
            // Since we don't store "isTokenPing", we'll use a heuristic or just a sensible base.
            // Default base is 25px (half of standard 50px grid).
            const baseRadius = 25 * mapStore.viewport.zoom;
            const expandRange = 40 * mapStore.viewport.zoom;
            const radius = baseRadius + progress * expandRange;
            const opacity = 1 - progress;

            ctx.beginPath();
            ctx.arc(pingPoint.x, pingPoint.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = ping.color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 4 * (1 - progress) + 1;

            // Glow effect
            ctx.shadowColor = ping.color;
            ctx.shadowBlur = 10 * opacity;
            ctx.stroke();

            // Minimal center dot for orientation
            ctx.globalAlpha = opacity * 0.5;
            ctx.beginPath();
            ctx.arc(pingPoint.x, pingPoint.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = ping.color;
            ctx.fill();

            ctx.restore();
          }
        }
      }

      // Render Visual Brush Indicator directly on canvas for zero-lag tracking
      if (mapStore.isGMMode && isAltPressed && isPointerOver) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          const primaryRGB = hexToRgb(themeStore.activeTheme.tokens.primary);

          // Outer circle
          ctx.beginPath();
          ctx.arc(
            lastMousePos.x,
            lastMousePos.y,
            visualBrushRadius,
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = `rgba(${primaryRGB}, 0.5)`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Fill
          ctx.fillStyle = `rgba(${primaryRGB}, 0.1)`;
          ctx.fill();

          // Center dot
          ctx.beginPath();
          ctx.arc(lastMousePos.x, lastMousePos.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${primaryRGB}, 0.5)`;
          ctx.fill();

          ctx.restore();
        }
      }
    }
    animationFrameId = requestAnimationFrame(draw);
  }

  onMount(() => {
    // Initial resize, delayed slightly to ensure DOM is painted
    setTimeout(handleResize, 10);
    const resizeObserver = new ResizeObserver(handleResize);
    if (container) resizeObserver.observe(container);

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  });

  // Interaction handlers
  const KEYBOARD_PAN_STEP = 50;
  const KEYBOARD_ZOOM_STEP = 0.1;
  let isPanning = false;
  let lastMousePos = $state({ x: 0, y: 0 });
  let mouseDownPos = { x: 0, y: 0 };
  let isAltPressed = $state(false);
  let isPointerOver = $state(false);
  let cachedRect: DOMRect | null = null;
  let dragState = $state<{
    tokenId: string;
    offset: { x: number; y: number };
  } | null>(null);
  let tokenImageCache = $state<Record<string, HTMLImageElement | null>>({});
  let tokenImageSourceCache = $state<Record<string, string>>({});
  let contextMenu = $state<{
    x: number;
    y: number;
    imgX: number;
    imgY: number;
    tokenId?: string;
  } | null>(null);
  let showResizeSubmenu = $state(false);

  const visualBrushRadius = $derived(
    mapStore.brushRadius * mapStore.viewport.zoom,
  );

  function updateCachedRect() {
    if (container) {
      cachedRect = container.getBoundingClientRect();
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    const { key, altKey } = event;
    isAltPressed = altKey;
    const viewport = mapStore.viewport;

    if (!viewport) return;

    const update = getKeyboardViewportUpdate(key, viewport, {
      panStep: KEYBOARD_PAN_STEP,
      zoomStep: KEYBOARD_ZOOM_STEP,
    });

    if (update) {
      mapStore.updateViewport(update.pan, update.zoom);
      mapAnnouncement = update.announcement;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    isAltPressed = event.altKey;
  }

  function onMouseDown(e: MouseEvent) {
    contextMenu = null;
    showResizeSubmenu = false;
    updateCachedRect();
    if (cachedRect) {
      lastMousePos = {
        x: e.clientX - cachedRect.left,
        y: e.clientY - cachedRect.top,
      };
    }
    mouseDownPos = { x: e.clientX, y: e.clientY };
    isAltPressed = e.altKey;

    if (mapSession.vttEnabled && cachedRect) {
      const hitToken = hitTestToken(
        Object.values(mapSession.tokens),
        (point) => mapStore.project(point),
        lastMousePos.x,
        lastMousePos.y,
      );

      if (
        hitToken &&
        mapSession.canMoveToken(
          hitToken.id,
          p2pGuestService.peerId,
          mapStore.isGMMode,
        )
      ) {
        const imgPoint = mapStore.unproject(lastMousePos);
        dragState = {
          tokenId: hitToken.id,
          offset: {
            x: imgPoint.x - hitToken.x,
            y: imgPoint.y - hitToken.y,
          },
        };
        mapSession.setSelection(hitToken.id);
        isPanning = false;
        return;
      }
    }

    if (mapStore.isGMMode && e.altKey) {
      painter.begin(
        { x: lastMousePos.x, y: lastMousePos.y },
        e.shiftKey || e.ctrlKey || e.metaKey,
      );
    } else if (e.button === 0) {
      isPanning = true;
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!cachedRect) updateCachedRect();
    if (!cachedRect) return;

    const mouseX = e.clientX - cachedRect.left;
    const mouseY = e.clientY - cachedRect.top;
    isAltPressed = e.altKey;

    if (dragState) {
      const imgPoint = mapStore.unproject({ x: mouseX, y: mouseY });
      const nextX = imgPoint.x - dragState.offset.x;
      const nextY = imgPoint.y - dragState.offset.y;
      if (mapStore.isGMMode) {
        mapSession.moveToken(dragState.tokenId, nextX, nextY);
      } else {
        mapSession.requestTokenMove(dragState.tokenId, nextX, nextY);
        p2pGuestService.requestTokenMove(dragState.tokenId, nextX, nextY);
      }
      lastMousePos = { x: mouseX, y: mouseY };
      return;
    }

    if (painter.isPainting) {
      painter.move(
        { x: mouseX, y: mouseY },
        e.shiftKey || e.ctrlKey || e.metaKey,
      );
    } else if (
      mapSession.measurement.active &&
      mapSession.measurement.start &&
      !mapSession.measurement.locked
    ) {
      const imgPoint = mapStore.unproject({ x: mouseX, y: mouseY });
      mapSession.setMeasurementEnd(imgPoint, true);
    } else if (isPanning && !isAltPressed) {
      const dx = mouseX - lastMousePos.x;
      const dy = mouseY - lastMousePos.y;

      mapStore.updateViewport(
        { x: mapStore.viewport.pan.x + dx, y: mapStore.viewport.pan.y + dy },
        mapStore.viewport.zoom,
      );
    }
    lastMousePos = { x: mouseX, y: mouseY };
  }

  function onMouseEnter() {
    isPointerOver = true;
    updateCachedRect();
  }

  function onMouseLeave() {
    isPointerOver = false;
  }

  async function onMouseUp(e: MouseEvent) {
    if (painter.isPainting) {
      const finished = await painter.finish();
      if (
        finished &&
        mapStore.isGMMode &&
        !uiStore.isGuestMode &&
        mapSession.vttEnabled
      ) {
        void p2pHost.broadcastActiveMapFogSync();
      }
    }

    if (dragState) {
      dragState = null;
      isPanning = false;
      return;
    }

    if (isPanning) {
      if (
        isClickGesture(
          { x: mouseDownPos.x, y: mouseDownPos.y },
          { x: e.clientX, y: e.clientY },
        )
      ) {
        handleMapClick(e);
      }
    }
    isPanning = false;
  }

  function handleMapClick(e: MouseEvent) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mapSession.vttEnabled) {
      const hitToken = hitTestToken(
        Object.values(mapSession.tokens),
        (point) => mapStore.project(point),
        x,
        y,
      );

      if (hitToken) {
        mapSession.setSelection(hitToken.id);
        selectedPinId = null;
        return;
      }

      mapSession.setSelection(null);
      if (mapSession.measurement.active) {
        const imgCoords = mapStore.unproject({ x, y });
        if (!mapSession.measurement.start) {
          mapSession.setMeasurementStart(imgCoords);
        } else if (!mapSession.measurement.locked) {
          mapSession.setMeasurementEnd(imgCoords);
          mapSession.setMeasurementLocked(true);
        } else {
          mapSession.setMeasurementStart(imgCoords);
        }
      }
      return;
    }

    const clickedPin = findClickedPin(
      mapStore.pins,
      (point) => mapStore.project(point),
      x,
      y,
    );

    if (clickedPin) {
      selectedPinId = clickedPin.id;
      if (clickedPin.entityId) {
        vault.selectedEntityId = clickedPin.entityId;
      }
    } else {
      selectedPinId = null;
    }
  }

  function onDoubleClick(e: MouseEvent) {
    contextMenu = null;
    showResizeSubmenu = false;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const imgCoords = mapStore.unproject({ x, y });
    if (mapSession.vttEnabled && mapStore.isGMMode && !uiStore.isGuestMode) {
      mapSession.pendingTokenCoords = imgCoords;
    } else if (!mapSession.vttEnabled) {
      mapStore.pendingPinCoords = imgCoords;
    }
  }

  function onContextMenu(e: MouseEvent) {
    if (!mapSession.vttEnabled || !container) return;
    e.preventDefault();

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitToken = hitTestToken(
      Object.values(mapSession.tokens),
      (point) => mapStore.project(point),
      x,
      y,
    );

    const imgCoords = mapStore.unproject({ x, y });
    showResizeSubmenu = false;
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      imgX: imgCoords.x,
      imgY: imgCoords.y,
      tokenId: hitToken?.id,
    };
  }
  function onWheel(e: WheelEvent) {
    const canResize =
      mapSession.vttEnabled && mapStore.isGMMode && !uiStore.isGuestMode;
    if (e.shiftKey && canResize) {
      if (!container) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const hitToken = hitTestToken(
        Object.values(mapSession.tokens),
        (point) => mapStore.project(point),
        mouseX,
        mouseY,
      );

      if (hitToken) {
        const gridSize = mapStore.gridSize || 50;
        const currentScale = Math.round(hitToken.width / gridSize);
        let nextScale = currentScale + (e.deltaY < 0 ? 1 : -1);
        nextScale = Math.max(1, Math.min(4, nextScale));

        if (nextScale !== currentScale) {
          mapSession.updateToken(hitToken.id, {
            width: nextScale * gridSize,
            height: nextScale * gridSize,
          });
        }
        return;
      }
    }

    e.preventDefault();
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const update = getZoomViewportUpdate({
      mouse: { x: mouseX, y: mouseY },
      canvasSize: mapStore.canvasSize,
      viewport: mapStore.viewport,
      deltaY: e.deltaY,
      altHeld: isAltPressed,
    });

    mapStore.updateViewport(update.pan, update.zoom);
    mapAnnouncement = update.announcement;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={container}
  class="flex-1 min-h-0 w-full h-full bg-theme-bg overflow-hidden relative select-none"
  role="application"
  aria-roledescription="map"
  aria-label="Interactive map. Use arrow keys to pan and plus or minus keys to zoom."
  tabindex="0"
  onmouseenter={onMouseEnter}
  onmouseleave={onMouseLeave}
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  ondblclick={onDoubleClick}
  oncontextmenu={onContextMenu}
  onwheel={onWheel}
  onkeydown={onKeyDown}
  onkeyup={onKeyUp}
>
  <canvas bind:this={canvas} class="absolute inset-0"></canvas>

  {#if !mapImage}
    <div
      class="absolute inset-0 flex items-center justify-center bg-theme-bg/40 backdrop-blur-sm z-50"
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
    {mapAnnouncement}
  </div>

  {#if mapStore.pendingPinCoords}
    <PinLinker
      onSelect={(id) => {
        mapStore.addPin(id, mapStore.pendingPinCoords!);
        mapStore.pendingPinCoords = null;
      }}
      onCancel={() => {
        mapStore.addPin(undefined, mapStore.pendingPinCoords!);
        mapStore.pendingPinCoords = null;
      }}
    />
  {/if}

  {#if selectedPin}
    {@const pos = mapStore.project(selectedPin.coordinates)}
    <MapPinPopover
      x={pos.x}
      y={pos.y}
      entity={selectedPin.entityId
        ? vault.entities[selectedPin.entityId]
        : null}
      subMap={subMapForSelected}
      onOpenEntity={(entityId) => uiStore.openZenMode(entityId)}
      onEnterSubmap={(mapId) => mapStore.selectMap(mapId, true)}
      onDelete={() => {
        if (selectedPinId) {
          mapStore.removePin(selectedPinId);
          selectedPinId = null;
        }
      }}
      onClose={() => (selectedPinId = null)}
    />
  {/if}

  {#if contextMenu}
    <div
      class="fixed z-[1000] bg-theme-surface border border-theme-border rounded shadow-2xl py-1 min-w-[140px]"
      style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
      transition:fade={{ duration: 100 }}
      role="presentation"
      onmousedown={(e) => e.stopPropagation()}
    >
      {#if contextMenu.tokenId}
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
          onclick={() => {
            if (contextMenu?.tokenId) {
              mapSession.pingToken(contextMenu.tokenId);
              contextMenu = null;
            }
          }}
        >
          <span class="icon-[lucide--radar] w-3.5 h-3.5 text-theme-primary"
          ></span>
          <span>Ping Token</span>
        </button>

        <div class="h-px bg-theme-border my-1 mx-2"></div>

        <!-- Removal -->
        {#if mapStore.isGMMode && !uiStore.isGuestMode}
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
            onclick={() => {
              if (contextMenu?.tokenId) {
                mapSession.cloneToken(contextMenu.tokenId);
                contextMenu = null;
              }
            }}
          >
            <span class="icon-[lucide--copy-plus] w-3.5 h-3.5"></span>
            <span>Clone Token</span>
          </button>
        {/if}

        {#if mapStore.isGMMode && !uiStore.isGuestMode}
          <button
            class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-red-400"
            onclick={() => {
              if (contextMenu?.tokenId) {
                mapSession.removeToken(contextMenu.tokenId);
                contextMenu = null;
              }
            }}
          >
            <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
            <span>Remove Token</span>
          </button>
        {/if}

        <!-- Resize Submenu Trigger (Host only) -->
        {#if mapStore.isGMMode && !uiStore.isGuestMode}
          <div class="relative group" role="presentation">
            <button
              class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center justify-between gap-2"
              onmouseenter={() => (showResizeSubmenu = true)}
            >
              <div class="flex items-center gap-2">
                <span class="icon-[lucide--maximize] w-3.5 h-3.5"></span>
                <span>Resize</span>
              </div>
              <span class="icon-[lucide--chevron-right] w-3 h-3 opacity-50"
              ></span>
            </button>

            {#if showResizeSubmenu}
              <div
                class="absolute left-full top-0 ml-px bg-theme-surface border border-theme-border rounded shadow-2xl py-1 min-w-[100px]"
                role="presentation"
                onmouseleave={() => (showResizeSubmenu = false)}
              >
                {#each [1, 2, 3, 4] as scale (scale)}
                  <button
                    class="w-full text-left px-4 py-2 text-xs hover:bg-theme-primary/20 hover:text-theme-primary transition-colors font-mono"
                    onclick={() => {
                      if (contextMenu?.tokenId) {
                        const gridSize = mapStore.gridSize || 50;
                        const token = mapSession.tokens[contextMenu.tokenId];
                        if (token) {
                          const snappedX =
                            Math.round(token.x / gridSize) * gridSize;
                          const snappedY =
                            Math.round(token.y / gridSize) * gridSize;

                          mapSession.updateToken(contextMenu.tokenId, {
                            x: snappedX,
                            y: snappedY,
                            width: scale * gridSize,
                            height: scale * gridSize,
                          });
                        }
                        contextMenu = null;
                        showResizeSubmenu = false;
                      }
                    }}
                  >
                    {scale}x{scale}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {:else}
        <button
          class="w-full text-left px-3 py-2 text-xs hover:bg-theme-bg/50 transition-colors flex items-center gap-2 text-theme-text"
          onclick={() => {
            if (contextMenu) {
              mapSession.ping(contextMenu.imgX, contextMenu.imgY);
              contextMenu = null;
            }
          }}
        >
          <span class="icon-[lucide--map-pin] w-3.5 h-3.5 text-theme-primary"
          ></span>
          <span>Ping Here</span>
        </button>
      {/if}
    </div>
  {/if}

  {@render children?.()}
</div>

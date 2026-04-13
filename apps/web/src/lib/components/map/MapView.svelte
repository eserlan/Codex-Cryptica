<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { uiStore } from "../../stores/ui.svelte";
  import { themeStore } from "../../stores/theme.svelte";
  import { oracle } from "../../stores/oracle.svelte";
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

  const fogColor = $derived(
    `rgba(${hexToRgb(themeStore.activeTheme.tokens.secondary)}, ${mapStore.isGMMode ? 0.6 : 1.0})`,
  );
  const gridColor = $derived(
    `rgba(${hexToRgb(themeStore.activeTheme.tokens.primary)}, 0.2)`,
  );

  $effect(() => {
    handleResize();
    return mapAssets.sync(mapStore.activeMap);
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
          opacity: 0.5,
        },
      });

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
    updateCachedRect();
    if (cachedRect) {
      lastMousePos = {
        x: e.clientX - cachedRect.left,
        y: e.clientY - cachedRect.top,
      };
    }
    mouseDownPos = { x: e.clientX, y: e.clientY };
    isAltPressed = e.altKey;

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

    if (painter.isPainting) {
      painter.move(
        { x: mouseX, y: mouseY },
        e.shiftKey || e.ctrlKey || e.metaKey,
      );
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
      await painter.finish();
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
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const imgCoords = mapStore.unproject({ x, y });
    mapStore.pendingPinCoords = imgCoords;
  }

  function onWheel(e: WheelEvent) {
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
  style:background-image="var(--bg-texture)"
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

  {@render children?.()}
</div>

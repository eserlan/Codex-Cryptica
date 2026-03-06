<script lang="ts">
  import { onMount, untrack, type Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { uiStore } from "../../stores/ui.svelte";
  import { themeStore } from "../../stores/theme.svelte";
  import { hexToRgb } from "../../utils/color";
  import { renderMap } from "map-engine";
  import PinLinker from "./PinLinker.svelte";

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
    const activeMap = mapStore.activeMap;

    if (activeMap) {
      // Immediately clear stale state
      mapImage = null;
      _drawImage = null;
      maskCanvas = null;
      _drawMask = null;
      handleResize();

      let canceled = false;
      const img = new Image();
      img.crossOrigin = "anonymous";
      let blobUrl = "";

      vault
        .resolveImageUrl(activeMap.assetPath)
        .then((url) => {
          if (canceled) return;
          if (!url) {
            console.error(
              "[MapView] Failed to resolve image URL for:",
              activeMap.assetPath,
            );
            return;
          }
          blobUrl = url;
          img.src = url;

          img.onload = async () => {
            if (canceled) return;

            // Mirror to draw loop immediately
            _drawImage = img;
            mapImage = img;

            const loadedMask = await mapStore.loadMask(img.width, img.height);
            if (canceled) return;

            maskCanvas = loadedMask;
            _drawMask = loadedMask;

            // Persist dimensions if not set (first load of this asset)
            untrack(() => {
              if (
                activeMap.id === mapStore.activeMapId &&
                activeMap.dimensions.width === 0
              ) {
                vault.maps[activeMap.id].dimensions = {
                  width: img.width,
                  height: img.height,
                };
                vault.saveMaps();
              }
            });
          };
          img.onerror = (err) => {
            console.error("[MapView] Image load failed:", url, err);
          };
        })
        .catch((err) => {
          console.error("[MapView] Error during resolveImageUrl:", err);
        });

      return () => {
        canceled = true;
        mapImage = null;
        _drawImage = null;
        maskCanvas = null;
        _drawMask = null;
        if (blobUrl.startsWith("blob:")) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    } else {
      mapImage = null;
      _drawImage = null;
      maskCanvas = null;
      _drawMask = null;
    }
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
  let isPainting = false;
  let needsMaskUpdate = false;
  let lastMousePos = { x: 0, y: 0 };
  let mouseDownPos = { x: 0, y: 0 };

  function onKeyDown(event: KeyboardEvent) {
    const { key } = event;
    const viewport = mapStore.viewport;
    let handled = false;

    if (!viewport) return;

    let { pan, zoom } = viewport;

    switch (key) {
      case "ArrowUp":
        pan = { x: pan.x, y: pan.y + KEYBOARD_PAN_STEP };
        mapStore.updateViewport(pan, zoom);
        mapAnnouncement = "Map panned up";
        handled = true;
        break;
      case "ArrowDown":
        pan = { x: pan.x, y: pan.y - KEYBOARD_PAN_STEP };
        mapStore.updateViewport(pan, zoom);
        mapAnnouncement = "Map panned down";
        handled = true;
        break;
      case "ArrowLeft":
        pan = { x: pan.x + KEYBOARD_PAN_STEP, y: pan.y };
        mapStore.updateViewport(pan, zoom);
        mapAnnouncement = "Map panned left";
        handled = true;
        break;
      case "ArrowRight":
        pan = { x: pan.x - KEYBOARD_PAN_STEP, y: pan.y };
        mapStore.updateViewport(pan, zoom);
        mapAnnouncement = "Map panned right";
        handled = true;
        break;
      case "+":
      case "=": {
        const newZoom = Math.max(0.1, Math.min(10, zoom + KEYBOARD_ZOOM_STEP));
        mapStore.updateViewport(pan, newZoom);
        mapAnnouncement = `Zoom level ${newZoom.toFixed(2)}`;
        handled = true;
        break;
      }
      case "-": {
        const newZoom = Math.max(0.1, Math.min(10, zoom - KEYBOARD_ZOOM_STEP));
        mapStore.updateViewport(pan, newZoom);
        mapAnnouncement = `Zoom level ${newZoom.toFixed(2)}`;
        handled = true;
        break;
      }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function onMouseDown(e: MouseEvent) {
    mouseDownPos = { x: e.clientX, y: e.clientY };
    lastMousePos = { x: e.clientX, y: e.clientY };

    if (mapStore.isGMMode && e.altKey) {
      isPainting = true;
      paintFog(e);
    } else if (e.button === 0) {
      isPanning = true;
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (isPainting) {
      paintFog(e);
    } else if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;

      mapStore.updateViewport(
        { x: mapStore.viewport.pan.x + dx, y: mapStore.viewport.pan.y + dy },
        mapStore.viewport.zoom,
      );
    }
    lastMousePos = { x: e.clientX, y: e.clientY };
  }

  function paintFog(e: MouseEvent) {
    if (!maskCanvas || !container || !mapImage || needsMaskUpdate) {
      return;
    }

    needsMaskUpdate = true;

    requestAnimationFrame(() => {
      if (!container || !maskCanvas || !mapImage || !mapStore.activeMapId) {
        needsMaskUpdate = false;
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const imgCoords = mapStore.unproject({ x, y });
      const ctx = maskCanvas!.getContext("2d")!;

      ctx.save();

      const isHiding = e.shiftKey || e.ctrlKey || e.metaKey;

      // In maskCanvas, transparent means "hidden", opacity means "revealed (punched hole)"
      // Default Alt+drag = REVEAL (white opacity in the mask)
      // Alt+Shift+drag or Alt+Ctrl+drag = HIDE (erase the mask canvas, restoring the fog)
      if (isHiding) {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.fillStyle = "white";
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.beginPath();
      ctx.arc(
        imgCoords.x + mapImage!.width / 2,
        imgCoords.y + mapImage!.height / 2,
        mapStore.brushRadius / mapStore.viewport.zoom,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
      needsMaskUpdate = false;
    });
  }

  async function onMouseUp(e: MouseEvent) {
    console.log("[MapView] mouseup, wasPainting:", isPainting);
    if (isPainting) {
      await mapStore.saveMask(maskCanvas!);
    }

    if (isPanning) {
      const dist = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
          Math.pow(e.clientY - mouseDownPos.y, 2),
      );

      // If it was a click (small movement)
      if (dist < 5) {
        handleMapClick(e);
      }
    }
    isPanning = false;
    isPainting = false;
  }

  function handleMapClick(e: MouseEvent) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked a pin
    const clickedPin = mapStore.pins.find((p) => {
      const pinPos = mapStore.project(p.coordinates);
      const dist = Math.sqrt(
        Math.pow(x - pinPos.x, 2) + Math.pow(y - pinPos.y, 2),
      );
      return dist < 15;
    });

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

    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    const oldZoom = mapStore.viewport.zoom;
    const newZoom = Math.max(0.1, Math.min(10, oldZoom + delta));

    // To zoom on mouse:
    // pan_new = mouse - (mouse - pan_old) * (zoom_new / zoom_old)
    // Actually, since our coordinate space is centered:
    // pos_rel = (mouse - canvas/2 - pan) / zoom
    // pan_new = mouse - canvas/2 - pos_rel * zoom_new

    const panX = mouseX - mapStore.canvasSize.width / 2;
    const panY = mouseY - mapStore.canvasSize.height / 2;

    const relX = (panX - mapStore.viewport.pan.x) / oldZoom;
    const relY = (panY - mapStore.viewport.pan.y) / oldZoom;

    const newPanX = panX - relX * newZoom;
    const newPanY = panY - relY * newZoom;

    mapStore.updateViewport({ x: newPanX, y: newPanY }, newZoom);
    mapAnnouncement = `Zoom level ${newZoom.toFixed(2)}`;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
<div
  bind:this={container}
  class="flex-1 min-h-0 w-full h-full bg-theme-bg overflow-hidden relative select-none"
  role="application"
  aria-label="Interactive map. Use arrow keys to pan and plus or minus keys to zoom."
  tabindex="0"
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  ondblclick={onDoubleClick}
  onwheel={onWheel}
  onkeydown={onKeyDown}
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
    <div
      class="absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+12px)] pointer-events-auto"
      style:left="{pos.x}px"
      style:top="{pos.y}px"
      onmousedown={(e) => e.stopPropagation()}
      onmouseup={(e) => e.stopPropagation()}
      onclick={(e) => e.stopPropagation()}
      role="none"
    >
      <div
        class="bg-theme-surface border border-theme-border rounded-lg shadow-2xl p-1 flex items-center gap-0.5"
      >
        {#if selectedPin.entityId}
          {@const entity = vault.entities[selectedPin.entityId]}
          {#if entity}
            <button
              class="px-3 py-1.5 text-[10px] font-bold text-theme-text hover:text-theme-primary transition-colors uppercase font-header tracking-widest whitespace-nowrap border-r border-theme-border mr-1"
              onclick={() => uiStore.openZenMode(entity.id)}
            >
              {entity.title}
            </button>
          {/if}
        {/if}

        {#if subMapForSelected}
          <button
            class="p-1.5 text-theme-primary hover:text-theme-text transition-colors rounded-md hover:bg-theme-primary/10 group/map mx-0.5"
            onclick={() => mapStore.selectMap(subMapForSelected!.id, true)}
            title="Enter Sub-map"
          >
            <span
              class="icon-[lucide--map] w-3.5 h-3.5 group-hover/map:scale-110 transition-transform"
            ></span>
          </button>
        {/if}

        <div class="flex items-center gap-0.5 ml-auto">
          <button
            class="p-1.5 text-theme-muted hover:text-red-500 transition-colors rounded-md hover:bg-red-500/10"
            onclick={() => {
              if (selectedPinId) {
                mapStore.removePin(selectedPinId);
                selectedPinId = null;
              }
            }}
            aria-label="Delete pin"
          >
            <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
          </button>
          <button
            class="p-1.5 text-theme-muted hover:text-theme-text transition-colors rounded-md hover:bg-theme-primary/10"
            onclick={() => (selectedPinId = null)}
            aria-label="Close pin details"
          >
            <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
          </button>
        </div>
      </div>
      <div
        class="w-2 h-2 bg-theme-surface border-r border-b border-theme-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"
      ></div>
    </div>
  {/if}

  {@render children?.()}
</div>

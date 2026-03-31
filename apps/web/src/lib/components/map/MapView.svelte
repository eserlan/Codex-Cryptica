<script lang="ts">
  import { onMount, untrack, type Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { uiStore } from "../../stores/ui.svelte";
  import { themeStore } from "../../stores/theme.svelte";
  import { oracle } from "../../stores/oracle.svelte";
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

      const assetPath = activeMap.assetPath;

      vault
        .resolveImageUrl(assetPath)
        .then((url) => {
          if (canceled) return;
          if (!url) {
            console.error(
              "[MapView] Failed to resolve image URL for:",
              assetPath,
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
        if (blobUrl) {
          vault.releaseImageUrl(assetPath);
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
  let isPainting = false;
  let maskSnapshot: HTMLCanvasElement | null = null;
  let lastMousePos = $state({ x: 0, y: 0 });
  let lastPaintPos: { x: number; y: number } | null = null;
  let lastPaintImgCoords: { x: number; y: number } | null = null;
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
      isPainting = true;
      lastPaintPos = { x: lastMousePos.x, y: lastMousePos.y };
      lastPaintImgCoords = mapStore.unproject(lastPaintPos);

      // Capture snapshot for undo
      if (maskCanvas) {
        maskSnapshot = document.createElement("canvas");
        maskSnapshot.width = maskCanvas.width;
        maskSnapshot.height = maskCanvas.height;
        maskSnapshot.getContext("2d")?.drawImage(maskCanvas, 0, 0);
      }

      paintFog(
        lastMousePos.x,
        lastMousePos.y,
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

    if (isPainting) {
      paintFog(mouseX, mouseY, e.shiftKey || e.ctrlKey || e.metaKey);
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

  function paintFog(x: number, y: number, isHiding: boolean) {
    if (!container || !maskCanvas || !mapImage || !mapStore.activeMapId) {
      return;
    }

    const imgCoords = mapStore.unproject({ x, y });
    const prevImgCoords = lastPaintImgCoords || imgCoords;
    const ctx = maskCanvas!.getContext("2d")!;

    ctx.save();

    const isErase = isHiding;

    if (isErase) {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.fillStyle = "white";
      ctx.strokeStyle = "white";
      ctx.globalCompositeOperation = "source-over";
    }

    const centerX = imgCoords.x + mapImage!.width / 2;
    const centerY = imgCoords.y + mapImage!.height / 2;
    const prevX = prevImgCoords.x + mapImage!.width / 2;
    const prevY = prevImgCoords.y + mapImage!.height / 2;

    // Draw a line from previous to current to fill gaps
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = mapStore.brushRadius * 2;
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(centerX, centerY);
    ctx.stroke();

    // Also draw the circle at the end point for perfect rounding
    ctx.beginPath();
    ctx.arc(centerX, centerY, mapStore.brushRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    lastPaintPos = { x, y };
    lastPaintImgCoords = imgCoords;
  }

  async function onMouseUp(e: MouseEvent) {
    console.log("[MapView] mouseup, wasPainting:", isPainting);
    if (isPainting) {
      const snapshotBefore = maskSnapshot;
      const currentMapId = mapStore.activeMapId;

      // Capture after state
      const snapshotAfter = document.createElement("canvas");
      snapshotAfter.width = maskCanvas!.width;
      snapshotAfter.height = maskCanvas!.height;
      snapshotAfter.getContext("2d")?.drawImage(maskCanvas!, 0, 0);

      oracle.pushUndoAction(
        "Map Drawing",
        async () => {
          // UNDO
          if (
            snapshotBefore &&
            maskCanvas &&
            mapStore.activeMapId === currentMapId
          ) {
            const ctx = maskCanvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
              ctx.drawImage(snapshotBefore, 0, 0);
              await mapStore.saveMask(maskCanvas);
            }
          }
        },
        undefined, // No messageId for map drawing
        async () => {
          // REDO
          if (
            snapshotAfter &&
            maskCanvas &&
            mapStore.activeMapId === currentMapId
          ) {
            const ctx = maskCanvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
              ctx.drawImage(snapshotAfter, 0, 0);
              await mapStore.saveMask(maskCanvas);
            }
          }
        },
      );

      await mapStore.saveMask(maskCanvas!);
      maskSnapshot = null;
      lastPaintPos = null;
      lastPaintImgCoords = null;
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

    // Use current pan when Alt is held to avoid shifting the map during resize
    const newPanX = isAltPressed
      ? mapStore.viewport.pan.x
      : panX - relX * newZoom;
    const newPanY = isAltPressed
      ? mapStore.viewport.pan.y
      : panY - relY * newZoom;

    mapStore.updateViewport({ x: newPanX, y: newPanY }, newZoom);
    mapAnnouncement = `Zoom level ${newZoom.toFixed(2)}`;
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
            aria-label="Enter Sub-map"
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

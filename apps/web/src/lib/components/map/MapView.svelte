<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { renderMap } from "map-engine";
  import PinLinker from "./PinLinker.svelte";
  import { debugStore } from "../../stores/debug.svelte";

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

  $effect(() => {
    const activeMap = mapStore.activeMap;
    if (activeMap) {
      const logCtx = { id: activeMap.id, assetPath: activeMap.assetPath };
      console.log("[MapView] $effect: activeMap changed", logCtx);
      debugStore.log("[MapView] activeMap changed", logCtx);

      // Immediately clear stale image and resize so draw loop has correct dims
      mapImage = null;
      maskCanvas = null;
      handleResize();

      const cw = canvas?.width ?? 0;
      const ch = canvas?.height ?? 0;
      console.log(`[MapView] canvas after handleResize: ${cw}x${ch}`);
      debugStore.log(`[MapView] canvas after resize: ${cw}x${ch}`);

      selectedPinId = null;
      let canceled = false;
      const img = new Image();
      let blobUrl = "";

      vault
        .resolveImageUrl(activeMap.assetPath)
        .then((url) => {
          console.log(
            `[MapView] resolveImageUrl returned: "${url?.slice(0, 60)}…" canceled=${canceled}`,
          );
          debugStore.log("[MapView] resolveImageUrl resolved", {
            urlPrefix: url?.slice(0, 60),
            isEmpty: !url,
            canceled,
          });

          if (canceled) return;
          blobUrl = url;
          img.src = url;

          img.onload = async () => {
            console.log(
              `[MapView] img.onload fired ${img.width}x${img.height} canceled=${canceled}`,
            );
            debugStore.log("[MapView] img.onload", {
              w: img.width,
              h: img.height,
              canceled,
            });

            if (canceled) return;
            mapImage = img;
            _drawImage = img; // mirror for rAF draw loop
            console.log("[MapView] mapImage assigned, loading mask…");
            debugStore.log("[MapView] mapImage set, loading mask");

            maskCanvas = await mapStore.loadMask(img.width, img.height);
            _drawMask = maskCanvas; // mirror for rAF draw loop
            console.log(`[MapView] maskCanvas ready canceled=${canceled}`);
            debugStore.log("[MapView] maskCanvas ready", { canceled });
            if (canceled) return; // guard after await

            // Persist dimensions if not set, deferred so it doesn't
            // re-trigger $effect (vault.maps mutation invalidates activeMap derived)
            if (
              activeMap.id === mapStore.activeMapId &&
              activeMap.dimensions.width === 0
            ) {
              setTimeout(async () => {
                if (!canceled && mapStore.activeMapId === activeMap.id) {
                  vault.maps[activeMap.id].dimensions = {
                    width: img.width,
                    height: img.height,
                  };
                  debugStore.log("[MapView] dimensions persisted", {
                    w: img.width,
                    h: img.height,
                  });
                  await vault.saveMaps();
                }
              }, 500);
            }
          };
          img.onerror = () => {
            console.error("[MapView] img.onerror — failed to load:", url);
            debugStore.error("[MapView] img.onerror", {
              url: url?.slice(0, 80),
            });
          };
        })
        .catch((err) => {
          console.error("[MapView] resolveImageUrl threw", err);
          debugStore.error("[MapView] resolveImageUrl threw", {
            err: String(err),
          });
        });

      return () => {
        console.log(`[MapView] $effect cleanup for map ${activeMap.id}`);
        debugStore.warn("[MapView] $effect cleanup", { mapId: activeMap.id });
        canceled = true;
        mapImage = null;
        _drawImage = null;
        maskCanvas = null;
        _drawMask = null;
        if (blobUrl.startsWith("blob:")) URL.revokeObjectURL(blobUrl);
      };
    } else {
      console.log("[MapView] $effect: no activeMap");
      debugStore.warn("[MapView] no activeMap");
      mapImage = null;
      _drawImage = null;
      maskCanvas = null;
      _drawMask = null;
    }
  });

  function handleResize() {
    if (container && canvas) {
      // In tests, container might initially report 0 if flex hasn't resolved
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      mapStore.setCanvasSize(canvas.width, canvas.height);
    }
  }

  function draw() {
    if (canvas) {
      // Use the canvas's physical dimensions directly — mapStore.canvasSize
      // may still be zero on the first frames after navigation.
      const canvasSize = {
        width: canvas.width || canvas.offsetWidth || window.innerWidth,
        height: canvas.height || canvas.offsetHeight || window.innerHeight,
      };
      // Keep mapStore in sync so project/unproject calls stay accurate
      if (
        canvasSize.width !== mapStore.canvasSize.width ||
        canvasSize.height !== mapStore.canvasSize.height
      ) {
        mapStore.setCanvasSize(canvasSize.width, canvasSize.height);
      }
      renderMap({
        canvas,
        image: _drawImage,
        transform: mapStore.viewport,
        canvasSize,
        pins: mapStore.pins,
        maskCanvas: _drawMask,
        showFog: mapStore.showFog,
        grid: {
          type: mapStore.showGrid ? "square" : "none",
          size: mapStore.gridSize,
          color: "rgba(255, 255, 255, 0.2)",
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
    if (!maskCanvas || !container || !mapImage || needsMaskUpdate) return;
    needsMaskUpdate = true;

    requestAnimationFrame(() => {
      if (!container || !maskCanvas || !mapImage || !mapStore.activeMapId)
        return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const imgCoords = mapStore.unproject({ x, y });
      const ctx = maskCanvas!.getContext("2d")!;

      ctx.save();
      // In maskCanvas, opacity means "revealed", transparent means "hidden"
      // So DRAWING on maskCanvas means CUTTING HOLES in fog.
      ctx.fillStyle = "white";
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

<div
  bind:this={container}
  class="w-full h-full bg-theme-bg overflow-hidden relative select-none"
  role="region"
  aria-label="Interactive map. Use arrow keys to pan and plus or minus keys to zoom."
  tabindex="-1"
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  ondblclick={onDoubleClick}
  onwheel={onWheel}
  onkeydown={onKeyDown}
>
  <canvas bind:this={canvas} class="absolute inset-0"></canvas>

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
    >
      <div
        class="bg-theme-surface border border-theme-border rounded-lg shadow-2xl p-1 flex gap-1 min-w-[120px]"
      >
        {#if subMapForSelected}
          <button
            class="flex-1 px-3 py-1.5 bg-theme-primary text-theme-bg text-[10px] font-bold rounded uppercase tracking-widest hover:opacity-90 transition-opacity"
            onclick={() => mapStore.selectMap(subMapForSelected!.id, true)}
          >
            Enter
          </button>
        {/if}
        <button
          class="px-2 py-1.5 text-theme-muted hover:text-theme-text transition-colors"
          onclick={() => (selectedPinId = null)}
          aria-label="Close pin details"
        >
          <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
        </button>
      </div>
      <div
        class="w-2 h-2 bg-theme-surface border-r border-b border-theme-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"
      ></div>
    </div>
  {/if}

  {@render children?.()}
</div>

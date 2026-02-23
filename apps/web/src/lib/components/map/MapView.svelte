<script lang="ts">
  import { onMount } from "svelte";
  import { mapStore } from "../../stores/map.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { renderMap } from "map-engine";
  import PinLinker from "./PinLinker.svelte";

  let canvas = $state<HTMLCanvasElement | null>(null);
  let container = $state<HTMLDivElement | null>(null);
  let mapImage = $state<HTMLImageElement | null>(null);
  let maskCanvas = $state<HTMLCanvasElement | null>(null);
  let selectedPinId = $state<string | null>(null);

  let selectedPin = $derived(mapStore.pins.find((p) => p.id === selectedPinId));
  let subMapForSelected = $derived(
    selectedPin?.entityId
      ? mapStore.getEntitySubMap(selectedPin.entityId)
      : null,
  );

  $effect(() => {
    const activeMap = mapStore.activeMap;
    if (activeMap) {
      selectedPinId = null;
      let canceled = false;
      const img = new Image();
      vault.resolveImageUrl(activeMap.assetPath).then((url) => {
        if (canceled) return;
        img.src = url;
        img.onload = async () => {
          if (canceled) return;
          mapImage = img;
          maskCanvas = await mapStore.loadMask(img.width, img.height);

          // Persist dimensions if not set
          if (
            activeMap.id === mapStore.activeMapId &&
            activeMap.dimensions.width === 0
          ) {
            activeMap.dimensions = { width: img.width, height: img.height };
            vault.saveMaps();
          }
        };
      });
      return () => {
        canceled = true;
      };
    } else {
      mapImage = null;
      maskCanvas = null;
    }
  });

  function handleResize() {
    if (container && canvas) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      mapStore.setCanvasSize(canvas.width, canvas.height);
    }
  }

  function draw() {
    if (canvas) {
      renderMap({
        canvas,
        image: mapImage,
        transform: mapStore.viewport,
        canvasSize: mapStore.canvasSize,
        pins: mapStore.pins,
        maskCanvas,
        showFog: mapStore.showFog,
        grid: {
          type: mapStore.showGrid ? "square" : "none",
          size: mapStore.gridSize,
          color: "rgba(255, 255, 255, 0.2)",
          opacity: 0.5,
        },
      });
    }
    requestAnimationFrame(draw);
  }

  onMount(() => {
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (container) resizeObserver.observe(container);

    requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
    };
  });

  // Interaction handlers
  let isPanning = false;
  let isPainting = false;
  let needsMaskUpdate = false;
  let lastMousePos = { x: 0, y: 0 };
  let mouseDownPos = { x: 0, y: 0 };

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
        import("../../stores/vault.svelte").then(({ vault }) => {
          vault.selectedEntityId = clickedPin.entityId!;
        });
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
  }
</script>

<div
  bind:this={container}
  class="w-full h-full bg-theme-bg overflow-hidden relative select-none"
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  ondblclick={onDoubleClick}
  onwheel={onWheel}
>
  <canvas bind:this={canvas} class="absolute inset-0"></canvas>

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
        >
          <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
        </button>
      </div>
      <div
        class="w-2 h-2 bg-theme-surface border-r border-b border-theme-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"
      ></div>
    </div>
  {/if}

  <slot />
</div>

<script lang="ts">
  import type { Core } from "cytoscape";
  import { onMount, onDestroy } from "svelte";

  interface Props {
    cy: Core;
    width?: number;
    height?: number;
    absolute?: boolean;
  }

  let { cy, width = 200, height = 150, absolute = true }: Props = $props();

  interface MinimapNode {
    id: string;
    x: number;
    y: number;
    color: string;
  }

  class ViewportState {
    x = $state(0);
    y = $state(0);
    width = $state(0);
    height = $state(0);
    zoom = $state(1);
  }

  let viewport = new ViewportState();
  let nodes = $state<MinimapNode[]>([]);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number | null = null;
  let lastDrawTime = 0;
  const FPS_LIMIT = 30; // Throttle to 30fps for minimap to save battery
  const INTERVAL = 1000 / FPS_LIMIT;
  const SCALE_PADDING = 50; // Graph units padding around content

  // Projection helpers
  let graphBounds = $state({ x1: 0, y1: 0, x2: 0, y2: 0, w: 1, h: 1 });
  let scale = $state(1); // minimap pixels / graph units

  // Toggle Visibility (US4)
  let collapsed = $state(true);
  const toggleMinimap = () => (collapsed = !collapsed);

  const updateProjection = () => {
    if (!cy) return;
    const eles = cy.elements();

    // If there are no elements, avoid calling boundingBox and reset to safe defaults
    if (!eles || eles.length === 0) {
      graphBounds = { x1: 0, y1: 0, x2: 0, y2: 0, w: 1, h: 1 };
      scale = 1;
      return;
    }

    const bb = eles.boundingBox({ includeOverlays: false });

    // Validate bounding box values to guard against Infinity/NaN
    if (
      !Number.isFinite(bb.x1) ||
      !Number.isFinite(bb.y1) ||
      !Number.isFinite(bb.w) ||
      !Number.isFinite(bb.h)
    ) {
      return;
    }

    // Add padding
    const x1 = bb.x1 - SCALE_PADDING;
    const y1 = bb.y1 - SCALE_PADDING;
    const w = bb.w + SCALE_PADDING * 2;
    const h = bb.h + SCALE_PADDING * 2;

    // Avoid divide by zero and non-finite dimensions
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return;
    }

    // Calculate 'contain' fit scale
    const scaleX = width / w;
    const scaleY = height / h;
    scale = Math.min(scaleX, scaleY);

    graphBounds = { x1, y1, x2: x1 + w, y2: y1 + h, w, h };
  };

  const syncGraphToMinimap = () => {
    if (!cy) return;

    // 1. Extract nodes
    const cyNodes = cy.nodes();
    const newNodes: MinimapNode[] = [];

    for (let i = 0; i < cyNodes.length; i++) {
      const node = cyNodes[i];
      const pos = node.position();
      // Simple style extraction - stick to theme color for MVP
      newNodes.push({
        id: node.id(),
        x: pos.x,
        y: pos.y,
        color: node.style("background-color") || "#4ade80",
      });
    }
    nodes = newNodes;
  };

  const draw = (timestamp: number) => {
    if (!ctx || !canvas || !cy) {
      animationFrameId = null;
      return;
    }

    const elapsed = timestamp - lastDrawTime;
    if (elapsed > INTERVAL) {
      lastDrawTime = timestamp - (elapsed % INTERVAL);

      // 1. Sync Viewport State
      const pan = cy.pan();
      const zoom = cy.zoom();
      const cyWidth = cy.width();
      const cyHeight = cy.height();

      viewport.zoom = zoom;
      viewport.x = -pan.x / zoom;
      viewport.y = -pan.y / zoom;
      viewport.width = cyWidth / zoom;
      viewport.height = cyHeight / zoom;

      // 2. Clear
      ctx.clearRect(0, 0, width, height);

      // 3. Draw Nodes (Simple dots)
      const contentW = graphBounds.w * scale;
      const contentH = graphBounds.h * scale;
      const offsetX = (width - contentW) / 2;
      const offsetY = (height - contentH) / 2;

      for (const node of nodes) {
        const mx = (node.x - graphBounds.x1) * scale + offsetX;
        const my = (node.y - graphBounds.y1) * scale + offsetY;

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Update Viewport Rect Style
      viewportX = (viewport.x - graphBounds.x1) * scale + offsetX;
      viewportY = (viewport.y - graphBounds.y1) * scale + offsetY;
      viewportW = viewport.width * scale;
      viewportH = viewport.height * scale;
    }

    animationFrameId = null;
  };

  const requestRedraw = () => {
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(draw);
    }
  };

  let viewportX = $state(0);
  let viewportY = $state(0);
  let viewportW = $state(0);
  let viewportH = $state(0);

  // Navigation Logic (US2)
  let isDragging = false;
  let hasMoved = false; // Track if actual drag occurred
  let dragStart = { x: 0, y: 0 }; // Minimap coordinates

  const handleDragStart = (e: MouseEvent) => {
    e.stopPropagation(); // Don't trigger click on background
    isDragging = true;
    hasMoved = false;
    dragStart = { x: e.clientX, y: e.clientY };
    e.preventDefault(); // Prevent text selection
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !cy) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      hasMoved = true;
    }

    // Convert minimap delta to graph delta
    if (scale > 0) {
      const dxGraph = dx / scale;
      const dyGraph = dy / scale;

      // We need to move the camera, which means shifting the pan in the opposite direction
      cy.panBy({ x: -dxGraph, y: -dyGraph });
    }

    dragStart = { x: e.clientX, y: e.clientY };
  };

  const handleDragEnd = () => {
    isDragging = false;
    // Don't reset hasMoved here, we need it for click handler
  };

  const handleMinimapClick = (e: MouseEvent) => {
    // Ignore if clicking the viewport rect itself (handled by drag or propagation stopped)
    // Also ignore if we just finished a drag operation
    if (isDragging || hasMoved || collapsed) return;
    if (!cy || scale <= 0) return;

    // e.offsetX/Y is relative to the target.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap px -> graph units
    const contentW = graphBounds.w * scale;
    const contentH = graphBounds.h * scale;
    const offsetX = (width - contentW) / 2;
    const offsetY = (height - contentH) / 2;

    const gx = (clickX - offsetX) / scale + graphBounds.x1;
    const gy = (clickY - offsetY) / scale + graphBounds.y1;

    // Center the graph on this point
    // Calculate pan to center on (gx, gy)
    const cw = cy.width();
    const ch = cy.height();
    const zoom = cy.zoom();
    const newPan = {
      x: cw / 2 - gx * zoom,
      y: ch / 2 - gy * zoom,
    };

    cy.animate({
      pan: newPan,
      duration: 300,
      easing: "ease-out-cubic",
    });
  };

  const handleGraphUpdate = () => {
    syncGraphToMinimap();
    updateProjection();
    requestRedraw();
  };

  const handleViewportUpdate = () => {
    requestRedraw();
  };

  onMount(() => {
    ctx = canvas.getContext("2d");

    // Initial sync
    syncGraphToMinimap();
    updateProjection();
    requestRedraw();

    // Listeners
    if (cy) {
      cy.on("add remove position", handleGraphUpdate);
      cy.on("pan zoom resize", handleViewportUpdate);
    }
  });

  onDestroy(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    if (cy) {
      cy.off("add remove position", handleGraphUpdate);
      cy.off("pan zoom resize", handleViewportUpdate);
    }
  });
</script>

<svelte:window onmousemove={handleDragMove} onmouseup={handleDragEnd} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="minimap-container {collapsed ? 'collapsed' : ''} {absolute
    ? 'absolute-pos'
    : 'relative-pos'}"
  style:width="{collapsed ? 40 : width}px"
  style:height="{collapsed ? 40 : height}px"
  role="button"
  aria-label="Graph minimap. Click to reposition the view. Drag the rectangle to pan."
  tabindex="0"
  onclick={handleMinimapClick}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }}
>
  <canvas bind:this={canvas} {width} {height} class="w-full h-full block"
  ></canvas>

  <!-- Viewport Overlay -->

  <div
    class="viewport-rect"
    style:left="{viewportX}px"
    style:top="{viewportY}px"
    style:width="{Math.max(viewportW, 2)}px"
    style:height="{Math.max(viewportH, 2)}px"
    style:background-color="color-mix(in srgb, var(--color-accent-primary) 10%, transparent)"
    role="button"
    aria-label="Drag to pan the graph view. Use arrow keys to pan when focused."
    tabindex="0"
    onmousedown={handleDragStart}
    onkeydown={(event) => {
      const key = event.key;
      if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "ArrowLeft" ||
        key === "ArrowRight"
      ) {
        event.preventDefault();
        const pan = cy.pan();
        const step = 20;
        if (key === "ArrowUp") {
          cy.pan({ x: pan.x, y: pan.y - step });
        } else if (key === "ArrowDown") {
          cy.pan({ x: pan.x, y: pan.y + step });
        } else if (key === "ArrowLeft") {
          cy.pan({ x: pan.x - step, y: pan.y });
        } else if (key === "ArrowRight") {
          cy.pan({ x: pan.x + step, y: pan.y });
        }
      }
    }}
  ></div>

  <!-- Toggle Button -->
  <button
    class="toggle-btn"
    onclick={(e: MouseEvent) => {
      e.stopPropagation();
      toggleMinimap();
    }}
    title={collapsed ? "Expand Minimap" : "Minimize Minimap"}
  >
    <span class="icon-[lucide--map] w-4 h-4"></span>
  </button>
</div>

<style>
  .minimap-container {
    background-color: rgba(0, 0, 0, 0.8);
    border: 1px solid var(--color-border-primary);
    border-radius: 0.5rem;
    overflow: hidden;
    z-index: 40;
    pointer-events: auto; /* Ensure it captures clicks */
    transition:
      width 0.3s ease,
      height 0.3s ease,
      opacity 0.3s ease;
  }

  .minimap-container.absolute-pos {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
  }

  .minimap-container.relative-pos {
    position: relative;
    /* No forced location */
  }

  .minimap-container.collapsed {
    border-radius: 9999px;
    cursor: pointer;
  }

  /* Hide internals when collapsed */
  .minimap-container.collapsed canvas,
  .minimap-container.collapsed .viewport-rect {
    opacity: 0;
    pointer-events: none;
  }

  .toggle-btn {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-primary);
    opacity: 0.7;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0.25rem;
    cursor: pointer;
    z-index: 60;
    opacity: 0; /* Hidden by default, shown on hover */
    transition: opacity 0.2s;
  }

  .toggle-btn:focus-visible {
    opacity: 1;
    outline: 2px solid var(--color-accent-primary);
    outline-offset: 2px;
  }

  .minimap-container:hover .toggle-btn {
    opacity: 1;
  }

  /* When collapsed, toggle btn covers the whole circle implicitly or we style it differently */
  .minimap-container.collapsed .toggle-btn {
    opacity: 1;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  }

  .viewport-rect {
    position: absolute;
    border: 2px solid var(--color-accent-primary);
    background-color: rgba(74, 222, 128, 0.1);
    box-shadow: 0 0 10px rgba(74, 222, 128, 0.2);
    cursor: grab;
    z-index: 50;
  }

  .viewport-rect:active {
    cursor: grabbing;
    background-color: color-mix(
      in srgb,
      var(--color-accent-primary) 20%,
      transparent
    );
  }
</style>

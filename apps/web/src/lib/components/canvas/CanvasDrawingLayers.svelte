<script lang="ts">
  import { ViewportPortal } from "@xyflow/svelte";
  import type { useCanvasDrawing } from "./hooks/use-canvas-drawing.svelte";
  import type { CanvasLogic } from "./hooks/canvas-logic-type";

  let {
    logic,
    drawingLogic,
  }: {
    logic: CanvasLogic;
    drawingLogic: ReturnType<typeof useCanvasDrawing>;
  } = $props();
</script>

<!--
  Freehand drawing input lives here, outside ViewportPortal, so it
  always covers the full visible pane regardless of zoom. Content
  inside ViewportPortal is scaled/translated together with the flow
  viewport for rendering, which means its own layout box (the thing
  a background pointerdown needs to land inside) shrinks well below
  the visible pane at any zoom other than 100% - fitView rarely lands
  on exactly 100%, so drawing would only "activate" near the flow's
  transform origin, i.e. wherever the canvas happened to be anchored
  on screen (in practice, near the top-left HUD).
-->
<div
  class="canvas-draw-input-layer"
  data-testid="canvas-draw-input-layer"
  aria-hidden="true"
  style:pointer-events={drawingLogic.isDrawingMode ? "auto" : "none"}
  style:cursor={drawingLogic.isDrawingMode ? "crosshair" : undefined}
  onpointerdown={drawingLogic.handleDrawingPointerDown}
  onpointermove={drawingLogic.handleDrawingPointerMove}
  onpointerup={(event) => drawingLogic.finishDrawing(event)}
  onpointercancel={(event) => drawingLogic.finishDrawing(event, true)}
></div>
<ViewportPortal target="front">
  <svg
    class="canvas-drawing-layer"
    data-testid="canvas-drawing-layer"
    role="img"
    aria-label="Canvas drawing strokes"
    style:pointer-events={drawingLogic.isErasingMode ? "auto" : "none"}
    style:cursor={drawingLogic.isErasingMode ? "pointer" : undefined}
    onpointerdown={drawingLogic.handleEraseLayerPointerDown}
  >
    {#each logic.drawings as drawing (drawing.id)}
      {#if drawingLogic.isErasingMode}
        <path
          data-testid={`eraser-target-${drawing.id}`}
          data-drawing-id={drawing.id}
          d={drawingLogic.drawingPath(drawing)}
          fill="none"
          stroke="transparent"
          stroke-width={Math.max(drawing.width + 12, 16)}
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
          pointer-events="stroke"
        />
      {/if}
      <path
        d={drawingLogic.drawingPath(drawing)}
        fill="none"
        stroke={drawing.color}
        stroke-width={drawing.width}
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
      />
    {/each}
    {#if drawingLogic.activeDrawing}
      <path
        d={drawingLogic.drawingPath(drawingLogic.activeDrawing)}
        fill="none"
        stroke={drawingLogic.activeDrawing.color}
        stroke-width={drawingLogic.activeDrawing.width}
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
      />
    {/if}
  </svg>
</ViewportPortal>

<style>
  .canvas-drawing-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    touch-action: none;
    user-select: none;
  }

  /*
   * Unlike .canvas-drawing-layer (inside ViewportPortal, scaled/panned with
   * the flow viewport), this sits outside it as a plain SvelteFlow child, so
   * it's never transformed and always spans the full visible pane. See the
   * comment above its markup for why that matters.
   */
  .canvas-draw-input-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 25;
    touch-action: none;
    user-select: none;
  }
</style>

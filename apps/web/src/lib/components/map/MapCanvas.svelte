<script lang="ts">
  import { onMount } from "svelte";
  import { mapStore } from "../../stores/map.svelte";
  import { mapSession } from "../../stores/map-session.svelte";
  import { themeStore } from "../../stores/theme.svelte";
  import { hexToRgb } from "../../utils/color";
  import { renderMap } from "map-engine";
  import type { Point } from "schema";
  import type { PingState, Token } from "../../../types/vtt";
  import type { MapInteractionManager } from "./map-interactions.svelte";
  import {
    CanvasRedrawScheduler,
    hasActivePings,
  } from "./map-canvas-scheduler";
  import { PING_DURATION_MS } from "$lib/stores/vtt/vtt-measurement-manager.svelte";
  import { systemClock } from "$lib/utils/runtime-deps";

  interface EnrichedToken extends Token {
    label: string;
    image: HTMLImageElement | null;
    selected: boolean;
    active: boolean;
    visible: boolean;
  }

  interface EnrichedMeasurement {
    active: boolean;
    start: Point | null;
    end: Point | null;
    label: string;
  }

  interface RemoteEnrichedMeasurement {
    start: Point;
    end: Point;
    label: string;
    color: string;
    peerId: string;
  }

  interface EnrichedDragPreview {
    entityId: string;
    x: number;
    y: number;
    label: string;
    valid: boolean;
  }

  let {
    mapImage,
    maskCanvas,
    vttTokens,
    vttMeasurement,
    remoteMeasurement,
    vttPings,
    vttDragPreview,
    interactions,
  }: {
    mapImage: HTMLImageElement | null;
    maskCanvas: HTMLCanvasElement | null;
    vttTokens: EnrichedToken[];
    vttMeasurement: EnrichedMeasurement | null;
    remoteMeasurement: RemoteEnrichedMeasurement | null;
    vttPings: PingState[];
    vttDragPreview: EnrichedDragPreview | null;
    interactions: MapInteractionManager;
  } = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let container = $state<HTMLDivElement | null>(null);
  const scheduler = new CanvasRedrawScheduler(() => draw());

  const fogColor = $derived(
    `rgba(${hexToRgb(themeStore.activeTheme.tokens.secondary)}, ${mapStore.isGMMode ? 0.6 : 1.0})`,
  );
  const gridColor = $derived.by(() => {
    const baseColor =
      mapStore.gridColor || themeStore.activeTheme.tokens.primary;
    const rgb = baseColor.startsWith("#") ? hexToRgb(baseColor) : baseColor;
    return `rgba(${rgb}, 0.55)`;
  });

  function handleResize() {
    if (container && canvas) {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      mapStore.setCanvasSize(w, h);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      scheduler.request();
    }
  }

  function draw() {
    if (!canvas) return;

    renderMap({
      canvas: canvas,
      image: mapImage,
      transform: mapStore.viewport,
      canvasSize: mapStore.canvasSize,
      pins: mapStore.pins,
      maskCanvas: maskCanvas,
      showFog: mapStore.showFog,
      fogColor,
      accentColor: themeStore.activeTheme.tokens.primary,
      grid: {
        type: mapStore.showGrid ? "square" : "none",
        size: mapStore.gridSize,
        color: gridColor,
        opacity: 0.65,
        offsetX: mapStore.gridOffsetX,
        offsetY: mapStore.gridOffsetY,
        fixed: mapSession.gridMoveMode && mapStore.isGMMode,
      },
      tokens: vttTokens,
      measurement: vttMeasurement,
    });

    if (vttDragPreview) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const point = mapStore.project({
          x: vttDragPreview.x,
          y: vttDragPreview.y,
        });
        const size = Math.max(
          28,
          (mapStore.gridSize || 50) * mapStore.viewport.zoom,
        );
        const radius = size / 2;
        const stroke = vttDragPreview.valid
          ? themeStore.activeTheme.tokens.primary
          : "#ef4444";
        const fill = vttDragPreview.valid
          ? "rgba(16, 185, 129, 0.25)"
          : "rgba(239, 68, 68, 0.25)";

        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = stroke;
        ctx.fill();

        ctx.font = "600 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = stroke;
        ctx.fillText(vttDragPreview.label, 0, -radius - 8);
        ctx.restore();
      }
    }

    if (vttPings.length > 0) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const now = systemClock.now();
        for (const ping of vttPings) {
          const elapsed = now - ping.timestamp;
          // Use >= so this matches hasActivePings (elapsed < duration === active).
          if (elapsed >= PING_DURATION_MS) continue;

          const progress = elapsed / PING_DURATION_MS;
          const pingPoint = mapStore.project({
            x: ping.x,
            y: ping.y,
          });

          ctx.save();

          const baseRadius = 25 * mapStore.viewport.zoom;
          const expandRange = 40 * mapStore.viewport.zoom;
          const radius = baseRadius + progress * expandRange;
          const opacity = 1 - progress;

          ctx.beginPath();
          ctx.arc(pingPoint.x, pingPoint.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = ping.color;
          ctx.globalAlpha = opacity;
          ctx.lineWidth = 4 * (1 - progress) + 1;

          ctx.shadowColor = ping.color;
          ctx.shadowBlur = 10 * opacity;
          ctx.stroke();

          ctx.globalAlpha = opacity * 0.5;
          ctx.beginPath();
          ctx.arc(pingPoint.x, pingPoint.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = ping.color;
          ctx.fill();

          ctx.restore();
        }
      }
    }

    if (remoteMeasurement) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const start = mapStore.project(remoteMeasurement.start);
        const end = mapStore.project(remoteMeasurement.end);

        ctx.save();
        ctx.strokeStyle = remoteMeasurement.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.globalAlpha = 0.8;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = remoteMeasurement.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
        ctx.fill();

        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        ctx.font = "12px sans-serif";
        ctx.fillStyle = remoteMeasurement.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(remoteMeasurement.label, midX, midY - 8);

        ctx.restore();
      }
    }

    if (
      mapStore.isGMMode &&
      interactions.isAltPressed &&
      interactions.isPointerOver
    ) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        const primaryRGB = hexToRgb(themeStore.activeTheme.tokens.primary);

        ctx.beginPath();
        ctx.arc(
          interactions.lastMousePos.x,
          interactions.lastMousePos.y,
          interactions.visualBrushRadius,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(${primaryRGB}, 0.5)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = `rgba(${primaryRGB}, 0.1)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(
          interactions.lastMousePos.x,
          interactions.lastMousePos.y,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(${primaryRGB}, 0.5)`;
        ctx.fill();

        ctx.restore();
      }
    }

    // Self-perpetuating rAF loop while any ping is still animating.
    // Pings animate from a timestamp, so the visual changes even when no
    // input does — without this we'd freeze mid-ping.
    if (hasActivePings(vttPings, systemClock.now(), PING_DURATION_MS)) {
      scheduler.request();
    }
  }

  // Trigger a redraw whenever any input that affects the canvas changes.
  $effect(() => {
    // Read each reactive value so Svelte 5 registers it as a dependency of
    // this effect. `void` marks the read as intentionally unused so ESLint's
    // no-unused-expressions rule lets it pass.
    void canvas;
    void mapImage;
    void maskCanvas;
    void mapStore.viewport;
    void mapStore.canvasSize;
    void mapStore.pins;
    void mapStore.showFog;
    void mapStore.isGMMode;
    void mapStore.showGrid;
    void mapStore.gridSize;
    void mapStore.gridOffsetX;
    void mapStore.gridOffsetY;
    void mapStore.gridColor;
    void mapSession.gridMoveMode;
    void themeStore.activeTheme;
    void vttTokens;
    void vttMeasurement;
    void remoteMeasurement;
    void vttPings;
    void vttDragPreview;
    void fogColor;
    void gridColor;
    void interactions.isAltPressed;
    void interactions.isPointerOver;
    void interactions.lastMousePos.x;
    void interactions.lastMousePos.y;
    void interactions.visualBrushRadius;

    scheduler.request();
  });

  onMount(() => {
    setTimeout(handleResize, 10);
    const resizeObserver = new ResizeObserver(handleResize);
    if (container) resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      scheduler.dispose();
    };
  });
</script>

<div bind:this={container} class="absolute inset-0">
  <canvas
    bind:this={canvas}
    class="absolute inset-0 {mapSession.gridFitMode && mapStore.isGMMode
      ? 'cursor-crosshair'
      : ''} {mapSession.gridMoveMode && mapStore.isGMMode ? 'cursor-move' : ''}"
  ></canvas>
</div>

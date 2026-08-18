<script lang="ts">
  import type { Entity } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import {
    buildConnectionNeighbors,
    vaultConnectionContext,
    type ConnectionNeighbor,
  } from "./entity-connections";
  import {
    WIDE_CONTAINER_PX,
    edgeSegment,
    layoutConnectionGraph,
    ringCapacity,
  } from "./connections-graph";
  import { PanZoomState } from "./pan-zoom.svelte";

  let {
    entity,
    onNavigate,
  }: {
    entity: Entity;
    onNavigate?: (id: string, event?: MouseEvent) => void;
  } = $props();

  // The composition depends on how much room this tab actually has, not on the
  // viewport: the same component renders in a ~330px side panel and in the
  // ~900px zen view. Before measurement (and in jsdom) assume the wide layout.
  let measuredWidth = $state(0);
  const width = $derived(measuredWidth || 640);
  const isWide = $derived(width >= WIDE_CONTAINER_PX);

  const allNeighbors = $derived.by<ConnectionNeighbor[]>(() =>
    buildConnectionNeighbors(entity, vaultConnectionContext(vault)),
  );

  // A picture of a handful of connections reads well; a picture of thirty does
  // not. The rest keep their own row below, still one tap from being opened.
  const ringNeighbors = $derived(allNeighbors.slice(0, ringCapacity(width)));
  const overflowNeighbors = $derived(allNeighbors.slice(ringNeighbors.length));
  const positions = $derived(layoutConnectionGraph(ringNeighbors.length));

  const centreColor = $derived(
    categories.getCategory(entity.type)?.color ?? null,
  );
  const entityIsPast = $derived(
    entity.labels?.some((l: string) => l.toLowerCase() === "past") ?? false,
  );

  const colorOf = (type: string) => categories.getCategory(type)?.color ?? null;
  const iconOf = (type: string) =>
    getIconClass(categories.getCategory(type)?.icon);
  const tint = (color: string | null, amount: string) =>
    color ? `color-mix(in srgb, ${color} ${amount}, transparent)` : undefined;

  const relationText = (neighbor: ConnectionNeighbor) =>
    neighbor.relations.map((r) => r.displayLabel).join(" · ");

  const relationIcon = (neighbor: ConnectionNeighbor) => {
    const outbound = neighbor.relations.some((r) => r.direction === "outbound");
    const inbound = neighbor.relations.some((r) => r.direction === "inbound");
    if (outbound && inbound) return "icon-[lucide--arrow-left-right]";
    return outbound ? "icon-[lucide--move-right]" : "icon-[lucide--move-left]";
  };

  const describe = (neighbor: ConnectionNeighbor) => {
    const relations = neighbor.relations
      .map((r) =>
        r.direction === "outbound"
          ? `${entity.title} ${r.displayLabel} ${neighbor.title}`
          : `${neighbor.title} ${r.displayLabel} ${entity.title}`,
      )
      .join(", ");
    // The "*" past marker is a purely visual footnote elsewhere in the app; the
    // accessible name has to spell it out instead.
    const past = neighbor.hasPastLabel ? " (past)" : "";
    return `Open ${neighbor.title}${past} (${relations})`;
  };

  // --- Pan & zoom ---------------------------------------------------------
  // Same viewport maths the lineage canvas uses, but a different input policy:
  // this view lives inside a scrolling tab, so it must never swallow the
  // gesture people use to scroll the page.
  //
  //  - touch drag pans only once zoomed in; at 1:1 the finger scrolls the tab
  //  - the wheel zooms only with ctrl/⌘ held (which is what a trackpad pinch
  //    sends), so an ordinary wheel still scrolls the tab
  //  - two-finger pinch always zooms
  let graphElement = $state<HTMLDivElement>();
  const panZoom = new PanZoomState(() => ({
    width: graphElement?.clientWidth ?? 0,
    height: graphElement?.clientHeight ?? 0,
  }));
  const viewport = $derived(panZoom.viewport);
  const isZoomed = $derived(viewport.zoom !== 1);

  // A new entity means a new picture; keep the camera from carrying over.
  $effect(() => {
    if (entity.id) panZoom.reset();
  });

  const DRAG_THRESHOLD_PX = 5;
  let pointerStart: { x: number; y: number } | null = null;
  let didDrag = false;

  function onPointerDown(event: PointerEvent) {
    // Let a finger scroll the page while the view sits at 1:1.
    if (event.pointerType === "touch" && !isZoomed && event.isPrimary) {
      pointerStart = null;
      return;
    }
    pointerStart = { x: event.clientX, y: event.clientY };
    didDrag = false;
    // Deliberately no pointer capture yet: capturing here would retarget the
    // click to this container, and tapping a connection would stop opening it.
    // Capture starts below, once the movement is a drag rather than a tap.
    panZoom.onPointerDown(event);
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerStart) {
      const moved = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      );
      // Below the threshold this is still a click, not a drag — otherwise
      // opening a connection would nudge the camera on every tap.
      if (moved >= DRAG_THRESHOLD_PX && !didDrag) {
        didDrag = true;
        graphElement?.setPointerCapture?.(event.pointerId);
      }
      if (!didDrag) return;
    }
    panZoom.onPointerMove(event);
  }

  function onPointerEnd(event: PointerEvent) {
    panZoom.onPointerUp(event);
    pointerStart = null;
    if (graphElement?.hasPointerCapture?.(event.pointerId)) {
      graphElement.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return; // let the tab scroll
    if (graphElement) panZoom.onWheel(event, graphElement);
  }

  function openNeighbor(neighborId: string, event: MouseEvent) {
    // A pan that ended on a card is not a request to open it.
    if (didDrag) {
      didDrag = false;
      return;
    }
    if (onNavigate) {
      onNavigate(neighborId, event);
      return;
    }
    layoutUIStore.setLastSelectedNodePosition({
      x: event.clientX,
      y: event.clientY,
    });
    vault.selectedEntityId = neighborId;
  }
</script>

<div
  class="space-y-3"
  data-testid="connections-tab"
  bind:clientWidth={measuredWidth}
>
  <p class="text-xs text-theme-muted">
    Direct connections only — entities linked straight to {entity.title}.
  </p>

  <div
    bind:this={graphElement}
    class="relative w-full shrink-0 overflow-hidden rounded-xl border border-theme-border bg-theme-surface/40 {isWide
      ? 'aspect-[16/10] max-h-[34rem]'
      : 'aspect-[3/4] max-h-[32rem]'} {isZoomed ? 'cursor-grab' : ''}"
    style:touch-action={isZoomed ? "none" : "pan-y"}
    data-testid="connections-graph"
    role="group"
    aria-label="Direct connections of {entity.title}"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerEnd}
    onpointercancel={onPointerEnd}
    onwheel={onWheel}
  >
    <!-- Everything inside the picture moves together under the camera. The
         controls below sit outside this layer so they stay put. -->
    <div
      class="absolute inset-0 origin-top-left"
      style:transform="translate({viewport.pan.x}px, {viewport.pan.y}px) scale({viewport.zoom})"
      data-testid="connections-viewport"
    >
      <!-- Spokes. Drawn in the same 0-100 percentage space the cards are placed
         in, so the two layers stay aligned at any container size. Each one is
         only the middle stretch of the line, so it never runs under the centre
         or under a card. -->
      <svg
        class="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each ringNeighbors as neighbor, i (neighbor.id)}
          {@const segment = edgeSegment(positions[i])}
          <line
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={colorOf(neighbor.type) ?? "currentColor"}
            stroke-opacity="0.35"
            stroke-width="1.5"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
            class="text-theme-border"
          />
        {/each}
      </svg>

      <!-- Centre entity: fixed in the middle, and the only thing allowed in this
         horizontal band, so it reads as the focal point. -->
      <div
        class="absolute top-1/2 left-1/2 z-20 flex w-[60%] max-w-[16rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
        data-testid="connections-centre"
      >
        <span
          class="flex items-center justify-center rounded-full border-2 ring-4 ring-theme-primary/15 {isWide
            ? 'h-20 w-20'
            : 'h-16 w-16'}"
          style:border-color={centreColor ?? undefined}
          style:background-color={tint(centreColor, "26%")}
        >
          <span
            class="{iconOf(entity.type)} {isWide ? 'h-8 w-8' : 'h-7 w-7'}"
            style:color={centreColor ?? undefined}
          ></span>
        </span>
        <span class="flex flex-col items-center gap-0.5 text-center">
          <span
            class="font-header leading-tight font-bold tracking-wide text-theme-text {isWide
              ? 'text-base'
              : 'text-sm'}"
          >
            {entity.title}{#if entityIsPast}<sup aria-hidden="true">*</sup><span
                class="sr-only"
              >
                (past)</span
              >{/if}
          </span>
          <span
            class="font-header text-[9px] tracking-[0.2em] text-theme-muted uppercase"
            >{entity.type}</span
          >
        </span>
      </div>

      <!-- Satellites. The relationship rides on the card rather than floating on
         the line: long labels then wrap instead of colliding with the art. -->
      {#each ringNeighbors as neighbor, i (neighbor.id)}
        {@const position = positions[i]}
        {@const color = colorOf(neighbor.type)}
        <button
          type="button"
          class="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rounded-lg p-1 transition hover:bg-theme-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          style:left="{position.x}%"
          style:top="{position.y}%"
          style:width="{position.widthPct}%"
          data-testid="connection-node"
          data-entity-id={neighbor.id}
          aria-label={describe(neighbor)}
          title="{neighbor.title} — {relationText(neighbor)}"
          onclick={(event) => openNeighbor(neighbor.id, event)}
        >
          <span
            class="flex shrink-0 items-center justify-center rounded-full border transition group-hover:scale-110 {isWide
              ? 'h-12 w-12'
              : 'h-10 w-10'}"
            style:border-color={color ?? undefined}
            style:background-color={tint(color, "22%")}
          >
            <span
              class="{iconOf(neighbor.type)} {isWide ? 'h-5 w-5' : 'h-4 w-4'}"
              style:color={color ?? undefined}
            ></span>
          </span>
          <span
            class="flex w-full flex-col items-center gap-0.5"
            aria-hidden="true"
          >
            <span
              class="line-clamp-2 leading-tight font-semibold text-balance text-theme-text transition-colors group-hover:text-theme-primary {isWide
                ? 'text-xs'
                : 'text-[11px]'}"
            >
              {neighbor.title}{#if neighbor.hasPastLabel}<sup>*</sup>{/if}
            </span>
            <span
              class="flex w-full items-start justify-center gap-0.5 leading-tight text-theme-muted {isWide
                ? 'text-[10px]'
                : 'text-[9px]'}"
              data-testid="connection-relation"
            >
              <span class="{relationIcon(neighbor)} mt-px h-2.5 w-2.5 shrink-0"
              ></span>
              <span class="line-clamp-2 min-w-0 text-balance"
                >{relationText(neighbor)}</span
              >
            </span>
          </span>
        </button>
      {/each}

      {#if ringNeighbors.length === 0}
        <p
          class="absolute inset-x-0 bottom-8 text-center text-sm text-theme-muted italic"
          data-testid="connections-empty"
        >
          No direct connections yet.
        </p>
      {/if}
    </div>

    <!-- Zoom controls: the gestures above are discoverable only if you already
         know they are there, and a phone has no wheel. -->
    <div
      class="absolute top-2 right-2 z-30 flex items-center gap-0.5 rounded-lg border border-theme-border bg-theme-bg/85 p-0.5 backdrop-blur-sm"
      data-testid="connections-zoom-controls"
    >
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded text-theme-muted transition hover:bg-theme-primary/10 hover:text-theme-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        aria-label="Zoom out"
        title="Zoom out"
        data-testid="connections-zoom-out"
        onclick={() => panZoom.zoomBy(1 / 1.25)}
      >
        <span aria-hidden="true" class="icon-[lucide--minus] h-3.5 w-3.5"
        ></span>
      </button>
      <button
        type="button"
        class="min-w-[2.75rem] rounded px-1 py-1 font-mono text-[10px] text-theme-muted transition hover:bg-theme-primary/10 hover:text-theme-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        aria-label="Reset zoom"
        title="Reset zoom"
        data-testid="connections-zoom-reset"
        onclick={() => panZoom.reset()}
      >
        {Math.round(viewport.zoom * 100)}%
      </button>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded text-theme-muted transition hover:bg-theme-primary/10 hover:text-theme-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        aria-label="Zoom in"
        title="Zoom in"
        data-testid="connections-zoom-in"
        onclick={() => panZoom.zoomBy(1.25)}
      >
        <span aria-hidden="true" class="icon-[lucide--plus] h-3.5 w-3.5"></span>
      </button>
    </div>
  </div>

  {#if overflowNeighbors.length > 0}
    <div class="space-y-2" data-testid="connections-overflow">
      <h3
        class="font-header text-[10px] font-bold tracking-widest text-theme-muted uppercase"
      >
        {overflowNeighbors.length} more connection{overflowNeighbors.length ===
        1
          ? ""
          : "s"}
      </h3>
      <div class="flex flex-wrap gap-1.5">
        {#each overflowNeighbors as neighbor (neighbor.id)}
          {@const color = colorOf(neighbor.type)}
          <button
            type="button"
            class="flex max-w-full items-center gap-1.5 rounded-full border border-theme-border bg-theme-surface/60 py-1 pr-2.5 pl-1.5 text-left transition hover:border-theme-primary/50 hover:bg-theme-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
            data-testid="connection-chip"
            data-entity-id={neighbor.id}
            aria-label={describe(neighbor)}
            title="{neighbor.title} — {relationText(neighbor)}"
            onclick={(event) => openNeighbor(neighbor.id, event)}
          >
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style:background-color={tint(color, "22%")}
            >
              <span
                class="{iconOf(neighbor.type)} h-3 w-3"
                style:color={color ?? undefined}
              ></span>
            </span>
            <span class="min-w-0 truncate text-[11px] text-theme-text">
              {neighbor.title}{#if neighbor.hasPastLabel}<sup>*</sup>{/if}
            </span>
            <span class="min-w-0 truncate text-[10px] text-theme-muted"
              >{relationText(neighbor)}</span
            >
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <FeatureHint hintId="connections" />
</div>

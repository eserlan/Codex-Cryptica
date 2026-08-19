<script lang="ts">
  import type { Entity } from "schema";
  import type { Core } from "cytoscape";
  import { initGraph, GraphImageManager } from "graph-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import {
    buildConnectionNeighbors,
    vaultConnectionContext,
    type ConnectionNeighbor,
  } from "./entity-connections";
  import {
    buildConnectionsElements,
    buildConnectionsStyle,
    carryForwardResolvedImages,
  } from "./connections-cytoscape";
  import { PanZoomState } from "./pan-zoom.svelte";

  let {
    entity,
    onNavigate,
  }: {
    entity: Entity;
    onNavigate?: (id: string, event?: MouseEvent) => void;
  } = $props();

  /** A picture of a handful of connections reads well; a picture of thirty
   * does not. The list beneath the picture is unabridged either way. */
  const MAX_SHOWN = 20;

  // The composition depends on how much room this tab actually has, not on
  // the viewport: the same component renders in a ~330px side panel and in
  // the ~900px zen view. Before measurement (and in jsdom) assume the wide
  // layout.
  let measuredWidth = $state(0);
  const width = $derived(measuredWidth || 640);
  const isWide = $derived(width >= 420);

  const allNeighbors = $derived.by<ConnectionNeighbor[]>(() =>
    buildConnectionNeighbors(entity, vaultConnectionContext(vault)),
  );
  const shownNeighbors = $derived(allNeighbors.slice(0, MAX_SHOWN));

  const colorOf = (type: string) => categories.getCategory(type)?.color ?? null;
  // --- Cytoscape: layout + paint only ---------------------------------
  // Concentric puts one node in the middle and rings the rest around it,
  // which is exactly this view's shape — no hand-rolled arc trigonometry.
  // Relationship text never renders on the canvas (cytoscape's edge labels
  // are the "Often found at the cor…" truncation this tab exists to avoid),
  // so the canvas is aria-hidden and the always-visible list below it is
  // both the a11y path and the place people actually read a relationship.
  let canvasElement = $state<HTMLDivElement>();
  let cy = $state<Core | null>(null);
  let imageManager: GraphImageManager | null = null;

  const elements = $derived(buildConnectionsElements(entity, shownNeighbors));
  const style = $derived(
    buildConnectionsStyle({
      tokens: themeStore.activeTheme.tokens,
      getCategoryColor: (type) => colorOf(type) ?? undefined,
    }),
  );

  $effect(() => {
    if (!canvasElement) return;
    let cancelled = false;
    void (async () => {
      const instance = await initGraph({
        container: canvasElement,
        elements: [],
        style: [],
        layout: { name: "preset" },
        // Tuned for a fixed, ≤20-node widget, not the panning world graph:
        // labels must stay legible mid-gesture, and zoom/pan gestures are
        // handled entirely by `panZoom` below (see the comment there), so
        // cytoscape's own aren't used.
        hideLabelsOnViewport: false,
        userPanningEnabled: false,
        userZoomingEnabled: false,
        boxSelectionEnabled: false,
        autoungrabify: true,
      } as any);
      if (cancelled) {
        instance.destroy();
        return;
      }
      imageManager = new GraphImageManager(instance);
      instance.on("tap", "node", (evt: any) => {
        if (evt.target.data("isCentre")) return;
        openNeighbor(evt.target.id(), evt.originalEvent as MouseEvent);
      });
      cy = instance;
    })();
    return () => {
      cancelled = true;
      cy?.destroy();
      cy = null;
      imageManager = null;
    };
  });

  // Re-sync elements/style/layout whenever the connection set or theme
  // changes. Simplest correct approach for a graph this small: replace the
  // whole element set and re-run layout rather than diffing it.
  $effect(() => {
    if (!cy) return;
    const nextStyle = style;
    const spacing = isWide ? 70 : 52;

    // Elements are fully replaced below rather than diffed — simplest correct
    // approach for a graph this small. That destroys every node object,
    // though, so a portrait cytoscape already resolved must be carried
    // forward explicitly or it flashes blank again while it silently
    // re-resolves (see carryForwardResolvedImages's own doc).
    const nextElements = carryForwardResolvedImages(elements, cy.nodes());

    cy.style(nextStyle as any);
    cy.batch(() => {
      cy!.elements().remove();
      cy!.add(nextElements as any);
    });
    cy.layout({
      name: "concentric",
      concentric: (n: any) => (n.data("isCentre") ? 2 : 1),
      levelWidth: () => 1,
      minNodeSpacing: spacing,
      fit: true,
      padding: 28,
      animate: false,
    } as any).run();
    imageManager?.sync({
      showImages: true,
      resolveImageUrl: (path: string) => vault.resolveImageUrl(path),
      releaseImageUrl: (path: string) => vault.releaseImageUrl(path),
    });
  });

  $effect(() => {
    if (cy && measuredWidth) {
      cy.resize();
      cy.fit(undefined, 28);
    }
  });

  // --- Pan & zoom -----------------------------------------------------
  // Cytoscape's own gestures are disabled above (see the mount effect) — this
  // is the single source of truth for the camera, applied to the canvas via
  // `cy.viewport()`. The input policy differs from a full-page canvas because
  // this view lives inside a scrolling tab and must never swallow the
  // gesture people use to scroll it:
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

  $effect(() => {
    if (cy) cy.viewport({ zoom: viewport.zoom, pan: viewport.pan });
  });

  // A new centre entity means a new picture; keep the camera from carrying
  // over. Deliberately its own effect, independent of the cytoscape mount —
  // folding this into that effect meant it also fired the moment cytoscape
  // finished its async load, silently resetting any zoom a user had already
  // applied in the meantime.
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
      ? 'aspect-[16/10] max-h-[28rem]'
      : 'aspect-square max-h-[22rem]'} {isZoomed ? 'cursor-grab' : ''}"
    style:touch-action={isZoomed ? "none" : "pan-y"}
    data-testid="connections-graph"
    role="group"
    aria-label="{entity.title} connections diagram — see the list below for the same connections as text"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerEnd}
    onpointercancel={onPointerEnd}
    onwheel={onWheel}
  >
    <!-- Cytoscape paints pixels, not DOM — no node here is focusable or
         nameable, so the whole canvas is hidden from assistive tech and the
         list below is the equivalent, real, operable surface.

         Two nested divs, deliberately: cytoscape sets `position: relative`
         inline on whatever container it's given (so its own absolutely-
         positioned canvas layers stack correctly inside it). An inline style
         beats a class, so a single `absolute inset-0` div handed straight to
         cytoscape would have that positioning silently overridden and never
         actually fill its parent. The outer div here does the "fill the
         parent" job; cytoscape only ever touches the plain, un-positioned
         inner one. -->
    <div class="absolute inset-0" aria-hidden="true">
      <div
        bind:this={canvasElement}
        class="h-full w-full"
        data-testid="connections-canvas"
      ></div>
    </div>

    {#if shownNeighbors.length === 0}
      <p
        class="pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-theme-muted italic"
        data-testid="connections-empty"
      >
        No direct connections yet.
      </p>
    {/if}

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

  <!-- The canvas above paints pixels, not DOM — nothing in it is reachable
       by keyboard or a screen reader. This tab has no operable equivalent of
       its own (unlike the world graph, which points at "Browse as table"),
       but the Status tab lists the same connections as real, focusable rows,
       so AT users are pointed there rather than left with nothing. -->
  <p class="sr-only" data-testid="connections-a11y-note">
    {allNeighbors.length} direct connection{allNeighbors.length === 1
      ? ""
      : "s"}, shown as a diagram that a screen reader cannot read. Open the
    Status tab on this entity for the same connections as a keyboard-friendly
    list.
  </p>

  <FeatureHint hintId="connections" />
</div>

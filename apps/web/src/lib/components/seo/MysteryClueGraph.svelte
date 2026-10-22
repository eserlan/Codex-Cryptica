<script lang="ts">
  import { focusTrap } from "$lib/actions/focusTrap";
  import {
    buildMysteryGraphDiagram,
    type MysteryGraph,
    type MysteryGraphDiagramNode,
    type MysteryGraphNodeKind,
  } from "generator-engine";
  import {
    FULL_VIEW,
    MAX_ZOOM,
    ZOOM_STEP,
    panBy,
    viewBoxOf,
    zoomAt,
    type GraphView,
  } from "./mystery-graph-view";

  let { graph }: { graph?: MysteryGraph } = $props();

  const NODE_CLASS: Record<MysteryGraphNodeKind, string> = {
    person: "fill-theme-primary/15 stroke-theme-primary/60",
    place: "fill-theme-accent/15 stroke-theme-accent/60",
    clue: "fill-theme-surface stroke-theme-border",
    revelation: "fill-theme-primary/30 stroke-theme-primary",
  };

  const EDGE_CLASS = {
    found: "stroke-theme-border/60",
    leads: "stroke-theme-accent/80",
    supports: "stroke-theme-primary",
  } as const;

  const MARK_TITLE = {
    culprit: "The culprit",
    "key-item": "Where the key item is now",
  } as const;

  const LEGEND = [
    { swatch: "bg-theme-border/60", label: "found at" },
    { swatch: "bg-theme-accent/80", label: "leads to" },
    { swatch: "bg-theme-primary", label: "supports" },
  ] as const;

  /** Wrap a label onto at most two lines of roughly `limit` characters. */
  function wrap(label: string, limit = 28): string[] {
    const out: string[] = [];
    let current = "";
    for (const word of label.split(" ")) {
      if (current && `${current} ${word}`.length > limit) {
        out.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    if (current) out.push(current);
    return out.slice(0, 2);
  }

  const view = $derived(
    graph?.nodes.length
      ? (() => {
          const layout = buildMysteryGraphDiagram(graph);
          return {
            layout,
            nodes: layout.nodes.map((node) => ({
              node,
              lines: wrap(node.label),
            })),
          };
        })()
      : null,
  );

  /** The node whose connections are highlighted; everything else fades. */
  let selectedId = $state<string | null>(null);

  const toggle = (id: string) => (selectedId = selectedId === id ? null : id);

  const touches = (from: string, to: string, id: string | null) =>
    id !== null && (from === id || to === id);

  /** Ids of the selected node and everything directly connected to it. */
  const related = $derived(
    new Set(
      selectedId === null
        ? []
        : [
            selectedId,
            ...(view?.layout.edges ?? [])
              .filter((e) => touches(e.from, e.to, selectedId))
              .flatMap((e) => [e.from, e.to]),
          ],
    ),
  );

  const edgeOpacity = (from: string, to: string) => {
    if (selectedId === null) return 0.55;
    return touches(from, to, selectedId) ? 1 : 0.07;
  };

  const nodeOpacity = (id: string) =>
    selectedId === null || related.has(id) ? 1 : 0.3;

  /** The visible window into the diagram; zoomed in, it can be dragged. */
  let camera = $state<GraphView>(FULL_VIEW);
  let expanded = $state(false);
  const size = $derived({
    width: view?.layout.width ?? 1,
    height: view?.layout.height ?? 1,
  });
  const canPan = $derived(camera.zoom > 1);

  const zoomBy = (factor: number) => (camera = zoomAt(camera, factor, size));
  const resetView = () => (camera = FULL_VIEW);

  function setExpanded(next: boolean) {
    expanded = next;
    camera = FULL_VIEW;
  }

  /** Pixels across the drawn diagram, allowing for letterboxing when it is fitted to a box. */
  function drawnWidth(box: DOMRect): number {
    return Math.min(box.width, (box.height * size.width) / size.height);
  }

  let drag: { x: number; y: number; moved: boolean } | null = null;
  /** Set when a drag ends, so the release does not also select a node. */
  let suppressClick = false;

  function startDrag(event: PointerEvent) {
    if (!canPan) return;
    drag = { x: event.clientX, y: event.clientY, moved: false };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event: PointerEvent) {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag = { x: event.clientX, y: event.clientY, moved: true };
    const box = (event.currentTarget as Element).getBoundingClientRect();
    camera = panBy(camera, dx, dy, drawnWidth(box), size);
  }

  function endDrag() {
    suppressClick = drag?.moved ?? false;
    drag = null;
  }

  function cancelDrag() {
    drag = null;
    suppressClick = false;
  }

  function select(id: string) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    toggle(id);
  }

  /** Wheel zooms around the cursor in the enlarged view; a non-passive listener so the page does not scroll. */
  function wheelZoom(node: HTMLElement) {
    const onWheel = (event: WheelEvent) => {
      if (!expanded) return;
      event.preventDefault();
      const box = node.getBoundingClientRect();
      camera = zoomAt(
        camera,
        event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
        size,
        (event.clientX - box.left) / box.width,
        (event.clientY - box.top) / box.height,
      );
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return { destroy: () => node.removeEventListener("wheel", onWheel) };
  }

  const TOOL_BUTTON =
    "flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary disabled:opacity-40 disabled:hover:border-theme-border/50 disabled:hover:text-theme-text/70";

  const lineY = (node: MysteryGraphDiagramNode, count: number, row: number) =>
    node.y + (count === 1 ? 24 : 17 + row * 13);
</script>

{#snippet legend()}
  <ul
    class="flex flex-wrap gap-x-4 gap-y-1 text-micro text-theme-text/70"
    aria-label="Legend"
  >
    {#each LEGEND as item (item.label)}
      <li class="flex items-center gap-1.5">
        <span class="h-0.5 w-5 {item.swatch}"></span>{item.label}
      </li>
    {/each}
    <li><span aria-hidden="true">☠</span> culprit</li>
    <li><span aria-hidden="true">◆</span> key item</li>
  </ul>
{/snippet}

{#snippet toolbar()}
  <div class="flex gap-1.5" role="toolbar" aria-label="Graph view controls">
    <button
      type="button"
      class={TOOL_BUTTON}
      onclick={() => zoomBy(1 / ZOOM_STEP)}
      disabled={camera.zoom <= 1}
      title="Zoom out"
      aria-label="Zoom out"
    >
      <span class="icon-[lucide--zoom-out] h-3.5 w-3.5" aria-hidden="true"
      ></span>
    </button>
    <button
      type="button"
      class={TOOL_BUTTON}
      onclick={() => zoomBy(ZOOM_STEP)}
      disabled={camera.zoom >= MAX_ZOOM}
      title="Zoom in"
      aria-label="Zoom in"
    >
      <span class="icon-[lucide--zoom-in] h-3.5 w-3.5" aria-hidden="true"
      ></span>
    </button>
    <button
      type="button"
      class={TOOL_BUTTON}
      onclick={resetView}
      disabled={!canPan}
      title="Show the whole graph"
      aria-label="Show the whole graph"
    >
      <span class="icon-[lucide--scan] h-3.5 w-3.5" aria-hidden="true"></span>
    </button>
    <button
      type="button"
      class={TOOL_BUTTON}
      onclick={() => setExpanded(!expanded)}
      title={expanded ? "Close the enlarged graph" : "Enlarge the graph"}
      aria-label={expanded ? "Close the enlarged graph" : "Enlarge the graph"}
    >
      <span
        class="{expanded
          ? 'icon-[lucide--minimize-2]'
          : 'icon-[lucide--maximize-2]'} h-3.5 w-3.5"
        aria-hidden="true"
      ></span>
    </button>
  </div>
{/snippet}

{#snippet canvas(fill: boolean)}
  <div
    class="{fill ? 'min-h-0 flex-1' : ''} {canPan
      ? 'cursor-grab touch-none active:cursor-grabbing'
      : ''}"
    role="presentation"
    data-testid="mystery-clue-graph-canvas"
    onpointerdown={startDrag}
    onpointermove={moveDrag}
    onpointerup={endDrag}
    onpointercancel={cancelDrag}
    use:wheelZoom
  >
    <svg
      viewBox={viewBoxOf(camera, size)}
      preserveAspectRatio="xMidYMid meet"
      class="block w-full {fill ? 'h-full' : 'h-auto'}"
      role="img"
      aria-label="Graph of how people, places and clues lead to the conclusions of the case"
    >
      {#each view?.layout.edges ?? [] as edge, i (i)}
        <path
          d={edge.path}
          fill="none"
          class={EDGE_CLASS[edge.kind]}
          opacity={edgeOpacity(edge.from, edge.to)}
          stroke-width={edge.kind === "supports" ? 1.6 : 1}
          stroke-dasharray={edge.kind === "found" ? "3 3" : undefined}
        />
      {/each}
      {#each view?.nodes ?? [] as item (item.node.id)}
        {@render graphNode(item.node, item.lines)}
      {/each}
    </svg>
  </div>
{/snippet}

{#snippet graphNode(node: MysteryGraphDiagramNode, lines: string[])}
  <g
    data-node-id={node.id}
    data-kind={node.kind}
    role="button"
    tabindex="0"
    aria-pressed={selectedId === node.id}
    aria-label="{node.label}. Show its connections"
    opacity={nodeOpacity(node.id)}
    class="cursor-pointer outline-none focus-visible:opacity-100"
    onclick={() => select(node.id)}
    onkeydown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(node.id);
      }
    }}
  >
    <rect
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      rx="8"
      class={NODE_CLASS[node.kind]}
      stroke-width={node.mark ? 2.5 : 1}
    />
    {#each lines as line, row (row)}
      <text
        x={node.x + 10}
        y={lineY(node, lines.length, row)}
        class="fill-theme-text/90 font-body"
        font-size="10.5"
      >
        {line}
      </text>
    {/each}
    {#if node.mark}
      <title>{MARK_TITLE[node.mark]}: {node.label}</title>
      <text
        x={node.x + node.width - 8}
        y={node.y + 14}
        text-anchor="end"
        font-size="11"
        class="fill-theme-primary"
      >
        {node.mark === "culprit" ? "☠" : "◆"}
      </text>
    {/if}
  </g>
{/snippet}

{#if view}
  <section
    class="mb-6 w-full rounded-2xl border border-theme-border/50 bg-theme-surface/40 p-4"
    aria-label="GM clue graph"
    data-testid="mystery-clue-graph"
  >
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3
        class="font-header text-xs font-bold uppercase tracking-wider text-theme-primary"
      >
        Clue Graph — GM Only
      </h3>
      <p class="w-full text-micro text-theme-text/60">
        Select a person, place, clue or conclusion to see what connects to it.
      </p>
      {@render legend()}
      {@render toolbar()}
    </div>
    {#if expanded}
      <p class="py-8 text-center text-micro text-theme-text/60">
        The graph is open in the enlarged view.
      </p>
    {:else}
      {@render canvas(false)}
    {/if}
  </section>
{/if}

{#if view && expanded}
  <div
    class="fixed inset-0 z-50 flex bg-black/80 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Clue graph, enlarged"
    tabindex="-1"
    use:focusTrap
    onkeydown={(event) => {
      if (event.key === "Escape") setExpanded(false);
    }}
  >
    <div
      class="mx-auto flex h-full w-full max-w-7xl flex-col gap-2 rounded-2xl border border-theme-border/50 bg-theme-surface p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3
          class="font-header text-xs font-bold uppercase tracking-wider text-theme-primary"
        >
          Clue Graph — GM Only
        </h3>
        {@render legend()}
        {@render toolbar()}
      </div>
      <p class="text-micro text-theme-text/60">
        Scroll or use the buttons to zoom; drag to move around when zoomed in.
        Press Escape to close.
      </p>
      {@render canvas(true)}
    </div>
  </div>
{/if}

<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    buildPointCrawlDiagramLayout,
    pointCrawlNodeRoleSymbol,
    type PointCrawlNetwork,
    type PointCrawlNode,
    type PointCrawlRoute,
    type PointCrawlRegenTarget,
  } from "generator-engine";
  import { svgToPngBlob } from "#lib/utils/svg-export.js";
  import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
  import { focusTrap } from "#lib/actions/focusTrap.js";
  import PointCrawlGraphToolbar from "./PointCrawlGraphToolbar.svelte";
  import PointCrawlInspector from "./PointCrawlInspector.svelte";

  let {
    crawl,
    selectedNodeIds = $bindable<string[]>([]),
    useAI = false,
    busyId = null,
    onRegeneratePart = undefined,
    onCopy = undefined,
  }: {
    crawl: PointCrawlNetwork | undefined;
    selectedNodeIds?: string[];
    useAI?: boolean;
    busyId?: string | null;
    onRegeneratePart?: (
      target: PointCrawlRegenTarget,
      instruction?: string,
    ) => void;
    onCopy?: () => void;
  } = $props();

  const canUseAI = $derived(useAI && !discoveryPolicyStore.aiDisabled);

  // Sync selectedNodeIds to all nodes whenever a new crawl arrives
  let lastCrawlTitle = $state<string | undefined>(undefined);
  $effect(() => {
    if (crawl && crawl.title !== lastCrawlTitle) {
      lastCrawlTitle = crawl.title;
      selectedNodeIds = crawl.nodes.map((n) => n.id);
      overrides = {};
      inspectedNodeId = crawl.startNodeId;
      inspectedRouteId = null;
    }
  });

  let overrides = $state<Record<string, { x: number; y: number }>>({});
  let inspectedNodeId = $state<string | null>(null);
  let inspectedRouteId = $state<string | null>(null);
  let draggingNodeId = $state<string | null>(null);
  let pendingDrag: {
    nodeId: string;
    clientX: number;
    clientY: number;
    nodeX: number;
    nodeY: number;
  } | null = null;
  let inlineSvgEl = $state<SVGSVGElement | undefined>();
  let fitMode = $state<"actual" | "box">("box");
  let showFullscreen = $state(false);
  let copyState = $state<"idle" | "copied" | "downloaded" | "error">("idle");
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;
  let isDestroyed = false;

  onDestroy(() => {
    isDestroyed = true;
    clearTimeout(copyTimeout);
  });

  const layout = $derived(
    crawl ? buildPointCrawlDiagramLayout(crawl, overrides) : null,
  );

  const selectedSet = $derived(new Set(selectedNodeIds));
  const hasPositionOverrides = $derived(Object.keys(overrides).length > 0);

  const inspectedNode = $derived<PointCrawlNode | undefined>(
    crawl && inspectedNodeId
      ? crawl.nodes.find((n) => n.id === inspectedNodeId)
      : undefined,
  );
  const inspectedRoute = $derived<PointCrawlRoute | undefined>(
    crawl && inspectedRouteId
      ? crawl.routes.find((r) => r.id === inspectedRouteId)
      : undefined,
  );

  const connectedRouteIds = $derived.by(() => {
    if (!crawl) return new Set<string>();
    if (inspectedRouteId) return new Set([inspectedRouteId]);
    if (!inspectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const r of crawl.routes) {
      if (r.fromNodeId === inspectedNodeId || r.toNodeId === inspectedNodeId) {
        ids.add(r.id);
      }
    }
    return ids;
  });

  const connectedNeighbourIds = $derived.by(() => {
    if (!crawl) return new Set<string>();
    if (inspectedRoute) {
      return new Set([inspectedRoute.fromNodeId, inspectedRoute.toNodeId]);
    }
    if (!inspectedNodeId) return new Set<string>();
    const ids = new Set<string>([inspectedNodeId]);
    for (const r of crawl.routes) {
      if (r.fromNodeId === inspectedNodeId) ids.add(r.toNodeId);
      if (r.toNodeId === inspectedNodeId) ids.add(r.fromNodeId);
    }
    return ids;
  });

  function roleBadgeLabel(
    node: Pick<PointCrawlNode, "role" | "structuralRole">,
  ): string {
    return (node.structuralRole ?? node.role)
      .replaceAll("-", " ")
      .toUpperCase();
  }

  function selectNode(nodeId: string) {
    inspectedNodeId = nodeId;
    inspectedRouteId = null;
  }

  function selectRoute(routeId: string) {
    inspectedRouteId = routeId;
    inspectedNodeId = null;
  }

  function toggleNodeInSave(nodeId: string) {
    if (selectedSet.has(nodeId)) {
      if (selectedNodeIds.length <= 1) return; // Require at least 1 selected node
      selectedNodeIds = selectedNodeIds.filter((id) => id !== nodeId);
    } else {
      selectedNodeIds = [...selectedNodeIds, nodeId];
    }
  }

  function selectAllNodes() {
    if (!crawl) return;
    selectedNodeIds = crawl.nodes.map((n) => n.id);
  }

  function selectCoreNodesOnly() {
    if (!crawl) return;
    const core = crawl.nodes
      .filter((n) => n.role !== "side" && n.role !== "secret")
      .map((n) => n.id);
    selectedNodeIds = core.length > 0 ? core : [crawl.startNodeId];
  }

  function resetLayout() {
    overrides = {};
  }

  function clientToSvgCoords(
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    if (!layout) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const scaleX = layout.width / rect.width;
    const scaleY = layout.height / rect.height;
    return {
      x: Math.round(
        Math.max(
          36,
          Math.min(layout.width - 36, (clientX - rect.left) * scaleX),
        ),
      ),
      y: Math.round(
        Math.max(
          36,
          Math.min(layout.height - 36, (clientY - rect.top) * scaleY),
        ),
      ),
    };
  }

  function handleNodePointerDown(event: PointerEvent, nodeId: string) {
    if (event.button !== 0) return;
    const node = layout?.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    pendingDrag = {
      nodeId,
      clientX: event.clientX,
      clientY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
    };
    draggingNodeId = null;
    selectNode(nodeId);
    const target = event.currentTarget as Element | null;
    target?.setPointerCapture?.(event.pointerId);
  }

  function handleSvgPointerMove(event: PointerEvent) {
    if (!inlineSvgEl) return;
    if (pendingDrag) {
      const deltaX = event.clientX - pendingDrag.clientX;
      const deltaY = event.clientY - pendingDrag.clientY;
      if (!draggingNodeId && Math.hypot(deltaX, deltaY) < 4) return;
      const start = clientToSvgCoords(
        inlineSvgEl,
        pendingDrag.clientX,
        pendingDrag.clientY,
      );
      const current = clientToSvgCoords(
        inlineSvgEl,
        event.clientX,
        event.clientY,
      );
      if (!start || !current) return;
      draggingNodeId = pendingDrag.nodeId;
      overrides = {
        ...overrides,
        [pendingDrag.nodeId]: {
          x: pendingDrag.nodeX + current.x - start.x,
          y: pendingDrag.nodeY + current.y - start.y,
        },
      };
      return;
    }
  }

  function handleSvgPointerUp() {
    draggingNodeId = null;
    pendingDrag = null;
  }

  function handleFullscreenKeydown(event: KeyboardEvent) {
    if (showFullscreen && event.key === "Escape") showFullscreen = false;
  }

  /** Direct programmatic move helper (also used by tests and keyboard). */
  export function moveNode(nodeId: string, x: number, y: number) {
    overrides = { ...overrides, [nodeId]: { x, y } };
  }

  function svgRef(
    node: SVGSVGElement,
    setRef: ((el: SVGSVGElement | undefined) => void) | undefined,
  ) {
    setRef?.(node);
    return {
      destroy() {
        setRef?.(undefined);
      },
    };
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  export async function exportPng(scale = 2): Promise<Blob | null> {
    if (!inlineSvgEl || !layout) return null;
    return svgToPngBlob(inlineSvgEl, layout.width, layout.height, scale);
  }

  // fallow-ignore-next-line complexity
  async function handleCopyImage() {
    if (!inlineSvgEl || !crawl) return;
    onCopy?.();
    clearTimeout(copyTimeout);
    try {
      const blob = await exportPng();
      if (!blob || isDestroyed) return;
      const filename = `${(crawl.title || "point-crawl").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-graph.png`;
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard &&
        "write" in navigator.clipboard
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        if (isDestroyed) return;
        copyState = "copied";
      } else {
        downloadBlob(blob, filename);
        if (isDestroyed) return;
        copyState = "downloaded";
      }
    } catch (error) {
      if (isDestroyed) return;
      console.error("Copy point-crawl diagram failed", error);
      copyState = "error";
    }
    if (isDestroyed) return;
    copyTimeout = setTimeout(() => (copyState = "idle"), 2200);
  }
</script>

<svelte:window onkeydown={handleFullscreenKeydown} />

{#snippet graphSvg(
  fitContainer: boolean,
  onRef: ((el: SVGSVGElement | undefined) => void) | undefined,
)}
  <!-- fallow-ignore-next-line complexity -->
  {#if layout && crawl}
    <svg
      use:svgRef={onRef}
      viewBox="0 0 {layout.width} {layout.height}"
      class="block h-auto select-none {fitContainer ? 'w-full' : ''}"
      style={fitContainer
        ? undefined
        : `min-width: ${Math.max(layout.width, 560)}px;`}
      role="img"
      aria-label="Interactive point crawl network graph for {crawl.title}"
      onpointermove={handleSvgPointerMove}
      onpointerup={handleSvgPointerUp}
      onpointercancel={handleSvgPointerUp}
    >
      <defs>
        <marker
          id="pc-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" class="fill-theme-primary" />
        </marker>
      </defs>

      <!-- Route edges -->
      {#each layout.edges as edge (edge.id)}
        {@const isHighlighted = connectedRouteIds.has(edge.id)}
        {@const isSelectedRoute = inspectedRouteId === edge.id}
        {@const bothEndpointsSaved =
          selectedSet.has(edge.fromNodeId) && selectedSet.has(edge.toNodeId)}
        <g
          class="cursor-pointer transition-opacity {!bothEndpointsSaved
            ? 'opacity-35'
            : ''}"
          role="button"
          tabindex="0"
          aria-label="Inspect route {edge.badgeLabel}"
          data-testid="point-crawl-edge-{edge.id}"
          onclick={() => selectRoute(edge.id)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectRoute(edge.id);
            }
          }}
        >
          <!-- Wide invisible hit target -->
          <path
            d={edge.path}
            fill="none"
            stroke="transparent"
            stroke-width="14"
          />
          <path
            d={edge.path}
            fill="none"
            class={isSelectedRoute
              ? "stroke-theme-primary"
              : isHighlighted
                ? "stroke-theme-accent"
                : "stroke-theme-border/80"}
            stroke-width={isSelectedRoute ? "3" : isHighlighted ? "2.4" : "1.8"}
            stroke-dasharray={edge.visibility === "hidden"
              ? "5 4"
              : edge.visibility === "rumoured"
                ? "2 4"
                : undefined}
            marker-end={edge.direction === "one-way"
              ? "url(#pc-arrow)"
              : undefined}
          />
          <!-- Midpoint badge for gated/hidden/one-way or travel time -->
          <rect
            x={edge.labelX - 38}
            y={edge.labelY - 9}
            width="76"
            height="18"
            rx="5"
            class={isSelectedRoute
              ? "fill-theme-primary stroke-theme-primary"
              : edge.gate
                ? "fill-theme-surface stroke-theme-accent"
                : "fill-theme-bg/90 stroke-theme-border/60"}
            stroke-width="1"
          />
          <text
            x={edge.labelX}
            y={edge.labelY + 3}
            text-anchor="middle"
            class="font-mono {isSelectedRoute
              ? 'fill-theme-bg font-bold'
              : 'fill-theme-text/85'}"
            font-size="8.5"
          >
            {edge.gate
              ? "🔒 "
              : edge.visibility !== "obvious"
                ? "👁 "
                : ""}{edge.badgeLabel.slice(0, 11)}
          </text>
        </g>
      {/each}

      <!-- Location nodes -->
      {#each layout.nodes as node (node.id)}
        {@const isSelectedNode = inspectedNodeId === node.id}
        {@const isNeighbour = connectedNeighbourIds.has(node.id)}
        {@const isSaved = selectedSet.has(node.id)}
        <g
          transform="translate({node.x}, {node.y})"
          class="cursor-grab active:cursor-grabbing transition-opacity {!isSaved
            ? 'opacity-45'
            : ''}"
          role="button"
          tabindex="0"
          aria-label="{node.name} ({node.roleLabel})"
          data-testid="point-crawl-node-{node.id}"
          onpointerdown={(e) => handleNodePointerDown(e, node.id)}
          onclick={() => selectNode(node.id)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectNode(node.id);
            }
          }}
        >
          {#if isSelectedNode}
            <circle
              r="26"
              class="fill-none stroke-theme-primary"
              stroke-width="2"
              stroke-dasharray="3 2"
            />
          {/if}
          <circle
            r="20"
            class={node.role === "start"
              ? "fill-theme-surface stroke-theme-primary"
              : node.role === "goal"
                ? "fill-theme-surface stroke-theme-accent"
                : isNeighbour
                  ? "fill-theme-surface stroke-theme-primary"
                  : "fill-theme-surface stroke-theme-border"}
            stroke-width={isSelectedNode ||
            isNeighbour ||
            node.role === "start" ||
            node.role === "goal"
              ? "3"
              : "1.5"}
          />
          <text
            y="-3"
            text-anchor="middle"
            aria-hidden="true"
            class="fill-theme-text"
            font-size="12">{pointCrawlNodeRoleSymbol(node)}</text
          >
          <text
            y="9"
            text-anchor="middle"
            class="fill-theme-text font-header font-bold"
            font-size="7"
          >
            {roleBadgeLabel(node)}
          </text>
          <text
            y="34"
            text-anchor="middle"
            class="fill-theme-text font-header font-bold"
            font-size="10"
          >
            {node.name}
          </text>
        </g>
      {/each}
    </svg>
  {/if}
{/snippet}

<!-- fallow-ignore-next-line complexity -->
{#if crawl && layout}
  <div
    class="point-crawl-graph w-full rounded-2xl border border-theme-border/60 bg-theme-surface/40 p-4"
    data-testid="point-crawl-graph"
  >
    <PointCrawlGraphToolbar
      nodeCount={crawl.nodes.length}
      routeCount={crawl.routes.length}
      selectedCount={selectedNodeIds.length}
      {hasPositionOverrides}
      {copyState}
      {fitMode}
      onSelectAll={selectAllNodes}
      onSelectCore={selectCoreNodesOnly}
      onResetLayout={resetLayout}
      onCopyImage={handleCopyImage}
      onToggleFit={() => (fitMode = fitMode === "actual" ? "box" : "actual")}
      onFullscreen={() => (showFullscreen = true)}
    />

    <div
      class="rounded-xl border border-theme-border/40 bg-theme-bg/40 p-2 {fitMode ===
      'box'
        ? ''
        : 'overflow-x-auto'}"
    >
      {@render graphSvg(fitMode === "box", (el) => (inlineSvgEl = el))}
    </div>

    <p class="mt-2 text-nano text-theme-muted">
      Click any location node or route to inspect its table details, toggle
      whether it is included in Vault Save, or drag nodes to rearrange the map.
    </p>

    <PointCrawlInspector
      node={inspectedNode}
      route={inspectedRoute}
      nodes={crawl.nodes}
      included={inspectedNode ? selectedSet.has(inspectedNode.id) : false}
      {canUseAI}
      {busyId}
      onToggleSave={inspectedNode ? toggleNodeInSave : undefined}
      {onRegeneratePart}
    />
  </div>
{/if}

{#if showFullscreen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Point crawl graph, fit to screen"
    tabindex="-1"
    use:focusTrap
    onclick={(e) => {
      if (e.target === e.currentTarget) showFullscreen = false;
    }}
  >
    <div
      class="relative flex max-h-full w-full max-w-6xl flex-col rounded-2xl border border-theme-border/50 bg-theme-surface p-4"
    >
      <button
        type="button"
        onclick={() => (showFullscreen = false)}
        class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-theme-border/50 bg-theme-bg/60 text-theme-text/80 transition-all hover:border-theme-primary hover:text-theme-primary"
        title="Close"
        aria-label="Close diagram"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
      <div class="flex-1 overflow-hidden">
        {@render graphSvg(true, undefined)}
      </div>
    </div>
  </div>
{/if}

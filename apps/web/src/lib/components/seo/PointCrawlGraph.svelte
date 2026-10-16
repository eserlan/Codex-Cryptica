<script lang="ts">
  import {
    buildPointCrawlDiagramLayout,
    formatRouteConnectionLabel,
    type PointCrawlNetwork,
    type PointCrawlNode,
    type PointCrawlRoute,
    type PointCrawlRegenTarget,
  } from "generator-engine";
  import { svgToPngBlob } from "$lib/utils/svg-export";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";

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
      steeringNote = "";
      showSteeringInput = false;
    }
  });

  let overrides = $state<Record<string, { x: number; y: number }>>({});
  let inspectedNodeId = $state<string | null>(null);
  let inspectedRouteId = $state<string | null>(null);
  let draggingNodeId = $state<string | null>(null);
  let inlineSvgEl = $state<SVGSVGElement | undefined>();
  let fitMode = $state<"actual" | "box">("box");
  let showFullscreen = $state(false);
  let copyState = $state<"idle" | "copied" | "downloaded" | "error">("idle");
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;
  let showSteeringInput = $state(false);
  let steeringNote = $state("");

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

  function nodeNameById(id: string): string {
    return crawl?.nodes.find((n) => n.id === id)?.name ?? id;
  }

  function roleBadgeLabel(role: PointCrawlNode["role"]): string {
    switch (role) {
      case "start":
        return "START";
      case "goal":
        return "GOAL";
      case "hub":
        return "HUB";
      case "secret":
        return "SECRET";
      case "hazard":
        return "HAZARD";
      case "obstacle":
        return "OBSTACLE";
      default:
        return "SIDE";
    }
  }

  function selectNode(nodeId: string) {
    inspectedNodeId = nodeId;
    inspectedRouteId = null;
    showSteeringInput = false;
    steeringNote = "";
  }

  function selectRoute(routeId: string) {
    inspectedRouteId = routeId;
    inspectedNodeId = null;
    showSteeringInput = false;
    steeringNote = "";
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
    draggingNodeId = nodeId;
    selectNode(nodeId);
    const target = event.currentTarget as Element | null;
    target?.setPointerCapture?.(event.pointerId);
  }

  function handleSvgPointerMove(event: PointerEvent) {
    if (!draggingNodeId || !inlineSvgEl) return;
    const pt = clientToSvgCoords(inlineSvgEl, event.clientX, event.clientY);
    if (!pt) return;
    overrides = {
      ...overrides,
      [draggingNodeId]: pt,
    };
  }

  function handleSvgPointerUp() {
    draggingNodeId = null;
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

  async function handleCopyImage() {
    if (!inlineSvgEl || !crawl) return;
    onCopy?.();
    clearTimeout(copyTimeout);
    try {
      const blob = await exportPng();
      if (!blob) return;
      const filename = `${(crawl.title || "point-crawl").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-graph.png`;
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard &&
        "write" in navigator.clipboard
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        copyState = "copied";
      } else {
        downloadBlob(blob, filename);
        copyState = "downloaded";
      }
    } catch (error) {
      console.error("Copy point-crawl diagram failed", error);
      copyState = "error";
    }
    copyTimeout = setTimeout(() => (copyState = "idle"), 2200);
  }

  function submitInspectorRegen(e?: SubmitEvent) {
    e?.preventDefault();
    if (!onRegeneratePart) return;
    const instruction = steeringNote.trim() || undefined;
    if (inspectedNode) {
      onRegeneratePart({ kind: "node", id: inspectedNode.id }, instruction);
    } else if (inspectedRoute) {
      onRegeneratePart({ kind: "route", id: inspectedRoute.id }, instruction);
    }
    showSteeringInput = false;
    steeringNote = "";
  }
</script>

{#snippet graphSvg(
  fitContainer: boolean,
  onRef: ((el: SVGSVGElement | undefined) => void) | undefined,
)}
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
          aria-label="{node.name} ({node.role})"
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
              ? "fill-theme-primary stroke-theme-border"
              : node.role === "goal"
                ? "fill-theme-accent stroke-theme-primary"
                : isNeighbour
                  ? "fill-theme-surface stroke-theme-primary"
                  : "fill-theme-surface stroke-theme-border"}
            stroke-width={isSelectedNode || isNeighbour ? "2.5" : "1.5"}
          />
          <text
            y="3"
            text-anchor="middle"
            class="font-header font-bold {node.role === 'start' ||
            node.role === 'goal'
              ? 'fill-theme-bg'
              : 'fill-theme-text'}"
            font-size="8"
          >
            {roleBadgeLabel(node.role)}
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

{#if crawl && layout}
  <div
    class="point-crawl-graph w-full rounded-2xl border border-theme-border/60 bg-theme-surface/40 p-4"
    data-testid="point-crawl-graph"
  >
    <!-- Toolbar -->
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="text-micro font-bold uppercase tracking-wider text-theme-text/80"
        >
          Point Crawl Network ({crawl.nodes.length} points · {crawl.routes
            .length} routes)
        </span>
        <span
          class="rounded-full border border-theme-border/60 bg-theme-bg/50 px-2 py-0.5 text-nano font-mono text-theme-muted"
          data-testid="point-crawl-save-count"
        >
          Saving {selectedNodeIds.length} of {crawl.nodes.length} points
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onclick={selectAllNodes}
          class="rounded-md border border-theme-border/50 bg-theme-bg/40 px-2 py-1 text-nano font-bold uppercase tracking-wider text-theme-text/75 transition hover:border-theme-primary hover:text-theme-primary"
          data-testid="point-crawl-select-all"
        >
          Select All
        </button>
        <button
          type="button"
          onclick={selectCoreNodesOnly}
          class="rounded-md border border-theme-border/50 bg-theme-bg/40 px-2 py-1 text-nano font-bold uppercase tracking-wider text-theme-text/75 transition hover:border-theme-primary hover:text-theme-primary"
          data-testid="point-crawl-select-core"
          title="Deselect optional side and secret points from Vault Save"
        >
          Core Only
        </button>
        {#if hasPositionOverrides}
          <button
            type="button"
            onclick={resetLayout}
            class="rounded-md border border-theme-border/50 bg-theme-bg/40 px-2 py-1 text-nano font-bold uppercase tracking-wider text-theme-text/75 transition hover:border-theme-primary hover:text-theme-primary"
            data-testid="point-crawl-reset-layout"
          >
            Reset Layout
          </button>
        {/if}
        <button
          type="button"
          onclick={handleCopyImage}
          class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
          title={copyState === "copied"
            ? "Copied!"
            : copyState === "downloaded"
              ? "Downloaded"
              : "Copy network graph as PNG"}
          aria-label="Copy diagram as image"
        >
          <span
            class={copyState === "copied"
              ? "icon-[lucide--check] h-3.5 w-3.5"
              : "icon-[lucide--copy] h-3.5 w-3.5"}
            aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          onclick={() => (fitMode = fitMode === "actual" ? "box" : "actual")}
          class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
          title={fitMode === "actual"
            ? "Fit to box"
            : "Show actual scrollable size"}
          aria-label={fitMode === "actual" ? "Fit to box" : "Show actual size"}
        >
          <span
            class={fitMode === "actual"
              ? "icon-[lucide--scan] h-3.5 w-3.5"
              : "icon-[lucide--move-horizontal] h-3.5 w-3.5"}
            aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          onclick={() => (showFullscreen = true)}
          class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
          title="Fullscreen graph"
          aria-label="Fit diagram to screen"
        >
          <span class="icon-[lucide--maximize] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>

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

    <!-- Selected Node or Route Inspector -->
    {#if inspectedNode}
      <div
        class="mt-3 rounded-xl border border-theme-border/60 bg-theme-bg/60 p-3.5 text-xs"
        data-testid="point-crawl-node-inspector"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span
                class="rounded bg-theme-primary/15 px-1.5 py-0.5 font-mono text-nano font-bold uppercase text-theme-primary"
              >
                {inspectedNode.role}
              </span>
              <h4 class="font-header text-sm font-bold text-theme-text">
                {inspectedNode.name}
              </h4>
            </div>
            <p class="mt-1 text-theme-text/85">{inspectedNode.summary}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <label
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-theme-border/60 bg-theme-surface/50 px-2.5 py-1 text-nano font-bold uppercase tracking-wider text-theme-text"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(inspectedNode.id)}
                onchange={() => toggleNodeInSave(inspectedNode.id)}
                class="accent-theme-primary"
                data-testid="point-crawl-toggle-save-{inspectedNode.id}"
              />
              Include in Vault Save
            </label>
            {#if onRegeneratePart}
              {#if canUseAI}
                <button
                  type="button"
                  disabled={busyId !== null}
                  onclick={() => (showSteeringInput = !showSteeringInput)}
                  class="inline-flex items-center gap-1 rounded-md border border-theme-border/60 bg-theme-surface/60 px-2.5 py-1 text-nano font-bold uppercase tracking-wider text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
                  data-testid="point-crawl-inspector-revise"
                >
                  <span class="icon-[lucide--pencil] h-3 w-3" aria-hidden="true"
                  ></span>
                  Steer
                </button>
              {/if}
              <button
                type="button"
                disabled={busyId !== null}
                onclick={() => submitInspectorRegen()}
                class="inline-flex items-center gap-1 rounded-md border border-theme-border/60 bg-theme-surface/60 px-2.5 py-1 text-nano font-bold uppercase tracking-wider text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
                data-testid="point-crawl-inspector-regenerate"
              >
                <span
                  class="icon-[lucide--refresh-cw] h-3 w-3 {busyId ===
                  inspectedNode.id
                    ? 'animate-spin'
                    : ''}"
                  aria-hidden="true"
                ></span>
                Regenerate Node
              </button>
            {/if}
          </div>
        </div>

        <dl class="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div>
            <dt class="font-bold text-theme-muted">Sensory:</dt>
            <dd class="text-theme-text/90">
              {inspectedNode.sensoryDescription}
            </dd>
          </div>
          <div>
            <dt class="font-bold text-theme-muted">Why Visit:</dt>
            <dd class="text-theme-text/90">
              {inspectedNode.whyVisit}
            </dd>
          </div>
          <div>
            <dt class="font-bold text-theme-muted">Encounter / Hazard:</dt>
            <dd class="text-theme-text/90">
              {inspectedNode.encounterOrHazard}
            </dd>
          </div>
          {#if inspectedNode.clueOrReward}
            <div>
              <dt class="font-bold text-theme-muted">
                Clue / Reward / Leverage:
              </dt>
              <dd class="text-theme-text/90">
                {inspectedNode.clueOrReward}
              </dd>
            </div>
          {/if}
        </dl>

        {#if showSteeringInput && canUseAI}
          <form
            class="mt-2.5 flex items-center gap-2"
            onsubmit={submitInspectorRegen}
          >
            <input
              type="text"
              bind:value={steeringNote}
              maxlength="400"
              placeholder="How should this location change? (e.g. flooded shrine with a rival explorer)"
              aria-label="Steer location rewrite"
              class="min-w-0 flex-1 rounded-lg border border-theme-border/60 bg-theme-bg px-2.5 py-1 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!steeringNote.trim() || busyId !== null}
              class="rounded-md bg-theme-primary px-3 py-1 text-nano font-bold uppercase tracking-wider text-theme-bg disabled:opacity-50"
            >
              Apply
            </button>
          </form>
        {/if}
      </div>
    {:else if inspectedRoute}
      <div
        class="mt-3 rounded-xl border border-theme-border/60 bg-theme-bg/60 p-3.5 text-xs"
        data-testid="point-crawl-route-inspector"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span
                class="rounded bg-theme-primary/15 px-1.5 py-0.5 font-mono text-nano font-bold uppercase text-theme-primary"
              >
                {inspectedRoute.visibility} · {inspectedRoute.direction}
              </span>
              <h4 class="font-header text-sm font-bold text-theme-text">
                {nodeNameById(inspectedRoute.fromNodeId)} → {nodeNameById(
                  inspectedRoute.toNodeId,
                )}
              </h4>
            </div>
            <p class="mt-1 font-mono text-nano text-theme-muted">
              {formatRouteConnectionLabel(inspectedRoute)}
            </p>
          </div>

          {#if onRegeneratePart}
            <div class="flex items-center gap-2">
              {#if canUseAI}
                <button
                  type="button"
                  disabled={busyId !== null}
                  onclick={() => (showSteeringInput = !showSteeringInput)}
                  class="inline-flex items-center gap-1 rounded-md border border-theme-border/60 bg-theme-surface/60 px-2.5 py-1 text-nano font-bold uppercase tracking-wider text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
                  data-testid="point-crawl-inspector-revise"
                >
                  <span class="icon-[lucide--pencil] h-3 w-3" aria-hidden="true"
                  ></span>
                  Steer
                </button>
              {/if}
              <button
                type="button"
                disabled={busyId !== null}
                onclick={() => submitInspectorRegen()}
                class="inline-flex items-center gap-1 rounded-md border border-theme-border/60 bg-theme-surface/60 px-2.5 py-1 text-nano font-bold uppercase tracking-wider text-theme-text hover:border-theme-primary hover:text-theme-primary disabled:opacity-50"
                data-testid="point-crawl-inspector-regenerate"
              >
                <span
                  class="icon-[lucide--refresh-cw] h-3 w-3 {busyId ===
                  inspectedRoute.id
                    ? 'animate-spin'
                    : ''}"
                  aria-hidden="true"
                ></span>
                Regenerate Route
              </button>
            </div>
          {/if}
        </div>

        <dl class="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <div>
            <dt class="font-bold text-theme-muted">Signpost at Origin:</dt>
            <dd class="text-theme-text/90">{inspectedRoute.signpost}</dd>
          </div>
          <div>
            <dt class="font-bold text-theme-muted">Risk / Toll:</dt>
            <dd class="text-theme-text/90">{inspectedRoute.risk}</dd>
          </div>
          {#if inspectedRoute.gate}
            <div class="sm:col-span-2">
              <dt class="font-bold text-theme-accent">
                Gate ({inspectedRoute.gate.kind}):
              </dt>
              <dd class="text-theme-text/90">
                Requires <strong>{inspectedRoute.gate.requirement}</strong>
                (found at {nodeNameById(inspectedRoute.gate.unlockedByNodeId)})
              </dd>
            </div>
          {/if}
        </dl>

        {#if showSteeringInput && canUseAI}
          <form
            class="mt-2.5 flex items-center gap-2"
            onsubmit={submitInspectorRegen}
          >
            <input
              type="text"
              bind:value={steeringNote}
              maxlength="400"
              placeholder="How should this route change? (e.g. collapsed rope bridge over a chasm)"
              aria-label="Steer route rewrite"
              class="min-w-0 flex-1 rounded-lg border border-theme-border/60 bg-theme-bg px-2.5 py-1 text-xs text-theme-text focus:border-theme-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!steeringNote.trim() || busyId !== null}
              class="rounded-md bg-theme-primary px-3 py-1 text-nano font-bold uppercase tracking-wider text-theme-bg disabled:opacity-50"
            >
              Apply
            </button>
          </form>
        {/if}
      </div>
    {/if}
  </div>
{/if}

{#if showFullscreen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Point crawl graph, fit to screen"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === "Escape") showFullscreen = false;
    }}
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

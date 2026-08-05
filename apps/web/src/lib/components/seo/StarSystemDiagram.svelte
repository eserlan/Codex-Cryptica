<script lang="ts">
  import {
    buildStarSystemDiagram,
    colorForBodyType,
    STAR_TYPE_COLORS,
  } from "generator-engine";
  import type { StarSystemBody } from "generator-engine";
  import { svgToPngBlob } from "$lib/utils/svg-export";

  let {
    bodies,
    starType,
    title,
  }: {
    bodies: StarSystemBody[] | undefined;
    starType?: string;
    title?: string;
  } = $props();

  const layout = $derived(buildStarSystemDiagram(bodies ?? []));
  const starColor = $derived(starType ? STAR_TYPE_COLORS[starType] : undefined);

  const isRinged = (type: string) => /ringed/i.test(type);
  const isBelt = (type: string) => /asteroid/i.test(type);

  // Fixed jitter pattern (not random) so a belt renders identically on every
  // re-render: a small irregular clump of rocks rather than a single body.
  const BELT_ROCK_OFFSETS = [
    { dx: -0.55, dy: -0.25, r: 0.34 },
    { dx: -0.1, dy: 0.5, r: 0.26 },
    { dx: 0.4, dy: -0.5, r: 0.3 },
    { dx: 0.55, dy: 0.2, r: 0.22 },
    { dx: 0.05, dy: -0.05, r: 0.3 },
    { dx: -0.5, dy: 0.35, r: 0.2 },
    { dx: 0.15, dy: 0.55, r: 0.18 },
    { dx: -0.2, dy: -0.55, r: 0.2 },
  ];

  function beltRocks(node: { x: number; y: number; radius: number }) {
    return BELT_ROCK_OFFSETS.map(({ dx, dy, r }) => ({
      cx: node.x + dx * node.radius * 2,
      cy: node.y + dy * node.radius * 2,
      r: Math.max(1.2, r * node.radius),
    }));
  }

  const RING_ANGLE = (18 * Math.PI) / 180;

  /**
   * How far a body's drawn glyph actually extends below its center — a
   * ringed world's tilted ellipse and a belt's scattered rock clump both
   * reach further down than the plain circle radius, and label spacing needs
   * to clear the real shape, not just the radius, or the name overlaps it.
   */
  function bottomExtent(node: { type: string; radius: number }): number {
    if (isBelt(node.type)) {
      return Math.max(
        node.radius,
        ...BELT_ROCK_OFFSETS.map(
          ({ dy, r }) => dy * node.radius * 2 + r * node.radius,
        ),
      );
    }
    if (isRinged(node.type)) {
      const rx = node.radius * 1.7;
      const ry = node.radius * 0.45;
      const ringHalfHeight = Math.sqrt(
        (rx * Math.sin(RING_ANGLE)) ** 2 + (ry * Math.cos(RING_ANGLE)) ** 2,
      );
      return Math.max(node.radius, ringHalfHeight);
    }
    return node.radius;
  }

  // "actual" scrolls to the diagram's natural pixel width; "box" scales it
  // down to fit the card it's sitting in with no horizontal scroll.
  let fitMode = $state<"actual" | "box">("actual");
  let showFullscreen = $state(false);
  let inlineSvgEl = $state<SVGSVGElement | undefined>();
  let copyState = $state<"idle" | "copied" | "downloaded" | "error">("idle");
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  function toggleFitMode() {
    fitMode = fitMode === "actual" ? "box" : "actual";
  }

  function openFullscreen() {
    showFullscreen = true;
  }

  function closeFullscreen() {
    showFullscreen = false;
  }

  function handleOverlayKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") closeFullscreen();
  }

  /** Action so each `{@render diagramSvg(...)}` call site can capture its own <svg> ref, without `bind:this` (which can't vary per-invocation of a shared snippet). */
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

  /**
   * Rasterizes the live diagram to a PNG blob, or `null` if there is no SVG
   * to export yet. Exposed so a parent can grab the diagram image at
   * "Save to Codex" time (via `bind:this`) and link it as the new Location
   * entity's map (#1935 follow-up).
   */
  export async function exportPng(scale = 2): Promise<Blob | null> {
    if (!inlineSvgEl) return null;
    return svgToPngBlob(inlineSvgEl, layout.width, layout.height, scale);
  }

  async function handleCopyImage() {
    if (!inlineSvgEl) return;
    clearTimeout(copyTimeout);
    try {
      const blob = await exportPng();
      if (!blob) return;
      const filename = `${(title || "star-system").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-diagram.png`;
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
      console.error("Copy diagram image failed", error);
      copyState = "error";
    }
    copyTimeout = setTimeout(() => (copyState = "idle"), 2200);
  }
</script>

{#snippet diagramSvg(
  fitContainer: boolean,
  onRef: ((el: SVGSVGElement | undefined) => void) | undefined,
)}
  <svg
    use:svgRef={onRef}
    viewBox="0 0 {layout.width} {layout.height}"
    class="block h-auto {fitContainer ? 'w-full' : ''}"
    style={fitContainer
      ? undefined
      : `min-width: ${Math.max(layout.width, 480)}px;`}
    role="img"
    aria-label="Side-view diagram of the star system, star on the left with major bodies stretched to the right"
  >
    <line
      x1={layout.star.x}
      y1={layout.star.y}
      x2={layout.width - 20}
      y2={layout.star.y}
      class="stroke-theme-border/40"
      stroke-width="1"
    />

    {#each layout.auGridlines as gridline (gridline.au)}
      <line
        x1={gridline.x}
        y1={34}
        x2={gridline.x}
        y2={layout.height - 6}
        class="stroke-theme-border/20"
        stroke-width="1"
        stroke-dasharray="1 4"
      />
      <text
        x={gridline.x}
        y={12}
        text-anchor="middle"
        class="fill-theme-muted/70 font-header"
        font-size="8"
      >
        {gridline.au} AU
      </text>
    {/each}

    <!-- Per-body exact AU distance, ticked along the same top ruler as the
         round-interval gridlines above, rather than crowding the labels
         under each planet. -->
    {#each layout.nodes.filter((n) => !n.isMoon && n.distanceAU !== undefined) as node (node.name)}
      <line
        x1={node.x}
        y1={30}
        x2={node.x}
        y2={36}
        class="stroke-theme-accent/50"
        stroke-width="1"
      />
      <text
        x={node.x}
        y={26}
        text-anchor="middle"
        class="fill-theme-accent/90 font-header"
        font-size="8"
      >
        {node.distanceAU} AU
      </text>
    {/each}

    {#each layout.nodes as node (node.name)}
      {#if node.isMoon}
        <line
          x1={node.x}
          y1={node.y}
          x2={node.x}
          y2={layout.star.y}
          class="stroke-theme-border/30"
          stroke-width="1"
          stroke-dasharray="2 3"
        />
      {/if}
    {/each}

    <circle
      cx={layout.star.x}
      cy={layout.star.y}
      r={layout.star.radius}
      class={starColor ? "" : "fill-theme-primary"}
      style={starColor ? `fill: ${starColor};` : undefined}
    />

    {#each layout.nodes as node (node.name)}
      {#if isBelt(node.type)}
        {#each beltRocks(node) as rock, i (i)}
          <circle
            cx={rock.cx}
            cy={rock.cy}
            r={rock.r}
            class="fill-theme-muted stroke-theme-border"
            stroke-width="0.75"
          />
        {/each}
      {:else}
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius}
          class={node.isMoon
            ? "fill-theme-muted/60 stroke-theme-border"
            : colorForBodyType(node.type)
              ? "stroke-theme-border"
              : "fill-theme-accent stroke-theme-border"}
          style={!node.isMoon && colorForBodyType(node.type)
            ? `fill: ${colorForBodyType(node.type)};`
            : undefined}
          stroke-width="1"
        />
      {/if}
      {#if isRinged(node.type)}
        <ellipse
          cx={node.x}
          cy={node.y}
          rx={node.radius * 1.7}
          ry={node.radius * 0.45}
          class={colorForBodyType(node.type)
            ? "fill-none"
            : "fill-none stroke-theme-accent/70"}
          style={colorForBodyType(node.type)
            ? `stroke: ${colorForBodyType(node.type)}; stroke-opacity: 0.7;`
            : undefined}
          stroke-width="1.5"
          transform="rotate(-18 {node.x} {node.y})"
        />
      {/if}
      <text
        x={node.x}
        y={node.y + bottomExtent(node) + (node.isMoon ? 13 : 17)}
        text-anchor="middle"
        class="fill-theme-text/80 font-header"
        font-size={node.isMoon ? 8 : 10}
      >
        {node.name}
      </text>
    {/each}
  </svg>
{/snippet}

{#if bodies && bodies.length > 0}
  <div
    class="star-system-diagram w-full rounded-2xl border border-theme-border/50 bg-theme-surface/40 p-4"
  >
    <div class="mb-2 flex justify-end gap-1.5">
      <button
        type="button"
        onclick={handleCopyImage}
        class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
        title={copyState === "copied"
          ? "Copied!"
          : copyState === "downloaded"
            ? "Downloaded"
            : copyState === "error"
              ? "Couldn't copy — try again"
              : "Copy this diagram as an image"}
        aria-label="Copy diagram as image"
      >
        <span
          class={copyState === "copied"
            ? "icon-[lucide--check] h-3.5 w-3.5"
            : copyState === "error"
              ? "icon-[lucide--alert-triangle] h-3.5 w-3.5"
              : "icon-[lucide--copy] h-3.5 w-3.5"}
          aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        onclick={toggleFitMode}
        class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
        title={fitMode === "actual"
          ? "Fit to box (no scrolling)"
          : "Show actual size (scrollable)"}
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
        onclick={openFullscreen}
        class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
        title="Fit to screen"
        aria-label="Fit diagram to screen"
      >
        <span class="icon-[lucide--maximize] h-3.5 w-3.5" aria-hidden="true"
        ></span>
      </button>
    </div>

    <div class={fitMode === "box" ? "" : "overflow-x-auto"}>
      {@render diagramSvg(fitMode === "box", (el) => (inlineSvgEl = el))}
    </div>
  </div>
{/if}

{#if showFullscreen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    role="dialog"
    aria-modal="true"
    aria-label="Star system diagram, fit to screen"
    tabindex="-1"
    onkeydown={handleOverlayKeydown}
    onclick={(e) => {
      if (e.target === e.currentTarget) closeFullscreen();
    }}
  >
    <div
      class="relative flex max-h-full w-full max-w-6xl flex-col rounded-2xl border border-theme-border/50 bg-theme-surface p-4"
    >
      <button
        type="button"
        onclick={closeFullscreen}
        class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-theme-border/50 bg-theme-bg/60 text-theme-text/80 transition-all hover:border-theme-primary hover:text-theme-primary"
        title="Close"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
      <div class="flex-1 overflow-hidden">
        {@render diagramSvg(true, undefined)}
      </div>
    </div>
  </div>
{/if}

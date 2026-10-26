<script lang="ts">
  import { buildConstellationDiagram } from "generator-engine";
  import type { ConstellationPattern } from "generator-engine";
  import { svgToPngBlob } from "$lib/utils/svg-export";

  let {
    pattern,
    title,
    onCopy,
  }: {
    pattern: ConstellationPattern | undefined;
    title?: string;
    onCopy?: () => void;
  } = $props();

  const layout = $derived(buildConstellationDiagram(pattern));

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
   * "Save to Codex" time (via `bind:this`) and link it as the new entity's
   * map, mirroring the star-system diagram's exportPng().
   */
  export async function exportPng(scale = 2): Promise<Blob | null> {
    if (!inlineSvgEl) return null;
    return svgToPngBlob(inlineSvgEl, layout.width, layout.height, scale);
  }

  async function handleCopyImage() {
    if (!inlineSvgEl) return;
    onCopy?.();
    clearTimeout(copyTimeout);
    try {
      const blob = await exportPng();
      if (!blob) return;
      const filename = `${(title || "constellation").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-chart.png`;
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
      console.error("Copy constellation chart image failed", error);
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
      : `min-width: ${Math.max(layout.width, 280)}px;`}
    role="img"
    aria-label="Star chart of the constellation, stars connected by lines tracing its shape"
  >
    {#each layout.lines as line, i (i)}
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        class="stroke-theme-accent/60"
        stroke-width="1"
      />
    {/each}

    {#each layout.nodes as node, i (i)}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.radius}
        class="fill-theme-primary stroke-theme-border"
        stroke-width="0.75"
      />
      {#if node.name}
        <text
          x={node.x}
          y={node.y - node.radius - 5}
          text-anchor="middle"
          class="fill-theme-text/80 font-header"
          font-size="9"
        >
          {node.name}
        </text>
      {/if}
    {/each}
  </svg>
{/snippet}

{#if pattern?.stars?.length}
  <div
    class="constellation-chart w-full rounded-2xl border border-theme-border/50 bg-theme-surface/40 p-4"
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
              : "Copy this star chart as an image"}
        aria-label="Copy star chart as image"
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
        aria-label="Fit chart to screen"
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
    aria-label="Constellation star chart, fit to screen"
    tabindex="-1"
    onkeydown={handleOverlayKeydown}
    onclick={(e) => {
      if (e.target === e.currentTarget) closeFullscreen();
    }}
  >
    <div
      class="relative flex max-h-full w-full max-w-2xl flex-col rounded-2xl border border-theme-border/50 bg-theme-surface p-4"
    >
      <button
        type="button"
        onclick={closeFullscreen}
        class="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-theme-border/50 bg-theme-bg/60 text-theme-text/80 transition-all hover:border-theme-primary hover:text-theme-primary"
        title="Close"
        aria-label="Close chart"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
      <div class="flex-1 overflow-hidden">
        {@render diagramSvg(true, undefined)}
      </div>
    </div>
  </div>
{/if}

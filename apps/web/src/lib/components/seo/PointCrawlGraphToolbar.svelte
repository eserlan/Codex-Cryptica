<script lang="ts">
  let {
    nodeCount,
    routeCount,
    selectedCount,
    hasPositionOverrides,
    copyState,
    fitMode,
    onSelectAll,
    onSelectCore,
    onResetLayout,
    onCopyImage,
    onToggleFit,
    onFullscreen,
  }: {
    nodeCount: number;
    routeCount: number;
    selectedCount: number;
    hasPositionOverrides: boolean;
    copyState: "idle" | "copied" | "downloaded" | "error";
    fitMode: "actual" | "box";
    onSelectAll: () => void;
    onSelectCore: () => void;
    onResetLayout: () => void;
    onCopyImage: () => void;
    onToggleFit: () => void;
    onFullscreen: () => void;
  } = $props();

  const fitTitle = $derived(
    fitMode === "actual" ? "Fit to box" : "Show actual scrollable size",
  );
  const fitLabel = $derived(
    fitMode === "actual" ? "Fit to box" : "Show actual size",
  );
  const fitIconClass = $derived(
    fitMode === "actual"
      ? "icon-[lucide--scan] h-3.5 w-3.5"
      : "icon-[lucide--move-horizontal] h-3.5 w-3.5",
  );
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
  <div class="flex flex-wrap items-center gap-2">
    <span
      class="text-micro font-bold uppercase tracking-wider text-theme-text/80"
      >Point Crawl Network ({nodeCount} points · {routeCount} routes)</span
    >
    <span
      class="rounded-full border border-theme-border/60 bg-theme-bg/50 px-2 py-0.5 text-nano font-mono text-theme-muted"
      data-testid="point-crawl-save-count"
      >Saving {selectedCount} of {nodeCount} points</span
    >
  </div>
  <div class="flex flex-wrap items-center gap-1.5">
    <button
      type="button"
      onclick={onSelectAll}
      class="rounded-md border border-theme-border/50 bg-theme-bg/40 px-2 py-1 text-nano font-bold uppercase tracking-wider text-theme-text/75 transition hover:border-theme-primary hover:text-theme-primary"
      data-testid="point-crawl-select-all">Select All</button
    >
    <button
      type="button"
      onclick={onSelectCore}
      class="rounded-md border border-theme-border/50 bg-theme-bg/40 px-2 py-1 text-nano font-bold uppercase tracking-wider text-theme-text/75 transition hover:border-theme-primary hover:text-theme-primary"
      data-testid="point-crawl-select-core"
      title="Deselect optional side and secret points from Vault Save"
      >Core Only</button
    >
    {#if hasPositionOverrides}<button
        type="button"
        onclick={onResetLayout}
        class="rounded-md border border-theme-border/50 bg-theme-bg/40 px-2 py-1 text-nano font-bold uppercase tracking-wider text-theme-text/75 transition hover:border-theme-primary hover:text-theme-primary"
        data-testid="point-crawl-reset-layout">Reset Layout</button
      >{/if}
    <button
      type="button"
      onclick={onCopyImage}
      class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
      title={copyState === "copied"
        ? "Copied!"
        : copyState === "downloaded"
          ? "Downloaded"
          : "Copy network graph as PNG"}
      aria-label="Copy diagram as image"
      ><span
        class={copyState === "copied"
          ? "icon-[lucide--check] h-3.5 w-3.5"
          : "icon-[lucide--copy] h-3.5 w-3.5"}
        aria-hidden="true"
      ></span></button
    >
    <button
      type="button"
      onclick={onToggleFit}
      class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
      title={fitTitle}
      aria-label={fitLabel}
      ><span class={fitIconClass} aria-hidden="true"></span></button
    >
    <button
      type="button"
      onclick={onFullscreen}
      class="flex h-7 w-7 items-center justify-center rounded-md border border-theme-border/50 bg-theme-bg/40 text-theme-text/70 transition-all hover:border-theme-primary hover:text-theme-primary"
      title="Fullscreen graph"
      aria-label="Fit diagram to screen"
      ><span class="icon-[lucide--maximize] h-3.5 w-3.5" aria-hidden="true"
      ></span></button
    >
  </div>
</div>

<script lang="ts">
  import type { Core } from "cytoscape";
  import { graph } from "$lib/stores/graph.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import Minimap from "./Minimap.svelte";
  import TimelineControls from "./TimelineControls.svelte";

  let { cy, isLayoutRunning, onApplyLayout } = $props<{
    cy: Core | undefined;
    isLayoutRunning: boolean;
    onApplyLayout: (
      isInitial?: boolean,
      isForced?: boolean,
      caller?: string,
    ) => Promise<void>;
  }>();

  let showMinimap = $state(false);
</script>

<div
  class="absolute bottom-6 left-6 z-20 flex flex-col gap-2 items-start max-w-[calc(100vw-3rem)]"
>
  {#if cy}
    <div class="relative">
      <Minimap
        {cy}
        absolute={false}
        width={192}
        height={128}
        isExpanded={showMinimap}
      />
    </div>
  {/if}

  <div class="flex gap-1 items-center flex-wrap">
    <button
      class="w-8 h-8 flex-shrink-0 flex items-center justify-center border transition {showMinimap
        ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
        : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
      onclick={() => (showMinimap = !showMinimap)}
      title="Toggle Minimap"
      aria-label="Toggle Minimap"
      aria-pressed={showMinimap}
    >
      <span class="icon-[lucide--map] w-4 h-4"></span>
    </button>
    <div class="h-6 w-px bg-theme-border/30 mx-1 flex-shrink-0"></div>
    <TimelineControls onApply={onApplyLayout} />
    <div class="h-6 w-px bg-theme-border/30 mx-2 flex-shrink-0"></div>
    <div class="flex gap-1 items-center">
      <button
        class="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => cy?.zoom(cy.zoom() * 1.2)}
        title="Zoom In"
        aria-label="Zoom In"
        ><span class="icon-[lucide--zoom-in] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => cy?.zoom(cy.zoom() / 1.2)}
        title="Zoom Out"
        aria-label="Zoom Out"
        ><span class="icon-[lucide--zoom-out] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => graph.requestFit()}
        title="Fit to Screen"
        aria-label="Fit to Screen"
        ><span class="icon-[lucide--maximize] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 flex-shrink-0 flex items-center justify-center border transition {graph.stableLayout
          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() =>
          void graph.toggleStableLayout().catch((e) => console.error(e))}
        title={graph.stableLayout ? "Stable Layout: ON" : "Stable Layout: OFF"}
        aria-label="Toggle Stable Layout"
        aria-pressed={graph.stableLayout}
        ><span
          class="{graph.stableLayout
            ? 'icon-[lucide--pin]'
            : 'icon-[lucide--pin-off]'} w-4 h-4"
        ></span></button
      >
      <button
        class="w-8 h-8 flex-shrink-0 flex items-center justify-center border transition {ui.showSelectionConnector
          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() => (ui.showSelectionConnector = !ui.showSelectionConnector)}
        title="Connect Selected Nodes"
        aria-label="Connect Selected Nodes"
        aria-pressed={ui.showSelectionConnector}
        ><span class="icon-[lucide--link] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => onApplyLayout(false, true, "UI Redraw Button")}
        title="Redraw Layout"
        aria-label="Redraw Layout"
        ><span
          class="icon-[lucide--refresh-cw] w-4 h-4 {isLayoutRunning
            ? 'animate-spin'
            : ''}"
        ></span></button
      >
    </div>
    <div
      class="h-6 w-px bg-theme-border/30 mx-2 hidden md:block flex-shrink-0"
    ></div>
    <button
      class="w-8 h-8 flex-shrink-0 items-center justify-center border hidden md:flex transition {ui.sharedMode
        ? 'bg-amber-500/20 border-amber-500/50 text-amber-500'
        : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
      onclick={() => (ui.sharedMode = !ui.sharedMode)}
      title={ui.sharedMode ? "Exit Shared Mode" : "Enter Shared Mode"}
      aria-label="Toggle Shared Mode"
      data-testid="shared-mode-toggle"
      aria-pressed={ui.sharedMode}
      ><span
        class={ui.sharedMode
          ? "icon-[lucide--eye] w-4 h-4"
          : "icon-[lucide--eye-off] w-4 h-4"}
      ></span></button
    >
    <button
      class="w-8 h-8 flex-shrink-0 items-center justify-center border hidden md:flex transition {graph.showLabels
        ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
        : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
      onclick={() => void graph.toggleLabels().catch((e) => console.error(e))}
      title={graph.showLabels ? "Labels: ON" : "Labels: OFF"}
      aria-label="Toggle Labels"
      aria-pressed={graph.showLabels}
      ><span class="icon-[lucide--type] w-4 h-4"></span></button
    >
    <button
      class="w-8 h-8 flex-shrink-0 items-center justify-center border hidden md:flex transition {graph.showImages
        ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
        : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
      onclick={() => void graph.toggleImages().catch((e) => console.error(e))}
      title={graph.showImages ? "Images: ON" : "Images: OFF"}
      aria-label="Toggle Images"
      aria-pressed={graph.showImages}
      ><span class="icon-[lucide--image] w-4 h-4"></span></button
    >
  </div>
</div>

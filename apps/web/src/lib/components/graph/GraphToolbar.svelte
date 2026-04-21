<script lang="ts">
  import { fade } from "svelte/transition";
  import type { Core } from "cytoscape";
  import { graph } from "$lib/stores/graph.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { guestRoster } from "$lib/stores/guest";
  import Minimap from "./Minimap.svelte";
  import TimelineControls from "./TimelineControls.svelte";

  let { cy, isLayoutRunning, onApplyLayout, selectedCount } = $props<{
    cy: Core | undefined;
    isLayoutRunning: boolean;
    onApplyLayout: (
      isInitial?: boolean,
      isForced?: boolean,
      caller?: string,
      randomizeForced?: boolean,
    ) => Promise<void>;
    selectedCount: number;
  }>();

  let showMinimap = $state(false);
  let currentZoom = $state(1);

  $effect(() => {
    if (cy) {
      const updateZoom = () => {
        currentZoom = cy.zoom();
      };
      cy.on("zoom", updateZoom);
      updateZoom();
      return () => {
        cy.off("zoom", updateZoom);
      };
    }
  });

  const canConnect = $derived(selectedCount === 2);
  const isConnecting = $derived(ui.showSelectionConnector || ui.isConnecting);
  const connectionTooltip = $derived(
    selectedCount === 2
      ? "Connect Selected Nodes"
      : ui.isConnecting
        ? "Exit Connect Mode"
        : "Enter Connect Mode (C)",
  );

  const activeGuests = $derived.by(() =>
    Object.values($guestRoster).sort((a, b) => a.joinedAt - b.joinedAt),
  );

  const guestPanelHeight = $derived(
    activeGuests.length === 0
      ? 0
      : Math.min(64 + activeGuests.length * 48, 280),
  );
</script>

{#if !ui.isGuestMode}
  <div
    class="absolute bottom-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:bottom-6 md:left-6 z-20 flex flex-col gap-2 items-center md:items-start max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-3rem)]"
  >
    {#if cy}
      <div class="relative hidden md:block">
        <Minimap
          {cy}
          absolute={false}
          width={192}
          height={128}
          isExpanded={showMinimap}
        />
      </div>
    {/if}

    {#if !vault.isGuest && activeGuests.length > 0}
      <div
        class="pointer-events-auto w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border border-theme-primary/25 bg-theme-surface/95 px-3 py-2 text-[10px] text-theme-text shadow-lg backdrop-blur overflow-hidden"
        style:height={`${guestPanelHeight}px`}
        style:max-height="calc(100vh - 6rem)"
        transition:fade
      >
        <div class="flex items-center justify-between gap-3 mb-2">
          <div
            class="flex items-center gap-2 text-theme-primary uppercase tracking-[0.2em] font-mono"
          >
            <span class="icon-[lucide--users] w-3 h-3"></span>
            Active Guests
          </div>
          <span class="text-theme-muted font-mono">{activeGuests.length}</span>
        </div>
        <div
          class="space-y-1.5 overflow-y-auto pr-1"
          style:max-height="calc(100% - 1.75rem)"
        >
          {#each activeGuests as guest (guest.peerId)}
            <div class="flex items-start gap-2">
              <span
                class="mt-1 w-2 h-2 rounded-full shrink-0 {guest.status ===
                'viewing'
                  ? 'bg-theme-primary'
                  : 'bg-theme-muted'}"
              ></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-theme-text truncate"
                    >{guest.displayName}</span
                  >
                  <span
                    class="rounded border border-theme-border/60 bg-theme-bg/60 px-1.5 py-0.5 uppercase tracking-[0.2em] text-[8px] text-theme-muted"
                  >
                    {guest.status === "viewing" ? "viewing" : "connected"}
                  </span>
                </div>
                <div class="truncate text-theme-text/70">
                  {guest.currentEntityTitle
                    ? `Viewing ${guest.currentEntityTitle}`
                    : "Connected"}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div
      class="flex gap-1 items-center flex-wrap justify-center md:justify-start bg-theme-surface/60 md:bg-transparent p-1.5 md:p-0 rounded-full md:rounded-none border border-theme-border/30 md:border-none backdrop-blur-md md:backdrop-blur-none"
    >
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
          class="w-8 h-8 flex-shrink-0 hidden sm:flex items-center justify-center border transition {graph.stableLayout
            ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
            : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
          onclick={() =>
            void graph.toggleStableLayout().catch((e) => console.error(e))}
          title={graph.stableLayout
            ? "Stable Layout: ON"
            : "Stable Layout: OFF"}
          aria-label="Toggle Stable Layout"
          aria-pressed={graph.stableLayout}
          ><span
            class="{graph.stableLayout
              ? 'icon-[lucide--pin]'
              : 'icon-[lucide--pin-off]'} w-4 h-4"
          ></span></button
        >
        {#if !ui.isGuestMode}
          <button
            class="w-8 h-8 flex-shrink-0 flex items-center justify-center border transition {isConnecting
              ? 'border-theme-primary bg-theme-primary/20 text-theme-primary shadow-[0_0_15px_rgba(var(--color-theme-accent-rgb),0.3)]'
              : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
            onclick={() => {
              if (canConnect) {
                ui.showSelectionConnector = !ui.showSelectionConnector;
              } else {
                ui.toggleConnectMode();
              }
            }}
            title={connectionTooltip}
            aria-label={connectionTooltip}
            aria-pressed={isConnecting}
            ><span class="icon-[lucide--link] w-4 h-4"></span></button
          >
        {/if}
        <button
          class="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
          onclick={() => onApplyLayout(false, true, "UI Redraw Button", true)}
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
        data-testid="shared-mode-toggle"
        aria-pressed={ui.sharedMode}
        aria-label="Toggle player view mode"
      >
        <span
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

      <div
        class="hidden sm:flex items-center gap-1 bg-theme-surface/80 border border-theme-border rounded px-2 h-8"
      >
        <span class="text-[9px] font-mono text-theme-primary font-bold"
          >{currentZoom.toFixed(2)}x</span
        >
        <button
          class="text-[8px] font-black bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-theme-bg px-1 rounded transition-colors uppercase tracking-tighter"
          onclick={() =>
            cy?.animate({
              zoom: 9,
              duration: 500,
              easing: "ease-in-out-cubic",
            })}
          title="Jump to Maximum Zoom (9x)"
        >
          MAX
        </button>
      </div>
    </div>
  </div>
{/if}

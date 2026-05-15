<script lang="ts">
  import type { Entity } from "schema";
  import { ui } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { isEntityVisible } from "schema";
  import { fade } from "svelte/transition";
  import LabelBadge from "$lib/components/labels/LabelBadge.svelte";
  import LabelInput from "$lib/components/labels/LabelInput.svelte";
  import AliasInput from "$lib/components/labels/AliasInput.svelte";
  import SidepanelRegenButton from "$lib/components/entity/SidepanelRegenButton.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import {
    dispatchSearchEntityFocus,
    DEFAULT_SEARCH_ENTITY_ZOOM,
  } from "$lib/components/search/search-focus";

  let {
    entity,
    isEditing,
    editTitle = $bindable(),
    editAliases = $bindable([]),
    onClose,
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editTitle: string;
    editAliases: string[];
    onClose: () => void;
  }>();

  const isGraphView = $derived.by(() => {
    const path = page.url.pathname;
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return path === base || path === normalizedBase || path === "/";
  });

  let isObscured = $derived.by(() => {
    if (!entity || !vault.isGuest) return false;
    return !isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  const handleFindInGraph = () => {
    const nodeId = vault.selectedEntityId;
    if (!nodeId) return;

    ui.findInGraph();

    // Trigger centering and zooming
    dispatchSearchEntityFocus(nodeId, DEFAULT_SEARCH_ENTITY_ZOOM);
  };

  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");
</script>

{#if isObscured}
  <div
    class="absolute inset-0 z-[60] bg-theme-surface/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
    transition:fade
  >
    <div
      class="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 animate-pulse"
    >
      <span class="icon-[lucide--eye-off] w-8 h-8 text-amber-500"></span>
    </div>
    <h3
      class="text-xl font-bold text-theme-text uppercase font-header tracking-widest mb-2"
    >
      Protocol Redacted
    </h3>
    <p class="text-xs text-theme-muted leading-relaxed max-w-xs">
      This {themeStore.jargon.entity.toLowerCase()} is currently obscured by Fog of
      War. Switch to Admin Mode or remove the
      <code class="text-amber-500">hidden</code> tag to decrypt.
    </p>
    <button
      onclick={onClose}
      class="mt-8 px-6 py-2 border border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all text-[10px] font-bold tracking-widest uppercase font-header"
    >
      Return to Overview
    </button>
  </div>
{/if}

<div
  class="p-4 md:p-6 border-b border-theme-border bg-theme-surface"
  style:background-color="var(--theme-panel-fill)"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="flex justify-between items-center mb-2">
    <div class="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
      <!-- Mobile-only close button -->
      <button
        onclick={onClose}
        class="md:hidden text-theme-muted hover:text-theme-primary transition p-1 -ml-2 rounded-full shrink-0"
        aria-label="Back"
      >
        <span class="icon-[lucide--chevron-left] w-7 h-7"></span>
      </button>

      {#if isEditing}
        <div class="flex flex-col gap-2 w-full mr-4">
          <input
            type="text"
            bind:value={editTitle}
            class="bg-theme-bg border border-theme-primary text-theme-text px-2 py-1 focus:outline-none focus:border-theme-primary font-body font-bold text-xl w-full placeholder-theme-muted"
            placeholder="Entity Title"
          />
          <AliasInput bind:aliases={editAliases} placeholder="Add alias..." />
        </div>
      {:else}
        <div class="flex flex-col gap-0.5 min-w-0">
          <h2
            class="{isFantasyTheme
              ? 'text-xl md:text-3xl font-header tracking-wider'
              : 'text-xl md:text-3xl font-body tracking-wide'} font-bold truncate"
            style:color={isFantasyTheme ? "var(--theme-title-ink)" : undefined}
          >
            {entity.title}
          </h2>
          {#if entity.aliases && entity.aliases.length > 0}
            <div class="flex flex-wrap gap-1 md:gap-1.5 mt-0.5">
              <span
                class="text-[8px] md:text-[9px] font-bold text-theme-muted uppercase tracking-widest self-center mr-0.5 md:mr-1"
                >aka:</span
              >
              {#each entity.aliases as alias}
                <div
                  class="px-1.5 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-[8px] md:text-[9px] font-bold text-theme-secondary uppercase tracking-wider"
                >
                  {alias}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-1.5 md:gap-2 shrink-0 ml-2 md:ml-4">
      {#if !isEditing}
        <SidepanelRegenButton entityId={entity.id} />
        {#if isGraphView}
          <button
            onclick={handleFindInGraph}
            class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]"
            aria-label="Find in Graph"
            title="Find in Graph"
            data-testid="find-in-graph-button"
          >
            <span class="icon-[lucide--target] w-5 h-5"></span>
          </button>
        {/if}
        <button
          onclick={() => ui.openZenMode(entity.id)}
          class="transition flex items-center justify-center p-1 text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-icon-active)]"
          aria-label="Enter Zen Mode"
          title="Zen Mode (Full Screen)"
          data-testid="enter-zen-mode-button"
        >
          <span class="icon-[lucide--maximize-2] w-5 h-5"></span>
        </button>
      {/if}

      <!-- Desktop-only close button -->
      <button
        onclick={onClose}
        class="hidden md:flex transition items-center justify-center p-1 text-[color:var(--theme-meta-text)] hover:text-[color:var(--theme-icon-active)]"
        aria-label="Close panel"
        title="Close"
      >
        <span class="icon-[heroicons--x-mark] w-6 h-6"></span>
      </button>
    </div>
  </div>

  <!-- Labels Section -->
  <div class="mt-4 mb-2 space-y-2">
    <div class="flex flex-wrap gap-1.5 min-h-[24px]">
      {#each entity.labels || [] as label}
        <LabelBadge
          {label}
          removable={!vault.isGuest}
          onRemove={async () => await vault.removeLabel(entity.id, label)}
        />
      {/each}
      {#if !entity.labels?.length && vault.isGuest}
        <span
          class="text-[9px] text-theme-muted italic uppercase tracking-tighter"
        >
          No labels
        </span>
      {/if}
    </div>

    {#if !vault.isGuest}
      <LabelInput entityId={entity.id} />
    {/if}
  </div>
</div>

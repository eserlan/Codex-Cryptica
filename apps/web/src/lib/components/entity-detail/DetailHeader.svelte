<script lang="ts">
  import type { Entity } from "schema";
  import { ui } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { isEntityVisible } from "schema";
  import { fade } from "svelte/transition";
  import LabelBadge from "$lib/components/labels/LabelBadge.svelte";
  import LabelInput from "$lib/components/labels/LabelInput.svelte";

  let {
    entity,
    isEditing,
    editTitle = $bindable(),
    onClose,
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editTitle: string;
    onClose: () => void;
  }>();

  let isObscured = $derived.by(() => {
    if (!entity || !ui.sharedMode) return false;
    return !isEntityVisible(entity, {
      sharedMode: ui.sharedMode,
    } as any);
  });
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
      class="text-xl font-bold text-theme-text uppercase tracking-widest mb-2"
    >
      Protocol Redacted
    </h3>
    <p class="text-xs text-theme-muted leading-relaxed max-w-xs">
      This archive entry is currently obscured by Fog of War. Switch to Admin
      Mode or remove the <code class="text-amber-500">hidden</code> tag to decrypt.
    </p>
    <button
      onclick={onClose}
      class="mt-8 px-6 py-2 border border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-all text-[10px] font-bold tracking-widest uppercase"
    >
      Return to Overview
    </button>
  </div>
{/if}

<div class="p-4 md:p-6 border-b border-theme-border bg-theme-surface">
  <div class="flex justify-between items-start mb-2">
    {#if isEditing}
      <div class="flex flex-col gap-2 w-full mr-4">
        <input
          type="text"
          bind:value={editTitle}
          class="bg-theme-bg border border-theme-primary text-theme-text px-2 py-1 focus:outline-none focus:border-theme-primary font-serif font-bold text-xl w-full placeholder-theme-muted"
          placeholder="Entity Title"
        />
      </div>
    {:else}
      <h2
        class="text-2xl md:text-3xl font-bold text-theme-text font-serif tracking-wide"
      >
        {entity.title}
      </h2>
    {/if}

    <div class="flex items-center gap-1">
      {#if !isEditing}
        <button
          onclick={() => ui.openZenMode(entity.id)}
          class="text-theme-secondary hover:text-theme-primary transition flex items-center justify-center p-1"
          aria-label="Enter Zen Mode"
          title="Zen Mode (Full Screen)"
          data-testid="enter-zen-mode-button"
        >
          <span class="icon-[lucide--maximize-2] w-5 h-5"></span>
        </button>
      {/if}
      <button
        onclick={onClose}
        class="text-theme-muted hover:text-theme-primary transition flex items-center justify-center p-1"
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
          onRemove={() => vault.removeLabel(entity.id, label)}
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

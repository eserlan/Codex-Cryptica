<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import LabelBadge from "$lib/components/labels/LabelBadge.svelte";
  import LabelInput from "$lib/components/labels/LabelInput.svelte";
  import { isEntityVisible, type Entity } from "schema";

  let {
    entity,
    editState = $bindable(),
    resolvedImageUrl,
    onShowLightbox,
    onNavigate,
    onDelete,
    isPopout = false,
  } = $props<{
    entity: Entity | null;
    editState: any;
    resolvedImageUrl: string;
    onShowLightbox: () => void;
    onNavigate: (id: string) => void;
    onDelete: () => Promise<void>;
    isPopout?: boolean;
  }>();

  interface ConnectionListItem {
    id: string;
    label: string;
    title: string;
    isOutbound: boolean;
  }

  let allConnections = $derived.by(() => {
    if (!entity) return [] as ConnectionListItem[];

    const checkVisibility = (targetId: string) => {
      const targetEntity = vault.entities[targetId];
      if (!targetEntity) return false;
      if (!vault.isGuest) return true;
      return isEntityVisible(targetEntity, {
        sharedMode: vault.isGuest,
        defaultVisibility: vault.defaultVisibility,
      });
    };

    const result: ConnectionListItem[] = [];
    const connections = entity?.connections || [];
    const connectionsLength = connections.length;
    for (let i = 0; i < connectionsLength; i++) {
      const c = connections[i];
      if (checkVisibility(c.target)) {
        result.push({
          id: c.target,
          label: c.label || c.type,
          title: vault.entities[c.target]?.title || c.target,
          isOutbound: true,
        });
      }
    }

    const inboundConnections = vault.inboundConnections[entity?.id || ""] || [];
    const inboundLength = inboundConnections.length;
    for (let i = 0; i < inboundLength; i++) {
      const item = inboundConnections[i];
      if (checkVisibility(item.sourceId)) {
        result.push({
          id: item.sourceId,
          label: item.connection.label || item.connection.type,
          title: vault.entities[item.sourceId]?.title || item.sourceId,
          isOutbound: false,
        });
      }
    }

    return result;
  });

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!entity) return false;
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });
</script>

<div
  style="background-image: var(--bg-texture-overlay)"
  class="w-full md:w-80 lg:w-96 md:border-r border-theme-border p-6 md:overflow-y-auto custom-scrollbar bg-theme-surface shrink-0"
  data-testid="zen-sidebar"
>
  <!-- Labels -->
  <div class="mb-6 space-y-2">
    {#if entity?.labels && entity?.labels?.length > 0}
      <div class="flex flex-wrap gap-1.5">
        {#each entity?.labels ?? [] as label}
          <LabelBadge
            {label}
            removable={!vault.isGuest}
            onRemove={async () =>
              entity && (await vault.removeLabel(entity.id, label))}
          />
        {/each}
      </div>
    {/if}

    {#if entity && !vault.isGuest}
      <LabelInput entityId={entity.id} />
    {/if}
  </div>

  <!-- Image -->
  <div class="mb-6">
    {#if !isVisible && vault.isGuest}
      <div
        class="w-full py-2 md:py-4 md:aspect-square rounded-lg border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 md:gap-4 text-theme-muted bg-theme-primary/5 relative overflow-hidden"
      >
        <span class="icon-[lucide--lock] w-6 h-6 md:w-8 md:h-8 opacity-30"
        ></span>
        <span
          class="text-[8px] md:text-[9px] font-bold uppercase font-header opacity-40"
          >Hidden</span
        >
      </div>
    {:else if editState.isEditing}
      <div class="mb-4">
        <label
          class="block text-[10px] text-theme-secondary font-bold mb-1"
          for="zen-entity-image-url">IMAGE URL</label
        >
        <input
          id="zen-entity-image-url"
          type="text"
          bind:value={editState.image}
          class="bg-theme-bg border border-theme-border text-theme-text px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary w-full placeholder-theme-muted rounded"
          placeholder="https://..."
        />
      </div>
    {:else if entity?.image}
      <button
        onclick={onShowLightbox}
        disabled={!resolvedImageUrl}
        class="w-full rounded-lg border border-theme-border overflow-hidden relative group cursor-pointer hover:border-theme-primary transition block shadow-lg bg-theme-bg/50 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none disabled:cursor-wait"
        aria-label="View full size image"
      >
        <img
          src={resolvedImageUrl}
          alt={entity.title}
          class="w-full h-auto max-h-[500px] object-contain opacity-90 group-hover:opacity-100 transition mx-auto"
        />
        <div
          class="absolute bottom-2 right-2 bg-theme-bg/70 text-theme-primary text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition"
        >
          Zoom
        </div>
      </button>
    {:else}
      <div
        class="w-full py-2 md:py-4 md:aspect-square rounded-lg border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 md:gap-4 text-theme-muted bg-theme-primary/5 relative overflow-hidden"
      >
        <div class="flex flex-col items-center justify-center gap-1 md:gap-2">
          <span
            class="icon-[lucide--image] w-6 h-6 md:w-12 md:h-12 opacity-30 md:opacity-50"
          ></span>
          <span
            class="text-[8px] md:text-[10px] font-bold uppercase font-header opacity-40"
            >No Image</span
          >
        </div>

        {#if oracle.tier === "advanced" && !uiStore.liteMode && entity}
          <button
            onclick={() => oracle.drawEntity(entity.id)}
            disabled={oracle.isLoading}
            class="bg-theme-surface/50 hover:bg-theme-surface border border-theme-primary/30 hover:border-theme-primary transition-all flex items-center justify-center gap-2 px-2 py-1 md:px-4 md:py-2 rounded shadow-sm group/btn relative overflow-hidden mt-1 md:mt-2"
            aria-label="Draw visualization for {entity.title}"
            aria-busy={oracle.isLoading}
          >
            {#if oracle.isLoading}
              <span
                class="icon-[lucide--loader-2] w-3 h-3 md:w-5 md:h-5 animate-spin text-theme-primary"
                aria-hidden="true"
              ></span>
              <span
                class="text-[7px] md:text-[10px] font-bold tracking-widest text-theme-primary text-center"
                aria-live="polite"
              >
                {#if oracle.activeStyleTitle}
                  STYLE: {oracle.activeStyleTitle.toUpperCase()}
                {:else}
                  VISUALIZING...
                {/if}
              </span>
            {:else}
              <div
                class="absolute inset-0 bg-theme-primary/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"
              ></div>
              <span
                class="icon-[lucide--palette] w-3 h-3 md:w-4 md:h-4 text-theme-primary"
                aria-hidden="true"
              ></span>
              <span
                class="text-[8px] md:text-[10px] font-bold tracking-widest text-theme-primary relative z-10"
                >DRAW VISUAL</span
              >
            {/if}
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Sidebar Content (Desktop) -->
  <div class="hidden md:block space-y-6">
    {#if !(isPopout && vault.isGuest)}
      <div
        class="space-y-4 pt-8 border-t border-theme-border md:border-t-0 md:pt-0"
      >
        <h3
          class="text-xs font-bold text-theme-secondary uppercase font-header tracking-widest border-b border-theme-border pb-2"
        >
          Connections
        </h3>
        {#if allConnections.length > 0}
          <div class="space-y-2">
            {#each allConnections as conn}
              <button
                onclick={() => onNavigate(conn.id)}
                class="w-full flex items-center gap-3 p-2 rounded border border-transparent hover:border-theme-border hover:bg-theme-primary/10 transition text-left group"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full {conn.isOutbound
                    ? 'bg-theme-primary'
                    : 'bg-blue-500'}"
                ></span>
                <div class="flex-1 min-w-0">
                  <div
                    class="text-[11px] text-theme-muted uppercase font-header"
                  >
                    {conn.label}
                  </div>
                  <div
                    class="text-sm font-bold text-theme-text group-hover:text-theme-primary truncate transition font-body"
                  >
                    {conn.title}
                  </div>
                </div>
                <span
                  class="icon-[lucide--chevron-right] w-4 h-4 text-theme-muted group-hover:text-theme-primary opacity-0 group-hover:opacity-100 transition"
                ></span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="text-xs text-theme-muted italic">No known connections.</p>
        {/if}
      </div>
    {/if}

    {#if editState.isEditing && !vault.isGuest}
      <div class="mt-8 pt-8 border-t border-theme-border">
        <button
          onclick={onDelete}
          class="w-full border border-red-900/30 text-red-800 hover:text-red-500 hover:border-red-600 hover:bg-red-950/30 text-xs font-bold px-4 py-2 rounded tracking-widest transition flex items-center justify-center gap-2"
        >
          <span class="icon-[lucide--trash-2] w-3 h-3"></span>
          DELETE ENTITY
        </button>
      </div>
    {/if}
  </div>
</div>

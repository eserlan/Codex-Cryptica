<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import LabelBadge from "$lib/components/labels/LabelBadge.svelte";
  import LabelInput from "$lib/components/labels/LabelInput.svelte";
  import AliasInput from "$lib/components/labels/AliasInput.svelte";
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
    type: string;
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
          type: c.type,
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
          type: item.connection.type,
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

  const isVisualizing = $derived(oracle.isVisualizingEntity(entity?.id));
</script>

<div
  style="background-image: var(--bg-texture-overlay)"
  class="w-full md:w-80 lg:w-96 md:border-r border-theme-border p-4 md:p-5 md:overflow-y-auto custom-scrollbar bg-theme-surface shrink-0"
  data-testid="zen-sidebar"
>
  <!-- Labels & Aliases -->
  <div class="mb-4 space-y-4">
    {#if !editState.isEditing}
      <div class="space-y-2">
        {#if entity?.labels?.length}
          <div class="flex flex-wrap gap-1.5">
            {#each entity.labels as label}
              <LabelBadge
                {label}
                removable={!vault.isGuest}
                onRemove={() => {
                  if (entity) {
                    vault.removeLabel(entity.id, label).catch((err) => {
                      console.error(
                        `[ZenSidebar] Failed to remove label: ${err}`,
                      );
                    });
                  }
                }}
              />
            {/each}
          </div>
        {/if}

        {#if entity?.aliases?.length}
          <div class="flex flex-wrap gap-1.5">
            {#each entity.aliases as alias}
              <div
                class="px-2 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
              >
                {alias}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if !vault.isGuest}
      <div class="space-y-4">
        <div class="space-y-1">
          <label
            class="block text-[10px] tracking-widest uppercase font-header text-theme-secondary font-bold"
            for="zen-labels">Labels</label
          >
          <LabelInput entityId={entity?.id || ""} />
        </div>

        <div class="space-y-1">
          <label
            class="block text-[10px] tracking-widest uppercase font-header text-theme-secondary font-bold"
            for="zen-aliases">Aliases</label
          >
          <AliasInput bind:aliases={editState.aliases} />
        </div>
      </div>
    {/if}
  </div>

  <!-- Image -->
  <div class="mb-4">
    {#if !isVisible && vault.isGuest}
      <div
        class="w-full py-2 md:py-4 md:aspect-square rounded-lg border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 md:gap-4 text-theme-muted bg-theme-primary/5 relative overflow-hidden"
      >
        <span class="icon-[lucide--lock] w-6 h-6 md:w-8 md:h-8 opacity-30"
        ></span>
        <span
          class="text-xs font-bold uppercase font-header tracking-widest opacity-40"
          >Hidden</span
        >
      </div>
    {:else if editState.isEditing}
      <div class="mb-4">
        <label
          class="block text-xs tracking-widest uppercase font-header text-theme-secondary font-bold mb-1"
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
          class="absolute bottom-2 right-2 bg-theme-bg/70 text-theme-primary text-xs font-header tracking-widest uppercase px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition"
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
            class="text-xs font-bold uppercase font-header tracking-widest opacity-40"
            >No Image</span
          >
        </div>

        {#if oracle.tier === "advanced" && !uiStore.aiDisabled && entity}
          <button
            onclick={() => oracle.drawEntity(entity.id)}
            disabled={isVisualizing}
            class="bg-theme-surface/50 hover:bg-theme-surface border border-theme-primary/30 hover:border-theme-primary transition-all flex items-center justify-center gap-2 px-2 py-1 md:px-4 md:py-2 rounded shadow-sm group/btn relative overflow-hidden mt-1 md:mt-2"
            aria-label="Draw visualization for {entity.title}"
            aria-busy={isVisualizing}
          >
            {#if isVisualizing}
              <span
                class="icon-[lucide--loader-2] w-3 h-3 md:w-5 md:h-5 animate-spin text-theme-primary"
                aria-hidden="true"
              ></span>
              <span
                class="text-xs font-bold tracking-widest text-theme-primary text-center font-header uppercase"
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
                class="text-xs font-bold tracking-widest font-header text-theme-primary relative z-10 uppercase"
                >DRAW VISUAL</span
              >
            {/if}
          </button>
        {/if}

        {#if isVisualizing}
          <div
            class="absolute inset-0 bg-theme-bg/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 border border-theme-primary/20"
          >
            <span
              class="icon-[lucide--loader-2] w-6 h-6 animate-spin text-theme-primary"
              aria-hidden="true"
            ></span>
            <div
              class="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] font-header text-theme-primary text-center px-6"
              aria-live="polite"
            >
              {#if oracle.activeStyleTitle}
                Visualizing in {oracle.activeStyleTitle}
              {:else}
                Building Visual
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Sidebar Content (Desktop) -->
  <div class="hidden md:block space-y-4">
    {#if !(isPopout && vault.isGuest)}
      <div
        class="space-y-4 pt-6 border-t border-theme-border md:border-t-0 md:pt-0"
      >
        <h3
          class="text-xs font-bold text-theme-secondary uppercase font-header tracking-widest border-b border-theme-border pb-2"
        >
          Connections
        </h3>
        {#if allConnections.length > 0}
          <div class="space-y-2">
            {#each allConnections as conn}
              <div
                class="w-full flex items-center gap-3 p-2 rounded border border-transparent hover:border-theme-border hover:bg-theme-primary/10 transition text-left group"
              >
                <button
                  onclick={() => onNavigate(conn.id)}
                  class="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0 {conn.isOutbound
                      ? 'bg-theme-primary'
                      : 'bg-blue-500'}"
                  ></span>
                  <div class="flex-1 min-w-0">
                    <div
                      class="text-xs text-theme-muted uppercase tracking-widest font-header"
                    >
                      {conn.label}
                    </div>
                    <div
                      class="text-sm font-bold text-theme-text group-hover:text-theme-primary truncate transition font-body"
                    >
                      {conn.title}
                    </div>
                  </div>
                </button>

                {#if !vault.isGuest}
                  <button
                    onclick={() => {
                      const entityId = entity?.id;
                      if (!entityId) return;
                      if (conn.isOutbound) {
                        vault.removeConnection(entityId, conn.id, conn.type);
                      } else {
                        vault.removeConnection(conn.id, entityId, conn.type);
                      }
                    }}
                    class="text-theme-muted hover:text-theme-danger transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
                    aria-label="Delete connection"
                    title="Delete connection"
                  >
                    <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
                  </button>
                {/if}

                <button
                  onclick={() => onNavigate(conn.id)}
                  class="icon-[lucide--chevron-right] w-4 h-4 text-theme-muted group-hover:text-theme-primary group-focus-within:text-theme-primary focus-visible:text-theme-primary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition shrink-0"
                  aria-label="Navigate to {conn.title}"
                ></button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-xs text-theme-muted italic">No known connections.</p>
        {/if}
      </div>
    {/if}

    {#if editState.isEditing && !vault.isGuest}
      <div class="mt-6 pt-6 border-t border-theme-border">
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

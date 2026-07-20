<script lang="ts">
  import VTTControls from "$lib/components/map/VTTControls.svelte";
  import EntityList from "$lib/components/explorer/EntityList.svelte";
  import InitiativePanel from "$lib/components/vtt/InitiativePanel.svelte";
  import TokenDetail from "$lib/components/vtt/TokenDetail.svelte";
  import VTTChatSidebar from "$lib/components/vtt/VTTChatSidebar.svelte";
  import { VTT_ENTITY_TYPES } from "$lib/stores/map/map-page-controller.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import type { Entity } from "schema";

  let {
    isVttChatSidebarCollapsed,
    showInitiativePanel,
    hasSelectedToken,
    vttEntityCount,
    onVttChatSidebarCollapsed,
    onEntitySelect,
    onEntityDragStart,
    onEntityDragEnd,
    onShare,
  }: {
    isVttChatSidebarCollapsed: boolean;
    showInitiativePanel: boolean;
    hasSelectedToken: boolean;
    vttEntityCount: number;
    onVttChatSidebarCollapsed: (collapsed: boolean) => void;
    onEntitySelect: (entity: Entity) => void;
    onEntityDragStart: (event: DragEvent, entityId: string) => void;
    onEntityDragEnd: () => void;
    onShare: () => void;
  } = $props();
</script>

<VTTChatSidebar
  collapsed={isVttChatSidebarCollapsed}
  setCollapsed={onVttChatSidebarCollapsed}
/>

<aside
  class="absolute top-0 right-0 bottom-0 z-[30] flex overflow-hidden border-l border-theme-primary/20 bg-theme-surface/95 shadow-[0_0_30px_rgba(0,0,0,0.25)] backdrop-blur transition-all duration-200 pointer-events-auto {layoutUIStore.vttSidebarCollapsed
    ? 'w-12'
    : 'w-[22rem] max-w-[calc(100vw-3rem)]'}"
  aria-label="VTT Sidebar"
  onwheel={(e) => e.stopPropagation()}
>
  {#if layoutUIStore.vttSidebarCollapsed}
    <div
      class="flex h-full w-full flex-col items-center justify-between p-2"
      style="background-image: var(--bg-texture-overlay)"
    >
      <button
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-bg/70 text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-text hover:bg-theme-primary/10"
        onclick={() => layoutUIStore.toggleVttSidebar(false)}
        aria-label="Expand VTT Sidebar"
        aria-expanded="false"
        type="button"
      >
        <span aria-hidden="true" class="icon-[lucide--panel-right-open] w-4 h-4"
        ></span>
      </button>

      <div class="flex flex-1 items-center justify-center">
        <span
          class="rotate-180 text-[10px] font-black uppercase tracking-[0.4em] text-theme-muted [writing-mode:vertical-rl]"
        >
          VTT
        </span>
      </div>
    </div>
  {:else}
    <div
      class="flex h-full min-h-0 w-full flex-col relative"
      style="background-image: var(--bg-texture-overlay)"
    >
      <div
        class="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-theme-primary/30 rounded-tl pointer-events-none hidden md:block"
      ></div>
      <div
        class="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-theme-primary/30 rounded-tr pointer-events-none hidden md:block"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-theme-primary/30 rounded-bl pointer-events-none hidden md:block"
      ></div>
      <div
        class="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-theme-primary/30 rounded-br pointer-events-none hidden md:block"
      ></div>

      <div
        class="flex items-center justify-between gap-3 border-b border-theme-primary/20 px-3 py-3"
      >
        <div>
          <div
            class="text-[9px] font-black uppercase tracking-[0.35em] text-theme-primary/70 font-header"
          >
            VTT Sidebar
          </div>
        </div>

        <button
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-theme-border bg-theme-bg/70 text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-text hover:bg-theme-primary/10"
          onclick={() => layoutUIStore.toggleVttSidebar(true)}
          aria-label="Collapse VTT Sidebar"
          aria-expanded="true"
          type="button"
        >
          <span
            aria-hidden="true"
            class="icon-[lucide--panel-right-close] w-4 h-4"
          ></span>
        </button>
      </div>

      <div class="border-b border-theme-primary/20 px-3 py-3">
        <VTTControls />
      </div>

      <div
        class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 p-3 pr-2"
      >
        {#if showInitiativePanel}
          <InitiativePanel />
        {/if}

        {#if !sessionModeStore.isGuestMode}
          <section
            class="rounded-xl border border-theme-primary/20 bg-theme-bg/50"
            data-testid="vtt-entity-list-section"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
              onclick={() =>
                layoutUIStore.toggleVttEntityList(
                  !layoutUIStore.vttEntityListCollapsed,
                )}
              aria-expanded={!layoutUIStore.vttEntityListCollapsed}
              aria-controls="vtt-entity-list"
            >
              <div>
                <div
                  class="text-[9px] font-black uppercase tracking-[0.35em] text-theme-primary/70 font-header"
                >
                  Vault Entities
                </div>
                <div class="text-xs text-theme-muted">
                  Drag characters, creatures, and items onto the map.
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="rounded-full border border-theme-border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-theme-muted"
                >
                  {vttEntityCount}
                </span>
                <span
                  class="icon-[lucide--chevron-down] h-4 w-4 text-theme-muted transition-transform {layoutUIStore.vttEntityListCollapsed
                    ? '-rotate-90'
                    : ''}"
                ></span>
              </div>
            </button>

            {#if !layoutUIStore.vttEntityListCollapsed}
              <div
                id="vtt-entity-list"
                class="border-t border-theme-primary/20 flex flex-col max-h-[50vh]"
                role="presentation"
                onmousedown={(event) => event.stopPropagation()}
              >
                <EntityList
                  allowedTypes={VTT_ENTITY_TYPES}
                  onSelect={onEntitySelect}
                  onDragStart={onEntityDragStart}
                  onDragEnd={onEntityDragEnd}
                  onOpenZen={(entity) => modalUIStore.openZenMode(entity.id)}
                />
              </div>
            {/if}
          </section>
        {/if}

        <TokenDetail />

        {#if !showInitiativePanel && !hasSelectedToken}
          <div
            class="rounded-xl border border-dashed border-theme-primary/20 bg-theme-bg/50 p-4 text-sm text-theme-muted"
          >
            Select a token to view its details.
          </div>
        {/if}
      </div>

      {#if !sessionModeStore.isGuestMode}
        <div
          class="relative z-20 border-t border-theme-primary/20 p-3 flex justify-end pointer-events-auto"
          role="presentation"
          onmousedown={(e) => e.stopPropagation()}
        >
          <button
            class="w-8 h-8 flex flex-shrink-0 items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-muted transition hover:text-theme-primary"
            onclick={onShare}
            type="button"
            title="Share Campaign"
            aria-label="Share Campaign"
          >
            <span aria-hidden="true" class="icon-[lucide--share-2] w-4 h-4"
            ></span>
          </button>
        </div>
      {/if}
    </div>
  {/if}
</aside>

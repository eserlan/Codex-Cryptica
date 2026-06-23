<script lang="ts">
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { Entity } from "schema";
  import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { detectCycle } from "$lib/stores/vault/entities";
  import { vault } from "$lib/stores/vault.svelte";
  import type { LocalEntity } from "$lib/stores/vault/types";

  let {
    entity,
    isMatching = true,
    hasChildren = false,
    isCollapsed = false,
    isDragging = false,
    isDragSource = false,
    draggable = false,
    onSelect,
    onDragStart,
    onDragEnd,
    onOpenZen,
    onFindInGraph,
    onApproveDraft,
    onRejectDraft,
    onAddChild,
  }: {
    entity: Entity;
    isMatching?: boolean;
    hasChildren?: boolean;
    isCollapsed?: boolean;
    isDragging?: boolean;
    isDragSource?: boolean;
    draggable?: boolean;
    onSelect?: (entity: Entity) => void;
    onDragStart?: (event: DragEvent, entityId: string) => void;
    onDragEnd?: () => void;
    onOpenZen?: (entity: Entity) => void;
    onFindInGraph?: (entity: Entity, event?: MouseEvent) => void;
    onApproveDraft?: (entity: Entity) => void;
    onRejectDraft?: (entity: Entity) => void;
    onAddChild?: (parentId: string) => void;
  } = $props();

  let isDragOver = $state(false);

  const activeVaultId = $derived(vault.activeVaultId);
  const labelFilters = $derived(explorerUIStore.labelFilters);
  const focusedEntityId = $derived(layoutUIStore.focusedEntityId);
  const cat = $derived(categories.getCategory(entity.type));
</script>

<div
  class="[content-visibility:auto] [contain-intrinsic-size:0_56px] group relative flex flex-wrap items-center rounded-xl border transition-all {!isMatching
    ? 'opacity-50'
    : ''} {entity.id === focusedEntityId
    ? 'border-theme-primary bg-theme-primary/10 ring-2 ring-theme-accent/20'
    : 'border-theme-border bg-theme-surface/50 hover:border-theme-primary/50 hover:bg-theme-primary/5'} {isDragOver &&
  !(entity as any).isVirtual
    ? 'border-theme-accent bg-theme-accent/10 ring-2 ring-theme-accent/20'
    : ''} {!sessionModeStore.isGuestMode &&
  draggable &&
  !(entity as any).isVirtual
    ? 'cursor-grab active:cursor-grabbing'
    : ''} {isDragging ? 'dragging-active' : ''} {isDragSource
    ? 'dragging-source'
    : ''}"
  role="listitem"
  data-testid="entity-list-item"
  data-entity-id={entity.id}
  draggable={!sessionModeStore.isGuestMode &&
    draggable &&
    !(entity as any).isVirtual}
  ondragstart={(e) => {
    if (!draggable || (entity as any).isVirtual) return;
    if (e.dataTransfer) {
      e.dataTransfer.setData("application/x-codex-entity-id", entity.id);
      e.dataTransfer.setData("text/plain", entity.id);
      e.dataTransfer.effectAllowed = "move";
    }
    onDragStart?.(e, entity.id);
  }}
  ondragend={() => {
    onDragEnd?.();
  }}
  ondragover={(e) => {
    if (!sessionModeStore.isGuestMode && !(entity as any).isVirtual) {
      e.preventDefault();
    }
  }}
  ondragenter={(e) => {
    if (!sessionModeStore.isGuestMode && !(entity as any).isVirtual) {
      e.preventDefault();
      isDragOver = true;
    }
  }}
  ondragleave={() => {
    isDragOver = false;
  }}
  ondrop={async (e) => {
    if (sessionModeStore.isGuestMode || (entity as any).isVirtual) return;
    e.preventDefault();
    isDragOver = false;
    const draggedId =
      e.dataTransfer?.getData("application/x-codex-entity-id") ||
      e.dataTransfer?.getData("text/plain");
    if (draggedId && draggedId !== entity.id) {
      const hasCycle = detectCycle(
        draggedId,
        entity.id,
        vault.entities as Record<string, LocalEntity>,
      );
      if (!hasCycle) {
        await vault.updateEntity(draggedId, { parent: entity.id });
      }
    }
  }}
>
  {#if hasChildren}
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        explorerUIStore.toggleExplorerEntityCollapse(activeVaultId, entity.id);
      }}
      onmousedown={(e) => e.stopPropagation()}
      aria-expanded={!isCollapsed}
      aria-label={isCollapsed ? "Expand" : "Collapse"}
      title={isCollapsed ? "Expand" : "Collapse"}
      class="p-1 text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center shrink-0 ml-1.5"
    >
      <span
        class="{isCollapsed
          ? 'icon-[lucide--chevron-right]'
          : 'icon-[lucide--chevron-down]'} w-3.5 h-3.5"
      ></span>
    </button>
  {:else}
    <div class="w-6 shrink-0 ml-1.5"></div>
  {/if}

  <button
    type="button"
    onclick={() => {
      if ((entity as any).isVirtual) {
        explorerUIStore.toggleExplorerEntityCollapse(activeVaultId, entity.id);
      } else {
        onSelect?.(entity);
      }
    }}
    title={(entity as any).isVirtual
      ? `Toggle ${entity.title}`
      : `Select ${entity.title}`}
    class="flex flex-1 min-w-0 items-center gap-2 p-2.5 pl-1 text-left select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-theme-primary rounded-l-xl {(
      entity as any
    ).isVirtual
      ? 'rounded-r-xl'
      : ''}"
  >
    <span
      class="{(entity as any).isVirtual
        ? 'icon-[lucide--folder]'
        : getIconClass(
            cat?.icon,
          )} h-3.5 w-3.5 shrink-0 text-theme-muted transition-colors group-hover:text-theme-primary"
    ></span>
    <div class="flex-1 min-w-0 flex flex-col gap-0.5">
      <div
        class="truncate font-header text-xs font-bold uppercase tracking-widest text-theme-text transition-colors group-hover:text-theme-primary"
      >
        {entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
            >*</sup
          >{/if}
      </div>
      {#if entity.aliases && entity.aliases.length > 0}
        <div class="truncate text-[9px] text-theme-muted/70 font-mono italic">
          aka: {entity.aliases.slice(0, 2).join(", ")}
          {#if entity.aliases.length > 2}
            <span class="text-[8px] opacity-60">
              +{entity.aliases.length - 2} more
            </span>
          {/if}
        </div>
      {/if}
    </div>
  </button>

  {#if entity.labels && entity.labels.length > 0}
    <div
      class="w-full md:w-auto order-last md:order-none pl-9 pr-2 md:px-2 pb-2 md:pb-0 flex gap-1 flex-nowrap justify-start md:justify-end max-w-full md:max-w-[45%] shrink-0"
    >
      {#each entity.labels.slice(0, 2) as label, index (`${entity.id}-label-${index}`)}
        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            explorerUIStore.toggleLabelFilter(label, e.ctrlKey || e.metaKey);
          }}
          onmousedown={(e) => e.stopPropagation()}
          class="text-[7px] px-1 rounded uppercase tracking-[0.1em] truncate max-w-[60px] font-mono transition-all border {labelFilters.has(
            label,
          )
            ? 'bg-theme-primary text-theme-bg border-theme-primary'
            : label === 'chatty'
              ? 'bg-theme-secondary/15 text-theme-secondary border-transparent hover:border-theme-secondary/50 hover:bg-theme-secondary/25'
              : 'bg-theme-primary/10 text-theme-primary border-transparent hover:border-theme-primary/50 hover:bg-theme-primary/20'}"
        >
          {label}
        </button>
      {/each}
      {#if entity.labels.length > 2}
        <div class="text-[7px] text-theme-muted font-mono flex items-center">
          +{entity.labels.length - 2}
        </div>
      {/if}
    </div>
  {/if}

  {#if !sessionModeStore.isGuestMode}
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        onAddChild?.(entity.id);
      }}
      onmousedown={(e) => e.stopPropagation()}
      title="Add child entity"
      aria-label="Add child entity to {entity.title}"
      class="shrink-0 flex items-center justify-center px-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-theme-muted hover:text-theme-primary focus:outline-none focus:opacity-100 focus-visible:opacity-100"
    >
      <span class="icon-[lucide--plus] h-3.5 w-3.5"></span>
    </button>
  {/if}

  {#if onFindInGraph && !(entity as any).isVirtual}
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        onFindInGraph(entity, e);
      }}
      onmousedown={(e) => e.stopPropagation()}
      title="Find in Graph"
      aria-label="Find {entity.title} in Graph"
      class="shrink-0 flex items-center justify-center px-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-theme-muted hover:text-theme-primary focus:outline-none focus:opacity-100 focus-visible:opacity-100"
    >
      <span class="icon-[lucide--target] h-3.5 w-3.5"></span>
    </button>
  {/if}
  {#if onOpenZen && !(entity as any).isVirtual}
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        onOpenZen(entity);
      }}
      onmousedown={(e) => e.stopPropagation()}
      title="Open in Zen Mode"
      aria-label="Open {entity.title} in Zen Mode"
      class="shrink-0 flex items-center justify-center px-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-theme-muted hover:text-theme-primary focus:outline-none focus:opacity-100 focus-visible:opacity-100 {!(
        onApproveDraft &&
        onRejectDraft &&
        entity.status === 'draft'
      )
        ? 'rounded-r-xl'
        : ''}"
    >
      <span class="icon-[lucide--book-open] h-3.5 w-3.5"></span>
    </button>
  {/if}
  {#if onApproveDraft && onRejectDraft && entity.status === "draft"}
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        onApproveDraft(entity);
      }}
      onmousedown={(e) => e.stopPropagation()}
      title="Approve draft"
      aria-label="Approve {entity.title}"
      class="shrink-0 flex items-center justify-center px-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-theme-muted hover:text-emerald-500 focus:outline-none focus:opacity-100 focus-visible:opacity-100"
    >
      <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
    </button>
    <button
      type="button"
      onclick={(e) => {
        e.stopPropagation();
        onRejectDraft(entity);
      }}
      onmousedown={(e) => e.stopPropagation()}
      title="Reject draft"
      aria-label="Reject {entity.title}"
      class="shrink-0 flex items-center justify-center px-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-theme-muted hover:text-red-500 focus:outline-none focus:opacity-100 focus-visible:opacity-100 rounded-r-xl"
    >
      <span class="icon-[lucide--trash-2] h-3.5 w-3.5"></span>
    </button>
  {/if}
</div>

<style>
  :global(.dragging-active:not(.dragging-source)) * {
    pointer-events: none !important;
  }
</style>

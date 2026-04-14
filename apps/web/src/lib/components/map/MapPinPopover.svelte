<script lang="ts">
  import type { Map } from "schema";

  let {
    x,
    y,
    entity,
    subMap,
    onOpenEntity,
    onEnterSubmap,
    onDelete,
    onClose,
  }: {
    x: number;
    y: number;
    entity?: { id: string; title: string } | null;
    subMap?: Map | null;
    onOpenEntity: (entityId: string) => void;
    onEnterSubmap: (mapId: string) => void;
    onDelete: () => void;
    onClose: () => void;
  } = $props();
</script>

<div
  class="absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+12px)] pointer-events-auto"
  style:left={`${x}px`}
  style:top={`${y}px`}
  onmousedown={(e) => e.stopPropagation()}
  onmouseup={(e) => e.stopPropagation()}
  onclick={(e) => e.stopPropagation()}
  role="none"
>
  <div
    class="bg-theme-surface border border-theme-border rounded-md shadow-lg p-1 flex items-center gap-0.5"
  >
    {#if entity}
      <button
        class="px-2.5 py-1.5 text-[10px] font-bold text-theme-text hover:text-theme-primary transition-all uppercase tracking-wider whitespace-nowrap border-r border-theme-border mr-1 hover:bg-theme-primary/10 rounded-md"
        onclick={() => onOpenEntity(entity.id)}
      >
        {entity.title}
      </button>
    {/if}

    {#if subMap}
      <button
        class="p-1.5 text-theme-primary hover:text-theme-text transition-all rounded-md hover:bg-theme-primary/10 group/map mx-0.5"
        onclick={() => onEnterSubmap(subMap.id)}
        title="Enter Sub-map"
        aria-label="Enter Sub-map"
      >
        <span
          class="icon-[lucide--map] w-3.5 h-3.5 group-hover/map:scale-110 transition-transform"
        ></span>
      </button>
    {/if}

    <div class="flex items-center gap-0.5 ml-auto">
      <button
        class="p-1.5 text-theme-muted hover:text-red-500 transition-all rounded-md hover:bg-red-500/10"
        onclick={onDelete}
        aria-label="Delete pin"
      >
        <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
      </button>
      <button
        class="p-1.5 text-theme-muted hover:text-theme-text transition-all rounded-md hover:bg-theme-primary/10"
        onclick={onClose}
        aria-label="Close pin details"
      >
        <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
      </button>
    </div>
  </div>
  <div
    class="w-2 h-2 bg-theme-surface border-r border-b border-theme-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"
  ></div>
</div>

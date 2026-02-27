<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";

  let { data }: NodeProps = $props();

  const entity = $derived(vault.entities[data.entityId as string]);
  let imageUrl = $state<string | null>(null);

  $effect(() => {
    if (entity?.image) {
      vault.resolveImageUrl(entity.image).then((url) => {
        imageUrl = url;
      });
    } else {
      imageUrl = null;
    }
  });

  function onDoubleClick() {
    if (entity) {
      uiStore.openZenMode(entity.id);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bg-theme-surface border border-theme-border rounded-lg shadow-lg overflow-hidden min-w-[200px] max-w-[300px] transition-all hover:border-theme-primary group select-none flex flex-col"
  style:width={data.width ? `${data.width}px` : "auto"}
  style:height={data.height ? `${data.height}px` : "auto"}
  ondblclick={onDoubleClick}
>
  <Handle type="target" position={Position.Top} class="!bg-theme-primary" />

  <div class="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
    {#if imageUrl}
      <div class="w-full h-32 overflow-hidden border-b border-theme-border">
        <img
          src={imageUrl}
          alt={entity?.title}
          class="w-full h-full object-cover"
        />
      </div>
    {/if}

    <div class="p-3">
      <div class="flex items-center justify-between mb-1">
        <span
          class="text-[10px] font-mono text-theme-primary uppercase tracking-widest"
        >
          {entity?.type || "Unknown"}
        </span>
      </div>
      <h3 class="text-sm font-bold text-theme-text truncate">
        {entity?.title || "Missing Entity"}
      </h3>
      {#if entity?.content}
        <p
          class="text-[11px] text-theme-muted mt-2 leading-relaxed line-clamp-6"
        >
          {entity.content}
        </p>
      {/if}

      {#if entity?.tags && entity.tags.length > 0}
        <div class="flex flex-wrap gap-1 mt-3">
          {#each entity.tags.slice(0, 5) as tag}
            <span
              class="px-1.5 py-0.5 bg-theme-bg border border-theme-border rounded text-[9px] text-theme-muted"
            >
              {tag}
            </span>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <Handle type="source" position={Position.Bottom} class="!bg-theme-primary" />
</div>

<style>
  :global(.svelte-flow__handle) {
    width: 8px;
    height: 8px;
    border: 2px solid var(--theme-surface);
  }
</style>

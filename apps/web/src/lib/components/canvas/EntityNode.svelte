<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { renderMarkdown } from "$lib/utils/markdown";

  let { data }: NodeProps = $props();

  const entity = $derived(vault.entities[data.entityId as string]);
  const category = $derived(categories.getCategory(entity?.type || ""));
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
  class="bg-theme-surface border border-theme-border rounded-lg shadow-lg min-w-[200px] max-w-[300px] transition-all hover:border-theme-primary group select-none flex flex-col focus:ring-2 focus:ring-theme-primary focus:outline-none relative"
  style:width={data.width ? `${data.width}px` : "auto"}
  style:height={data.height ? `${data.height}px` : "auto"}
  ondblclick={onDoubleClick}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onDoubleClick()}
  tabindex="0"
  role="button"
  aria-label={entity?.title || "Missing Entity"}
>
  <!-- Omni-directional Stacked Handles -->
  <!-- Top -->
  <Handle
    type="target"
    id="top-target"
    position={Position.Top}
    class="!bg-theme-primary target"
    style="left: 25%; z-index: 50;"
  />
  <Handle
    type="source"
    id="top-source"
    position={Position.Top}
    class="!bg-theme-primary source"
    style="left: 75%; z-index: 51;"
  />

  <!-- Bottom -->
  <Handle
    type="target"
    id="bottom-target"
    position={Position.Bottom}
    class="!bg-theme-primary target"
    style="left: 25%; z-index: 50;"
  />
  <Handle
    type="source"
    id="bottom-source"
    position={Position.Bottom}
    class="!bg-theme-primary source"
    style="left: 75%; z-index: 51;"
  />

  <!-- Left -->
  <Handle
    type="target"
    id="left-target"
    position={Position.Left}
    class="!bg-theme-primary target"
    style="top: 25%; z-index: 50;"
  />
  <Handle
    type="source"
    id="left-source"
    position={Position.Left}
    class="!bg-theme-primary source"
    style="top: 75%; z-index: 51;"
  />

  <!-- Right -->
  <Handle
    type="target"
    id="right-target"
    position={Position.Right}
    class="!bg-theme-primary target"
    style="top: 25%; z-index: 50;"
  />
  <Handle
    type="source"
    id="right-source"
    position={Position.Right}
    class="!bg-theme-primary source"
    style="top: 75%; z-index: 51;"
  />

  <div class="flex-1 flex flex-col min-h-0 overflow-hidden rounded-lg">
    <div class="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
      {#if imageUrl}
        <div
          class="w-full h-44 overflow-hidden border-b border-theme-border bg-theme-bg/50"
        >
          <img
            src={imageUrl}
            alt={entity?.title}
            class="w-full h-full object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      {/if}

      <div class="p-3">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-1.5 text-theme-primary">
            <span class="{getIconClass(category?.icon)} w-3 h-3"></span>
            <span class="text-[10px] font-mono uppercase tracking-widest">
              {entity?.type || "Unknown"}
            </span>
          </div>
        </div>
        <h3 class="text-sm font-bold text-theme-text truncate font-header">
          {entity?.title || "Missing Entity"}
        </h3>
        {#if entity?.content}
          <div
            class="text-[11px] text-theme-muted mt-2 leading-relaxed line-clamp-6 markdown-content prose prose-invert prose-xs font-body"
          >
            {@html renderMarkdown(entity.content)}
          </div>
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
  </div>
</div>

<style>
  :global(.svelte-flow__handle) {
    width: 24px;
    height: 24px;
    background: var(--theme-primary);
    border: 3px solid var(--theme-surface);
    transition: all 0.2s;
    z-index: 50; /* Ensure handles are above the node body content */
  }
  :global(.svelte-flow__handle:hover) {
    transform: scale(1.2);
    background: var(--theme-text);
    border-color: var(--theme-primary);
    cursor: crosshair;
  }
  .markdown-content :global(strong) {
    font-weight: bold;
    color: var(--theme-text);
  }
  .markdown-content :global(em) {
    font-style: italic;
  }
  .markdown-content :global(p) {
    margin-bottom: 0.5rem;
  }
  .markdown-content :global(p:last-child) {
    margin-bottom: 0;
  }
  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin-left: 1rem;
    margin-bottom: 0.5rem;
  }
</style>

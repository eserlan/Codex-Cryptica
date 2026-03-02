<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { renderMarkdown } from "$lib/utils/markdown";
  import { Edit2, Check, X } from "lucide-svelte";

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

  let isEditing = $state(false);
  let editContent = $state("");
  let isSaving = $state(false);

  function startEdit(e: MouseEvent) {
    e.stopPropagation();
    editContent = entity?.content || "";
    isEditing = true;
  }

  function autoresize(node: HTMLTextAreaElement) {
    const resize = () => {
      node.style.height = "auto";
      node.style.height = node.scrollHeight + "px";
    };
    node.addEventListener("input", resize);
    setTimeout(resize, 0);
    return {
      destroy: () => node.removeEventListener("input", resize),
    };
  }

  function cancelEdit(e: MouseEvent) {
    e.stopPropagation();
    isEditing = false;
  }

  async function saveEdit(e: MouseEvent) {
    e.stopPropagation();
    if (!entity) return;
    isSaving = true;
    try {
      await vault.updateEntity(entity.id, { content: editContent });
      isEditing = false;
    } catch (err) {
      console.error("Failed to inline save", err);
    } finally {
      isSaving = false;
    }
  }

  const isCtrlPressed = $derived(uiStore.isModifierPressed);

  function onDoubleClick() {
    if (entity) {
      uiStore.openZenMode(entity.id);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bg-theme-surface border border-theme-border rounded-lg shadow-lg min-w-[200px] max-w-[300px] transition-all hover:border-theme-primary group select-none flex flex-col focus:ring-2 focus:ring-theme-primary focus:outline-none relative {isCtrlPressed
    ? 'nodrag'
    : ''}"
  style:width={data.width ? `${data.width}px` : "auto"}
  style:height={data.height ? `${data.height}px` : "auto"}
  ondblclick={onDoubleClick}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onDoubleClick()}
  tabindex="0"
  role="button"
  aria-label={entity?.title || "Missing Entity"}
>
  <Handle
    type="source"
    position={Position.Bottom}
    class="source-handle-cover !bg-theme-primary !border-theme-surface border-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
    style="width: 12px; height: 12px; bottom: -6px; z-index: 50; cursor: crosshair;"
  />
  <Handle
    type="target"
    position={Position.Top}
    class="target-handle-cover !bg-theme-primary !border-theme-surface border-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
    style="width: 12px; height: 12px; top: -6px; z-index: 50;"
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
          {#if !isEditing}
            <button
              class="text-theme-muted hover:text-theme-primary p-1 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
              onclick={startEdit}
              title="Quick edit chronicle"
              aria-label="Quick edit chronicle"
              type="button"
            >
              <Edit2 class="w-3 h-3" />
            </button>
          {/if}
        </div>
        <h3 class="text-sm font-bold text-theme-text truncate font-header">
          {entity?.title || "Missing Entity"}
        </h3>

        <div class="grid grid-cols-1 grid-rows-1 mt-2">
          <!-- Non-editing content (hidden but takes space when editing to maintain node size) -->
          <div
            class="col-start-1 row-start-1 text-[11px] text-theme-muted leading-relaxed markdown-content prose prose-invert prose-xs font-body {isEditing
              ? 'invisible pointer-events-none'
              : ''}"
          >
            {#if entity?.content}
              <div class="line-clamp-6">
                {@html renderMarkdown(entity.content)}
              </div>
            {/if}
          </div>

          <!-- Editing area -->
          {#if isEditing}
            <div
              class="col-start-1 row-start-1 relative z-50 pointer-events-auto group/editor min-h-0 overflow-hidden"
            >
              <textarea
                bind:value={editContent}
                use:autoresize
                class="bg-theme-surface/30 border border-theme-border/50 rounded-md p-1.5 text-[11px] text-theme-muted font-body leading-relaxed focus:outline-none focus:border-theme-primary focus:bg-theme-surface/50 resize-none nodrag overflow-hidden transition-colors w-full min-h-[100px] max-h-[350px]"
                placeholder="Write the chronicle here..."
                onkeydown={(e) => {
                  e.stopPropagation();
                }}
                ondblclick={(e) => e.stopPropagation()}
              ></textarea>
              <div
                class="absolute bottom-2 right-2 flex items-center justify-end gap-1 opacity-0 group-hover/editor:opacity-100 focus-within:opacity-100 transition-opacity"
              >
                <button
                  class="p-1.5 rounded-full bg-theme-surface border border-theme-border text-theme-muted hover:text-red-400 hover:border-red-400/50 backdrop-blur-sm shadow-sm transition-all"
                  onclick={cancelEdit}
                  disabled={isSaving}
                  title="Cancel"
                  aria-label="Cancel"
                  type="button"
                >
                  <X class="w-3 h-3" />
                </button>
                <button
                  class="p-1.5 rounded-full bg-theme-primary border border-theme-primary text-theme-surface hover:brightness-110 hover:scale-105 backdrop-blur-sm shadow-sm transition-all"
                  onclick={saveEdit}
                  disabled={isSaving}
                  title="Save"
                  aria-label="Save"
                  type="button"
                >
                  <Check class="w-3 h-3" />
                </button>
              </div>
            </div>
          {/if}
        </div>

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
  :global(.is-connecting .source-handle-cover),
  :global(.is-connecting .target-handle-cover) {
    opacity: 1 !important;
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

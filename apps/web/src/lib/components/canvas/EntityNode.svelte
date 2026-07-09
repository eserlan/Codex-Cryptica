<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { renderMarkdown } from "$lib/utils/markdown";

  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let { data, selected }: NodeProps = $props();

  const entityId = $derived(data?.entityId as string | undefined);
  const entity = $derived(entityId ? vault.entities[entityId] : undefined);
  const category = $derived(
    entity?.type ? categories.getCategory(entity.type) : undefined,
  );
  let imageUrl = $state<string | null>(null);

  // Access global state to detect if we are currently connecting anywhere on the canvas
  const isConnecting = $derived(connectionModeStore.isConnecting);

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

  // ⚡ Bolt Optimization: Memoize expensive markdown parsing.
  // Previously, `{@html renderMarkdown(entity.content)}` evaluated inline on every
  // reactive update (like hover state or connection dragging), blocking the main thread.
  const renderedContent = $derived.by(() => {
    try {
      return entity?.content ? renderMarkdown(entity.content) : "";
    } catch {
      return "";
    }
  });

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
    const frame = requestAnimationFrame(resize);
    return {
      destroy: () => {
        node.removeEventListener("input", resize);
        cancelAnimationFrame(frame);
      },
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

  const isCtrlPressed = $derived(connectionModeStore.isModifierPressed);
  let isHovered = $state(false);

  function onDoubleClick() {
    if (entity) {
      modalUIStore.openZenMode(entity.id);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bg-theme-surface border rounded-lg shadow-lg min-w-[200px] max-w-[300px] transition-all group select-none flex flex-col focus:outline-none relative
    {isConnecting &&
  isHovered &&
  connectionModeStore.connectingNodeId !== data?.id
    ? 'border-[3px] border-red-400 ring-4 ring-red-400/50 cursor-crosshair scale-[1.02]'
    : isCtrlPressed && isHovered
      ? 'nodrag border-[3px] border-amber-400 ring-4 ring-amber-400/50 cursor-crosshair'
      : isCtrlPressed
        ? 'nodrag border-theme-border'
        : selected
          ? 'border-2 border-[color:var(--theme-focus-border)] ring-2 ring-[color:var(--theme-focus-border)]/50'
          : 'border-theme-border hover:border-theme-primary focus:ring-2 focus:ring-theme-primary'}"
  style:box-shadow={selected
    ? "var(--theme-glow), 0 10px 15px -3px rgb(0 0 0 / 0.1)"
    : undefined}
  style:width={data?.width ? `${data.width}px` : "auto"}
  style:height={data?.height ? `${data.height}px` : "auto"}
  ondblclick={onDoubleClick}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onDoubleClick()}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
  tabindex="0"
  role="button"
  aria-label={entity?.title || "Missing Entity"}
>
  <!-- Invisible standard handles -->
  <Handle
    type="target"
    position={Position.Top}
    class="!bg-transparent !border-none target-test-handle"
    style="width: 1px; height: 1px; opacity: 0;"
  />

  <Handle
    type="source"
    position={Position.Top}
    class="full-card-handle !bg-transparent !border-none !rounded-none"
    style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 100; opacity: 0; transform: none !important; pointer-events: {isCtrlPressed
      ? 'auto'
      : 'none'}; cursor: crosshair;"
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
            loading="lazy"
            decoding="async"
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
              <span class="icon-[lucide--edit-2] w-3 h-3" aria-hidden="true"></span>
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
            {#if renderedContent}
              <div class="line-clamp-6">
                {@html renderedContent}
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
                  <span class="icon-[lucide--x] w-3 h-3" aria-hidden="true"></span>
                </button>
                <button
                  class="p-1.5 rounded-full bg-theme-primary border border-theme-primary text-theme-surface hover:brightness-110 hover:scale-105 backdrop-blur-sm shadow-sm transition-all"
                  onclick={saveEdit}
                  disabled={isSaving}
                  title="Save"
                  aria-label="Save"
                  type="button"
                >
                  <span class="icon-[lucide--check] w-3 h-3" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          {/if}
        </div>

        {#if entity?.labels && entity.labels.length > 0}
          <div class="flex flex-wrap gap-1 mt-3">
            {#each entity.labels.slice(0, 5) as label}
              <span
                class="px-1.5 py-0.5 bg-theme-bg border border-theme-border rounded text-[9px] text-theme-muted"
              >
                {label}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  :global(.is-connecting .full-card-handle) {
    pointer-events: none;
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

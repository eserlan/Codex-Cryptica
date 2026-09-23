<script lang="ts">
  import type { RandomSource } from "random-source-engine";

  let {
    contextMenu,
    onClose,
    onSelect,
    onRename,
    onDuplicate,
    onExport,
    onDelete,
  }: {
    contextMenu: { x: number; y: number; source: RandomSource };
    onClose: () => void;
    onSelect: (source: RandomSource) => void;
    onRename: (source: RandomSource) => void;
    onDuplicate: (source: RandomSource) => void;
    onExport: (source: RandomSource) => void;
    onDelete: (source: RandomSource) => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 z-50"
  onclick={onClose}
  oncontextmenu={(e) => {
    e.preventDefault();
    onClose();
  }}
>
  <div
    class="fixed z-50 flex min-w-[170px] max-w-[calc(100vw-32px)] flex-col rounded-xl border border-theme-border bg-theme-surface p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
    style="left: {Math.max(
      16,
      Math.min(
        contextMenu.x,
        (typeof window !== 'undefined' ? window.innerWidth : 600) - 190,
      ),
    )}px; top: {Math.max(
      16,
      Math.min(
        contextMenu.y,
        (typeof window !== 'undefined' ? window.innerHeight : 600) - 220,
      ),
    )}px;"
    onclick={(e) => e.stopPropagation()}
    role="menu"
    tabindex="-1"
  >
    <div
      class="px-2.5 py-1 text-[10px] font-header font-bold uppercase tracking-wider text-theme-muted truncate border-b border-theme-border/50 mb-1"
    >
      {contextMenu.source.name}
    </div>
    <button
      type="button"
      onclick={() => {
        onSelect(contextMenu.source);
        onClose();
      }}
      class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
      data-testid="ctx-open"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--folder-open] h-3.5 w-3.5 text-theme-muted"
      ></span>
      <span>Open</span>
    </button>
    <button
      type="button"
      onclick={() => onRename(contextMenu.source)}
      class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
      data-testid="ctx-rename"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--pencil] h-3.5 w-3.5 text-theme-muted"
      ></span>
      <span>Rename</span>
    </button>
    <button
      type="button"
      onclick={() => onDuplicate(contextMenu.source)}
      class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
      data-testid="ctx-duplicate"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--copy] h-3.5 w-3.5 text-theme-muted"
      ></span>
      <span>Duplicate</span>
    </button>
    <button
      type="button"
      onclick={() => {
        onExport(contextMenu.source);
        onClose();
      }}
      class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary"
      data-testid="ctx-export"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--download] h-3.5 w-3.5 text-theme-muted"
      ></span>
      <span>Export</span>
    </button>
    <div class="my-1 border-t border-theme-border/50"></div>
    <button
      type="button"
      onclick={() => onDelete(contextMenu.source)}
      class="flex items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-red-500 transition-colors hover:bg-red-500/10"
      data-testid="ctx-delete"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--trash-2] h-3.5 w-3.5 text-red-500"
      ></span>
      <span>Delete</span>
    </button>
  </div>
</div>

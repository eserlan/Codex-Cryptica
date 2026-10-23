<script lang="ts">
  import type { ItemTableRow } from "./item-table-values";
  let {
    row,
    linkedTitle,
    rIdx,
    rowCount,
    onMove,
    onRemove,
  }: {
    row: ItemTableRow;
    linkedTitle?: string;
    rIdx: number;
    rowCount: number;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
  } = $props();
  const rowLabel = $derived(row.name || linkedTitle || `item ${rIdx + 1}`);
</script>

<td class="w-12 px-1 py-0.5 text-center align-middle whitespace-nowrap">
  <div
    class="inline-flex items-center justify-center gap-0.5 opacity-70 group-hover/row:opacity-100 transition-opacity"
  >
    <div class="flex flex-col items-center justify-center -space-y-0.5">
      <button
        type="button"
        data-action="move-up"
        aria-label={`Move ${rowLabel} up`}
        class="flex h-3.5 w-4 items-center justify-center rounded-xs text-theme-muted hover:text-theme-primary hover:bg-theme-surface/60 active:scale-95 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-theme-muted disabled:active:scale-100 transition-all"
        disabled={rIdx === 0}
        onclick={() => onMove(-1)}
        title="Move item up (Ctrl+↑)"
      >
        <span class="icon-[lucide--chevron-up] h-3 w-3" aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        data-action="move-down"
        aria-label={`Move ${rowLabel} down`}
        class="flex h-3.5 w-4 items-center justify-center rounded-xs text-theme-muted hover:text-theme-primary hover:bg-theme-surface/60 active:scale-95 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-theme-muted disabled:active:scale-100 transition-all"
        disabled={rIdx === rowCount - 1}
        onclick={() => onMove(1)}
        title="Move item down (Ctrl+↓)"
      >
        <span class="icon-[lucide--chevron-down] h-3 w-3" aria-hidden="true"
        ></span>
      </button>
    </div>
    <button
      type="button"
      data-action="remove"
      aria-label={`Remove ${row.name || `item ${rIdx + 1}`}`}
      class="flex h-5 w-5 items-center justify-center rounded text-theme-muted hover:bg-red-500/15 hover:text-red-400 active:scale-95 transition-all"
      onclick={() => onRemove()}
      title="Remove item"
    >
      <span class="icon-[lucide--trash-2] h-3.5 w-3.5" aria-hidden="true"
      ></span>
    </button>
  </div>
</td>

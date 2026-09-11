<script lang="ts">
  import type { ShelfEntrySummary } from "@codex/entity-shelf";

  let {
    entry,
    selected = false,
    onToggle,
    onRemove,
  }: {
    entry: ShelfEntrySummary;
    selected?: boolean;
    onToggle: () => void;
    onRemove: () => void;
  } = $props();

  const shelvedOn = $derived(
    new Date(entry.shelvedAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  );

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div
  class="flex items-start gap-3 p-3 border border-theme-border rounded-lg hover:border-theme-primary/40 transition-colors"
  class:border-theme-primary={selected}
  data-testid="shelf-entry"
>
  <input
    type="checkbox"
    checked={selected}
    onchange={onToggle}
    class="mt-1 accent-theme-primary"
    aria-label={`Select ${entry.title}`}
  />

  <div class="flex-1 min-w-0">
    <p class="text-sm text-theme-text font-medium truncate">{entry.title}</p>
    <p class="text-xs text-theme-text-muted mt-0.5">
      {entry.type} · from {entry.sourceVaultName} · {shelvedOn}
    </p>
    <p class="text-[11px] text-theme-text-muted/70 mt-0.5">
      {formatSize(entry.byteSize)}
    </p>
  </div>

  <button
    type="button"
    onclick={onRemove}
    class="p-1.5 text-theme-text-muted hover:text-theme-danger transition-colors"
    aria-label={`Remove ${entry.title} from the Shelf`}
    title="Remove from the Shelf"
  >
    <span class="icon-[lucide--x] w-3.5 h-3.5" aria-hidden="true"></span>
  </button>
</div>

<script lang="ts">
  import type { TimelineEntry } from "$lib/stores/timeline.svelte";
  import { vault } from "$lib/stores/vault.svelte";

  let { entry } = $props<{ entry: TimelineEntry }>();

  const entity = $derived(vault.entities[entry.entityId]);

  const formatDate = (date: TimelineEntry["date"]) => {
    if (date.label) return date.label;
    const parts = [date.year];
    if (date.month) parts.push(date.month);
    if (date.day) parts.push(date.day);
    return parts.join("/");
  };

  const handleClick = () => {
    vault.selectedEntityId = entry.entityId;
  };
</script>

<button
  onclick={handleClick}
  class="w-full text-left p-4 bg-theme-surface/50 border border-theme-border hover:border-theme-primary/50 hover:bg-theme-primary/10 transition-all rounded group relative"
>
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span
          class="text-[10px] font-mono text-theme-primary font-bold uppercase font-header tracking-widest bg-theme-primary/10 px-1.5 py-0.5 rounded"
        >
          {formatDate(entry.date)}
        </span>
        <span class="text-[9px] text-theme-muted uppercase tracking-tighter">
          {entry.type}
        </span>
      </div>
      <h4
        class="text-sm font-bold text-theme-text group-hover:text-theme-primary transition-colors truncate"
      >
        {entry.title}
      </h4>
      {#if entity?.content}
        <p
          class="text-[11px] text-theme-muted line-clamp-2 mt-1 leading-relaxed italic font-body"
        >
          {entity.content}
        </p>
      {/if}
    </div>

    {#if entity?.image}
      <div
        class="w-12 h-12 rounded overflow-hidden border border-theme-border shrink-0"
      >
        <!-- We don't resolve here for performance in lists, but we could if needed -->
        <span class="icon-[lucide--image] w-full h-full text-theme-muted p-2"
        ></span>
      </div>
    {/if}
  </div>

  <!-- Selection Indicator -->
  {#if vault.selectedEntityId === entry.entityId}
    <div
      class="absolute inset-y-0 left-0 w-1 bg-theme-primary [box-shadow:var(--theme-glow)]"
    ></div>
  {/if}
</button>

<script lang="ts">
  import { importQueue } from "$lib/stores/import-queue.svelte";

  let { totalChunks = 0 } = $props<{ totalChunks: number }>();

  let segments = $derived.by(() => {
    const list = [];
    for (let i = 0; i < totalChunks; i++) {
      list.push({
        index: i,
        status: importQueue.activeItemChunks[i] || "pending",
      });
    }
    return list;
  });
</script>

<div class="space-y-2">
  <div
    class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-theme-muted"
  >
    <span>Analysis Progress</span>
    <span
      >{segments.filter(
        (s) => s.status === "completed" || s.status === "skipped",
      ).length} / {totalChunks} Chunks</span
    >
  </div>

  <div
    class="grid gap-1 h-3 w-full"
    style:grid-template-columns="repeat({totalChunks}, 1fr)"
  >
    {#each segments as segment (segment.index)}
      <div
        class="rounded-sm transition-all duration-300 {segment.status ===
        'completed'
          ? 'bg-theme-primary shadow-[0_0_8px_rgba(var(--color-primary),0.4)]'
          : segment.status === 'skipped'
            ? 'bg-theme-muted/40'
            : segment.status === 'active'
              ? 'bg-theme-secondary animate-pulse'
              : 'bg-theme-bg border border-theme-border/20'}"
        title="Chunk {segment.index + 1}: {segment.status}"
      ></div>
    {/each}
  </div>

  <div class="flex gap-4 mt-2 justify-center">
    <div
      class="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tighter text-theme-muted"
    >
      <div class="w-2 h-2 rounded-sm bg-theme-muted/40"></div>
      Skipped
    </div>
    <div
      class="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tighter text-theme-muted"
    >
      <div class="w-2 h-2 rounded-sm bg-theme-primary"></div>
      Completed
    </div>
    <div
      class="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-tighter text-theme-muted"
    >
      <div class="w-2 h-2 rounded-sm bg-theme-secondary animate-pulse"></div>
      Active
    </div>
  </div>
</div>

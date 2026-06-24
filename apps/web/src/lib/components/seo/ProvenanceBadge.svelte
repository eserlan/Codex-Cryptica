<script lang="ts">
  import type { ProvenanceRecord } from "generator-engine";
  import { sessionHubStore } from "$lib/stores/session-hub.svelte";

  let {
    record,
    onSelect,
  }: {
    record: ProvenanceRecord | undefined;
    onSelect: (entity: any) => void;
  } = $props();

  const usedEntities = $derived(
    record
      ? record.usedEntityIds
          .map((id) => sessionHubStore.entities.find((e) => e.id === id))
          .filter(Boolean)
      : [],
  );
</script>

{#if usedEntities.length > 0}
  <div
    class="mt-4 p-3 bg-theme-primary/5 border border-theme-primary/20 rounded-xl flex items-start gap-2 text-[10px] text-theme-text/80 animate-in fade-in"
  >
    <span
      class="icon-[lucide--zap] w-3.5 h-3.5 text-theme-primary shrink-0 mt-0.5"
    ></span>
    <div class="flex flex-wrap items-center gap-1.5 leading-tight">
      <span
        class="text-theme-muted uppercase font-bold tracking-wider font-header"
        >Used context:</span
      >
      {#each usedEntities as entity (entity!.id)}
        <button
          type="button"
          onclick={() => onSelect(entity)}
          class="inline-flex items-center gap-1 hover:text-theme-primary transition-colors underline decoration-theme-primary/30 underline-offset-2"
        >
          {entity!.title}
        </button>
      {/each}
    </div>
  </div>
{/if}

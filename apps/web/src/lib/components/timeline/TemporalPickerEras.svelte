<script lang="ts">
  export type TimelineEra = {
    id: string;
    name: string;
    start_year: number;
    end_year?: number | null;
    color?: string;
  };

  let {
    eras,
    onSelect,
  }: {
    eras: TimelineEra[];
    onSelect: (era: TimelineEra) => void;
  } = $props();
</script>

<div id="era-panel" role="tabpanel" aria-labelledby="era-tab" class="space-y-1">
  {#each eras as era (era.id)}
    <button
      type="button"
      class="w-full text-left p-2 rounded hover:bg-theme-primary/10 border border-transparent hover:border-theme-primary/20 transition-all group"
      data-testid="era-select-button"
      onclick={() => onSelect(era)}
    >
      <div class="flex items-center gap-2">
        <div
          class="w-1 h-4 rounded-full"
          style:background-color={era.color}
        ></div>
        <span
          class="text-xs font-bold text-theme-text group-hover:text-theme-primary"
          >{era.name}</span
        >
      </div>
      <div class="text-[9px] text-theme-muted ml-3 font-header">
        Year {era.start_year}
        {era.end_year != null ? `→ ${era.end_year}` : "→ Present"}
      </div>
    </button>
  {:else}
    <div
      class="py-8 text-center text-theme-muted text-[10px] uppercase tracking-widest"
    >
      No Eras Defined
    </div>
  {/each}
</div>

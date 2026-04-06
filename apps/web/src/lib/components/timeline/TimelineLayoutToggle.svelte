<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";

  const modes = [
    { id: "vertical", icon: "icon-[lucide--list]", label: "Vertical" },
    { id: "horizontal", icon: "icon-[lucide--columns-3]", label: "Horizontal" },
  ];
</script>

<div class="flex bg-theme-surface border border-theme-border rounded p-1">
  {#each modes as mode}
    <button
      onclick={() => (timelineStore.viewMode = mode.id as any)}
      class="px-3 py-1.5 flex items-center gap-2 rounded text-[10px] font-bold tracking-widest transition-all
      {timelineStore.viewMode === mode.id
        ? 'bg-theme-primary/20 text-theme-primary'
        : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/5'}"
      title="Switch to {mode.label} View"
    >
      <span class="{mode.icon} w-3.5 h-3.5"></span>
      <span class="hidden md:inline uppercase">{mode.label}</span>
    </button>
  {/each}
</div>

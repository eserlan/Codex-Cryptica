<script lang="ts">
  import { timelineStore } from "$lib/stores/timeline.svelte";

  const modes = [
    { id: "calendar", icon: "icon-[lucide--calendar-days]", label: "Calendar" },
    { id: "agenda", icon: "icon-[lucide--scroll-text]", label: "Agenda" },
    { id: "vertical", icon: "icon-[lucide--list]", label: "Timeline" },
    { id: "horizontal", icon: "icon-[lucide--columns-3]", label: "Bands" },
  ];
</script>

<div class="flex bg-theme-surface border border-theme-border rounded p-1">
  {#each modes as mode}
    <button
      type="button"
      onclick={() => timelineStore.setViewMode(mode.id as any)}
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

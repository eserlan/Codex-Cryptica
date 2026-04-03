<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { Sparkles, Database } from "lucide-svelte";

  interface Tool {
    id: string;
    icon: any;
    label: string;
    action: () => void;
  }

  let {
    tools = [
      {
        id: "oracle",
        icon: Sparkles,
        label: "Lore Oracle",
        action: () => uiStore.toggleSidebarTool("oracle"),
      },
      {
        id: "explorer",
        icon: Database,
        label: "Entity Explorer",
        action: () => uiStore.toggleSidebarTool("explorer"),
      },
    ],
  }: {
    tools?: Tool[];
  } = $props();
</script>

<nav
  class="bg-theme-surface border-theme-border flex shrink-0 z-[80]
    flex-row md:flex-col items-center justify-center md:justify-start py-2 md:py-4 gap-4 md:gap-4
    w-full md:w-14 h-14 md:h-full border-t md:border-t-0 md:border-r"
  aria-label="Activity Bar"
  data-testid="activity-bar"
>
  {#each tools as tool}
    {@const Icon = tool.icon}
    <button
      onclick={tool.action}
      class="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group relative {uiStore.activeSidebarTool ===
      tool.id
        ? 'bg-theme-primary/10 text-theme-primary border border-theme-primary/30'
        : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/5'}"
      aria-label={tool.label}
      title={tool.label}
      data-testid={`activity-bar-${tool.id}`}
    >
      <Icon
        class="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
      />

      {#if uiStore.activeSidebarTool === tool.id}
        <div
          class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
                 bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
                 bg-theme-primary rounded-t-full md:rounded-r-full md:rounded-t-none"
        ></div>
      {/if}
    </button>
  {/each}
</nav>

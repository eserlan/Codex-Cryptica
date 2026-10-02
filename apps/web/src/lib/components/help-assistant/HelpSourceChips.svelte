<script lang="ts">
  import type { HelpSource } from "help-engine";

  let {
    sources,
    onOpenArticle,
  }: {
    sources: HelpSource[];
    onOpenArticle: (helpId: string) => void;
  } = $props();
</script>

<div class="flex flex-wrap items-center gap-1">
  <span class="text-[10px] uppercase tracking-wider text-chrome-muted"
    >Sources</span
  >
  {#each sources as source (source.id)}
    {#if source.helpId}
      <button
        type="button"
        onclick={() => onOpenArticle(source.helpId!)}
        class="rounded border border-chrome-border px-2 py-0.5 text-[10px] text-chrome-accent hover:bg-chrome-accent/10 focus-visible:outline-2 focus-visible:outline-chrome-accent"
      >
        {source.title}
      </button>
    {:else}
      <span
        class="rounded border border-chrome-border px-2 py-0.5 text-[10px] text-chrome-muted"
        >{source.title}</span
      >
    {/if}
  {/each}
</div>

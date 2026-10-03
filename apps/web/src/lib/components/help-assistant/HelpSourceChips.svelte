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

<div class="flex flex-wrap items-center gap-1.5 sm:gap-1">
  <span class="text-meta uppercase tracking-wider text-theme-muted"
    >Sources</span
  >
  {#each sources as source (source.id)}
    {#if source.helpId}
      <button
        type="button"
        onclick={() => onOpenArticle(source.helpId!)}
        class="touch-target inline-flex items-center rounded border border-theme-border px-2 py-0.5 text-meta text-theme-primary hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-theme-primary"
      >
        {source.title}
      </button>
    {:else}
      <span
        class="rounded border border-theme-border px-2 py-0.5 text-meta text-theme-muted"
        >{source.title}</span
      >
    {/if}
  {/each}
</div>

<script lang="ts">
  import type { HelpSource } from "help-engine";

  let {
    sources,
    onOpenArticle,
  }: {
    sources: HelpSource[];
    onOpenArticle: (helpId: string) => void;
  } = $props();

  const articleSources = $derived.by(() => {
    const seen = new Set<string>();
    return sources.filter((source) => {
      if (!source.helpId) return false;
      const key = source.helpId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
</script>

{#if articleSources.length > 0}
  <div class="flex flex-wrap items-center gap-1">
    <span class="text-meta uppercase tracking-wider text-chrome-muted"
      >Sources</span
    >
    {#each articleSources as source (source.id)}
      <button
        type="button"
        onclick={() => onOpenArticle(source.helpId!)}
        class="touch-target rounded border border-chrome-border px-2 py-0.5 text-meta text-chrome-accent hover:bg-chrome-accent/10 focus-visible:outline-2 focus-visible:outline-chrome-accent"
      >
        {source.title}
      </button>
    {/each}
  </div>
{/if}

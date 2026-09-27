<script lang="ts">
  import type { LinkGroup } from "./entity-card-variant";
  import GroupedRelationLinks from "./GroupedRelationLinks.svelte";

  let {
    renderedContent,
    coordinatesText,
    connectionCount,
    groups = [],
  }: {
    renderedContent: string;
    coordinatesText?: string;
    connectionCount: number;
    groups?: LinkGroup[];
  } = $props();
</script>

<div
  class="text-[11px] text-theme-muted leading-relaxed markdown-content prose prose-invert prose-xs font-body"
>
  {#if renderedContent}
    <div class="line-clamp-3" data-testid="location-card-excerpt">
      {@html renderedContent}
    </div>
  {/if}
  <div
    class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-theme-border/30 pt-1.5 text-[9px] text-theme-muted"
    data-testid="location-card-meta"
  >
    {#if coordinatesText}
      <span class="inline-flex items-center gap-1 font-mono">
        <span class="icon-[lucide--map-pin] w-2.5 h-2.5" aria-hidden="true"
        ></span>
        {coordinatesText}
      </span>
    {/if}
    <span class="inline-flex items-center gap-1">
      <span class="icon-[lucide--link] w-2.5 h-2.5" aria-hidden="true"></span>
      {connectionCount}
      {connectionCount === 1 ? "connection" : "connections"}
    </span>
  </div>
  <GroupedRelationLinks {groups} />
</div>

<style>
  .markdown-content :global(strong) {
    font-weight: bold;
    color: var(--theme-text);
  }
  .markdown-content :global(em) {
    font-style: italic;
  }
  .markdown-content :global(p) {
    margin-bottom: 0.5rem;
  }
  .markdown-content :global(p:last-child) {
    margin-bottom: 0;
  }
</style>

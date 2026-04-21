<script lang="ts">
  import { fly } from "svelte/transition";
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { browser } from "$app/environment";
  import type { Entity } from "schema";

  let { hoveredEntity, hoverPosition } = $props<{
    hoveredEntity: Entity | null;
    hoverPosition: { x: number; y: number } | null;
  }>();

  let tooltipContent = $derived(
    hoveredEntity?.content
      ? browser
        ? DOMPurify.sanitize(marked.parse(hoveredEntity.content) as string, {
            ALLOWED_URI_REGEXP:
              /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i,
          })
        : (marked.parse(hoveredEntity.content) as string)
      : '<span class="italic text-theme-muted">No data available</span>',
  );
</script>

{#if hoveredEntity && hoverPosition}
  <div
    class="fixed z-50 pointer-events-none bg-theme-surface/90 backdrop-blur-md border border-theme-primary/30 p-4 shadow-2xl max-w-xs overflow-hidden"
    style="left: {hoverPosition.x + 20}px; top: {hoverPosition.y - 20}px;"
    transition:fly={{ y: 10, duration: 200 }}
  >
    <div class="flex flex-col gap-2">
      <h3
        class="text-theme-primary font-header font-bold text-sm uppercase tracking-widest border-b border-theme-primary/20 pb-1"
      >
        {hoveredEntity?.title || hoveredEntity?.id}
      </h3>
      <div class="prose prose-invert prose-sm text-xs line-clamp-4">
        {@html tooltipContent}
      </div>
      {#if hoveredEntity?.tags?.length}
        <div class="flex flex-wrap gap-1 mt-1">
          {#each hoveredEntity.tags as tag}
            <span
              class="px-1.5 py-0.5 bg-theme-primary/10 border border-theme-primary/20 text-theme-primary text-[10px] font-mono rounded"
              >{tag}</span
            >
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

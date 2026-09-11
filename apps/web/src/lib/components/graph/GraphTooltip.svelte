<script lang="ts">
  import { fly } from "svelte/transition";
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { browser } from "$app/environment";
  import { deriveEntityTypePalette } from "schema";
  import type { Entity } from "schema";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { getIconClass } from "$lib/utils/icon";

  let { hoveredEntity, hoverPosition } = $props<{
    hoveredEntity: Entity | null;
    hoverPosition: { x: number; y: number } | null;
  }>();

  // Entity type must not ride on node colour alone (issue #2680): hovering a
  // node names the type in words, with its icon, next to the title.
  //
  // Kept out of the hover-driven derived below so switching nodes is a lookup,
  // not a re-derivation of the whole palette.
  const typePalette = $derived(
    deriveEntityTypePalette(themeStore.activeTheme, categories.list),
  );
  const category = $derived(
    hoveredEntity?.type
      ? categories.getCategory(hoveredEntity.type)
      : undefined,
  );
  // Only the icon takes the type colour. The label stays in the theme's own
  // text colour, because 3:1 is the floor for a graphic, not for small text.
  const typeAccent = $derived(
    category ? (typePalette[category.id]?.accent ?? category.color) : undefined,
  );

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
    class="fixed z-50 pointer-events-none bg-theme-surface/90 backdrop-blur-md border border-theme-primary/30 p-4 shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-xs overflow-hidden rounded-xl"
    style="left: {hoverPosition.x + 20}px; top: {hoverPosition.y - 20}px;"
    transition:fly={{ y: 10, duration: 200 }}
  >
    <div class="flex flex-col gap-2">
      <h3
        class="text-theme-primary font-header font-bold text-base uppercase tracking-widest border-b border-theme-primary/20 pb-1"
      >
        {hoveredEntity?.title || hoveredEntity?.id}
      </h3>
      {#if category}
        <div
          class="flex items-center gap-1.5 text-xs font-medium tracking-wide -mt-1 text-theme-text"
          data-testid="graph-tooltip-type"
        >
          <span
            aria-hidden="true"
            class="{getIconClass(category.icon)} h-3.5 w-3.5 shrink-0"
            style={typeAccent ? `color: ${typeAccent}` : undefined}
          ></span>
          <span>{category.label}</span>
        </div>
      {/if}
      <div
        class="prose prose-invert prose-sm text-sm leading-relaxed line-clamp-4"
      >
        {@html tooltipContent}
      </div>
      {#if hoveredEntity?.labels?.length}
        <div class="flex flex-wrap gap-1 mt-1">
          {#each hoveredEntity.labels as label}
            <span
              class="px-1.5 py-0.5 bg-theme-primary/10 border border-theme-primary/20 text-theme-primary text-xs font-mono rounded"
              >{label}</span
            >
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

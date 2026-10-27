<script lang="ts">
  /**
   * Reusable responsive layout container for public pages.
   *
   * Implements the two-width concept from docs/design/public-shell-grammar.md:
   * - Outer page canvas (narrow, default, wide, or full for widescreen).
   * - Single-column reading measure or responsive content + contextual aside split.
   * - Natural single-column stacking on mobile (<1024px) preserving source order.
   */
  import { PUBLIC_LAYOUT, type ShellWidth } from "./marketing-shell";

  let {
    width = "default",
    class: customClass = "",
    children,
    aside,
  }: {
    width?: ShellWidth;
    class?: string;
    children?: import("svelte").Snippet;
    aside?: import("svelte").Snippet;
  } = $props();

  const canvasClass = $derived(PUBLIC_LAYOUT.canvas[width]);
  const paddingClass = $derived(PUBLIC_LAYOUT.padding.canvas);
</script>

<div
  class="{canvasClass} {paddingClass} {customClass}"
  data-testid="public-page-container"
>
  {#if aside}
    <div class={PUBLIC_LAYOUT.split.container}>
      <div class={PUBLIC_LAYOUT.split.content}>
        {#if children}
          {@render children()}
        {/if}
      </div>
      <aside class={PUBLIC_LAYOUT.split.aside} data-testid="public-page-aside">
        {@render aside()}
      </aside>
    </div>
  {:else if children}
    {@render children()}
  {/if}
</div>

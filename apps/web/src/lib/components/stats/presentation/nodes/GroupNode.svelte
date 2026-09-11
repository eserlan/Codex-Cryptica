<script lang="ts">
  import type { GroupNode as GroupNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import PresentationRenderer from "../PresentationRenderer.svelte";

  let {
    node,
    context,
  }: { node: GroupNodeType; context: PresentationRenderContext } = $props();

  // Column tracks are `minmax(0,auto)` rather than the equal `1fr` fractions
  // Tailwind's `grid-cols-N` produces. Equal fractions hand a column of
  // three-letter characteristics exactly as much width as a column of
  // two-word attributes, so the first ends up mostly empty gutter while the
  // second wraps its labels. `auto` sizes each track towards its content
  // first and only then shares out the leftover, and the `0` floor keeps a
  // long value from forcing the group to overflow horizontally.
  //
  // Every class is spelled out in full: Tailwind scans source statically, so
  // a track built by string interpolation would never reach the stylesheet.
  //
  // Responsive degrade (FR-018): never render more columns than fit at a
  // narrow viewport, regardless of the requested `columns=N`. Tailwind's
  // `sm:`/`md:` breakpoints only apply the wider grid above their min-width,
  // so a mobile viewport always falls back to a single column.
  const gridClass = $derived.by(() => {
    const cols = node.columns ?? 1;
    if (cols <= 1) return "grid grid-cols-1 gap-2";
    if (cols === 2)
      return "grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,auto))] gap-2";
    if (cols === 3)
      return "grid grid-cols-1 sm:grid-cols-[repeat(2,minmax(0,auto))] md:grid-cols-[repeat(3,minmax(0,auto))] gap-2";
    if (cols === 4)
      return "grid grid-cols-[repeat(2,minmax(0,auto))] sm:grid-cols-[repeat(3,minmax(0,auto))] md:grid-cols-[repeat(4,minmax(0,auto))] gap-2";
    if (cols === 5)
      return "grid grid-cols-[repeat(2,minmax(0,auto))] sm:grid-cols-[repeat(3,minmax(0,auto))] md:grid-cols-[repeat(5,minmax(0,auto))] gap-2";
    return "grid grid-cols-[repeat(2,minmax(0,auto))] sm:grid-cols-[repeat(3,minmax(0,auto))] md:grid-cols-[repeat(6,minmax(0,auto))] gap-2";
  });
</script>

<div
  class={gridClass}
  data-testid="presentation-group"
  data-columns={node.columns}
>
  {#each node.children as child, i (i)}
    <PresentationRenderer nodes={[child]} {context} />
  {/each}
</div>

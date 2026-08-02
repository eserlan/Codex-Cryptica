<script lang="ts">
  import type { GroupNode as GroupNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import PresentationRenderer from "../PresentationRenderer.svelte";

  let {
    node,
    context,
  }: { node: GroupNodeType; context: PresentationRenderContext } = $props();

  // Responsive degrade (FR-018): never render more columns than fit at a
  // narrow viewport, regardless of the requested `columns=N`. Tailwind's
  // `sm:`/`md:` breakpoints only apply the wider grid above their min-width,
  // so a mobile viewport always falls back to a single column.
  const gridClass = $derived.by(() => {
    const cols = node.columns ?? 1;
    if (cols <= 1) return "grid grid-cols-1 gap-2";
    if (cols === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-2";
    return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2";
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

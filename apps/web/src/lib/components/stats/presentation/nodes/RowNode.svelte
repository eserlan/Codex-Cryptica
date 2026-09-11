<script lang="ts">
  import type { RowNode as RowNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import PresentationRenderer from "../PresentationRenderer.svelte";

  let {
    node,
    context,
  }: { node: RowNodeType; context: PresentationRenderContext } = $props();
</script>

<div
  class="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
  data-testid="presentation-row"
>
  {#each node.children as child, i (i)}
    <div class="min-w-0 flex-1">
      <PresentationRenderer nodes={[child]} {context} />
    </div>
  {/each}
</div>

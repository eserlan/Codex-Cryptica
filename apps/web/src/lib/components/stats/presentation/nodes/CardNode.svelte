<script lang="ts">
  import type { CardNode as CardNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import PresentationRenderer from "../PresentationRenderer.svelte";

  let {
    node,
    context,
  }: { node: CardNodeType; context: PresentationRenderContext } = $props();
</script>

<div
  class="flex flex-col gap-2 rounded border border-theme-border bg-theme-surface/50 p-3"
  data-testid="presentation-card"
>
  <PresentationRenderer nodes={node.children} {context} />
</div>

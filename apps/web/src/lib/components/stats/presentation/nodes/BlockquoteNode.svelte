<script lang="ts">
  import type { BlockquoteNode as BlockquoteNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  // fallow-ignore-next-line circular-dependency
  import PresentationRenderer from "../PresentationRenderer.svelte";

  let {
    node,
    context,
  }: { node: BlockquoteNodeType; context: PresentationRenderContext } =
    $props();
</script>

<blockquote class="border-l-2 border-theme-border pl-2 text-theme-muted">
  <PresentationRenderer nodes={node.children} {context} />
</blockquote>

<script lang="ts">
  import type { ParagraphNode as ParagraphNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import InlineContent from "../InlineContent.svelte";

  let {
    node,
    context,
  }: { node: ParagraphNodeType; context: PresentationRenderContext } = $props();
</script>

<div
  class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-theme-text"
>
  <InlineContent nodes={node.children} {context} />
</div>

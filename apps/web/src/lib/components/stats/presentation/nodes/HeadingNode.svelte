<script lang="ts">
  import type { HeadingNode as HeadingNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import InlineContent from "../InlineContent.svelte";

  let {
    node,
    context,
  }: { node: HeadingNodeType; context: PresentationRenderContext } = $props();

  const sizeClass = $derived(
    (
      {
        1: "text-base",
        2: "text-sm",
        3: "text-xs",
        4: "text-xs",
        5: "text-xs",
        6: "text-xs",
      } as Record<number, string>
    )[node.level] ?? "text-xs",
  );
</script>

<div
  class="mt-2 border-b border-theme-border pb-1 font-bold uppercase tracking-widest text-theme-muted {sizeClass}"
>
  <InlineContent nodes={node.children} {context} />
</div>

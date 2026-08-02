<script lang="ts">
  import type { SectionNode as SectionNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import PresentationRenderer from "../PresentationRenderer.svelte";

  let {
    node,
    context,
  }: { node: SectionNodeType; context: PresentationRenderContext } = $props();
</script>

<section class="flex flex-col gap-2" data-testid="presentation-section">
  {#if node.title}
    <h3
      class="text-[10px] font-bold uppercase tracking-widest text-theme-muted"
    >
      {node.title}
    </h3>
  {/if}
  <PresentationRenderer nodes={node.children} {context} />
</section>

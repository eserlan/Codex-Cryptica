<script lang="ts">
  import type { SectionNode as SectionNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import PresentationRenderer from "../PresentationRenderer.svelte";

  let {
    node,
    context,
  }: { node: SectionNodeType; context: PresentationRenderContext } = $props();

  const sectionKey = $derived(context.sectionKeys.get(node));
  const collapsed = $derived(
    node.title && sectionKey ? context.isSectionCollapsed(sectionKey) : false,
  );

  function toggle() {
    if (sectionKey) context.onToggleSection(sectionKey);
  }
</script>

<section class="flex flex-col gap-2" data-testid="presentation-section">
  {#if node.title}
    <button
      type="button"
      class="flex w-full items-center gap-1.5 text-left text-[10px] font-bold uppercase tracking-widest text-theme-muted"
      onclick={toggle}
      aria-expanded={!collapsed}
      data-testid="presentation-section-toggle"
    >
      <span
        class="icon-[lucide--chevron-right] h-3.5 w-3.5 shrink-0 transition-transform {collapsed
          ? ''
          : 'rotate-90'}"
        aria-hidden="true"
      ></span>
      {node.title}
    </button>
  {/if}
  {#if !collapsed}
    <PresentationRenderer nodes={node.children} {context} />
  {/if}
</section>

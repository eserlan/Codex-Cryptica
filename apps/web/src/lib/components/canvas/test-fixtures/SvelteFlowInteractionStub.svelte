<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    panOnDrag = true,
    nodesDraggable = true,
    nodesConnectable = true,
    elementsSelectable = true,
    zoomOnScroll = true,
    zoomOnPinch = true,
    children,
  }: {
    panOnDrag?: boolean | number[];
    nodesDraggable?: boolean;
    nodesConnectable?: boolean;
    elementsSelectable?: boolean;
    zoomOnScroll?: boolean;
    zoomOnPinch?: boolean;
    children?: Snippet;
  } = $props();
</script>

<div
  data-testid="svelte-flow-interaction-stub"
  data-pan-on-drag={String(panOnDrag)}
  data-nodes-draggable={String(nodesDraggable)}
  data-nodes-connectable={String(nodesConnectable)}
  data-elements-selectable={String(elementsSelectable)}
  data-zoom-on-scroll={String(zoomOnScroll)}
  data-zoom-on-pinch={String(zoomOnPinch)}
>
  {#if children}
    {@render children()}
  {/if}
</div>

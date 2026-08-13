<script lang="ts">
  import type { BlockNode } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "./types";
  import HeadingNode from "./nodes/HeadingNode.svelte";
  import ParagraphNode from "./nodes/ParagraphNode.svelte";
  import ListNode from "./nodes/ListNode.svelte";
  import TableNode from "./nodes/TableNode.svelte";
  import BlockquoteNode from "./nodes/BlockquoteNode.svelte";
  import ImageNode from "./nodes/ImageNode.svelte";
  import GroupNode from "./nodes/GroupNode.svelte";
  import SectionNode from "./nodes/SectionNode.svelte";
  import CardNode from "./nodes/CardNode.svelte";
  import RowNode from "./nodes/RowNode.svelte";
  import UnknownDirectiveNode from "./nodes/UnknownDirectiveNode.svelte";

  let {
    nodes,
    context,
  }: { nodes: BlockNode[]; context: PresentationRenderContext } = $props();
</script>

<div class="flex flex-col gap-2" data-testid="presentation-renderer">
  {#each nodes as node, i (i)}
    {#if node.type === "heading"}
      <HeadingNode {node} {context} />
    {:else if node.type === "paragraph"}
      <ParagraphNode {node} {context} />
    {:else if node.type === "list"}
      <ListNode {node} {context} />
    {:else if node.type === "table"}
      <TableNode {node} {context} />
    {:else if node.type === "blockquote"}
      <BlockquoteNode {node} {context} />
    {:else if node.type === "thematic-break"}
      <hr class="border-theme-border" />
    {:else if node.type === "image"}
      <ImageNode {node} />
    {:else if node.type === "group"}
      <GroupNode {node} {context} />
    {:else if node.type === "section"}
      <SectionNode {node} {context} />
    {:else if node.type === "card"}
      <CardNode {node} {context} />
    {:else if node.type === "row"}
      <RowNode {node} {context} />
    {:else if node.type === "unknown-directive"}
      <UnknownDirectiveNode {node} />
    {/if}
  {/each}
</div>

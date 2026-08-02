<script lang="ts">
  import type { InlineNode } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "./types";
  import FieldReferenceNode from "./nodes/FieldReferenceNode.svelte";
  import MissingFieldNode from "./nodes/MissingFieldNode.svelte";
  import InlineContent from "./InlineContent.svelte";

  let {
    nodes,
    context,
  }: { nodes: InlineNode[]; context: PresentationRenderContext } = $props();
</script>

{#each nodes as node, i (i)}
  {#if node.type === "text"}
    {node.text}
  {:else if node.type === "strong"}
    <strong><InlineContent nodes={node.children} {context} /></strong>
  {:else if node.type === "em"}
    <em><InlineContent nodes={node.children} {context} /></em>
  {:else if node.type === "link"}
    <a
      href={node.href}
      target="_blank"
      rel="noopener noreferrer"
      class="text-theme-primary underline"
    >
      <InlineContent nodes={node.children} {context} />
    </a>
  {:else if node.type === "field-reference"}
    <FieldReferenceNode {node} {context} />
  {:else if node.type === "missing-field"}
    <MissingFieldNode {node} />
  {/if}
{/each}

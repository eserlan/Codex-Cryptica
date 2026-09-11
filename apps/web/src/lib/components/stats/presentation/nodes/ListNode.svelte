<script lang="ts">
  import type { ListNode as ListNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import InlineContent from "../InlineContent.svelte";

  let {
    node,
    context,
  }: { node: ListNodeType; context: PresentationRenderContext } = $props();
</script>

{#if node.ordered}
  <ol class="ml-4 list-decimal text-xs text-theme-text">
    {#each node.items as item, i (i)}
      <li><InlineContent nodes={item} {context} /></li>
    {/each}
  </ol>
{:else}
  <ul class="ml-4 list-disc text-xs text-theme-text">
    {#each node.items as item, i (i)}
      <li><InlineContent nodes={item} {context} /></li>
    {/each}
  </ul>
{/if}

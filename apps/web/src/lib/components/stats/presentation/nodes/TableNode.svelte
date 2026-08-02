<script lang="ts">
  import type { TableNode as TableNodeType } from "@codex/stat-sheet-engine";
  import type { PresentationRenderContext } from "../types";
  import InlineContent from "../InlineContent.svelte";

  let {
    node,
    context,
  }: { node: TableNodeType; context: PresentationRenderContext } = $props();
</script>

<div class="overflow-x-auto">
  <table class="w-full border-collapse text-xs text-theme-text">
    <thead>
      <tr>
        {#each node.header as cell, i (i)}
          <th
            class="border-b border-theme-border px-2 py-1 text-left font-bold text-theme-muted"
          >
            <InlineContent nodes={cell} {context} />
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each node.rows as row, ri (ri)}
        <tr>
          {#each row as cell, ci (ci)}
            <td class="border-b border-theme-border/50 px-2 py-1">
              <InlineContent nodes={cell} {context} />
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

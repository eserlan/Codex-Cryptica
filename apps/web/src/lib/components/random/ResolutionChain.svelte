<script lang="ts">
  import type { ResolutionNode } from "random-source-engine";
  import Self from "./ResolutionChain.svelte";

  /**
   * Which source produced which fragment of a composed result (#2247, SC-009).
   *
   * Shown inline under the result rather than behind a dialog: the question
   * "where did that word come from" is asked while reading the sentence, and
   * an answer a click away is an answer arriving too late.
   */
  let {
    nodes,
    path = [],
    onReroll,
  }: {
    nodes: ResolutionNode[];
    /** Index path of `nodes` within the outcome's chain. */
    path?: number[];
    onReroll?: (nodePath: number[]) => void;
  } = $props();

  const STATUS_LABEL: Record<string, string> = {
    cycle: "reference loop",
    "depth-limit": "nesting limit",
    unresolved: "not found",
  };
</script>

<ul class="flex flex-col gap-1" data-testid="resolution-chain">
  {#each nodes as node, index}
    {@const nodePath = [...path, index]}
    <li class="flex flex-col gap-1">
      <div class="flex items-start gap-2">
        <span
          class="mt-0.5 shrink-0 font-mono text-[9px] uppercase tracking-widest text-theme-muted/70"
          data-testid="chain-source"
        >
          {node.sourceName}{#if node.dieValue !== undefined}
            <span class="text-theme-primary/70"> {node.dieValue}</span>
          {/if}
        </span>
        <span class="min-w-0 flex-1 font-body text-xs text-theme-text">
          {node.text}
          {#if node.status !== "ok"}
            <span class="ml-1 font-mono text-[9px] uppercase text-amber-500">
              ({STATUS_LABEL[node.status]})
            </span>
          {/if}
        </span>
        {#if onReroll}
          <button
            type="button"
            class="shrink-0 rounded p-1 text-theme-muted transition-colors hover:text-theme-primary"
            onclick={() => onReroll(nodePath)}
            aria-label="Roll {node.sourceName} again"
            data-testid="chain-reroll"
          >
            <span aria-hidden="true" class="icon-[lucide--refresh-cw] h-3 w-3"
            ></span>
          </button>
        {/if}
      </div>

      {#if node.children.length > 0}
        <div class="ml-3 border-l border-theme-border/60 pl-3">
          <Self nodes={node.children} path={nodePath} {onReroll} />
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  @reference "../../../app.css";
</style>

<script lang="ts">
  /** What a trade is about to do, or why it cannot be done (#3963). */
  let {
    problem = "",
    resuming = false,
    summary = "",
    stockLine = "",
    accountingLine = "",
    walletActive = false,
  }: {
    problem?: string;
    /** The trade was already started; confirming finishes it. */
    resuming?: boolean;
    summary?: string;
    stockLine?: string;
    accountingLine?: string;
    walletActive?: boolean;
  } = $props();
</script>

<div
  class="mt-3 rounded border border-theme-border/40 bg-theme-bg/50 p-2"
  data-testid="trade-preview"
>
  {#if problem}
    <p class="font-bold text-amber-400" data-testid="trade-problem">
      {problem}
    </p>
  {:else if resuming}
    <p>Finishing a trade that was already started. Nothing is applied twice.</p>
  {:else}
    <p class="font-bold">{summary}</p>
    {#if stockLine}<p class="font-mono">{stockLine}</p>{/if}
    <p class={walletActive ? "font-mono" : "italic text-theme-muted"}>
      {accountingLine}
    </p>
  {/if}
</div>

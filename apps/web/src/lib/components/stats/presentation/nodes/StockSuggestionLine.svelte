<script lang="ts">
  import type { ReviewedLine } from "@codex/stat-sheet-engine";

  export interface LineChoice {
    on?: boolean;
    quantity?: string;
    price?: string;
    link?: boolean;
  }

  /** One proposed stock line in the review (#3965). */
  let {
    line,
    choice,
    onChange,
  }: {
    line: ReviewedLine;
    choice: LineChoice;
    onChange: (patch: LineChoice) => void;
  } = $props();

  const duplicate = $derived(line.status === "duplicate");
  const read = (event: Event) => event.target as HTMLInputElement;
</script>

<li
  class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-theme-border/40 px-2 py-1"
  class:opacity-60={duplicate}
  data-testid="stock-suggest-line"
>
  <label class="flex min-w-40 flex-1 items-center gap-2">
    <input
      type="checkbox"
      class="h-3.5 w-3.5 rounded border-theme-border text-theme-primary"
      checked={!duplicate && (choice.on ?? true)}
      disabled={duplicate}
      onchange={(event) => onChange({ on: read(event).checked })}
      aria-label={`Add ${line.name}`}
    />
    <span class="font-bold">{line.name}</span>
  </label>
  {#if duplicate}
    <span class="text-micro italic text-theme-muted">
      Already in this shop. Left as it is.
    </span>
  {:else}
    {#if line.stock.kind !== "service"}
      <label class="flex items-center gap-1">
        ×
        <input
          type="number"
          min="0"
          class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 font-mono"
          value={choice.quantity ?? String(line.stock.quantity ?? 0)}
          oninput={(event) => onChange({ quantity: read(event).value })}
          aria-label={`Quantity for ${line.name}`}
        />
      </label>
    {/if}
    {#if line.stock.price}
      <label class="flex items-center gap-1">
        <input
          type="number"
          min="1"
          class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 font-mono"
          value={choice.price ?? String(line.stock.price.units)}
          oninput={(event) => onChange({ price: read(event).value })}
          aria-label={`Price for ${line.name}`}
        />
        {line.stock.price.currency}
      </label>
    {/if}
    {#if line.itemMatch}
      <label class="flex items-center gap-1 text-micro">
        <input
          type="checkbox"
          class="h-3 w-3 rounded border-theme-border text-theme-primary"
          checked={choice.link ?? false}
          onchange={(event) => onChange({ link: read(event).checked })}
          data-testid="stock-suggest-link"
        />
        Link to your item "{line.itemMatch.title}"
      </label>
    {/if}
    <span class="basis-full text-micro text-theme-muted">{line.reason}</span>
  {/if}
</li>

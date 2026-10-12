<script lang="ts">
  import { formatMoney, type ReviewedLine } from "@codex/stat-sheet-engine";

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
    invalidFields,
    onChange,
  }: {
    line: ReviewedLine;
    choice: LineChoice;
    invalidFields: Array<"quantity" | "price">;
    onChange: (patch: LineChoice) => void;
  } = $props();

  const duplicate = $derived(line.status === "duplicate");
  const read = (event: Event) => event.target as HTMLInputElement;
</script>

{#snippet quantityControl()}
  {#if line.stock.kind !== "service"}
    <label class="flex items-center gap-1">
      ×
      <input
        type="number"
        min="0"
        class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 font-mono"
        value={choice.quantity ?? String(line.stock.quantity ?? 0)}
        oninput={(event) => onChange({ quantity: read(event).value })}
        aria-invalid={invalidFields.includes("quantity")}
        aria-label={`Quantity for ${line.name}`}
      />
    </label>
    {#if invalidFields.includes("quantity")}
      <span class="basis-full text-micro text-theme-primary" role="alert">
        Enter a whole number 0 or greater.
      </span>
    {/if}
  {/if}
{/snippet}

{#snippet priceControl()}
  {#if line.stock.price}
    <label class="flex items-center gap-1">
      <input
        type="number"
        min={10 ** -line.stock.price.precision}
        step={10 ** -line.stock.price.precision}
        class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 font-mono"
        value={choice.price ?? formatMoney(line.stock.price, false)}
        oninput={(event) => onChange({ price: read(event).value })}
        aria-invalid={invalidFields.includes("price")}
        aria-label={`Price for ${line.name}`}
      />
      {line.stock.price.currency}
    </label>
    {#if invalidFields.includes("price")}
      <span class="basis-full text-micro text-theme-primary" role="alert">
        Enter a valid price of at least one smallest currency unit.
      </span>
    {/if}
  {/if}
{/snippet}

{#snippet linkControl()}
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
{/snippet}

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
    {@render quantityControl()}
    {@render priceControl()}
    {@render linkControl()}
    <span class="basis-full text-micro text-theme-muted">{line.reason}</span>
  {/if}
</li>

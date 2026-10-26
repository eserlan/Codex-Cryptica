<script lang="ts">
  import type { MoneyAmount, StatSheetField } from "schema";
  import {
    applyAcceptedLines,
    deriveShopContext,
    editedStock,
    invalidLineEditFields,
    proposeStock,
    reviewProposal,
    type AcceptedLine,
    type ReviewedLine,
    type StockGenre,
  } from "@codex/stat-sheet-engine";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { gatherShopText } from "#lib/services/shop-stock-context.js";
  import type { PresentationRenderContext } from "../types";
  import StockSuggestionLine, {
    type LineChoice,
  } from "./StockSuggestionLine.svelte";

  /**
   * Suggests opening stock for a shop (#3965). It reads the shop and the
   * places it is connected to, proposes lines, and shows them for review.
   * Nothing is saved until the GM adds the lines they accept, and the
   * shop's existing rows are never changed. Works offline, with no AI.
   */
  let {
    field,
    context,
  }: {
    field: StatSheetField;
    context: PresentationRenderContext;
  } = $props();

  const LINKABLE = ["item", "weapon", "gear", "artifact", "object"];

  let open = $state(false);
  let genre = $state<StockGenre | "auto">("auto");
  let round = $state(0);
  // Per-line choices, by proposal key. Absent means the default.
  let edits = $state<Record<string, LineChoice>>({});

  const existingRows = $derived(
    (field.rows ?? []) as Record<string, unknown>[],
  );

  const resolveName = (id: string) => vault.entities[id]?.title;
  // One pass over the vault per change, not one per suggested line.
  const itemsByTitle = $derived.by(() => {
    const index = new Map<string, { id: string; title: string }>();
    for (const e of Object.values(vault.entities)) {
      const key = e.title.toLowerCase();
      if (LINKABLE.includes(e.type) && !index.has(key)) {
        index.set(key, { id: e.id, title: e.title });
      }
    }
    return index;
  });
  const findItem = (title: string) =>
    itemsByTitle.get(title.trim().toLowerCase());

  const reviewed = $derived.by<{
    lines: ReviewedLine[];
    summary: string;
    constraints: string[];
  }>(() => {
    const shop = context.entityId
      ? vault.entities[context.entityId]
      : undefined;
    const text = shop
      ? gatherShopText(shop, context.fields, (id) => vault.entities[id])
      : { shopText: "", placeText: "" };
    const ctx = deriveShopContext({
      genre: genre === "auto" ? undefined : genre,
      ...text,
    });
    const priced = existingRows
      .map((row) => (row.stock as { price?: MoneyAmount })?.price)
      .find(Boolean);
    const { currency, precision } = priced ?? {};
    const proposal = proposeStock(ctx, {
      seed: `${context.entityId}:${round}`,
      currency,
      precision,
    });
    const parts: string[] = [ctx.genre];
    if (ctx.plentiful.length)
      parts.push(`plentiful: ${ctx.plentiful.join(", ")}`);
    if (ctx.scarce.length) parts.push(`scarce: ${ctx.scarce.join(", ")}`);
    return {
      lines: reviewProposal(existingRows, proposal.lines, {
        resolveName,
        findItem,
      }),
      summary: parts.join(" · "),
      constraints: proposal.constraints,
    };
  });

  const isOn = (line: ReviewedLine) =>
    line.status === "new" && (edits[line.key]?.on ?? true);
  const accepted = $derived(reviewed.lines.filter(isOn));
  const hasInvalidEdits = $derived(
    accepted.some(
      (line) =>
        invalidLineEditFields(line.stock, edits[line.key] ?? {}).length > 0,
    ),
  );

  function setEdit(key: string, patch: LineChoice) {
    edits[key] = { ...edits[key], ...patch };
  }

  function reroll() {
    round += 1;
    edits = {};
  }

  function toAccepted(line: ReviewedLine): AcceptedLine {
    const edit = edits[line.key] ?? {};
    const linked = edit.link && line.itemMatch ? line.itemMatch.id : undefined;
    return {
      name: line.name,
      stock: editedStock(line.stock, edit),
      ...(linked ? { linkItemId: linked } : {}),
    };
  }

  function addAccepted() {
    const rows = applyAcceptedLines(existingRows, accepted.map(toAccepted), {
      resolveName,
    });
    context.onUpdateField(field.id, { rows: rows as StatSheetField["rows"] });
    open = false;
    edits = {};
  }
</script>

<div
  class="border-b border-theme-border/60 bg-theme-surface/20 px-3 py-2 text-xs text-theme-text"
  data-testid="stock-suggestions"
>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      aria-expanded={open}
      onclick={() => (open = !open)}
      data-testid="stock-suggest-toggle"
    >
      <span class="icon-[lucide--sparkles] h-3 w-3" aria-hidden="true"></span>
      Suggest stock
    </button>
  </div>

  {#if open}
    <div class="mt-2 space-y-2" data-testid="stock-suggest-panel">
      <p class="text-micro text-theme-muted">
        Starting points based on this shop and where it is. These are not
        official prices. Nothing is added until you choose.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-1.5">
          Setting
          <select
            class="rounded border border-theme-border bg-theme-bg px-1 py-0.5"
            bind:value={genre}
            onchange={() => (edits = {})}
            data-testid="stock-suggest-genre"
          >
            <option value="auto">Read from the shop</option>
            <option value="fantasy">Fantasy</option>
            <option value="sci-fi">Sci-fi</option>
            <option value="generic">Generic</option>
          </select>
        </label>
        <button
          type="button"
          class="rounded border border-theme-border/60 px-2 py-0.5 font-bold text-theme-muted hover:text-theme-primary"
          onclick={reroll}
          data-testid="stock-suggest-reroll"
        >
          Try another set
        </button>
        <span
          class="text-micro text-theme-muted"
          data-testid="stock-suggest-summary"
        >
          Using: {reviewed.summary}
        </span>
      </div>

      {#each reviewed.constraints as constraint (constraint)}
        <p class="text-micro italic text-theme-muted">{constraint}</p>
      {/each}

      <ul class="space-y-1" aria-label="Suggested stock">
        {#each reviewed.lines as line (line.key)}
          <StockSuggestionLine
            {line}
            choice={edits[line.key] ?? {}}
            invalidFields={invalidLineEditFields(
              line.stock,
              edits[line.key] ?? {},
            )}
            onChange={(patch) => setEdit(line.key, patch)}
          />
        {/each}
      </ul>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border border-theme-primary bg-theme-primary/10 px-2 py-0.5 font-bold text-theme-primary disabled:opacity-40"
          disabled={accepted.length === 0 || hasInvalidEdits}
          onclick={addAccepted}
          data-testid="stock-suggest-add"
        >
          Add {accepted.length} to stock
        </button>
        <button
          type="button"
          class="rounded border border-theme-border/60 px-2 py-0.5 text-theme-muted"
          onclick={() => (open = false)}
          data-testid="stock-suggest-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>

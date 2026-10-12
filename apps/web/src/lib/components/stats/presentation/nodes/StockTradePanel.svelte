<script lang="ts">
  import type { StatSheetField } from "schema";
  import {
    findWalletField,
    formatMoney,
    parseMoney,
    planTrade,
    planWalletChange,
    walletKeyFor,
    type TradeKind,
  } from "@codex/stat-sheet-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import TradePreview from "./TradePreview.svelte";
  import { merchantTradeService } from "$lib/services/merchant-trade-instance";
  import type {
    MerchantTradeService,
    TradeOutcome,
  } from "$lib/services/merchant-trade";

  let {
    shopId,
    field,
    row,
    name,
    service = merchantTradeService,
    onClose,
    onDone = () => {},
  }: {
    shopId: string;
    field: StatSheetField;
    row: Record<string, any>;
    /** The line's display name. */
    name: string;
    service?: Pick<MerchantTradeService, "execute">;
    onClose: () => void;
    onDone?: (outcome: TradeOutcome) => void;
  } = $props();

  // One id per opened panel. A retry after a failure reuses it, which is what
  // lets the service finish a half-done trade without applying it twice.
  // svelte-ignore state_referenced_locally
  const tradeId = `trade-${globalThis.crypto.randomUUID()}`;

  // svelte-ignore state_referenced_locally
  const linePrice = row.stock?.price as
    { units: number; currency: string; precision: number } | undefined;

  // The form fields start from the line as it was when the panel opened and
  // are then the operator's own edits, so they are deliberately local copies.
  let kind = $state<TradeKind>("purchase");
  let quantityText = $state<string | number | null>(1);
  let priceText = $state(linePrice ? formatMoney(linePrice, false) : "");
  let unit = $state(linePrice?.currency ?? "gp");
  let counterpartyId = $state("");
  let useWallet = $state(false);
  let busy = $state(false);
  let outcome = $state<TradeOutcome | null>(null);

  const isTracked = $derived((row.stock?.kind ?? "item") === "item");

  const characters = $derived(
    vault.allEntities
      .filter((entity) => entity.type?.toLowerCase() === "character")
      .map((entity) => ({ id: entity.id, title: entity.title })),
  );
  const counterparty = $derived(
    counterpartyId ? vault.entities[counterpartyId] : undefined,
  );

  const parsedPrice = $derived.by(() => {
    const text = priceText.trim();
    if (!text) return undefined;
    const precision = Math.min(6, (text.split(".")[1] ?? "").length);
    return parseMoney(text, unit, precision) ?? null;
  });
  const priceInvalid = $derived(parsedPrice === null);

  const walletField = $derived(
    counterparty?.statSheet
      ? findWalletField(counterparty.statSheet.fields, unit)
      : undefined,
  );
  const walletActive = $derived(useWallet && !!counterpartyId && !!walletField);

  const command = $derived({
    tradeId,
    kind,
    rowId: String(row.rowId ?? ""),
    quantity: Number(quantityText ?? 0),
    unitPrice: parsedPrice ?? undefined,
    accounting: walletActive ? ("wallet" as const) : ("record-only" as const),
    counterpartyId: counterpartyId || undefined,
  });

  const preview = $derived(
    planTrade(
      {
        rows: field.rows ?? [],
        tradeLog: field.tradeLog,
        now: "",
        itemName: () => name,
      },
      command,
    ),
  );

  const walletPlan = $derived(
    walletActive && counterparty?.statSheet && preview.ok
      ? planWalletChange(counterparty.statSheet.fields, kind, preview.record)
      : null,
  );

  const problem = $derived.by(() => {
    if (priceInvalid)
      return "Enter the price as digits, for example 12 or 2.5.";
    if (!preview.ok) return preview.message;
    if (walletPlan && !walletPlan.ok) return walletPlan.message;
    return "";
  });

  const stockLine = $derived.by(() => {
    if (!preview.ok || preview.duplicate || !isTracked) return "";
    const before = Number(row.stock?.quantity ?? 0);
    const after = Number(
      (preview.nextRows.find((r) => r.rowId === row.rowId) as any)?.stock
        ?.quantity ?? before,
    );
    return `Stock: ${before} → ${after}`;
  });

  const summary = $derived.by(() => {
    if (!preview.ok) return "";
    const { record } = preview;
    const what = record.quantity > 1 ? `${record.quantity}× ${name}` : name;
    const total = formatMoney(record.total);
    return record.kind === "purchase"
      ? `Customer buys ${what} for ${total}.`
      : `Shop buys ${what} for ${total}.`;
  });

  const accountingLine = $derived.by(() => {
    if (walletPlan?.ok && counterparty) {
      return `${counterparty.title}: ${walletPlan.balanceBefore} → ${walletPlan.balanceAfter} ${unit}`;
    }
    return "Record only. No funds will be moved.";
  });

  const canConfirm = $derived(!busy && !problem && preview.ok);

  const resuming = $derived(preview.ok && preview.duplicate);
  const failure = $derived(
    outcome && outcome.status !== "done" ? outcome : null,
  );
  const confirmLabel = $derived(
    busy
      ? "Recording…"
      : outcome?.status === "needs-recovery"
        ? "Finish trade"
        : "Confirm trade",
  );

  async function confirm() {
    // The guard also stops a second click while the first is still saving.
    if (busy || !canConfirm) return;
    busy = true;
    outcome = null;
    try {
      const result = await service.execute({
        shopId,
        fieldId: field.id,
        command,
      });
      outcome = result;
      if (result.status === "done") {
        onDone(result);
        onClose();
      }
    } finally {
      busy = false;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }
</script>

<!-- Escape cancels from any control inside; the controls themselves are the focusable, interactive parts. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  role="group"
  aria-label={`Trade ${name}`}
  data-testid="stock-trade-panel"
  tabindex="-1"
  class="mt-2 w-full rounded-lg border border-theme-primary/40 bg-theme-surface/40 p-3 text-xs text-theme-text"
  onkeydown={onKeydown}
>
  <div class="flex flex-wrap items-end gap-3">
    <label class="flex flex-col gap-0.5 text-micro text-theme-muted">
      Trade
      <select
        class="rounded border border-theme-border/60 bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
        bind:value={kind}
        data-testid="trade-kind"
      >
        <option value="purchase">Customer buys from the shop</option>
        <option value="sell" disabled={!isTracked}>
          Customer sells to the shop
        </option>
      </select>
    </label>

    {#if isTracked}
      <label class="flex flex-col gap-0.5 text-micro text-theme-muted">
        Quantity
        <input
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          class="w-16 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text"
          bind:value={quantityText}
          data-testid="trade-quantity"
        />
      </label>
    {/if}

    <div class="flex flex-col gap-0.5 text-micro text-theme-muted">
      <label for={`trade-price-${tradeId}`}>Price each</label>
      <div class="inline-flex items-center gap-0.5">
        <input
          id={`trade-price-${tradeId}`}
          type="text"
          inputmode="decimal"
          class="w-16 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text"
          bind:value={priceText}
          data-testid="trade-price"
        />
        <input
          type="text"
          aria-label="Price unit"
          class="w-12 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center text-xs text-theme-text"
          bind:value={unit}
          data-testid="trade-unit"
        />
      </div>
    </div>

    <label class="flex flex-col gap-0.5 text-micro text-theme-muted">
      Who is trading (optional)
      <select
        class="min-w-[9rem] rounded border border-theme-border/60 bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
        bind:value={counterpartyId}
        data-testid="trade-counterparty"
      >
        <option value="">No one (record only)</option>
        {#each characters as character (character.id)}
          <option value={character.id}>{character.title}</option>
        {/each}
      </select>
    </label>
  </div>

  {#if counterpartyId}
    {#if walletField}
      <label class="mt-2 flex items-center gap-2 text-theme-text">
        <input
          type="checkbox"
          class="h-3.5 w-3.5 rounded border-theme-border text-theme-primary"
          bind:checked={useWallet}
          data-testid="trade-use-wallet"
        />
        Also update {counterparty?.title}'s {unit} wallet
      </label>
    {:else}
      <p class="mt-2 italic text-theme-muted" data-testid="trade-no-wallet">
        {counterparty?.title ?? "That character"} has no
        <code>{walletKeyFor(unit) || "wallet"}</code> number field, so this will be
        record only.
      </p>
    {/if}
  {/if}

  <TradePreview
    {problem}
    {resuming}
    {summary}
    {stockLine}
    {accountingLine}
    {walletActive}
  />

  <p class="sr-only" role="status" aria-live="polite">
    {failure?.message ?? ""}
  </p>
  {#if failure}
    <p
      class="mt-2 font-bold text-amber-400"
      data-testid="trade-outcome"
      data-status={failure.status}
    >
      {failure.message}
    </p>
  {/if}

  <div class="mt-3 flex items-center justify-end gap-2">
    <button
      type="button"
      class="rounded border border-theme-border/60 bg-theme-surface/40 px-3 py-1 font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      onclick={onClose}
      data-testid="trade-cancel"
    >
      Cancel
    </button>
    <button
      type="button"
      class="rounded border border-theme-primary bg-theme-primary/15 px-3 py-1 font-bold text-theme-primary transition-colors hover:bg-theme-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!canConfirm}
      aria-busy={busy}
      onclick={confirm}
      data-testid="trade-confirm"
    >
      {confirmLabel}
    </button>
  </div>
</div>

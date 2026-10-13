<script lang="ts">
  import type { MarketChange, StatSheetField, StockAvailability } from "schema";
  import {
    PRESSURE_PRESETS,
    appendChange,
    applyPlan,
    effectProblem,
    planPressure,
    revertChange,
    rowsMatching,
    standingPressure,
    type PressureEffect,
    type PressurePreset,
    type RevertConflict,
  } from "@codex/stat-sheet-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import {
    systemClock,
    systemIdGenerator,
    type Clock,
    type IdGenerator,
  } from "$lib/utils/runtime-deps";
  import type { PresentationRenderContext } from "../types";
  import MarketHistory from "./MarketHistory.svelte";
  import MarketPressureDiff from "./MarketPressureDiff.svelte";

  /**
   * Optional market pressure for a shop (#3966): a shortage, glut, embargo,
   * festival or restock, applied to chosen stock lines after the GM reviews
   * the diff. Off until opened, and nothing changes until Apply. Every applied
   * change can be undone without disturbing prices the GM has set since.
   */
  let {
    field,
    context,
    idGenerator = systemIdGenerator,
    clock = systemClock,
  }: {
    field: StatSheetField;
    context: PresentationRenderContext;
    idGenerator?: IdGenerator;
    clock?: Clock;
  } = $props();

  let open = $state(false);
  let kind = $state<PressurePreset["kind"]>("shortage");
  let label = $state("");
  let reason = $state("");
  let appliesTo = $state("");
  let percent = $state<string | number | null>("50");
  let quantityMode = $state<"none" | "percent" | "add">("percent");
  let quantityValue = $state<string | number | null>("34");
  let availability = $state<"" | StockAvailability>("");
  let chosen = $state<Record<string, boolean>>({});
  let conflicts = $state<RevertConflict[]>([]);

  const rows = $derived((field.rows ?? []) as Record<string, unknown>[]);
  const history = $derived((field.marketHistory ?? []) as MarketChange[]);
  const resolveName = (id: string) => vault.entities[id]?.title;
  const preset = $derived(PRESSURE_PRESETS.find((p) => p.kind === kind)!);

  // Number inputs bind to a number (or null when empty), not to text.
  const whole = (input: unknown): number | undefined => {
    if (input === "" || input === null || input === undefined) return undefined;
    const value = Number(input);
    return Number.isFinite(value) ? value : undefined;
  };

  const effect = $derived.by<PressureEffect>(() => {
    const out: PressureEffect = {};
    const price = whole(percent);
    if (price !== undefined) out.pricePercent = price;
    const amount = whole(quantityValue);
    if (quantityMode !== "none" && amount !== undefined) {
      out.quantity = { mode: quantityMode, value: amount };
    }
    if (availability) out.availability = availability;
    return out;
  });

  const problem = $derived(effectProblem(effect));
  const plan = $derived(
    problem
      ? []
      : planPressure(rows, effect, {
          rowIds: rowsMatching(rows, appliesTo, resolveName),
          resolveName,
        }),
  );
  const isOn = (rowId: string) => chosen[rowId] ?? true;
  const selected = $derived(
    plan.filter((row) => !row.skipped && isOn(row.rowId)),
  );
  const standing = $derived(standingPressure(rows, history));

  function choosePreset(next: PressurePreset["kind"]) {
    kind = next;
    const e = PRESSURE_PRESETS.find((p) => p.kind === next)!.effect;
    percent = e.pricePercent ?? "";
    quantityMode = e.quantity?.mode ?? "none";
    quantityValue = e.quantity?.value ?? "";
    availability = e.availability ?? "";
    chosen = {};
  }

  function apply() {
    if (problem || selected.length === 0) return;
    const text = label.trim() || preset.label;
    const result = applyPlan(rows, selected, {
      id: `market-${idGenerator.uuid()}`,
      label: text,
      reason: reason.trim() || preset.description,
      cause: { kind: "gm" },
      at: new Date(clock.now()).toISOString(),
    });
    if (!result) return;
    context.onUpdateField(field.id, {
      rows: result.rows as StatSheetField["rows"],
      marketHistory: appendChange(history, result.change),
    });
    conflicts = [];
    chosen = {};
  }

  function undo(changeId: string) {
    const result = revertChange(rows, history, changeId);
    conflicts = result.conflicts;
    context.onUpdateField(field.id, {
      rows: result.rows as StatSheetField["rows"],
      marketHistory: result.history,
    });
  }
</script>

<div
  class="border-b border-theme-border/60 bg-theme-surface/20 px-3 py-2 text-xs text-theme-text"
  data-testid="market-pressure"
>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
    aria-expanded={open}
    onclick={() => (open = !open)}
    data-testid="market-toggle"
  >
    <span class="icon-[lucide--trending-up] h-3 w-3" aria-hidden="true"></span>
    Market pressure
  </button>

  {#if open}
    <div class="mt-2 space-y-2" data-testid="market-panel">
      <p class="text-micro text-theme-muted">
        Optional. Change prices and stock for several lines at once, such as a
        shortage or a restock. You review the changes first, and can undo them.
      </p>
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-0.5">
          Kind
          <select
            class="rounded border border-theme-border bg-theme-bg px-1 py-0.5"
            value={kind}
            onchange={(e) =>
              choosePreset(
                (e.target as HTMLSelectElement).value as PressurePreset["kind"],
              )}
            data-testid="market-kind"
          >
            {#each PRESSURE_PRESETS as p (p.kind)}
              <option value={p.kind}>{p.label}</option>
            {/each}
          </select>
        </label>
        <label class="flex flex-col gap-0.5">
          Applies to lines containing
          <input
            class="rounded border border-theme-border bg-theme-bg px-1 py-0.5"
            placeholder="all lines"
            bind:value={appliesTo}
            oninput={() => (chosen = {})}
            data-testid="market-applies-to"
          />
        </label>
        <label class="flex flex-col gap-0.5">
          Price %
          <input
            type="number"
            class="w-20 rounded border border-theme-border bg-theme-bg px-1 py-0.5 font-mono"
            bind:value={percent}
            data-testid="market-percent"
          />
        </label>
        <label class="flex flex-col gap-0.5">
          Quantity
          <span class="flex gap-1">
            <select
              class="rounded border border-theme-border bg-theme-bg px-1 py-0.5"
              bind:value={quantityMode}
              aria-label="How quantity changes"
            >
              <option value="none">Unchanged</option>
              <option value="percent">To % of now</option>
              <option value="add">Add</option>
            </select>
            <input
              type="number"
              class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 font-mono"
              bind:value={quantityValue}
              disabled={quantityMode === "none"}
              aria-label="Quantity amount"
            />
          </span>
        </label>
        <label class="flex flex-col gap-0.5">
          Status
          <select
            class="rounded border border-theme-border bg-theme-bg px-1 py-0.5"
            bind:value={availability}
            aria-label="Availability to set"
          >
            <option value="">Unchanged</option>
            <option value="sold-out">Sold out</option>
            <option value="reserved">Reserved</option>
            <option value="available">Available</option>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap gap-3">
        <label class="flex min-w-40 flex-1 flex-col gap-0.5">
          Name this change
          <input
            class="rounded border border-theme-border bg-theme-bg px-1 py-0.5"
            placeholder={preset.label}
            bind:value={label}
            data-testid="market-label"
          />
        </label>
        <label class="flex min-w-48 flex-[2] flex-col gap-0.5">
          Why
          <input
            class="rounded border border-theme-border bg-theme-bg px-1 py-0.5"
            placeholder={preset.description}
            bind:value={reason}
            data-testid="market-reason"
          />
        </label>
      </div>

      {#if problem}
        <p class="text-micro text-theme-error" role="alert">{problem}</p>
      {:else}
        <MarketPressureDiff
          {plan}
          {chosen}
          onToggle={(rowId, on) => (chosen = { ...chosen, [rowId]: on })}
        />
      {/if}

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border border-theme-primary bg-theme-primary/10 px-2 py-0.5 font-bold text-theme-primary disabled:opacity-40"
          disabled={!!problem || selected.length === 0}
          onclick={apply}
          data-testid="market-apply"
        >
          Apply to {selected.length}
          {selected.length === 1 ? "line" : "lines"}
        </button>
        <button
          type="button"
          class="rounded border border-theme-border/60 px-2 py-0.5 text-theme-muted"
          onclick={() => (open = false)}
          data-testid="market-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <MarketHistory {standing} {history} {conflicts} onUndo={undo} />
</div>

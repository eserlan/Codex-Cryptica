<script lang="ts">
  import type { RandomSource, RollOutcome } from "random-source-engine";
  import { randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import {
    diceHistory,
    type DiceHistoryStore,
  } from "$lib/stores/dice-history.svelte";
  import { fade } from "svelte/transition";

  /**
   * Rolls one table and shows the result, the die value behind it, and a way to
   * roll again without leaving the editor (SC-010).
   *
   * The store and history are injected with production defaults so the
   * component can be driven by fakes in a test (Constitution VIII).
   */
  let {
    source,
    sources = randomSources,
    history = diceHistory,
  }: {
    source: RandomSource;
    sources?: RandomSourceStore;
    history?: DiceHistoryStore;
  } = $props();

  let outcome = $state<RollOutcome | undefined>();

  const dieValue = $derived(outcome?.chain[0]?.dieValue);

  /**
   * The die a value was read off. Ranged tables carry their own; a weighted
   * table's range is the sum of its weights, which is what the engine picks
   * across.
   */
  const dieSides = $derived.by(() => {
    if (source.selection?.mode === "ranged") return source.selection.die.sides;
    return (source.entries ?? []).reduce((sum, e) => sum + (e.weight ?? 1), 0);
  });

  const hasEntries = $derived((source.entries ?? []).length > 0);

  async function roll() {
    const result = sources.roll(source);
    outcome = result;
    await record(result);
  }

  /** Writes the roll into the shared roll history (FR-018). */
  async function record(result: RollOutcome) {
    const value = result.chain[0]?.dieValue;
    await history.addResult(
      {
        total: value ?? 0,
        parts:
          value === undefined
            ? []
            : [{ type: "dice", sides: dieSides, rolls: [value], value }],
        formula: `d${dieSides}`,
        timestamp: Date.now(),
      },
      "table",
      {
        label: source.name,
        source: {
          sourceId: source.id,
          sourceName: source.name,
          kind: source.kind,
          finalText: result.finalText,
          chain: result.chain,
        },
      },
    );
  }
</script>

<div
  class="flex flex-col gap-3 rounded-xl border border-theme-border bg-theme-surface p-4"
  data-testid="table-roller"
>
  <div class="flex items-center justify-between gap-3">
    <h3
      class="text-[10px] font-bold font-header uppercase tracking-[0.2em] text-theme-muted"
    >
      Roll
    </h3>
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg border border-theme-primary/30 bg-theme-primary/10 px-3 py-1.5 text-[10px] font-bold font-header uppercase tracking-widest text-theme-primary transition-all hover:bg-theme-primary hover:text-theme-bg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      onclick={roll}
      disabled={!hasEntries}
      data-testid="roll-table"
    >
      <span aria-hidden="true" class="icon-[lucide--dices] h-3.5 w-3.5"></span>
      {outcome ? "Roll again" : "Roll"}
    </button>
  </div>

  {#if !hasEntries}
    <p class="text-xs text-theme-muted/70 font-body italic">
      Add an entry and this table can be rolled.
    </p>
  {:else if outcome}
    <div class="flex items-start gap-4" in:fade={{ duration: 150 }}>
      <div
        class="flex min-w-[3.5rem] flex-col items-center justify-center border-r border-theme-border/30 py-1 pr-4"
      >
        <span
          class="text-3xl font-black font-header leading-none tabular-nums text-theme-primary"
          data-testid="roll-die-value"
        >
          {dieValue ?? "—"}
        </span>
        <span
          class="mt-1.5 text-[8px] font-bold uppercase tracking-tighter text-theme-muted"
        >
          d{dieSides}
        </span>
      </div>
      <p
        class="flex-1 whitespace-pre-wrap font-body text-sm leading-relaxed text-theme-text"
        data-testid="roll-result"
      >
        {outcome.finalText}
      </p>
    </div>

    {#each outcome.notices as notice}
      <p
        class="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-body text-xs text-amber-600 dark:text-amber-400"
        data-testid="roll-notice"
      >
        {notice.message}
      </p>
    {/each}
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>

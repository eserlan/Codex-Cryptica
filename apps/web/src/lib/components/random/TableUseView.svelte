<script lang="ts">
  import type { RandomSource } from "random-source-engine";
  import SourceHeading from "./SourceHeading.svelte";
  import TableRoller from "./TableRoller.svelte";
  import { randomSources } from "$lib/features/random";
  import type { RandomSourceStore } from "$lib/stores/random-source-store.svelte";
  import {
    diceHistory,
    type DiceHistoryStore,
  } from "$lib/stores/dice-history.svelte";
  import { mapSession } from "$lib/stores/map-session.svelte";
  import { systemClock, type Clock } from "$lib/utils/runtime-deps";

  /**
   * A table as it is used at the table, rather than as it is written
   * (issue 2258).
   *
   * Everything that changes the table lives in Build. What is left is the roll,
   * the result, and — folded away — the table itself, because mid-session the
   * question is usually "what did I get", and only sometimes "what could I
   * have got".
   */
  let {
    source,
    sources = randomSources,
    history = diceHistory,
    session = mapSession,
    addToChat,
    copyText,
    clock = systemClock,
  }: {
    source: RandomSource;
    sources?: RandomSourceStore;
    history?: DiceHistoryStore;
    session?: typeof mapSession;
    addToChat?: (text: string) => Promise<void>;
    copyText?: (text: string) => Promise<void>;
    clock?: Clock;
  } = $props();

  const entries = $derived(source.entries ?? []);
  const isRanged = $derived(source.selection?.mode === "ranged");

  const totalWeight = $derived(
    entries.reduce((sum, e) => sum + (e.weight ?? 1), 0),
  );

  /** What each entry answers to: its die numbers, or its share of the picks. */
  function odds(entry: (typeof entries)[number]): string {
    if (isRanged) {
      const min = entry.range?.min ?? 1;
      const max = entry.range?.max ?? min;
      return min === max ? `${min}` : `${min}–${max}`;
    }
    const weight = entry.weight ?? 1;
    return weight === 1 ? "1" : `×${weight}`;
  }
</script>

<div class="flex flex-col gap-4" data-testid="table-use-view">
  <SourceHeading {source} />

  <TableRoller
    {source}
    {sources}
    {history}
    {session}
    {...addToChat ? { addToChat } : {}}
    {...copyText ? { copyText } : {}}
    {clock}
  />

  {#if entries.length > 0}
    <details
      class="rounded border border-theme-border"
      data-testid="table-peek"
    >
      <summary
        class="cursor-pointer select-none px-3 py-2 font-header text-[10px] uppercase tracking-widest text-theme-muted transition-colors hover:text-theme-text"
      >
        Show the table ({entries.length})
      </summary>
      <ul class="max-h-[24rem] overflow-y-auto border-t border-theme-border">
        {#each entries as entry (entry.id)}
          <li
            class="flex gap-3 border-b border-theme-border/40 px-3 py-1.5 last:border-b-0"
            data-testid="peek-entry"
          >
            <span
              class="w-14 shrink-0 text-right font-mono text-[10px] text-theme-muted/70"
            >
              {odds(entry)}
            </span>
            <span class="min-w-0 flex-1 font-body text-sm text-theme-text">
              {entry.text}
            </span>
          </li>
        {/each}
      </ul>
      {#if !isRanged}
        <p
          class="border-t border-theme-border/40 px-3 py-1.5 font-mono text-[10px] text-theme-muted/70"
        >
          {totalWeight} in the pool
        </p>
      {/if}
    </details>
  {/if}
</div>

<style>
  @reference "../../../app.css";
</style>

<script lang="ts">
  import type { MarketChange } from "schema";
  import type {
    RevertConflict,
    StandingPressure,
  } from "@codex/stat-sheet-engine";
  import MarketStanding from "./MarketStanding.svelte";

  /** What is under market pressure now, and the changes that can be undone. */
  let {
    standing,
    history,
    conflicts,
    onUndo,
  }: {
    standing: StandingPressure[];
    history: MarketChange[];
    conflicts: RevertConflict[];
    onUndo: (changeId: string) => void;
  } = $props();

  const recent = $derived([...history].reverse());
  const statusText = (change: MarketChange) =>
    change.status === "reverted" ? " · undone" : "";
  const causeText = (change: MarketChange) =>
    change.cause.kind === "signal"
      ? `from ${change.cause.source ?? "a signal"}`
      : "by you";
</script>

<MarketStanding {standing} />

{#if conflicts.length > 0}
  <p
    class="text-micro text-theme-error"
    role="status"
    data-testid="market-conflicts"
  >
    Kept as they are because they changed since:
    {conflicts.map((c) => `${c.name} (${c.kept.join(", ")})`).join("; ")}.
  </p>
{/if}

{#if recent.length > 0}
  <section aria-label="Market change history" data-testid="market-history">
    <p class="text-micro font-bold text-theme-muted">Changes</p>
    <ul class="space-y-0.5">
      {#each recent as change (change.id)}
        <li
          class="flex flex-wrap items-center gap-x-2 text-xs"
          data-testid="market-history-row"
        >
          <span class="font-bold">{change.label}</span>
          <span class="text-theme-muted">
            {causeText(change)} · {change.rows.length} lines{statusText(change)}
          </span>
          {#if change.status === "applied"}
            <button
              type="button"
              class="rounded border border-theme-border/60 px-1.5 py-0.5 text-micro font-bold text-theme-muted hover:text-theme-primary"
              onclick={() => onUndo(change.id)}
              aria-label={`Undo ${change.label}`}
            >
              Undo
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

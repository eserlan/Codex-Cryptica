<script lang="ts">
  import { randomSources } from "$lib/features/random";
  import { recordTableRoll, tableDie } from "$lib/services/record-table-roll";
  import { diceHistory } from "$lib/stores/dice-history.svelte";
  import { soloTablePins } from "$lib/stores/solo-session-instance";
  import { systemClock } from "$lib/utils/runtime-deps";
  import type { RandomSource } from "random-source-engine";
  import SoloMenu from "./SoloMenu.svelte";

  let result = $state<string | null>(null);
  let note = $state<string | null>(null);

  const tables = $derived(randomSources.tables);
  const pinned = $derived(
    soloTablePins.pins
      .map((id) => tables.find((table) => table.id === id))
      .filter((table): table is RandomSource => table !== undefined),
  );
  const full = $derived(soloTablePins.pins.length >= 3);

  /** Rolls inline: the result shows in the bar and is recorded like any table roll. */
  async function roll(source: RandomSource) {
    result = null;
    note = null;
    if (!source.entries?.length) {
      note = `${source.name} has no entries yet.`;
      return;
    }
    const outcome = randomSources.roll(source);
    // The player sees the result even if the roll history cannot take it.
    result = `${source.name}: ${outcome.finalText}`;
    const die = tableDie(source);
    try {
      await recordTableRoll(diceHistory, {
        source,
        outcome,
        dieSides: die.sides,
        dieLabel: die.label,
        clock: systemClock,
      });
    } catch (error) {
      console.error("[SoloPinnedTables] Could not record table roll", error);
      note = "The roll could not be saved to the roll history.";
    }
  }
</script>

<div class="flex flex-wrap items-center gap-1.5">
  {#each pinned as table (table.id)}
    <span
      class="inline-flex items-center rounded-md border border-theme-border"
    >
      <button
        type="button"
        class="px-2 py-1 text-sm text-theme-text hover:text-theme-primary"
        data-testid="solo-pinned-table"
        aria-label={`Roll ${table.name}`}
        onclick={() => roll(table)}
      >
        {table.name}
      </button>
      <button
        type="button"
        class="px-1.5 py-1 text-xs text-theme-muted hover:text-theme-danger"
        data-testid="solo-unpin-table"
        aria-label={`Unpin ${table.name}`}
        onclick={() => soloTablePins.unpin(table.id)}
      >
        ×
      </button>
    </span>
  {/each}

  <SoloMenu
    label="Pin a table"
    testId="solo-pin-table"
    helpTarget="solo-pinned-tables"
  >
    <div data-testid="solo-pin-table-list" class="flex w-64 flex-col gap-1">
      {#if tables.length === 0}
        <p class="text-sm text-theme-muted">
          Create a random table in the Tables screen to pin it here.
        </p>
      {:else if full}
        <p class="text-sm text-theme-muted">
          You've already pinned three tables. Unpin one to add another.
        </p>
      {:else}
        <ul class="flex flex-col gap-1" role="menu">
          {#each tables as table (table.id)}
            <li>
              <button
                type="button"
                role="menuitem"
                class="w-full rounded-md px-3 py-1.5 text-left text-sm text-theme-text hover:bg-theme-primary/10 disabled:opacity-50"
                disabled={soloTablePins.pins.includes(table.id)}
                onclick={() => soloTablePins.pin(table.id)}
              >
                {table.name}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </SoloMenu>
</div>

{#if result}
  <p
    class="text-sm font-bold text-theme-primary"
    data-testid="solo-table-result"
    aria-live="polite"
  >
    {result}
  </p>
{/if}
{#if note}
  <p class="text-sm text-theme-muted" data-testid="solo-table-note">{note}</p>
{/if}

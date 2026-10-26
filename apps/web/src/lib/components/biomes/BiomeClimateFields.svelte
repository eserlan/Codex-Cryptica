<script lang="ts">
  import { untrack } from "svelte";
  import type { BiomeExplorerStore } from "#lib/stores/biome-explorer.svelte.js";

  let {
    store,
    referenceSummary,
    changed,
  }: {
    store: BiomeExplorerStore;
    referenceSummary: string;
    changed: boolean;
  } = $props();

  type RangeKey = "temperature" | "precipitation";

  const RANGES: { key: RangeKey; name: string; unit: string }[] = [
    { key: "temperature", name: "Temperature", unit: "°C" },
    { key: "precipitation", name: "Rainfall and snow", unit: "mm per year" },
  ];

  // The boxes start from what is already saved, so reopening a biome shows it.
  const text = (value: number | undefined) =>
    value === undefined ? "" : String(value);
  let inputs = $state<Record<RangeKey, { low: string; high: string }>>(
    untrack(() => {
      const start = store.draft?.profile.own.climate;
      return {
        temperature: {
          low: text(start?.temperature?.low),
          high: text(start?.temperature?.high),
        },
        precipitation: {
          low: text(start?.precipitation?.low),
          high: text(start?.precipitation?.high),
        },
      };
    }),
  );

  // A range is only stored once both ends are numbers.
  function setEnd(
    key: RangeKey,
    unit: string,
    end: "low" | "high",
    value: string,
  ) {
    inputs[key][end] = value;
    const low = Number.parseFloat(inputs[key].low);
    const high = Number.parseFloat(inputs[key].high);
    const valid = Number.isFinite(low) && Number.isFinite(high) && low <= high;
    store.editClimate({ [key]: valid ? { low, high, unit } : undefined });
  }
</script>

<fieldset class="flex flex-col gap-3 rounded-xl border border-theme-border p-4">
  <legend class="px-1 text-theme-text">Climate</legend>
  <div class="grid gap-4 md:grid-cols-2">
    <div class="min-w-0 break-words text-sm text-theme-muted">
      <p class="mb-1 text-xs uppercase tracking-wide">Reference</p>
      <p>{referenceSummary || "No reference values."}</p>
    </div>
    <div class="flex min-w-0 flex-col gap-3">
      {#each RANGES as { key, name, unit } (key)}
        <div class="grid grid-cols-2 gap-2">
          {#each [["low", "lowest"], ["high", "highest"]] as [end, word] (end)}
            <label class="flex flex-col gap-1 text-sm text-theme-muted">
              <span>{name}, {word}</span>
              <input
                type="number"
                aria-label="{name}, {word}"
                value={inputs[key][end as "low" | "high"]}
                class="rounded border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
                oninput={(e) =>
                  setEnd(
                    key,
                    unit,
                    end as "low" | "high",
                    e.currentTarget.value,
                  )}
              />
              <span class="text-xs">{unit}</span>
            </label>
          {/each}
        </div>
      {/each}
      <label class="flex flex-col gap-1 text-sm text-theme-muted">
        <span>Seasons: my version</span>
        <textarea
          rows="3"
          maxlength="4000"
          aria-label="Seasons: my version"
          value={store.draft?.profile.own.climate.seasonality ?? ""}
          oninput={(e) =>
            store.editClimate({ seasonality: e.currentTarget.value })}
          class="w-full break-words rounded border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
        ></textarea>
      </label>
      {#if changed}
        <p class="text-xs text-theme-primary">Changed from reference</p>
      {/if}
    </div>
  </div>
</fieldset>

<script lang="ts">
  import { formatRange, type BiomeConditions, type Range } from "biome-engine";

  let { conditions }: { conditions: BiomeConditions } = $props();

  const ranges: { label: string; range?: Range; always: boolean }[] = $derived([
    {
      label: "Temperature (yearly average)",
      range: conditions.temperature,
      always: true,
    },
    {
      label: "Rainfall and snow",
      range: conditions.precipitation,
      always: true,
    },
    {
      label: "Height above sea level",
      range: conditions.elevation,
      always: false,
    },
  ]);
</script>

<dl class="m-0 grid gap-2">
  {#each ranges.filter((r) => r.range || r.always) as { label, range } (label)}
    <div>
      <dt class="text-xs uppercase tracking-wide text-theme-muted">{label}</dt>
      <dd class="m-0">
        {#if range}
          <span>{formatRange(range)}</span>
          {#if range.note}
            <span class="block text-xs text-theme-muted">{range.note}</span>
          {/if}
        {:else}
          Not a fixed value
        {/if}
      </dd>
    </div>
  {/each}
</dl>

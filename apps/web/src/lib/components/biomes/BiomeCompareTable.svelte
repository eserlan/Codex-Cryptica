<script lang="ts">
  import type { ComparisonRow } from "biome-engine";
  import BiomeCompareCell from "./BiomeCompareCell.svelte";

  let {
    biomes,
    rows,
  }: {
    biomes: { id: string; name: string }[];
    rows: ComparisonRow[];
  } = $props();
</script>

<div class="hidden overflow-x-auto md:block">
  <table
    class="w-full border-collapse text-left text-sm"
    aria-label="Comparison of {biomes.map((b) => b.name).join(' and ')}"
  >
    <thead>
      <tr>
        <th scope="col" class="p-2 text-xs uppercase text-theme-muted"
          >Attribute</th
        >
        {#each biomes as biome (biome.id)}
          <th scope="col" class="p-2 font-header text-theme-text"
            >{biome.name}</th
          >
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr class="border-t border-theme-border align-top">
          <th scope="row" class="p-2 font-normal text-theme-muted"
            >{row.label}</th
          >
          {#each row.cells as value, index (index)}
            <td class="p-2 text-theme-text"><BiomeCompareCell {value} /></td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="flex flex-col gap-4 md:hidden" data-testid="biome-compare-stacked">
  {#each rows as row (row.id)}
    <section class="rounded-lg border border-theme-border bg-theme-surface p-3">
      <h3 class="mb-2 text-xs uppercase tracking-wide text-theme-muted">
        {row.label}
      </h3>
      <dl class="m-0 flex flex-col gap-2 text-sm text-theme-text">
        {#each row.cells as value, index (index)}
          <div>
            <dt class="font-header">{biomes[index].name}</dt>
            <dd class="m-0"><BiomeCompareCell {value} /></dd>
          </div>
        {/each}
      </dl>
    </section>
  {/each}
</div>

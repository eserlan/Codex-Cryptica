<script lang="ts">
  import type { BiomeOwnFields, Departure } from "biome-engine";
  import type { BiomeExplorerStore } from "$lib/stores/biome-explorer.svelte";

  let {
    store,
    departures,
  }: { store: BiomeExplorerStore; departures: Departure[] } = $props();

  const FIELDS: {
    field: Exclude<keyof BiomeOwnFields, "climate">;
    label: string;
  }[] = [
    { field: "terrain", label: "Terrain" },
    { field: "vegetation", label: "Plants" },
    { field: "water", label: "Water" },
    { field: "pressures", label: "Pressures" },
    { field: "notes", label: "Notes" },
  ];

  const departure = (aspect: string) =>
    departures.find((d) => d.aspect === aspect);
</script>

{#each FIELDS as { field, label } (field)}
  <fieldset
    class="flex flex-col gap-3 rounded-xl border border-theme-border p-4"
  >
    <legend class="px-1 text-theme-text">{label}</legend>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="min-w-0 break-words text-sm text-theme-muted">
        <p class="mb-1 text-xs uppercase tracking-wide">Reference</p>
        <p>{departure(field)?.referenceSummary || "No reference values."}</p>
      </div>
      <div class="flex min-w-0 flex-col gap-1">
        <label for="biome-{field}" class="sr-only">{label}: my version</label>
        <textarea
          id="biome-{field}"
          rows="4"
          maxlength="4000"
          placeholder="Leave empty to keep the reference."
          value={store.draft?.profile.own[field] ?? ""}
          oninput={(e) => store.editOwn(field, e.currentTarget.value)}
          class="w-full break-words rounded border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
        ></textarea>
        {#if departure(field)?.changed}
          <p class="text-xs text-theme-primary">Changed from reference</p>
        {/if}
      </div>
    </div>
  </fieldset>
{/each}

<script lang="ts">
  import { magicItemConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    type = $bindable(magicItemConfig.typesByTheme["Classic Fantasy"][0]),
    rarity = $bindable(magicItemConfig.rarities[1]),
  }: {
    type: string;
    rarity: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="item-type-select"
  label="Item Type"
  bind:value={type}
  choices={magicItemConfig.typesByTheme["Classic Fantasy"].map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom item type"
/>

<SelectWithCustomOption
  id="rarity-select"
  label="Rarity"
  bind:value={rarity}
  choices={magicItemConfig.rarities.map((r: string) => ({
    value: r,
    label: r,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom rarity"
/>

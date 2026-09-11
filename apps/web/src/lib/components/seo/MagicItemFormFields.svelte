<script lang="ts">
  import { magicItemConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    type = $bindable(magicItemConfig.typesByTheme["Classic Fantasy"][0]),
    rarity = $bindable(magicItemConfig.rarities[1]),
    campaignContext = $bindable(""),
  }: {
    type: string;
    rarity: string;
    campaignContext?: string;
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

<div class="flex flex-col gap-1.5">
  <label for="magic-item-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="magic-item-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="4"
    aria-describedby="magic-item-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="magic-item-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Name the campaign, region, or faction this belongs to. Anything you name
    here is kept and the item is built to fit it.
  </p>
</div>

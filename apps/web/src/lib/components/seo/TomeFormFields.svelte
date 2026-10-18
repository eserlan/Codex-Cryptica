<script lang="ts">
  import {
    factionConfig,
    tomeConfig,
    pickFrom,
  } from "$lib/services/seo/generator-config";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    tomeType = $bindable(tomeConfig.tomeTypes[0]),
    format = $bindable(tomeConfig.formats[0]),
    rarity = $bindable(tomeConfig.rarities[0]),
    custodian = $bindable(tomeConfig.custodians[0]),
    hazard = $bindable(tomeConfig.primaryHazards[0]),
    language = $bindable(tomeConfig.languages[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    tomeType: string;
    format: string;
    rarity: string;
    custodian: string;
    hazard: string;
    language: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-meta font-bold uppercase tracking-wider text-theme-text/80";

  const activeTomeTypes = $derived(
    tomeConfig.tomeTypesByTheme[theme] ?? tomeConfig.tomeTypes,
  );
  const builtInTomeTypes = tomeConfig.tomeTypes;

  $effect(() => {
    if (
      builtInTomeTypes.includes(tomeType) &&
      !activeTomeTypes.includes(tomeType)
    ) {
      tomeType = activeTomeTypes[0];
    }
  });
</script>

<SelectWithCustomOption
  id="tome-theme-select"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="tome-type-select"
  label="Book Type / Nature"
  bind:value={tomeType}
  choices={activeTomeTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom book type"
/>

<SelectWithCustomOption
  id="tome-format-select"
  label="Format & Binding"
  bind:value={format}
  choices={tomeConfig.formats.map((f: string) => ({ value: f, label: f }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom format"
/>

<SelectWithCustomOption
  id="tome-rarity-select"
  label="Rarity & Condition"
  bind:value={rarity}
  choices={tomeConfig.rarities.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom rarity"
/>

<SelectWithCustomOption
  id="tome-custodian-select"
  label="Current Custodian"
  bind:value={custodian}
  choices={tomeConfig.custodians.map((c: string) => ({ value: c, label: c }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom custodian"
/>

<SelectWithCustomOption
  id="tome-hazard-select"
  label="Primary Reading Hazard"
  bind:value={hazard}
  choices={tomeConfig.primaryHazards.map((h: string) => ({
    value: h,
    label: h,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom hazard"
/>

<SelectWithCustomOption
  id="tome-language-select"
  label="Primary Script / Language"
  bind:value={language}
  choices={tomeConfig.languages.map((l: string) => ({ value: l, label: l }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom script or language"
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      tomeType = pickFrom(activeTomeTypes);
      format = pickFrom(tomeConfig.formats);
      rarity = pickFrom(tomeConfig.rarities);
      custodian = pickFrom(tomeConfig.custodians);
      hazard = pickFrom(tomeConfig.primaryHazards);
      language = pickFrom(tomeConfig.languages);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tome-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="tome-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="tome-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="tome-campaign-context-help"
    class="text-micro text-theme-muted leading-relaxed"
  >
    Add an occult mystery, patron, cult, or campaign premise to ground this
    forbidden manuscript in your world.
  </p>
</div>

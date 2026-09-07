<script lang="ts">
  import {
    pickFrom,
    factionConfig,
    constellationConfig,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    visualImpression = $bindable(constellationConfig.visualImpressions[0]),
    practicalUse = $bindable(constellationConfig.practicalUses[0]),
    culturalMeaning = $bindable(constellationConfig.culturalMeanings[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    visualImpression: string;
    practicalUse: string;
    culturalMeaning: string;
    campaignContext?: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2.5 text-base text-theme-text focus:border-theme-primary/60 focus:outline-none md:text-sm";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="constellation-theme-select"
  label="Genre"
  bind:value={theme}
  choices={factionConfig.themes.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
/>

<SelectWithCustomOption
  id="constellation-visual-impression-select"
  label="Visual Impression"
  bind:value={visualImpression}
  choices={constellationConfig.visualImpressions.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom visual impression"
/>

<SelectWithCustomOption
  id="constellation-practical-use-select"
  label="Practical Use"
  bind:value={practicalUse}
  choices={constellationConfig.practicalUses.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom practical use"
/>

<SelectWithCustomOption
  id="constellation-cultural-meaning-select"
  label="Cultural Meaning"
  bind:value={culturalMeaning}
  choices={constellationConfig.culturalMeanings.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom cultural meaning"
/>

<div class="flex justify-end pt-2">
  <button
    type="button"
    class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-text transition-all hover:border-theme-primary hover:bg-theme-primary hover:text-theme-bg"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      visualImpression = pickFrom(constellationConfig.visualImpressions);
      practicalUse = pickFrom(constellationConfig.practicalUses);
      culturalMeaning = pickFrom(constellationConfig.culturalMeanings);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] h-3.5 w-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="constellation-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="constellation-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="4"
    aria-describedby="constellation-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="constellation-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Name the world, sky, or people this constellation belongs to. Anything you
    name here is kept and the constellation is built to fit it.
  </p>
</div>

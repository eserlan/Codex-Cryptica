<script lang="ts">
  import {
    factionConfig,
    pickFrom,
    secretSocietyConfig,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    tone = $bindable(secretSocietyConfig.tones[0]),
    scale = $bindable(secretSocietyConfig.scales[0]),
    publicFace = $bindable(secretSocietyConfig.publicFaces[0]),
    dangerLevel = $bindable(secretSocietyConfig.dangers[0]),
    truthRelationship = $bindable(secretSocietyConfig.truths[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    tone: string;
    scale: string;
    publicFace: string;
    dangerLevel: string;
    truthRelationship: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const inputClass =
    "w-full rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2 text-base text-theme-text focus:border-theme-primary/60 focus:outline-none md:text-xs";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";

  function surprise() {
    tone = pickFrom(secretSocietyConfig.tones);
    scale = pickFrom(secretSocietyConfig.scales);
    publicFace = pickFrom(secretSocietyConfig.publicFaces);
    dangerLevel = pickFrom(secretSocietyConfig.dangers);
    truthRelationship = pickFrom(secretSocietyConfig.truths);
    onSurprise?.();
  }
</script>

<SelectWithCustomOption
  id="secret-society-theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom vibe"
/>
<SelectWithCustomOption
  id="secret-society-tone"
  label="Tone"
  bind:value={tone}
  choices={secretSocietyConfig.tones.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom tone"
/>
<SelectWithCustomOption
  id="secret-society-scale"
  label="Scale"
  bind:value={scale}
  choices={secretSocietyConfig.scales.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom scale"
/>
<SelectWithCustomOption
  id="secret-society-public-face"
  label="Public face"
  bind:value={publicFace}
  choices={secretSocietyConfig.publicFaces.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom public face"
/>
<SelectWithCustomOption
  id="secret-society-danger"
  label="Danger level"
  bind:value={dangerLevel}
  choices={secretSocietyConfig.dangers.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom danger level"
/>
<SelectWithCustomOption
  id="secret-society-truth"
  label="Relationship to truth"
  bind:value={truthRelationship}
  choices={secretSocietyConfig.truths.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom relationship to truth"
/>
<div class="flex flex-col gap-1.5">
  <label for="secret-society-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="secret-society-context"
    bind:value={campaignContext}
    rows="3"
    maxlength="600"
    class="{inputClass} resize-y"
    placeholder="A place, faction, rumour, or threat to weave in"
  ></textarea>
</div>
<button
  type="button"
  onclick={surprise}
  class="rounded-lg border border-theme-border px-3 py-2 text-xs font-bold text-theme-text hover:border-theme-primary hover:text-theme-primary"
  >Surprise me</button
>

<script lang="ts">
  import {
    villainConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    tone = $bindable(villainConfig.tones[0]),
    threatScale = $bindable(villainConfig.threatScales[0]),
    archetype = $bindable(villainConfig.archetypes[0]),
    sympathy = $bindable(villainConfig.sympathyLevels[0]),
    worldRelation = $bindable(villainConfig.worldRelations[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    tone: string;
    threatScale: string;
    archetype: string;
    sympathy: string;
    worldRelation: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="villain-theme-select"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="villain-tone-select"
  label="Tone"
  bind:value={tone}
  choices={villainConfig.tones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<SelectWithCustomOption
  id="villain-threat-scale-select"
  label="Threat Scale"
  bind:value={threatScale}
  choices={villainConfig.threatScales.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom threat scale"
/>

<SelectWithCustomOption
  id="villain-archetype-select"
  label="Villain Archetype"
  bind:value={archetype}
  choices={villainConfig.archetypes.map((a: string) => ({
    value: a,
    label: a,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom archetype"
/>

<SelectWithCustomOption
  id="villain-sympathy-select"
  label="Degree of Sympathy / Redeemability"
  bind:value={sympathy}
  choices={villainConfig.sympathyLevels.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom sympathy level"
/>

<SelectWithCustomOption
  id="villain-world-relation-select"
  label="World Relation"
  bind:value={worldRelation}
  choices={villainConfig.worldRelations.map((w: string) => ({
    value: w,
    label: w,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom world relation"
/>
<p class="text-[10px] text-theme-muted leading-relaxed -mt-1">
  The villain's fundamental relationship to the status quo — exploit it, replace
  it, protect it, end it, and so on. Distinct from Archetype (their methods).
</p>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      tone = pickFrom(villainConfig.tones);
      threatScale = pickFrom(villainConfig.threatScales);
      archetype = pickFrom(villainConfig.archetypes);
      sympathy = pickFrom(villainConfig.sympathyLevels);
      worldRelation = pickFrom(villainConfig.worldRelations);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="villain-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="villain-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="villain-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="villain-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a world, faction, or ongoing campaign tension to ground this villain in
    your table.
  </p>
</div>

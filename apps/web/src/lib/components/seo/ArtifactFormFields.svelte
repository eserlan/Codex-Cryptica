<script lang="ts">
  import {
    artifactConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    form = $bindable(artifactConfig.forms[0]),
    originEra = $bindable(artifactConfig.originEras[0]),
    powerTier = $bindable(artifactConfig.powerTiers[0]),
    currentStatus = $bindable(artifactConfig.currentStatuses[0]),
    curseCost = $bindable(artifactConfig.curseCosts[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    form: string;
    originEra: string;
    powerTier: string;
    currentStatus: string;
    curseCost: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="artifact-theme-select"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="artifact-form-select"
  label="Item Form"
  bind:value={form}
  choices={artifactConfig.forms.map((f: string) => ({ value: f, label: f }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom form"
/>

<SelectWithCustomOption
  id="artifact-origin-era-select"
  label="Origin Era"
  bind:value={originEra}
  choices={artifactConfig.originEras.map((e: string) => ({
    value: e,
    label: e,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom origin era"
/>

<SelectWithCustomOption
  id="artifact-power-tier-select"
  label="Power Tier / Scope"
  bind:value={powerTier}
  choices={artifactConfig.powerTiers.map((p: string) => ({
    value: p,
    label: p,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom power tier"
/>

<SelectWithCustomOption
  id="artifact-current-status-select"
  label="Current Status"
  bind:value={currentStatus}
  choices={artifactConfig.currentStatuses.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom status"
/>

<SelectWithCustomOption
  id="artifact-curse-cost-select"
  label="Curse / Cost / Drawback"
  bind:value={curseCost}
  choices={artifactConfig.curseCosts.map((c: string) => ({
    value: c,
    label: c,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom curse or cost"
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      form = pickFrom(artifactConfig.forms);
      originEra = pickFrom(artifactConfig.originEras);
      powerTier = pickFrom(artifactConfig.powerTiers);
      currentStatus = pickFrom(artifactConfig.currentStatuses);
      curseCost = pickFrom(artifactConfig.curseCosts);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="artifact-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="artifact-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="artifact-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="artifact-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add an ancient kingdom, deity, war, or campaign premise to ground this relic
    in your world.
  </p>
</div>

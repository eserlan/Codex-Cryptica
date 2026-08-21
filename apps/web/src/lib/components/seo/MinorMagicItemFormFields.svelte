<script lang="ts">
  import {
    minorMagicItemConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    form = $bindable(""),
    usageLimit = $bindable(minorMagicItemConfig.usageLimits[0]),
    utility = $bindable(minorMagicItemConfig.utilities[0]),
    activation = $bindable(minorMagicItemConfig.activations[0]),
    quirkSeverity = $bindable(minorMagicItemConfig.quirkSeverities[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    form: string;
    usageLimit: string;
    utility: string;
    activation: string;
    quirkSeverity: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";

  const activeForms = $derived(
    minorMagicItemConfig.formsByTheme[theme] ??
      minorMagicItemConfig.formsByTheme["Classic Fantasy"],
  );

  $effect(() => {
    if (!form || !activeForms.includes(form)) {
      form = activeForms[0];
    }
  });
</script>

<SelectWithCustomOption
  id="minor-magic-item-theme-select"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="minor-magic-item-form-select"
  label="Item Form"
  bind:value={form}
  choices={activeForms.map((f: string) => ({ value: f, label: f }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom form"
/>

<SelectWithCustomOption
  id="minor-magic-item-usage-limit-select"
  label="Usage Limit / Charges"
  bind:value={usageLimit}
  choices={minorMagicItemConfig.usageLimits.map((u: string) => ({
    value: u,
    label: u,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom usage limit"
/>

<SelectWithCustomOption
  id="minor-magic-item-utility-select"
  label="Focus / Primary Utility"
  bind:value={utility}
  choices={minorMagicItemConfig.utilities.map((ut: string) => ({
    value: ut,
    label: ut,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom utility"
/>

<SelectWithCustomOption
  id="minor-magic-item-activation-select"
  label="Activation Method"
  bind:value={activation}
  choices={minorMagicItemConfig.activations.map((a: string) => ({
    value: a,
    label: a,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom activation"
/>

<SelectWithCustomOption
  id="minor-magic-item-quirk-select"
  label="Quirk or Side Effect"
  bind:value={quirkSeverity}
  choices={minorMagicItemConfig.quirkSeverities.map((q: string) => ({
    value: q,
    label: q,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom quirk"
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      form = pickFrom(activeForms);
      usageLimit = pickFrom(minorMagicItemConfig.usageLimits);
      utility = pickFrom(minorMagicItemConfig.utilities);
      activation = pickFrom(minorMagicItemConfig.activations);
      quirkSeverity = pickFrom(minorMagicItemConfig.quirkSeverities);
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
  <label for="minor-magic-item-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="minor-magic-item-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="minor-magic-item-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="minor-magic-item-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a world, region, merchant guild, or current situation to ground this
    item in your table.
  </p>
</div>

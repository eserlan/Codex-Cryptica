<script lang="ts">
  import {
    encounterConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  const encounterTypeChoices = encounterConfig.encounterTypes.filter(
    (t) => t !== "Random",
  );

  let {
    theme = $bindable(factionConfig.themes[0]),
    encounterType = $bindable(encounterTypeChoices[0]),
    environment = $bindable(encounterConfig.environments[0]),
    threat = $bindable(encounterConfig.threats[0]),
    tone = $bindable(encounterConfig.tones[0]),
    context = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    encounterType: string;
    environment: string;
    threat: string;
    tone: string;
    context: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";

  const activeEnvironments = $derived(
    encounterConfig.environmentsByTheme[theme] ?? encounterConfig.environments,
  );
  const builtInEnvironments = encounterConfig.environments;

  $effect(() => {
    if (
      builtInEnvironments.includes(environment) &&
      !activeEnvironments.includes(environment)
    )
      environment = activeEnvironments[0];
  });
</script>

<SelectWithCustomOption
  id="encounter-theme-select"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="encounter-type-select"
  label="Encounter Type"
  bind:value={encounterType}
  choices={encounterTypeChoices.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom encounter type"
/>

<SelectWithCustomOption
  id="encounter-environment-select"
  label="Environment"
  bind:value={environment}
  choices={activeEnvironments.map((e: string) => ({ value: e, label: e }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom environment"
/>

<SelectWithCustomOption
  id="encounter-threat-select"
  label="Threat"
  bind:value={threat}
  choices={encounterConfig.threats.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom threat"
/>

<SelectWithCustomOption
  id="encounter-tone-select"
  label="Tone"
  bind:value={tone}
  choices={encounterConfig.tones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      encounterType = pickFrom(encounterTypeChoices);
      environment = pickFrom(activeEnvironments);
      threat = pickFrom(encounterConfig.threats);
      tone = pickFrom(encounterConfig.tones);
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
  <label for="encounter-context" class={labelClass}>Additional Context</label>
  <textarea
    id="encounter-context"
    name="context"
    bind:value={context}
    maxlength="4000"
    rows="3"
    aria-describedby="encounter-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="encounter-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Optional: describe an existing situation, location, or NPC to anchor the
    encounter.
  </p>
</div>

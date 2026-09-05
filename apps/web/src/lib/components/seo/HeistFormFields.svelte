<script lang="ts">
  import {
    heistConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    heistType = $bindable(heistConfig.heistTypes[0]),
    targetScale = $bindable(heistConfig.targetScales[1]),
    targetType = $bindable(
      heistConfig.targetTypesByTheme[factionConfig.themes[0]][0],
    ),
    system = $bindable(heistConfig.systems[0]),
    prize = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    heistType: string;
    targetScale: string;
    targetType: string;
    system: string;
    prize: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const inputClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";

  // Targets are the one genuinely genre-flavoured field here — a Data Fortress
  // has no place in a Classic Fantasy score. Heist type and scale read the
  // same in any setting, so they keep a single shared pool.
  const activeTargets = $derived(
    heistConfig.targetTypesByTheme[theme] ?? heistConfig.targetTypes,
  );
  const builtInTargets = Object.values(heistConfig.targetTypesByTheme)
    .flat()
    .concat(heistConfig.targetTypes);

  $effect(() => {
    // Reset only a built-in target that the new theme no longer offers —
    // a custom target the user typed themselves is left alone.
    if (
      builtInTargets.includes(targetType) &&
      !activeTargets.includes(targetType)
    ) {
      targetType = activeTargets[0];
    }
  });
</script>

<SelectWithCustomOption
  id="heist-theme-select"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="heist-type-select"
  label="Heist Type"
  bind:value={heistType}
  choices={heistConfig.heistTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom heist type"
/>

<SelectWithCustomOption
  id="heist-scale-select"
  label="Target Scale"
  bind:value={targetScale}
  choices={heistConfig.targetScales.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
/>

<SelectWithCustomOption
  id="heist-target-select"
  label="Target"
  bind:value={targetType}
  choices={activeTargets.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom target"
/>

<div class="flex flex-col gap-1.5">
  <label for="heist-system-select" class={labelClass}>Rules System</label>
  <select
    id="heist-system-select"
    bind:value={system}
    aria-describedby="heist-system-help"
    class={inputClass}
  >
    {#each heistConfig.systems as s (s)}
      <option value={s}>{s}</option>
    {/each}
  </select>
  <p
    id="heist-system-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Left system-neutral, effects are described in the fiction rather than one
    game's mechanics.
  </p>
</div>

<div class="flex flex-col gap-1.5">
  <label for="heist-prize" class={labelClass}>The Prize (optional)</label>
  <textarea
    id="heist-prize"
    bind:value={prize}
    maxlength="400"
    rows="2"
    placeholder="e.g. a sealed confession, a living witness, the payroll ledger"
    class="{inputClass} min-h-16 resize-y"
  ></textarea>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      heistType = pickFrom(heistConfig.heistTypes);
      targetScale = pickFrom(heistConfig.targetScales);
      targetType = pickFrom(activeTargets);
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
  <label for="heist-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="heist-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="heist-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="heist-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add the patron, the crew, or the campaign tension this score should connect
    to.
  </p>
</div>

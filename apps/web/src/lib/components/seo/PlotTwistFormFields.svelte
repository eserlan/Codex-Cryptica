<script lang="ts">
  import {
    factionConfig,
    plotTwistConfig,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    twistType = $bindable(plotTwistConfig.twistTypes[0]),
    impact = $bindable(plotTwistConfig.impacts[1]),
    timing = $bindable(plotTwistConfig.timings[4]),
    foreshadowing = $bindable(plotTwistConfig.foreshadowing[0]),
    premise = $bindable(""),
    constraints = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    twistType: string;
    impact: string;
    timing: string;
    foreshadowing: string;
    premise: string;
    constraints: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="plot-twist-theme-select"
  name="plot_twist_theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((value: string) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<div class="flex flex-col gap-1.5">
  <label for="plot-twist-premise" class={labelClass}
    >Current situation / premise</label
  >
  <textarea
    id="plot-twist-premise"
    bind:value={premise}
    required
    maxlength="4000"
    rows="4"
    aria-describedby="plot-twist-premise-help"
    placeholder="e.g. The party has proven the duke is diverting supplies, and the city is ready to revolt..."
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm leading-6 text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="plot-twist-premise-help"
    class="text-sm text-theme-text/70 leading-6 md:text-[13px] md:leading-relaxed"
  >
    Start with an established scene, conflict, or campaign problem. The
    generator keeps the facts you provide and overturns an assumption inside
    them.
  </p>
</div>

<SelectWithCustomOption
  id="plot-twist-type-select"
  label="Twist Type"
  bind:value={twistType}
  choices={plotTwistConfig.twistTypes.map((value: string) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom twist type"
/>

<SelectWithCustomOption
  id="plot-twist-impact-select"
  label="Impact"
  bind:value={impact}
  choices={plotTwistConfig.impacts.map((value: string) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom impact"
/>

<SelectWithCustomOption
  id="plot-twist-timing-select"
  label="When It Hits"
  bind:value={timing}
  choices={plotTwistConfig.timings.map((value: string) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom timing"
/>

<SelectWithCustomOption
  id="plot-twist-foreshadowing-select"
  label="Fairness / Foreshadowing"
  bind:value={foreshadowing}
  choices={plotTwistConfig.foreshadowing.map((value: string) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom foreshadowing preference"
/>

<div class="flex flex-col gap-1.5">
  <label for="plot-twist-constraints" class={labelClass}
    >Avoid / constraints (optional)</label
  >
  <textarea
    id="plot-twist-constraints"
    bind:value={constraints}
    maxlength="2000"
    rows="3"
    placeholder="e.g. Do not change the villain or invalidate the witness's testimony."
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm leading-6 text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
</div>

<div class="flex flex-col gap-1.5">
  <label for="plot-twist-context" class={labelClass}
    >World context (optional)</label
  >
  <textarea
    id="plot-twist-context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    placeholder="Paste the relevant campaign facts, relationships, or timeline here."
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm leading-6 text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
</div>

{#if onSurprise}
  <button
    type="button"
    class="self-start rounded-lg border border-theme-border/60 px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-text/75 hover:border-theme-primary/60 hover:text-theme-primary"
    onclick={onSurprise}
  >
    Surprise Me
  </button>
{/if}

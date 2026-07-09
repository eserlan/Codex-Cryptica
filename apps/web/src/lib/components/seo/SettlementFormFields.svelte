<script lang="ts">
  import {
    settlementConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre,
    size = $bindable(""),
    environment = $bindable(""),
    primaryFunction = $bindable(""),
    tone = $bindable(""),
    mainTension = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    genre: string;
    size: string;
    environment: string;
    primaryFunction: string;
    tone: string;
    mainTension: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="size-select"
  label="Scale"
  bind:value={size}
  choices={(
    settlementConfig.sizesByGenre[genre] ??
    settlementConfig.sizesByGenre["Fantasy"]
  ).map((s: { name: string; range: string }) => ({
    value: s.name,
    label: `${s.name} (${s.range})`,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scale"
/>

<SelectWithCustomOption
  id="environment-select"
  label="Environment"
  bind:value={environment}
  choices={(
    settlementConfig.environmentsByGenre[genre] ??
    settlementConfig.environmentsByGenre["Fantasy"]
  ).map((e: string) => ({
    value: e,
    label: e,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom environment"
/>

<SelectWithCustomOption
  id="function-select"
  label="Primary Function"
  bind:value={primaryFunction}
  choices={(
    settlementConfig.primaryFunctionsByGenre[genre] ??
    settlementConfig.primaryFunctionsByGenre["Fantasy"]
  ).map((f: string) => ({
    value: f,
    label: f,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom function"
/>

<SelectWithCustomOption
  id="tone-select"
  label="Tone"
  bind:value={tone}
  choices={(
    settlementConfig.tonesByGenre[genre] ??
    settlementConfig.tonesByGenre["Fantasy"]
  ).map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<SelectWithCustomOption
  id="tension-select"
  label="Dominant Tension"
  bind:value={mainTension}
  choices={(
    settlementConfig.mainTensionsByGenre[genre] ??
    settlementConfig.mainTensionsByGenre["Fantasy"]
  ).map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tension"
/>

<div class="flex flex-col gap-1.5">
  <label for="settlement-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="settlement-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="settlement-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="settlement-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a region name, nearby factions, or ongoing conflict to aim the result at
    your world.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      const sizes =
        settlementConfig.sizesByGenre[genre] ??
        settlementConfig.sizesByGenre["Fantasy"];
      size = pickFrom(sizes).name;
      environment = pickFrom(
        settlementConfig.environmentsByGenre[genre] ??
          settlementConfig.environmentsByGenre["Fantasy"],
      );
      primaryFunction = pickFrom(
        settlementConfig.primaryFunctionsByGenre[genre] ??
          settlementConfig.primaryFunctionsByGenre["Fantasy"],
      );
      tone = pickFrom(
        settlementConfig.tonesByGenre[genre] ??
          settlementConfig.tonesByGenre["Fantasy"],
      );
      mainTension = pickFrom(
        settlementConfig.mainTensionsByGenre[genre] ??
          settlementConfig.mainTensionsByGenre["Fantasy"],
      );
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

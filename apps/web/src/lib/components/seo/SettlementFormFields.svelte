<script lang="ts">
  import {
    settlementConfig,
    pickFrom,
    SETTLEMENT_PRESETS,
    presetsFor,
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

  /**
   * Presets write into the same fields the selects bind to, so nothing a preset
   * chooses is hidden and everything stays editable afterwards (#2340).
   */
  let activePresetId = $state<string | null>(null);
  const presets = $derived(presetsFor(SETTLEMENT_PRESETS, genre));

  const applyPreset = (preset: (typeof presets)[number]) => {
    const set = preset.set;
    if (set.size !== undefined) size = set.size;
    if (set.environment !== undefined) environment = set.environment;
    if (set.primaryFunction !== undefined)
      primaryFunction = set.primaryFunction;
    if (set.tone !== undefined) tone = set.tone;
    if (set.mainTension !== undefined) mainTension = set.mainTension;
    activePresetId = preset.id;
  };

  // Editing any field the preset set means the user has taken over from it, so
  // the highlight stops claiming otherwise. Same for switching genre.
  $effect(() => {
    if (!activePresetId) return;
    const active = presets.find((p) => p.id === activePresetId);
    if (!active) {
      activePresetId = null;
      return;
    }
    const current: Record<string, string> = {
      size,
      environment,
      primaryFunction,
      tone,
      mainTension,
    };
    if (
      Object.entries(active.set).some(([id, value]) => current[id] !== value)
    ) {
      activePresetId = null;
    }
  });

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

{#if presets.length > 0}
  <div class="flex flex-col gap-1.5">
    <span class={labelClass} id="settlement-presets-label">Start from</span>
    <div
      class="flex flex-wrap gap-1.5"
      role="group"
      aria-labelledby="settlement-presets-label"
    >
      {#each presets as preset (preset.id)}
        <button
          type="button"
          aria-pressed={activePresetId === preset.id}
          title={preset.description}
          class="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer {activePresetId ===
          preset.id
            ? 'bg-theme-primary text-theme-bg border-theme-primary'
            : 'bg-theme-surface/60 text-theme-text border-theme-border/60 hover:border-theme-primary/60'}"
          onclick={() => applyPreset(preset)}
        >
          {preset.label}
        </button>
      {/each}
    </div>
    <p class="text-[10px] text-theme-text/60 leading-relaxed">
      A preset fills in a few fields below. Change any of them, or leave the
      rest blank and they will be picked to match.
    </p>
  </div>
{/if}

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
    maxlength="4000"
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
      activePresetId = null;
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

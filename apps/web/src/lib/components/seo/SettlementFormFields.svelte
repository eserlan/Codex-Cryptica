<script lang="ts">
  import {
    settlementConfig,
    SETTLEMENT_PRESETS,
    SETTLEMENT_LEXICON,
    settlementSchema,
    presetsFor,
    analyseIntent,
    applyIntent,
    resolveSmart,
    type InferredChoice,
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

  /**
   * Reading the description into settings (#2339).
   *
   * The inferred values land in the ordinary fields, and the chips explain
   * which of them came from the description. Nothing is hidden, so a wrong
   * reading costs one click to undo rather than a confusing result.
   */
  let inferred = $state<InferredChoice[]>([]);

  const FIELD_SETTERS: Record<string, (value: string) => void> = {
    size: (v) => (size = v),
    environment: (v) => (environment = v),
    primaryFunction: (v) => (primaryFunction = v),
    tone: (v) => (tone = v),
    mainTension: (v) => (mainTension = v),
  };

  const currentValues = (): Record<string, string> => ({
    size,
    environment,
    primaryFunction,
    tone,
    mainTension,
  });

  const readDescription = () => {
    const description = campaignContext.trim();
    if (!description) {
      inferred = [];
      return;
    }

    // Whatever is already on screen was chosen deliberately, so it is locked
    // and the description only fills what is still open.
    // ⚡ Bolt Optimization: Replace chained Object.entries().filter().map() with an imperative loop
    const locked: Record<string, { value: string; source: "manual" }> = {};
    const current = currentValues();
    for (const axisId in current) {
      const value = current[axisId];
      if (value !== "") {
        locked[axisId] = { value, source: "manual" as const };
      }
    }

    const signals = analyseIntent(description, SETTLEMENT_LEXICON);
    const result = applyIntent(
      settlementSchema,
      signals,
      { genre, locked },
      description,
    );

    const applied = result.inferred.filter(
      (choice) => FIELD_SETTERS[choice.axisId],
    );
    for (const choice of applied) FIELD_SETTERS[choice.axisId](choice.value);
    inferred = applied;
  };

  const clearInference = (choice: InferredChoice) => {
    FIELD_SETTERS[choice.axisId]("");
    inferred = inferred.filter((i) => i.axisId !== choice.axisId);
  };

  // A chip stops claiming credit the moment its field says something else.
  $effect(() => {
    if (inferred.length === 0) return;
    const current = currentValues();
    const still = inferred.filter((i) => current[i.axisId] === i.value);
    if (still.length !== inferred.length) inferred = still;
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
    >Describe what you want (optional)</label
  >
  <textarea
    id="settlement-context"
    bind:value={campaignContext}
    onblur={readDescription}
    maxlength="4000"
    rows="4"
    placeholder="A prosperous but creepy coastal town controlled by merchants"
    aria-describedby="settlement-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="settlement-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Settings above that are still blank get filled in from this. Anything else
    here, like a region name or a nearby faction, aims the result at your world.
  </p>

  {#if inferred.length > 0}
    <div class="flex flex-col gap-1.5 pt-1">
      <span class={labelClass} id="settlement-inferred-label">
        Read from your description
      </span>
      <div
        class="flex flex-wrap gap-1.5"
        role="group"
        aria-labelledby="settlement-inferred-label"
      >
        {#each inferred as choice (choice.axisId)}
          <span
            class="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border border-theme-primary/50 bg-theme-primary/10 text-[11px] text-theme-text"
          >
            <span class="icon-[lucide--wand-sparkles] w-3 h-3 shrink-0"></span>
            <span class="font-medium">{choice.label}</span>
            <span class="text-theme-text/80">{choice.value}</span>
            <button
              type="button"
              class="p-1 rounded hover:bg-theme-primary/20 cursor-pointer"
              aria-label="Remove {choice.label} {choice.value}"
              onclick={() => clearInference(choice)}
            >
              <span class="icon-[lucide--x] w-3 h-3 block"></span>
            </button>
          </span>
        {/each}
      </div>
      <p class="text-[10px] text-theme-text/60 leading-relaxed">
        These are settings, not results. Remove any of them, or change them
        above, and the generator uses what you leave.
      </p>
    </div>
  {/if}
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      // Resolved through the same framework as the generator itself (#2525),
      // so Surprise Me can no longer hand back a settlement the generator
      // would never produce on its own — a landlocked fishing village, a
      // hamlet-scale university city.
      const { values } = resolveSmart(settlementSchema, { genre });
      size = values.size;
      environment = values.environment;
      primaryFunction = values.primaryFunction;
      tone = values.tone;
      mainTension = values.mainTension;
      activePresetId = null;
      inferred = [];
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

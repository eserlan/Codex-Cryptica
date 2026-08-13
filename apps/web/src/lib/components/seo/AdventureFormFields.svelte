<script lang="ts">
  import {
    adventureConfig,
    factionConfig,
    forAdventureGenre,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    archetype = $bindable(adventureConfig.archetypes[0]),
    scale = $bindable(adventureConfig.scales[1]),
    tone = $bindable(adventureConfig.tones[0]),
    seed = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    archetype: string;
    scale: string;
    tone: string;
    seed: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  const availableArchetypes = $derived(
    forAdventureGenre(adventureConfig.archetypesByGenre, theme),
  );
  const availableTones = $derived(
    forAdventureGenre(adventureConfig.tonesByGenre, theme),
  );

  const knownArchetypes = adventureConfig.archetypes;
  const knownTones = adventureConfig.tones;

  $effect(() => {
    if (
      archetype &&
      knownArchetypes.includes(archetype) &&
      !availableArchetypes.includes(archetype)
    ) {
      archetype = availableArchetypes[0];
    }
  });

  $effect(() => {
    if (tone && knownTones.includes(tone) && !availableTones.includes(tone)) {
      tone = availableTones[0];
    }
  });
</script>

<SelectWithCustomOption
  id="adventure-theme-select"
  name="adventure_theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="adventure-archetype-select"
  label="Adventure Type"
  bind:value={archetype}
  choices={availableArchetypes.map((a: string) => ({ value: a, label: a }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom adventure type (e.g. Heist)"
/>

<SelectWithCustomOption
  id="adventure-scale-select"
  label="Adventure Scale"
  bind:value={scale}
  choices={adventureConfig.scales.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom scale"
/>

<SelectWithCustomOption
  id="adventure-tone-select"
  label="Tone"
  bind:value={tone}
  choices={availableTones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom tone"
/>

<div class="flex flex-col gap-1.5">
  <label for="adventure-seed" class={labelClass}
    >Starting Seed / Situation (optional)</label
  >
  <textarea
    id="adventure-seed"
    bind:value={seed}
    maxlength="4000"
    rows="3"
    aria-describedby="adventure-seed-help"
    placeholder="e.g. A dying courier surrenders a stolen ledger at the city gates..."
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm leading-6 text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="adventure-seed-help"
    class="text-sm text-theme-text/70 leading-6 md:text-[13px] md:leading-relaxed text-wrap-pretty"
  >
    Paste an adventure hook here and the adventure is built around it. Names you
    write are kept as-is, and a deadline you state becomes the adventure's
    clock.
  </p>
</div>

<div class="flex flex-col gap-1.5">
  <label for="adventure-context" class={labelClass}
    >World context (optional)</label
  >
  <textarea
    id="adventure-context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="adventure-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm leading-6 text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="adventure-context-help"
    class="text-sm text-theme-text/70 leading-6 md:text-[13px] md:leading-relaxed text-wrap-pretty"
  >
    Describe the surrounding region, active factions, or campaign environment.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      archetype = pickFrom(availableArchetypes);
      scale = pickFrom(adventureConfig.scales);
      tone = pickFrom(availableTones);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

<script lang="ts">
  import { mysteryConfig, pickFrom } from "$lib/services/seo/generator-config";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(mysteryConfig.genres[0]),
    tone = $bindable(mysteryConfig.tones[1]),
    mysteryType = $bindable(mysteryConfig.types[0]),
    scope = $bindable(mysteryConfig.scopes[0]),
    complexity = $bindable(mysteryConfig.complexities[1]),
    clueDensity = $bindable(mysteryConfig.clueDensities[1]),
    pressure = $bindable(mysteryConfig.pressures[1]),
    campaignContext = $bindable(""),
    onSurprise,
  }: {
    genre: string;
    tone: string;
    mysteryType: string;
    scope: string;
    complexity: string;
    clueDensity: string;
    pressure: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-meta font-bold uppercase tracking-wider text-theme-text/80";
  const choices = (values: readonly string[]) =>
    values.map((value) => ({ value, label: value }));

  function surprise(): void {
    genre = pickFrom(mysteryConfig.genres);
    tone = pickFrom(mysteryConfig.tones);
    mysteryType = pickFrom(mysteryConfig.types);
    scope = pickFrom(mysteryConfig.scopes);
    complexity = pickFrom(mysteryConfig.complexities);
    clueDensity = pickFrom(mysteryConfig.clueDensities);
    pressure = pickFrom(mysteryConfig.pressures);
    onSurprise?.();
  }
</script>

<SelectWithCustomOption
  id="mystery-genre"
  label="Genre / setting"
  bind:value={genre}
  choices={choices(mysteryConfig.genres)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a genre or setting"
/>
<SelectWithCustomOption
  id="mystery-tone"
  label="Tone"
  bind:value={tone}
  choices={choices(mysteryConfig.tones)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a tone"
/>
<SelectWithCustomOption
  id="mystery-type"
  label="Mystery type"
  bind:value={mysteryType}
  choices={choices(mysteryConfig.types)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a mystery type"
/>
<SelectWithCustomOption
  id="mystery-scope"
  label="Scope"
  bind:value={scope}
  choices={choices(mysteryConfig.scopes)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a scope"
/>
<SelectWithCustomOption
  id="mystery-complexity"
  label="Complexity / suspect count"
  bind:value={complexity}
  choices={choices(mysteryConfig.complexities)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Describe the case complexity"
/>
<SelectWithCustomOption
  id="mystery-clue-density"
  label="Clue density"
  bind:value={clueDensity}
  choices={choices(mysteryConfig.clueDensities)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Describe the clue density"
/>
<SelectWithCustomOption
  id="mystery-pressure"
  label="Danger / pressure"
  bind:value={pressure}
  choices={choices(mysteryConfig.pressures)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Describe the pressure"
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={surprise}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-on-primary hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize the case options and generate a draft"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"
    ></span>Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="mystery-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="mystery-campaign-context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
    placeholder="A location, faction, ongoing tension, or clue to build around"
  ></textarea>
</div>

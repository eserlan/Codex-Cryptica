<script lang="ts">
  import {
    pickFrom,
    starSystemConfig,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    systemType = $bindable(starSystemConfig.systemTypes[0]),
    genre = $bindable(starSystemConfig.genres[0]),
    civilisationLevel = $bindable(starSystemConfig.civilisationLevels[0]),
    systemCharacter = $bindable(starSystemConfig.systemCharacters[0]),
    scientificRealism = $bindable(starSystemConfig.scientificRealism[0]),
    onGenreChange = undefined,
    onSurprise = undefined,
  }: {
    systemType: string;
    genre: string;
    civilisationLevel: string;
    systemCharacter: string;
    scientificRealism: string;
    onGenreChange?: (genre: string) => void;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2.5 text-base text-theme-text focus:border-theme-primary/60 focus:outline-none md:text-sm";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="star-system-genre-select"
  label="Genre"
  bind:value={genre}
  choices={starSystemConfig.genres.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
  onvaluechange={(value) => onGenreChange?.(value)}
/>

<SelectWithCustomOption
  id="star-system-type-select"
  label="System Type"
  bind:value={systemType}
  choices={starSystemConfig.systemTypes.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom system type"
/>

<SelectWithCustomOption
  id="star-system-civilisation-select"
  label="Civilisation Level"
  bind:value={civilisationLevel}
  choices={starSystemConfig.civilisationLevels.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom civilisation level"
/>

<SelectWithCustomOption
  id="star-system-character-select"
  label="System Character"
  bind:value={systemCharacter}
  choices={starSystemConfig.systemCharacters.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom system character"
/>

<SelectWithCustomOption
  id="star-system-realism-select"
  label="Scientific Realism"
  bind:value={scientificRealism}
  choices={starSystemConfig.scientificRealism.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom realism level"
/>

<div class="flex justify-end pt-2">
  <button
    type="button"
    class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-text transition-all hover:border-theme-primary hover:bg-theme-primary hover:text-theme-bg"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      systemType = pickFrom(starSystemConfig.systemTypes);
      civilisationLevel = pickFrom(starSystemConfig.civilisationLevels);
      systemCharacter = pickFrom(starSystemConfig.systemCharacters);
      scientificRealism = pickFrom(starSystemConfig.scientificRealism);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] h-3.5 w-3.5"></span>
    Surprise Me
  </button>
</div>

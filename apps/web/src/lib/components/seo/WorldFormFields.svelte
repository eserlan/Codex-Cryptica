<script lang="ts">
  import { pickFrom, worldConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    worldType = $bindable(worldConfig.worldTypes[0]),
    habitability = $bindable(worldConfig.habitability[0]),
    civilisation = $bindable(worldConfig.civilisations[0]),
    societalModel = $bindable(worldConfig.societalModels[0]),
    worldTagOne = $bindable(worldConfig.defaultWorldTags[0]),
    worldTagTwo = $bindable(worldConfig.defaultWorldTags[1]),
    genre = $bindable(worldConfig.genres[0]),
    dominantFeature = $bindable(""),
    onGenreChange = undefined,
    onSurprise = undefined,
  }: {
    worldType: string;
    habitability: string;
    civilisation: string;
    societalModel: string;
    worldTagOne: string;
    worldTagTwo: string;
    genre: string;
    dominantFeature: string;
    onGenreChange?: (genre: string) => void;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2.5 text-base text-theme-text focus:border-theme-primary/60 focus:outline-none md:text-sm";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  function chooseDifferentTag(excluded: string): string {
    const available = worldConfig.worldTags.filter(
      (value) => value !== excluded,
    );
    return pickFrom(available);
  }

  function handleWorldTagOneChange(value: string): void {
    if (value === worldTagTwo) worldTagTwo = chooseDifferentTag(value);
  }

  function handleWorldTagTwoChange(value: string): void {
    if (value === worldTagOne) worldTagTwo = chooseDifferentTag(value);
  }
</script>

<SelectWithCustomOption
  id="world-genre-select"
  label="Genre / Tone"
  bind:value={genre}
  choices={worldConfig.genres.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre or tone"
  onvaluechange={onGenreChange}
/>

<SelectWithCustomOption
  id="world-societal-model-select"
  label="Primary Societal Model"
  bind:value={societalModel}
  choices={worldConfig.societalModels.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom societal model"
/>

<SelectWithCustomOption
  id="world-type-select"
  label="World Type"
  bind:value={worldType}
  choices={worldConfig.worldTypes.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom world type"
/>

<SelectWithCustomOption
  id="world-tag-one-select"
  label="World Tag 1 (Stars Without Number)"
  bind:value={worldTagOne}
  choices={worldConfig.worldTags.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom first world tag"
  onvaluechange={handleWorldTagOneChange}
/>

<SelectWithCustomOption
  id="world-tag-two-select"
  label="World Tag 2 (Stars Without Number)"
  bind:value={worldTagTwo}
  choices={worldConfig.worldTags.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom second world tag"
  onvaluechange={handleWorldTagTwoChange}
/>

<SelectWithCustomOption
  id="world-habitability-select"
  label="Habitability"
  bind:value={habitability}
  choices={worldConfig.habitability.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom habitability"
/>

<SelectWithCustomOption
  id="world-civilisation-select"
  label="Civilisation"
  bind:value={civilisation}
  choices={worldConfig.civilisations.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom civilisation"
/>

<div class="flex flex-col gap-1.5">
  <label for="world-dominant-feature" class={labelClass}
    >Dominant feature (optional)</label
  >
  <input
    id="world-dominant-feature"
    bind:value={dominantFeature}
    maxlength="4000"
    placeholder="e.g. A migrating storm belt hides an ancient orbital elevator"
    class={selectClass}
  />
  <p
    class="text-sm leading-6 text-theme-text/70 md:text-[13px] md:leading-relaxed"
  >
    Add the feature, mystery, or condition that should shape the world.
  </p>
</div>

<div class="flex justify-end pt-2">
  <button
    type="button"
    class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-text transition-all hover:border-theme-primary hover:bg-theme-primary hover:text-theme-bg"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      worldType = pickFrom(worldConfig.worldTypes);
      habitability = pickFrom(worldConfig.habitability);
      civilisation = pickFrom(worldConfig.civilisations);
      societalModel = pickFrom(worldConfig.societalModels);
      worldTagOne = pickFrom(worldConfig.worldTags);
      worldTagTwo = pickFrom(
        worldConfig.worldTags.filter((value) => value !== worldTagOne),
      );
      dominantFeature = "";
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] h-3.5 w-3.5"></span>
    Surprise Me
  </button>
</div>

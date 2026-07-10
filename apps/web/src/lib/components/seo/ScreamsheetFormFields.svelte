<script lang="ts">
  import {
    screamsheetConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(screamsheetConfig.genres[0]),
    publicationType = $bindable(
      screamsheetConfig.publicationTypesByGenre[screamsheetConfig.genres[0]][0],
    ),
    tone = $bindable(screamsheetConfig.tones[1]),
    bias = $bindable(screamsheetConfig.biases[0]),
    censorLevel = $bindable(screamsheetConfig.censorLevels[0]),
    hookDensity = $bindable(screamsheetConfig.hookDensities[1]),
    placeName = $bindable(""),
    headlineEvent = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    genre: string;
    publicationType: string;
    tone: string;
    bias: string;
    censorLevel: string;
    hookDensity: string;
    placeName: string;
    headlineEvent: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const inputClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";

  let publicationTypes = $derived(
    screamsheetConfig.publicationTypesByGenre[genre] ??
      screamsheetConfig.publicationTypesByGenre["Fantasy"],
  );
  const builtInPublicationTypes = Object.values(
    screamsheetConfig.publicationTypesByGenre,
  ).flat();

  $effect(() => {
    if (
      builtInPublicationTypes.includes(publicationType) &&
      !publicationTypes.includes(publicationType)
    ) {
      publicationType = publicationTypes[0];
    }
  });
</script>

<SelectWithCustomOption
  id="screamsheet-genre-select"
  label="Genre / Setting"
  bind:value={genre}
  choices={screamsheetConfig.genres.map((g: string) => ({
    value: g,
    label: g,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre or setting"
/>

<SelectWithCustomOption
  id="screamsheet-publication-select"
  label="Publication type"
  bind:value={publicationType}
  choices={publicationTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom publication type"
/>

<SelectWithCustomOption
  id="screamsheet-tone-select"
  label="Editorial tone"
  bind:value={tone}
  choices={screamsheetConfig.tones.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom editorial tone"
/>

<SelectWithCustomOption
  id="screamsheet-bias-select"
  label="Ownership / bias"
  bind:value={bias}
  choices={screamsheetConfig.biases.map((b: string) => ({
    value: b,
    label: b,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom ownership or bias"
/>

<SelectWithCustomOption
  id="screamsheet-censor-select"
  label="Censor level"
  bind:value={censorLevel}
  choices={screamsheetConfig.censorLevels.map((c: string) => ({
    value: c,
    label: c,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom censor level"
/>

<SelectWithCustomOption
  id="screamsheet-hooks-select"
  label="Hook density"
  bind:value={hookDensity}
  choices={screamsheetConfig.hookDensities.map((h: string) => ({
    value: h,
    label: h,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom hook density"
/>

<div class="flex flex-col gap-1.5">
  <label for="screamsheet-place" class={labelClass}
    >Settlement, region, or publication name (optional)</label
  >
  <input
    id="screamsheet-place"
    type="text"
    bind:value={placeName}
    maxlength="80"
    placeholder="e.g. Greywick Landing, The Gutter Signal"
    class={inputClass}
  />
</div>

<div class="flex flex-col gap-1.5">
  <label for="screamsheet-headline" class={labelClass}
    >Current crisis or headline event (optional)</label
  >
  <input
    id="screamsheet-headline"
    type="text"
    bind:value={headlineEvent}
    maxlength="160"
    placeholder="e.g. the harbour has been closed for three days"
    class={inputClass}
  />
</div>

<div class="flex flex-col gap-1.5">
  <label for="screamsheet-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="screamsheet-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="screamsheet-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="screamsheet-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add factions, recent events, NPCs, or tensions and the sheet will report on
    them in its own biased voice.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      const currentPublicationTypes =
        screamsheetConfig.publicationTypesByGenre[genre] ??
        screamsheetConfig.publicationTypesByGenre["Fantasy"];
      publicationType = pickFrom(currentPublicationTypes);
      tone = pickFrom(screamsheetConfig.tones);
      bias = pickFrom(screamsheetConfig.biases);
      censorLevel = pickFrom(screamsheetConfig.censorLevels);
      hookDensity = pickFrom(screamsheetConfig.hookDensities);
      if (onSurprise) {
        onSurprise();
      }
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

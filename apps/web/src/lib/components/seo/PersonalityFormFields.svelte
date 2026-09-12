<script lang="ts">
  import {
    personalityConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(personalityConfig.genres[0]),
    roleHint = $bindable(personalityConfig.roleHints[0]),
    temperament = $bindable(personalityConfig.temperaments[0]),
    socialStyle = $bindable(personalityConfig.socialStyles[0]),
    moralOutlook = $bindable(personalityConfig.moralOutlooks[0]),
    emotionalOpenness = $bindable(personalityConfig.emotionalOpenness[0]),
    confidence = $bindable(personalityConfig.confidenceLevels[0]),
    optimism = $bindable(personalityConfig.optimismSpectrum[0]),
    expressiveness = $bindable(personalityConfig.expressiveness[0]),
    cooperationStyle = $bindable(personalityConfig.cooperationStyles[0]),
    ageOrLifeStage = $bindable(""),
    relationshipContext = $bindable(""),
    concept = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
    onGenreChange = undefined,
  }: {
    genre: string;
    roleHint: string;
    temperament: string;
    socialStyle: string;
    moralOutlook: string;
    emotionalOpenness: string;
    confidence: string;
    optimism: string;
    expressiveness: string;
    cooperationStyle: string;
    ageOrLifeStage: string;
    relationshipContext: string;
    concept: string;
    campaignContext: string;
    onSurprise?: () => void;
    onGenreChange?: (genre: string) => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
  const textClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";

  const choices = (values: readonly string[]) =>
    values.map((v) => ({ value: v, label: v }));
</script>

<SelectWithCustomOption
  id="personality-genre-select"
  label="Choose a vibe"
  bind:value={genre}
  choices={choices(personalityConfig.genres)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
  onvaluechange={onGenreChange}
/>

<SelectWithCustomOption
  id="personality-role-select"
  label="Role / Context"
  bind:value={roleHint}
  choices={choices(personalityConfig.roleHints)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom role"
/>

<SelectWithCustomOption
  id="personality-temperament-select"
  label="Temperament"
  bind:value={temperament}
  choices={choices(personalityConfig.temperaments)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom temperament"
/>

<SelectWithCustomOption
  id="personality-social-style-select"
  label="Social Style"
  bind:value={socialStyle}
  choices={choices(personalityConfig.socialStyles)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom social style"
/>

<SelectWithCustomOption
  id="personality-moral-outlook-select"
  label="Moral Outlook"
  bind:value={moralOutlook}
  choices={choices(personalityConfig.moralOutlooks)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom moral outlook"
/>

<SelectWithCustomOption
  id="personality-emotional-openness-select"
  label="Emotional Openness"
  bind:value={emotionalOpenness}
  choices={choices(personalityConfig.emotionalOpenness)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom level of openness"
/>

<SelectWithCustomOption
  id="personality-confidence-select"
  label="Confidence"
  bind:value={confidence}
  choices={choices(personalityConfig.confidenceLevels)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom confidence level"
/>

<SelectWithCustomOption
  id="personality-optimism-select"
  label="Optimism / Pessimism"
  bind:value={optimism}
  choices={choices(personalityConfig.optimismSpectrum)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom outlook"
/>

<SelectWithCustomOption
  id="personality-expressiveness-select"
  label="Reserved / Expressive"
  bind:value={expressiveness}
  choices={choices(personalityConfig.expressiveness)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom expressiveness"
/>

<SelectWithCustomOption
  id="personality-cooperation-select"
  label="Cooperative / Competitive"
  bind:value={cooperationStyle}
  choices={choices(personalityConfig.cooperationStyles)}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom style"
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      roleHint = pickFrom(personalityConfig.roleHints);
      temperament = pickFrom(personalityConfig.temperaments);
      socialStyle = pickFrom(personalityConfig.socialStyles);
      moralOutlook = pickFrom(personalityConfig.moralOutlooks);
      emotionalOpenness = pickFrom(personalityConfig.emotionalOpenness);
      confidence = pickFrom(personalityConfig.confidenceLevels);
      optimism = pickFrom(personalityConfig.optimismSpectrum);
      expressiveness = pickFrom(personalityConfig.expressiveness);
      cooperationStyle = pickFrom(personalityConfig.cooperationStyles);
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
  <label for="personality-age" class={labelClass}
    >Optional Age / Life Stage</label
  >
  <input
    id="personality-age"
    name="age_or_life_stage"
    type="text"
    bind:value={ageOrLifeStage}
    maxlength="120"
    class={textClass}
    placeholder="e.g. weathered veteran, barely an adult"
  />
</div>

<div class="flex flex-col gap-1.5">
  <label for="personality-relationship-context" class={labelClass}
    >Optional Relationship Context</label
  >
  <input
    id="personality-relationship-context"
    name="relationship_context"
    type="text"
    bind:value={relationshipContext}
    maxlength="200"
    class={textClass}
    placeholder="e.g. the party's reluctant contact, a rival's former mentor"
  />
</div>

<div class="flex flex-col gap-1.5">
  <label for="personality-concept" class={labelClass}
    >Optional Free-text Concept</label
  >
  <textarea
    id="personality-concept"
    name="concept"
    bind:value={concept}
    maxlength="2000"
    rows="2"
    class="w-full min-h-16 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
    placeholder="A rough idea to build the personality around, if you have one"
  ></textarea>
</div>

<div class="flex flex-col gap-1.5">
  <label for="personality-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="personality-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="personality-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="personality-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a faction, location, or ongoing tension to tie the personality into your
    table.
  </p>
</div>

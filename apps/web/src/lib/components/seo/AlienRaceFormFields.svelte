<script lang="ts">
  import {
    pickFrom,
    alienRaceConfig,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(alienRaceConfig.genres[0]),
    generationMode = $bindable(alienRaceConfig.generationModes[0]),
    homeEnvironment = $bindable(alienRaceConfig.homeEnvironments[0]),
    bodyPlan = $bindable(alienRaceConfig.bodyPlans[0]),
    psychology = $bindable(alienRaceConfig.psychologies[0]),
    socialOrganisation = $bindable(alienRaceConfig.socialOrganisations[0]),
    technologyLevel = $bindable(alienRaceConfig.technologyLevels[0]),
    relationToOutsiders = $bindable(alienRaceConfig.relationsToOutsiders[0]),
    campaignContext = $bindable(""),
    onGenreChange = undefined,
    onSurprise = undefined,
  }: {
    genre: string;
    generationMode: string;
    homeEnvironment: string;
    bodyPlan: string;
    psychology: string;
    socialOrganisation: string;
    technologyLevel: string;
    relationToOutsiders: string;
    campaignContext?: string;
    onGenreChange?: (genre: string) => void;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2.5 text-base text-theme-text focus:border-theme-primary/60 focus:outline-none md:text-sm";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  // Grounded mode hides the exotic body plans and environments entirely, so
  // the form cannot offer a plasma being to someone who asked for a
  // biologically plausible species.
  let activeBodyPlans = $derived(
    alienRaceConfig.bodyPlansByMode[generationMode] ??
      alienRaceConfig.bodyPlans,
  );
  let activeEnvironments = $derived(
    alienRaceConfig.homeEnvironmentsByMode[generationMode] ??
      alienRaceConfig.homeEnvironments,
  );

  // Switching to Grounded while an exotic option is selected resets it — but
  // only if the current value is a built-in. A custom value the user typed is
  // theirs to keep.
  $effect(() => {
    if (
      alienRaceConfig.bodyPlans.includes(bodyPlan) &&
      !activeBodyPlans.includes(bodyPlan)
    ) {
      bodyPlan = activeBodyPlans[0];
    }
  });
  $effect(() => {
    if (
      alienRaceConfig.homeEnvironments.includes(homeEnvironment) &&
      !activeEnvironments.includes(homeEnvironment)
    ) {
      homeEnvironment = activeEnvironments[0];
    }
  });
</script>

<SelectWithCustomOption
  id="alien-race-genre-select"
  label="Genre"
  bind:value={genre}
  choices={alienRaceConfig.genres.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
  onvaluechange={(value) => onGenreChange?.(value)}
/>

<SelectWithCustomOption
  id="alien-race-mode-select"
  label="Generation Mode"
  bind:value={generationMode}
  choices={alienRaceConfig.generationModes.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom generation mode"
/>
<p class="-mt-1 text-[10px] leading-relaxed text-theme-text/60">
  Grounded keeps the species biologically plausible and shaped by its
  environment. Freeform also allows crystalline, colonial, plasma and machine
  life.
</p>

<SelectWithCustomOption
  id="alien-race-environment-select"
  label="Home Environment"
  bind:value={homeEnvironment}
  choices={activeEnvironments.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom environment"
/>

<SelectWithCustomOption
  id="alien-race-body-plan-select"
  label="Body Plan"
  bind:value={bodyPlan}
  choices={activeBodyPlans.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom body plan"
/>

<SelectWithCustomOption
  id="alien-race-psychology-select"
  label="Psychology"
  bind:value={psychology}
  choices={alienRaceConfig.psychologies.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom psychology"
/>

<SelectWithCustomOption
  id="alien-race-social-select"
  label="Social Organisation"
  bind:value={socialOrganisation}
  choices={alienRaceConfig.socialOrganisations.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom social structure"
/>

<SelectWithCustomOption
  id="alien-race-technology-select"
  label="Technology Level"
  bind:value={technologyLevel}
  choices={alienRaceConfig.technologyLevels.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom technology level"
/>

<SelectWithCustomOption
  id="alien-race-relations-select"
  label="Relationship to Other Species"
  bind:value={relationToOutsiders}
  choices={alienRaceConfig.relationsToOutsiders.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom relationship"
/>

<div class="flex justify-end pt-2">
  <button
    type="button"
    class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-text transition-all hover:border-theme-primary hover:bg-theme-primary hover:text-theme-bg"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      // Genre is deliberately left alone: it is a user-controlled axis and
      // also drives the page's visual skin.
      generationMode = pickFrom(alienRaceConfig.generationModes);
      homeEnvironment = pickFrom(
        alienRaceConfig.homeEnvironmentsByMode[generationMode] ??
          alienRaceConfig.homeEnvironments,
      );
      bodyPlan = pickFrom(
        alienRaceConfig.bodyPlansByMode[generationMode] ??
          alienRaceConfig.bodyPlans,
      );
      psychology = pickFrom(alienRaceConfig.psychologies);
      socialOrganisation = pickFrom(alienRaceConfig.socialOrganisations);
      technologyLevel = pickFrom(alienRaceConfig.technologyLevels);
      relationToOutsiders = pickFrom(alienRaceConfig.relationsToOutsiders);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] h-3.5 w-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="alien-race-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="alien-race-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="4"
    aria-describedby="alien-race-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="alien-race-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Name the world, system, or powers this species lives among — or describe the
    species concept you already have in mind. Anything you name here is kept and
    the species is built to fit it.
  </p>
</div>

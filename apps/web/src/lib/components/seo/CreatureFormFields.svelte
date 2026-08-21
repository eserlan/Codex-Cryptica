<script lang="ts">
  import { pickFrom, creatureConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(creatureConfig.genres[0]),
    category = $bindable("Random"),
    threatLevel = $bindable("Random"),
    size = $bindable("Random"),
    temperament = $bindable("Random"),
    habitat = $bindable("Random"),
    ecologicalRole = $bindable("Random"),
    campaignContext = $bindable(""),
    onGenreChange = undefined,
    onSurprise = undefined,
  }: {
    genre: string;
    category: string;
    threatLevel: string;
    size: string;
    temperament: string;
    habitat: string;
    ecologicalRole: string;
    campaignContext?: string;
    onGenreChange?: (genre: string) => void;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 rounded-lg border border-theme-border/60 bg-theme-bg/60 px-3 py-2.5 text-base text-theme-text focus:border-theme-primary/60 focus:outline-none md:text-sm";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  let activeHabitats = $derived(
    creatureConfig.habitatByTheme[genre]
      ? ["Random", ...creatureConfig.habitatByTheme[genre]]
      : creatureConfig.habitats,
  );

  $effect(() => {
    if (
      habitat !== "Random" &&
      creatureConfig.habitats.includes(habitat as any) &&
      !activeHabitats.includes(habitat)
    ) {
      habitat = "Random";
    }
  });
</script>

<SelectWithCustomOption
  id="creature-genre-select"
  label="Genre / Theme"
  bind:value={genre}
  choices={creatureConfig.genres.map((value) => ({ value, label: value }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
  onvaluechange={(value) => onGenreChange?.(value)}
/>

<SelectWithCustomOption
  id="creature-category-select"
  label="Creature Category / Origin"
  bind:value={category}
  choices={creatureConfig.categories.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom category"
/>

<SelectWithCustomOption
  id="creature-threat-select"
  label="Threat Level"
  bind:value={threatLevel}
  choices={creatureConfig.threatLevels.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom threat level"
/>

<SelectWithCustomOption
  id="creature-size-select"
  label="Size"
  bind:value={size}
  choices={creatureConfig.sizes.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom size"
/>

<SelectWithCustomOption
  id="creature-temperament-select"
  label="Intelligence / Temperament"
  bind:value={temperament}
  choices={creatureConfig.temperaments.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom temperament or sapience"
/>

<SelectWithCustomOption
  id="creature-habitat-select"
  label="Habitat / Environment"
  bind:value={habitat}
  choices={activeHabitats.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom habitat"
/>

<SelectWithCustomOption
  id="creature-ecological-role-select"
  label="Ecological Role / Behaviour"
  bind:value={ecologicalRole}
  choices={creatureConfig.ecologicalRoles.map((value) => ({
    value,
    label: value,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom role"
/>

<div class="flex justify-end pt-2">
  <button
    type="button"
    class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-text transition-all hover:border-theme-primary hover:bg-theme-primary hover:text-theme-bg"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      // Genre is deliberately left alone: it is a user-controlled axis and
      // also drives the page's visual skin.
      category = pickFrom(
        creatureConfig.categories.filter((c) => c !== "Random"),
      );
      threatLevel = pickFrom(
        creatureConfig.threatLevels.filter((t) => t !== "Random"),
      );
      size = pickFrom(creatureConfig.sizes.filter((s) => s !== "Random"));
      temperament = pickFrom(
        creatureConfig.temperaments.filter((t) => t !== "Random"),
      );
      const availableHabitats = (
        creatureConfig.habitatByTheme[genre] ?? creatureConfig.habitats
      ).filter((h) => h !== "Random");
      habitat = pickFrom(availableHabitats);
      ecologicalRole = pickFrom(
        creatureConfig.ecologicalRoles.filter((r) => r !== "Random"),
      );
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] h-3.5 w-3.5"></span>
    Surprise Me
  </button>
</div>

<div class="flex flex-col gap-1.5">
  <label for="creature-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="creature-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="4"
    aria-describedby="creature-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="creature-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Describe an encounter concept, specific lair, local threat, or existing
    faction this creature interacts with.
  </p>
</div>

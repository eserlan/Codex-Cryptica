<script lang="ts">
  import { nationConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(nationConfig.genres[0]),
    polityType = $bindable(
      nationConfig.polityTypesByGenre[nationConfig.genres[0]][0],
    ),
    governmentStyle = $bindable(nationConfig.governmentStyles[0]),
    scale = $bindable(nationConfig.scales[2]),
    conflictLevel = $bindable(nationConfig.conflictLevels[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    genre: string;
    polityType: string;
    governmentStyle: string;
    scale: string;
    conflictLevel: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  let polityTypes = $derived(
    nationConfig.polityTypesByGenre[genre] ??
      nationConfig.polityTypesByGenre["Fantasy"],
  );

  $effect(() => {
    if (!polityTypes.includes(polityType)) {
      polityType = polityTypes[0];
    }
  });
</script>

<SelectWithCustomOption
  id="nation-genre-select"
  label="Genre / Setting"
  bind:value={genre}
  choices={nationConfig.genres.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre or setting"
/>

<SelectWithCustomOption
  id="nation-polity-select"
  label="Polity type"
  bind:value={polityType}
  choices={polityTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom polity type"
/>

<SelectWithCustomOption
  id="nation-govt-select"
  label="Government style"
  bind:value={governmentStyle}
  choices={nationConfig.governmentStyles.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom government style"
/>

<SelectWithCustomOption
  id="nation-scale-select"
  label="Scale"
  bind:value={scale}
  choices={nationConfig.scales.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scale"
/>

<SelectWithCustomOption
  id="nation-conflict-select"
  label="Conflict level"
  bind:value={conflictLevel}
  choices={nationConfig.conflictLevels.map((c: string) => ({ value: c, label: c }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom conflict level"
/>

<div class="flex flex-col gap-1.5">
  <label for="nation-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="nation-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="nation-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="nation-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a campaign name, ongoing conflict, or political tension to aim the state
    at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      const currentPolityTypes =
        nationConfig.polityTypesByGenre[genre] ??
        nationConfig.polityTypesByGenre["Fantasy"];
      polityType = pickFrom(currentPolityTypes);
      governmentStyle = pickFrom(nationConfig.governmentStyles);
      scale = pickFrom(nationConfig.scales);
      conflictLevel = pickFrom(nationConfig.conflictLevels);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

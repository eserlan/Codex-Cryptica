<script lang="ts">
  import {
    socialHubConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  const fantasyVenueTypes = socialHubConfig.venueTypesByGenre["Fantasy"];
  const fantasyClienteles = socialHubConfig.clientelesByGenre["Fantasy"];

  let {
    type = $bindable(fantasyVenueTypes[0]),
    atmosphere = $bindable(socialHubConfig.atmospheres[0]),
    settlementType = $bindable(socialHubConfig.settlementTypes[1]),
    wealthLevel = $bindable(socialHubConfig.wealthLevels[2]),
    clientele = $bindable(fantasyClienteles[4]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    type: string;
    atmosphere: string;
    settlementType: string;
    wealthLevel: string;
    clientele: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<SelectWithCustomOption
  id="tavern-type-select"
  label="Tavern type"
  bind:value={type}
  choices={fantasyVenueTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tavern type"
/>

<SelectWithCustomOption
  id="tavern-atmosphere-select"
  label="Atmosphere"
  bind:value={atmosphere}
  choices={socialHubConfig.atmospheres.map((a: string) => ({ value: a, label: a }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom atmosphere"
/>

<SelectWithCustomOption
  id="tavern-settlement-select"
  label="Settlement type"
  bind:value={settlementType}
  choices={socialHubConfig.settlementTypes.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom settlement type"
/>

<SelectWithCustomOption
  id="tavern-wealth-select"
  label="Wealth level"
  bind:value={wealthLevel}
  choices={socialHubConfig.wealthLevels.map((w: string) => ({ value: w, label: w }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom wealth level"
/>

<SelectWithCustomOption
  id="tavern-clientele-select"
  label="Primary clientele"
  bind:value={clientele}
  choices={fantasyClienteles.map((c: string) => ({ value: c, label: c }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom primary clientele"
/>

<div class="flex flex-col gap-1.5">
  <label for="tavern-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="tavern-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="tavern-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="tavern-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a city, region, ongoing conflict, or campaign tension to aim the tavern
    at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      type = pickFrom(fantasyVenueTypes);
      atmosphere = pickFrom(socialHubConfig.atmospheres);
      settlementType = pickFrom(socialHubConfig.settlementTypes);
      wealthLevel = pickFrom(socialHubConfig.wealthLevels);
      clientele = pickFrom(fantasyClienteles);
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

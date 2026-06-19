<script lang="ts">
  import {
    socialHubConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(socialHubConfig.genres[0]),
    venueType = $bindable(
      socialHubConfig.venueTypesByGenre[socialHubConfig.genres[0]][0],
    ),
    atmosphere = $bindable(socialHubConfig.atmospheres[0]),
    wealthLevel = $bindable(socialHubConfig.wealthLevels[2]),
    clientele = $bindable(
      socialHubConfig.clientelesByGenre[socialHubConfig.genres[0]][0],
    ),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    genre: string;
    venueType: string;
    atmosphere: string;
    wealthLevel: string;
    clientele: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";

  let venueTypes = $derived(
    socialHubConfig.venueTypesByGenre[genre] ??
      socialHubConfig.venueTypesByGenre["Fantasy"],
  );
  let clienteles = $derived(
    socialHubConfig.clientelesByGenre[genre] ??
      socialHubConfig.clientelesByGenre["Fantasy"],
  );
  const builtInVenueTypes = Object.values(
    socialHubConfig.venueTypesByGenre,
  ).flat();
  const builtInClienteles = Object.values(
    socialHubConfig.clientelesByGenre,
  ).flat();

  $effect(() => {
    if (
      builtInVenueTypes.includes(venueType) &&
      !venueTypes.includes(venueType)
    ) {
      venueType = venueTypes[0];
    }
  });

  $effect(() => {
    if (
      builtInClienteles.includes(clientele) &&
      !clienteles.includes(clientele)
    ) {
      clientele = clienteles[0];
    }
  });
</script>

<SelectWithCustomOption
  id="hub-genre-select"
  label="Genre / Setting"
  bind:value={genre}
  choices={socialHubConfig.genres.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre or setting"
/>

<SelectWithCustomOption
  id="hub-venue-select"
  label="Venue type"
  bind:value={venueType}
  choices={venueTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom venue type"
/>

<SelectWithCustomOption
  id="hub-atmosphere-select"
  label="Atmosphere"
  bind:value={atmosphere}
  choices={socialHubConfig.atmospheres.map((a: string) => ({ value: a, label: a }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom atmosphere"
/>

<SelectWithCustomOption
  id="hub-wealth-select"
  label="Wealth level"
  bind:value={wealthLevel}
  choices={socialHubConfig.wealthLevels.map((w: string) => ({ value: w, label: w }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom wealth level"
/>

<SelectWithCustomOption
  id="hub-clientele-select"
  label="Primary clientele"
  bind:value={clientele}
  choices={clienteles.map((c: string) => ({ value: c, label: c }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom primary clientele"
/>

<div class="flex flex-col gap-1.5">
  <label for="hub-context" class={labelClass}>Campaign context (optional)</label
  >
  <textarea
    id="hub-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="hub-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="hub-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a city, faction, ongoing conflict, or campaign tension to aim the venue
    at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      const currentVenueTypes =
        socialHubConfig.venueTypesByGenre[genre] ??
        socialHubConfig.venueTypesByGenre["Fantasy"];
      venueType = pickFrom(currentVenueTypes);
      atmosphere = pickFrom(socialHubConfig.atmospheres);
      wealthLevel = pickFrom(socialHubConfig.wealthLevels);
      const newClienteles =
        socialHubConfig.clientelesByGenre[genre] ??
        socialHubConfig.clientelesByGenre["Fantasy"];
      clientele = pickFrom(newClienteles);
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

<script lang="ts">
  import {
    socialHubConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";

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

  $effect(() => {
    if (!venueTypes.includes(venueType)) {
      venueType = venueTypes[0];
    }
  });

  $effect(() => {
    if (!clienteles.includes(clientele)) {
      clientele = clienteles[0];
    }
  });
</script>

<div class="flex flex-col gap-1.5">
  <label for="hub-genre-select" class={labelClass}>Genre / Setting</label>
  <select id="hub-genre-select" bind:value={genre} class={selectClass}>
    {#each socialHubConfig.genres as g (g)}
      <option value={g}>{g}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="hub-venue-select" class={labelClass}>Venue type</label>
  <select id="hub-venue-select" bind:value={venueType} class={selectClass}>
    {#each venueTypes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="hub-atmosphere-select" class={labelClass}>Atmosphere</label>
  <select
    id="hub-atmosphere-select"
    bind:value={atmosphere}
    class={selectClass}
  >
    {#each socialHubConfig.atmospheres as a (a)}
      <option value={a}>{a}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="hub-wealth-select" class={labelClass}>Wealth level</label>
  <select id="hub-wealth-select" bind:value={wealthLevel} class={selectClass}>
    {#each socialHubConfig.wealthLevels as w (w)}
      <option value={w}>{w}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="hub-clientele-select" class={labelClass}>Primary clientele</label>
  <select id="hub-clientele-select" bind:value={clientele} class={selectClass}>
    {#each clienteles as c (c)}
      <option value={c}>{c}</option>
    {/each}
  </select>
</div>

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

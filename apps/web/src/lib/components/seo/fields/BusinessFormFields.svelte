<script lang="ts">
  import {
    businessConfig,
    pickFrom,
  } from "#lib/services/seo/generator-config.js";
  import SelectWithCustomOption from "#lib/components/forms/SelectWithCustomOption.svelte";
  import { businessTypeAfterGenreChange } from "./business-form";

  let {
    genre = $bindable(businessConfig.genres[0]),
    businessType = $bindable(""),
    scale = $bindable("small"),
    legitimacy = $bindable("legitimate"),
    wealth = $bindable("modest"),
    tone = $bindable("grounded"),
    location = $bindable(""),
    clientele = $bindable(""),
    campaignContext = $bindable(""),
    playersOwn = $bindable(false),
    onSurprise = undefined,
    onGenreChange = undefined,
  }: {
    genre: string;
    businessType: string;
    scale: string;
    legitimacy: string;
    wealth: string;
    tone: string;
    location: string;
    clientele: string;
    campaignContext: string;
    playersOwn: boolean;
    onSurprise?: () => void;
    onGenreChange?: (genre: string) => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-meta font-bold uppercase tracking-wider text-theme-text/80";
  const textClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";

  const typeChoices = $derived(
    businessConfig.typesFor(genre).map((t) => ({ value: t, label: t })),
  );

  /** Randomise everything except the genre, location, clientele, context and ownership, then generate. */
  function surprise() {
    businessType = pickFrom(businessConfig.typesFor(genre) as string[]);
    scale = pickFrom(businessConfig.scales);
    legitimacy = pickFrom(businessConfig.legitimacies);
    wealth = pickFrom(businessConfig.wealth);
    tone = pickFrom(businessConfig.tones);
    if (onSurprise) onSurprise();
  }

  let lastGenre = genre;
  $effect(() => {
    if (genre !== lastGenre) {
      businessType = businessTypeAfterGenreChange(
        lastGenre,
        genre,
        businessType,
      );
      lastGenre = genre;
    }
  });
</script>

<SelectWithCustomOption
  id="business-genre-select"
  label="Genre / Setting"
  bind:value={genre}
  onvaluechange={onGenreChange}
  choices={businessConfig.genres.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
/>

<SelectWithCustomOption
  id="business-type-select"
  label="Business type"
  bind:value={businessType}
  choices={typeChoices}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom business type"
/>

<div class="flex flex-col gap-1.5">
  <label for="business-scale-select" class={labelClass}>Scale</label>
  <select id="business-scale-select" bind:value={scale} class={selectClass}>
    {#each businessConfig.scales as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="business-legitimacy-select" class={labelClass}>Legitimacy</label>
  <select
    id="business-legitimacy-select"
    bind:value={legitimacy}
    class={selectClass}
  >
    {#each businessConfig.legitimacies as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="business-wealth-select" class={labelClass}>Wealth</label>
  <select id="business-wealth-select" bind:value={wealth} class={selectClass}>
    {#each businessConfig.wealth as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="business-tone-select" class={labelClass}>Tone</label>
  <select id="business-tone-select" bind:value={tone} class={selectClass}>
    {#each businessConfig.tones as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="business-location-input" class={labelClass}
    >Location (optional)</label
  >
  <input
    id="business-location-input"
    type="text"
    bind:value={location}
    class={textClass}
  />
</div>

<div class="flex flex-col gap-1.5">
  <label for="business-clientele-input" class={labelClass}
    >Clientele (optional)</label
  >
  <input
    id="business-clientele-input"
    type="text"
    bind:value={clientele}
    class={textClass}
  />
</div>

<div class="flex flex-col gap-1.5">
  <label for="business-context-input" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="business-context-input"
    rows="2"
    bind:value={campaignContext}
    class={textClass}
  ></textarea>
</div>

<label class="flex items-center gap-2 text-xs text-theme-text">
  <input type="checkbox" bind:checked={playersOwn} />
  Players own this business
</label>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={surprise}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-on-primary hover:border-theme-primary transition-all cursor-pointer"
    title="Randomise the business type, scale, legitimacy, wealth and tone while keeping your genre, then generate"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

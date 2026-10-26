<script lang="ts">
  import {
    pointCrawlConfig,
    pickFrom,
  } from "#lib/services/seo/generator-config.js";
  import SelectWithCustomOption from "#lib/components/forms/SelectWithCustomOption.svelte";

  let {
    genre = $bindable(pointCrawlConfig.genres[0]),
    scale = $bindable("Wilderness"),
    pointCount = $bindable("8"),
    density = $bindable("Balanced branching"),
    dangerLevel = $bindable("Moderate"),
    secretFrequency = $bindable("Balanced"),
    premise = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    genre: string;
    scale: string;
    pointCount: string;
    density: string;
    dangerLevel: string;
    secretFrequency: string;
    premise: string;
    campaignContext?: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-meta font-bold uppercase tracking-wider text-theme-text/80";
  const textClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
</script>

<SelectWithCustomOption
  id="point-crawl-genre-select"
  label="Genre / Theme"
  bind:value={genre}
  choices={pointCrawlConfig.genres.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom genre"
/>

<div class="flex flex-col gap-1.5">
  <label for="point-crawl-scale-select" class={labelClass}>Crawl Scale</label>
  <select id="point-crawl-scale-select" bind:value={scale} class={selectClass}>
    {#each pointCrawlConfig.scales as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="point-crawl-point-count-select" class={labelClass}
    >Number of Points</label
  >
  <select
    id="point-crawl-point-count-select"
    bind:value={pointCount}
    class={selectClass}
  >
    {#each pointCrawlConfig.pointCounts as count (count)}
      <option value={String(count)}>{count} points</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="point-crawl-density-select" class={labelClass}
    >Interconnection Density</label
  >
  <select
    id="point-crawl-density-select"
    bind:value={density}
    class={selectClass}
  >
    {#each pointCrawlConfig.densities as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="point-crawl-danger-select" class={labelClass}>Danger Level</label>
  <select
    id="point-crawl-danger-select"
    bind:value={dangerLevel}
    class={selectClass}
  >
    {#each pointCrawlConfig.dangerLevels as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="point-crawl-secret-select" class={labelClass}
    >Secret Route Frequency</label
  >
  <select
    id="point-crawl-secret-select"
    bind:value={secretFrequency}
    class={selectClass}
  >
    {#each pointCrawlConfig.secretFrequencies as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="point-crawl-premise" class={labelClass}
    >Free-Text Premise <span class="font-normal normal-case text-theme-muted"
      >(optional)</span
    ></label
  >
  <textarea
    id="point-crawl-premise"
    bind:value={premise}
    maxlength="1000"
    rows="2"
    placeholder="e.g. A sunken pilgrimage trail leading to a flooded reliquary..."
    class="{textClass} resize-y"
  ></textarea>
</div>

<details class="group rounded-lg border border-theme-border/60 px-3 py-2">
  <summary
    class="cursor-pointer text-meta font-bold uppercase tracking-wider text-theme-text/80"
  >
    Optional campaign context
  </summary>
  <div class="mt-3 flex flex-col gap-2">
    <textarea
      id="point-crawl-campaign-context"
      aria-label="Optional campaign context"
      bind:value={campaignContext}
      maxlength="4000"
      rows="3"
      placeholder="Existing factions, landmarks, or world constraints..."
      class="{textClass} min-h-20 resize-y"
    ></textarea>
  </div>
</details>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      scale = pickFrom(pointCrawlConfig.scales);
      pointCount = String(pickFrom([6, 7, 8, 9, 10, 12]));
      density = pickFrom(pointCrawlConfig.densities);
      dangerLevel = pickFrom(pointCrawlConfig.dangerLevels);
      secretFrequency = pickFrom(pointCrawlConfig.secretFrequencies);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomise scale, size, and density while preserving your genre, then generate"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

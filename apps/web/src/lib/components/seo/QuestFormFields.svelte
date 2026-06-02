<script lang="ts">
  import { questConfig } from "$lib/services/seo/generator-engine";

  let {
    genre = $bindable(questConfig.genres[0]),
    tone = $bindable(questConfig.tones[0]),
    scope = $bindable(questConfig.scopes[0]),
    locationType = $bindable(questConfig.locationTypes[0]),
    threat = $bindable(questConfig.threats[0]),
    campaignContext = $bindable(""),
  }: {
    genre: string;
    tone: string;
    scope: string;
    locationType: string;
    threat: string;
    campaignContext: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<div class="flex flex-col gap-1.5">
  <label for="genre-select" class={labelClass}>Genre</label>
  <select id="genre-select" bind:value={genre} class={selectClass}>
    {#each questConfig.genres as g (g)}
      <option value={g}>{g}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tone-select" class={labelClass}>Tone</label>
  <select id="tone-select" bind:value={tone} class={selectClass}>
    {#each questConfig.tones as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="scope-select" class={labelClass}>Scope</label>
  <select id="scope-select" bind:value={scope} class={selectClass}>
    {#each questConfig.scopes as s (s)}
      <option value={s}>{s}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="location-type-select" class={labelClass}>Location Type</label>
  <select
    id="location-type-select"
    bind:value={locationType}
    class={selectClass}
  >
    {#each questConfig.locationTypes as l (l)}
      <option value={l}>{l}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="threat-select" class={labelClass}>Main Threat</label>
  <select id="threat-select" bind:value={threat} class={selectClass}>
    {#each questConfig.threats as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="quest-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="quest-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="quest-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="quest-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a location, faction, villain, or ongoing campaign tension to tie the
    quest into your table.
  </p>
</div>

<script lang="ts">
  import { kingdomConfig, pickFrom } from "$lib/services/seo/generator-engine";

  let {
    polityType = $bindable(kingdomConfig.polityTypes[0]),
    governmentStyle = $bindable(kingdomConfig.governmentStyles[0]),
    geography = $bindable(kingdomConfig.geographies[0]),
    scale = $bindable(kingdomConfig.scales[2]),
    conflictLevel = $bindable(kingdomConfig.conflictLevels[0]),
    magicLevel = $bindable(kingdomConfig.magicLevels[2]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    polityType: string;
    governmentStyle: string;
    geography: string;
    scale: string;
    conflictLevel: string;
    magicLevel: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<div class="flex flex-col gap-1.5">
  <label for="kingdom-polity-select" class={labelClass}>Polity type</label>
  <select
    id="kingdom-polity-select"
    bind:value={polityType}
    class={selectClass}
  >
    {#each kingdomConfig.polityTypes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="kingdom-govt-select" class={labelClass}>Government style</label>
  <select
    id="kingdom-govt-select"
    bind:value={governmentStyle}
    class={selectClass}
  >
    {#each kingdomConfig.governmentStyles as g (g)}
      <option value={g}>{g}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="kingdom-geo-select" class={labelClass}>Geography</label>
  <select id="kingdom-geo-select" bind:value={geography} class={selectClass}>
    {#each kingdomConfig.geographies as g (g)}
      <option value={g}>{g}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="kingdom-scale-select" class={labelClass}>Scale</label>
  <select id="kingdom-scale-select" bind:value={scale} class={selectClass}>
    {#each kingdomConfig.scales as s (s)}
      <option value={s}>{s}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="kingdom-conflict-select" class={labelClass}>Conflict level</label>
  <select
    id="kingdom-conflict-select"
    bind:value={conflictLevel}
    class={selectClass}
  >
    {#each kingdomConfig.conflictLevels as c (c)}
      <option value={c}>{c}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="kingdom-magic-select" class={labelClass}>Magic level</label>
  <select id="kingdom-magic-select" bind:value={magicLevel} class={selectClass}>
    {#each kingdomConfig.magicLevels as m (m)}
      <option value={m}>{m}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="kingdom-context" class={labelClass}
    >Campaign context (optional)</label
  >
  <textarea
    id="kingdom-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="kingdom-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="kingdom-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a campaign name, ongoing conflict, or political tension to aim the realm
    at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      polityType = pickFrom(kingdomConfig.polityTypes);
      governmentStyle = pickFrom(kingdomConfig.governmentStyles);
      geography = pickFrom(kingdomConfig.geographies);
      scale = pickFrom(kingdomConfig.scales);
      conflictLevel = pickFrom(kingdomConfig.conflictLevels);
      magicLevel = pickFrom(kingdomConfig.magicLevels);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

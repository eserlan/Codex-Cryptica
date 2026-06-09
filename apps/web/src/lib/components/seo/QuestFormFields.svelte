<script lang="ts">
  import {
    questConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";

  let {
    theme = $bindable(factionConfig.themes[0]),
    tone = $bindable(questConfig.tones[0]),
    scope = $bindable(questConfig.scopes[0]),
    locationType = $bindable(questConfig.locationTypes[0]),
    threat = $bindable(questConfig.threats[0]),
    twist = $bindable(questConfig.twists[0]),
    reward = $bindable(questConfig.rewards[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    tone: string;
    scope: string;
    locationType: string;
    threat: string;
    twist: string;
    reward: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";

  const activeTones = $derived(
    questConfig.tonesByTheme[theme] ?? questConfig.tones,
  );
  const activeScopes = $derived(
    questConfig.scopesByTheme[theme] ?? questConfig.scopes,
  );
  const activeLocationTypes = $derived(
    questConfig.locationTypesByTheme[theme] ?? questConfig.locationTypes,
  );
  const activeThreats = $derived(
    questConfig.threatsByTheme[theme] ?? questConfig.threats,
  );
  const activeRewards = $derived(
    questConfig.rewardsByTheme[theme] ?? questConfig.rewards,
  );

  $effect(() => {
    if (!activeTones.includes(tone)) tone = activeTones[0];
    if (!activeScopes.includes(scope)) scope = activeScopes[0];
    if (!activeLocationTypes.includes(locationType))
      locationType = activeLocationTypes[0];
    if (!activeThreats.includes(threat)) threat = activeThreats[0];
    if (!activeRewards.includes(reward)) reward = activeRewards[0];
  });
</script>

<div class="flex flex-col gap-1.5">
  <label for="quest-theme-select" class={labelClass}>Choose a vibe</label>
  <select id="quest-theme-select" bind:value={theme} class={selectClass}>
    {#each factionConfig.themes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="tone-select" class={labelClass}>Tone</label>
  <select id="tone-select" bind:value={tone} class={selectClass}>
    {#each activeTones as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="scope-select" class={labelClass}>Scope</label>
  <select id="scope-select" bind:value={scope} class={selectClass}>
    {#each activeScopes as s (s)}
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
    {#each activeLocationTypes as l (l)}
      <option value={l}>{l}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="threat-select" class={labelClass}>Main Threat</label>
  <select id="threat-select" bind:value={threat} class={selectClass}>
    {#each activeThreats as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="twist-select" class={labelClass}>Twist</label>
  <select id="twist-select" bind:value={twist} class={selectClass}>
    {#each questConfig.twists as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="reward-select" class={labelClass}>Reward</label>
  <select id="reward-select" bind:value={reward} class={selectClass}>
    {#each activeRewards as r (r)}
      <option value={r}>{r}</option>
    {/each}
  </select>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      tone = pickFrom(activeTones);
      scope = pickFrom(activeScopes);
      locationType = pickFrom(activeLocationTypes);
      threat = pickFrom(activeThreats);
      twist = pickFrom(questConfig.twists);
      reward = pickFrom(activeRewards);
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
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
    rows="3"
    aria-describedby="quest-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="quest-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a location, faction, villain, or ongoing campaign tension to tie the
    quest into your table.
  </p>
</div>

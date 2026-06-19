<script lang="ts">
  import {
    questConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

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

<SelectWithCustomOption
  id="quest-theme-select"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="tone-select"
  label="Tone"
  bind:value={tone}
  choices={activeTones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<SelectWithCustomOption
  id="scope-select"
  label="Scope"
  bind:value={scope}
  choices={activeScopes.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scope"
/>

<SelectWithCustomOption
  id="location-type-select"
  label="Location Type"
  bind:value={locationType}
  choices={activeLocationTypes.map((l: string) => ({ value: l, label: l }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom location type"
/>

<SelectWithCustomOption
  id="threat-select"
  label="Main Threat"
  bind:value={threat}
  choices={activeThreats.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom main threat"
/>

<SelectWithCustomOption
  id="twist-select"
  label="Twist"
  bind:value={twist}
  choices={questConfig.twists.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom twist"
/>

<SelectWithCustomOption
  id="reward-select"
  label="Reward"
  bind:value={reward}
  choices={activeRewards.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom reward"
/>

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

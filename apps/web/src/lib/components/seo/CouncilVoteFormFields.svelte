<script lang="ts">
  import {
    councilVoteConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    proposal = $bindable(""),
    governingBodyType = $bindable(councilVoteConfig.bodyTypes[0]),
    councilSize = $bindable(councilVoteConfig.sizes[1]),
    votingRule = $bindable(councilVoteConfig.votingRules[0]),
    deadline = $bindable(""),
    scope = $bindable(councilVoteConfig.scopes[0]),
    tone = $bindable(councilVoteConfig.tones[0]),
    antagonistInfluence = $bindable(councilVoteConfig.antagonistInfluences[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    proposal: string;
    governingBodyType: string;
    councilSize: string;
    votingRule: string;
    deadline: string;
    scope: string;
    tone: string;
    antagonistInfluence: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const inputClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<div class="flex flex-col gap-1.5">
  <label for="council-vote-proposal" class={labelClass}
    >Proposal / Desired Outcome (optional)</label
  >
  <textarea
    id="council-vote-proposal"
    bind:value={proposal}
    maxlength="400"
    rows="2"
    placeholder="e.g. raise an army, appoint an official, open a vault, recognise a claimant"
    class="{inputClass} min-h-16 resize-y"
  ></textarea>
</div>

<SelectWithCustomOption
  id="council-vote-body-select"
  label="Governing Body"
  bind:value={governingBodyType}
  choices={councilVoteConfig.bodyTypes.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom governing body"
/>

<SelectWithCustomOption
  id="council-vote-size-select"
  label="Council Size"
  bind:value={councilSize}
  choices={councilVoteConfig.sizes.map((s: string) => ({
    value: s,
    label: `${s} seats`,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
/>

<SelectWithCustomOption
  id="council-vote-rule-select"
  label="Voting Rule"
  bind:value={votingRule}
  choices={councilVoteConfig.votingRules.map((r: string) => ({
    value: r,
    label: r,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom voting rule"
/>

<div class="flex flex-col gap-1.5">
  <label for="council-vote-deadline" class={labelClass}
    >Deadline / Time Pressure (optional)</label
  >
  <input
    id="council-vote-deadline"
    type="text"
    bind:value={deadline}
    maxlength="120"
    placeholder="e.g. before the harvest moon, within three days"
    class={inputClass}
  />
</div>

<SelectWithCustomOption
  id="council-vote-scope-select"
  label="Scope"
  bind:value={scope}
  choices={councilVoteConfig.scopes.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
/>

<SelectWithCustomOption
  id="council-vote-tone-select"
  label="Tone"
  bind:value={tone}
  choices={councilVoteConfig.tones.map((t: string) => ({
    value: t,
    label: t,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
  customPlaceholder="Enter a custom tone"
/>

<SelectWithCustomOption
  id="council-vote-antagonist-select"
  label="Antagonist Influence"
  bind:value={antagonistInfluence}
  choices={councilVoteConfig.antagonistInfluences.map((a: string) => ({
    value: a,
    label: a,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  {inputClass}
/>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      governingBodyType = pickFrom(councilVoteConfig.bodyTypes);
      councilSize = pickFrom(councilVoteConfig.sizes);
      votingRule = pickFrom(councilVoteConfig.votingRules);
      scope = pickFrom(councilVoteConfig.scopes);
      tone = pickFrom(councilVoteConfig.tones);
      antagonistInfluence = pickFrom(councilVoteConfig.antagonistInfluences);
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
  <label for="council-vote-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="council-vote-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    aria-describedby="council-vote-campaign-context-help"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="council-vote-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a faction, ruler, threat, or ongoing campaign tension the vote should
    connect to.
  </p>
</div>

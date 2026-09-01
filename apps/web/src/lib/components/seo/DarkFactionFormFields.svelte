<script lang="ts">
  import { darkFactionConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    mode = $bindable(darkFactionConfig.modes[0]),
    factionType = $bindable(darkFactionConfig.types[0]),
    scope = $bindable(darkFactionConfig.scopes[0]),
    moralPosture = $bindable(darkFactionConfig.moralPostures[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    mode: string;
    factionType: string;
    scope: string;
    moralPosture: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<SelectWithCustomOption
  id="dark-faction-mode-select"
  name="dark_faction_mode"
  label="Dark fantasy mode"
  bind:value={mode}
  choices={darkFactionConfig.modes.map((m: string) => ({ value: m, label: m }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom mode"
/>

<SelectWithCustomOption
  id="dark-faction-type-select"
  name="dark_faction_type"
  label="Faction type"
  bind:value={factionType}
  choices={darkFactionConfig.types.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom faction type"
/>

<SelectWithCustomOption
  id="dark-faction-scope-select"
  name="dark_faction_scope"
  label="Operating scope"
  bind:value={scope}
  choices={darkFactionConfig.scopes.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scope"
/>

<SelectWithCustomOption
  id="dark-faction-moral-posture-select"
  name="dark_faction_moral_posture"
  label="Moral posture"
  bind:value={moralPosture}
  choices={darkFactionConfig.moralPostures.map((p: string) => ({
    value: p,
    label: p,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom moral posture"
/>

<div class="flex flex-col gap-1.5">
  <label for="dark-faction-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="dark-faction-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="4"
    aria-describedby="dark-faction-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="dark-faction-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a cursed kingdom, plague city, or ongoing crisis to aim the faction at
    your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      mode =
        darkFactionConfig.modes[
          Math.floor(Math.random() * darkFactionConfig.modes.length)
        ];
      factionType =
        darkFactionConfig.types[
          Math.floor(Math.random() * darkFactionConfig.types.length)
        ];
      scope =
        darkFactionConfig.scopes[
          Math.floor(Math.random() * darkFactionConfig.scopes.length)
        ];
      moralPosture =
        darkFactionConfig.moralPostures[
          Math.floor(Math.random() * darkFactionConfig.moralPostures.length)
        ];
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

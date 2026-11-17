<script lang="ts">
  import { urbanFantasyFactionConfig } from "#lib/services/seo/generator-config.js";
  import SelectWithCustomOption from "#lib/components/forms/SelectWithCustomOption.svelte";

  let {
    mode = $bindable(urbanFantasyFactionConfig.modes[0]),
    factionType = $bindable(urbanFantasyFactionConfig.types[0]),
    scope = $bindable(urbanFantasyFactionConfig.scopes[0]),
    moralPosture = $bindable(urbanFantasyFactionConfig.moralPostures[0]),
    campaignContext = $bindable(""),
    isBusy,
    onSurprise = undefined,
  }: {
    mode: string;
    factionType: string;
    scope: string;
    moralPosture: string;
    campaignContext: string;
    isBusy: boolean;
    onSurprise?: () => void;
  } = $props();

  let selectReset = $state(0);
  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-xs font-bold uppercase tracking-wider text-theme-text";
</script>

{#key selectReset}
  <SelectWithCustomOption
    id="urban-fantasy-mode-select"
    name="urban_fantasy_mode"
    label="Urban fantasy mode"
    bind:value={mode}
    choices={urbanFantasyFactionConfig.modes.map((value) => ({
      value,
      label: value,
    }))}
    className="flex flex-col gap-1.5"
    {labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom mode"
  />

  <SelectWithCustomOption
    id="urban-fantasy-faction-type-select"
    name="urban_fantasy_faction_type"
    label="Faction type"
    bind:value={factionType}
    choices={urbanFantasyFactionConfig.types.map((value) => ({
      value,
      label: value,
    }))}
    className="flex flex-col gap-1.5"
    {labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom faction type"
  />

  <SelectWithCustomOption
    id="urban-fantasy-scope-select"
    name="urban_fantasy_scope"
    label="Operating scope"
    bind:value={scope}
    choices={urbanFantasyFactionConfig.scopes.map((value) => ({
      value,
      label: value,
    }))}
    className="flex flex-col gap-1.5"
    {labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom scope"
  />

  <SelectWithCustomOption
    id="urban-fantasy-moral-posture-select"
    name="urban_fantasy_moral_posture"
    label="Moral posture"
    bind:value={moralPosture}
    choices={urbanFantasyFactionConfig.moralPostures.map((value) => ({
      value,
      label: value,
    }))}
    className="flex flex-col gap-1.5"
    {labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom moral posture"
  />
{/key}

<div class="flex flex-col gap-1.5">
  <label for="urban-fantasy-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="urban-fantasy-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="4"
    aria-describedby="urban-fantasy-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="urban-fantasy-campaign-context-help"
    class="text-xs text-theme-text leading-relaxed"
  >
    Add a city, neighbourhood, hidden community, or current conflict to shape
    the faction.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      if (isBusy) return;

      mode =
        urbanFantasyFactionConfig.modes[
          Math.floor(Math.random() * urbanFantasyFactionConfig.modes.length)
        ];
      factionType =
        urbanFantasyFactionConfig.types[
          Math.floor(Math.random() * urbanFantasyFactionConfig.types.length)
        ];
      scope =
        urbanFantasyFactionConfig.scopes[
          Math.floor(Math.random() * urbanFantasyFactionConfig.scopes.length)
        ];
      moralPosture =
        urbanFantasyFactionConfig.moralPostures[
          Math.floor(
            Math.random() * urbanFantasyFactionConfig.moralPostures.length,
          )
        ];
      selectReset += 1;
      onSurprise?.();
    }}
    disabled={isBusy}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-xs font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-on-primary hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize options and generate an urban fantasy faction"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

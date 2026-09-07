<script lang="ts">
  import {
    factionConfig,
    factionRosterConfig,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    size = $bindable(factionRosterConfig.sizes[1]),
    structure = $bindable(factionRosterConfig.structures[0]),
    emphasis = $bindable(factionRosterConfig.emphases[0]),
    factionContext = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    size: string;
    structure: string;
    emphasis: string;
    factionContext: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<div class="flex flex-col gap-1.5">
  <label for="faction-roster-context" class={labelClass}>The faction</label>
  <textarea
    id="faction-roster-context"
    bind:value={factionContext}
    required
    maxlength="4000"
    rows="4"
    aria-describedby="faction-roster-context-help"
    placeholder="Paste a generated faction here, or describe one: its goal, resources, base, and internal conflict."
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="faction-roster-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    The roster inherits this faction's ideology, goals, methods, and internal
    tensions — the more specific this is, the more the members reflect it.
  </p>
</div>

<SelectWithCustomOption
  id="faction-roster-theme-select"
  name="faction_roster_theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="faction-roster-size-select"
  name="faction_roster_size"
  label="Roster size"
  bind:value={size}
  choices={factionRosterConfig.sizes.map((s: string) => ({
    value: s,
    label: `${s} members`,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
/>

<SelectWithCustomOption
  id="faction-roster-structure-select"
  name="faction_roster_structure"
  label="How the faction is organised"
  bind:value={structure}
  choices={factionRosterConfig.structures.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom structure"
/>

<SelectWithCustomOption
  id="faction-roster-emphasis-select"
  name="faction_roster_emphasis"
  label="Roster emphasis"
  bind:value={emphasis}
  choices={factionRosterConfig.emphases.map((e: string) => ({
    value: e,
    label: e,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom emphasis"
/>

<div class="flex flex-col gap-1.5">
  <label for="faction-roster-campaign-context" class={labelClass}
    >Add campaign context (optional)</label
  >
  <textarea
    id="faction-roster-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="4000"
    rows="3"
    class="w-full min-h-20 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      size =
        factionRosterConfig.sizes[
          Math.floor(Math.random() * factionRosterConfig.sizes.length)
        ];
      structure =
        factionRosterConfig.structures[
          Math.floor(Math.random() * factionRosterConfig.structures.length)
        ];
      emphasis =
        factionRosterConfig.emphases[
          Math.floor(Math.random() * factionRosterConfig.emphases.length)
        ];
      if (onSurprise) {
        onSurprise();
      }
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize size, structure, and emphasis, and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5" aria-hidden="true"></span>
    Surprise Me
  </button>
</div>

<script lang="ts">
  import {
    dungeonConfig,
    factionConfig,
    pickFrom,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    theme = $bindable(factionConfig.themes[0]),
    purpose = $bindable(dungeonConfig.purposes[0]),
    currentState = $bindable(dungeonConfig.currentStates[0]),
    scale = $bindable(dungeonConfig.scales[1]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    purpose: string;
    currentState: string;
    scale: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full min-h-12 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
  const helpClass =
    "text-sm text-theme-text/70 leading-6 md:text-[13px] md:leading-relaxed -mt-0.5 text-wrap-pretty";

  const PURPOSE_HELP: Record<string, string> = {
    "Temple & Shrine":
      "Sacred dwarven or planar sanctuary originally dedicated to a higher power.",
    "Fortress & Citadel":
      "Subterranean military stronghold designed to withstand siege or containment.",
    "Tomb & Catacomb":
      "Burial vault or catacomb complex protecting ancient relics.",
    "Mine & Shafts":
      "Deep excavation network following precious ore or arcane veins.",
    "Research Facility":
      "Black-budget testing vault, laboratory, or alien observation site.",
    "Prison & Vault":
      "High-security lockup built to seal away dangerous entities or artefacts.",
    "Natural Cavern Network":
      "Eroded subterranean tunnels, underground rivers, or volcanic tubes.",
    "Planar Anomaly":
      "Unstable dimensional rift or reality-warping pocket plane.",
  };
</script>

<SelectWithCustomOption
  id="dungeon-theme-select"
  name="dungeon_theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="dungeon-purpose-select"
  label="Original Purpose"
  bind:value={purpose}
  choices={dungeonConfig.purposes.map((p: string) => ({ value: p, label: p }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  describedBy={PURPOSE_HELP[purpose] ? "dungeon-purpose-help" : undefined}
  customPlaceholder="Enter custom purpose (e.g. Submerged Beacon)"
/>
{#if PURPOSE_HELP[purpose]}
  <p id="dungeon-purpose-help" class={helpClass}>{PURPOSE_HELP[purpose]}</p>
{/if}

<SelectWithCustomOption
  id="dungeon-state-select"
  label="Current State & Function"
  bind:value={currentState}
  choices={dungeonConfig.currentStates.map((s: string) => ({
    value: s,
    label: s,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom state (e.g. Submerged in Brine)"
/>

<SelectWithCustomOption
  id="dungeon-scale-select"
  label="Complex Scale"
  bind:value={scale}
  choices={dungeonConfig.scales.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter custom scale"
/>

<div class="flex flex-col gap-1.5">
  <label for="dungeon-context" class={labelClass}
    >World context (optional)</label
  >
  <textarea
    id="dungeon-context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="dungeon-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2.5 text-base md:text-sm leading-6 text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="dungeon-context-help"
    class="text-sm text-theme-text/70 leading-6 md:text-[13px] md:leading-relaxed text-wrap-pretty"
  >
    Describe the surrounding region, controlling faction, or campaign
    environment.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
    onclick={() => {
      purpose = pickFrom(dungeonConfig.purposes);
      currentState = pickFrom(dungeonConfig.currentStates);
      scale = pickFrom(dungeonConfig.scales);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

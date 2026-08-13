<script lang="ts">
  import {
    dungeonConfig,
    factionConfig,
    forDungeonGenre,
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
    "Data Vault & Archive":
      "Off-grid records store holding backups and research nobody admits exists.",
    "Bio-Containment Wing":
      "Quarantine and isolation labs built to hold specimens that shouldn't escape.",
    "Fallout Shelter":
      "Hardened civil-defence bunker stocked for years of life underground.",
    "Ancestral Mausoleum":
      "Family crypt built to outlast the bloodline it was meant to honour.",
    "Pirate Cove & Smuggler's Hold":
      "Hidden tidal anchorage, powder store, and shareout hall for a crew with no home port.",
    "Mech Bay & Hangar":
      "Sub-surface maintenance bay and hardpoint cache for frames too large to service topside.",
    "Rail Tunnel & Depot":
      "Freight tunnel, siding, and depot bored through the range for a line that stalled.",
    "Clockwork Engine Works":
      "Subterranean engine house and pressure gallery driving the machinery of the city above.",
    "Black Site":
      "Unlisted detention and research installation outside every applicable jurisdiction.",
  };

  // Only offer purposes/states that suit the chosen vibe. Uses the same
  // resolver as the engine so the dropdown can never offer an option the
  // generator wouldn't pick on its own.
  const availablePurposes = $derived(
    forDungeonGenre(dungeonConfig.purposesByGenre, theme),
  );
  const availableStates = $derived(
    forDungeonGenre(dungeonConfig.currentStatesByGenre, theme),
  );
  // Known values across every genre — used so a *custom* purpose/state the user
  // typed is never clobbered when the vibe changes, matching FactionFormFields.
  const knownPurposes = dungeonConfig.purposes;
  const knownStates = dungeonConfig.currentStates;

  $effect(() => {
    if (
      purpose &&
      knownPurposes.includes(purpose) &&
      !availablePurposes.includes(purpose)
    ) {
      purpose = availablePurposes[0];
    }
  });

  $effect(() => {
    if (
      currentState &&
      knownStates.includes(currentState) &&
      !availableStates.includes(currentState)
    ) {
      currentState = availableStates[0];
    }
  });
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
  choices={availablePurposes.map((p: string) => ({ value: p, label: p }))}
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
  choices={availableStates.map((s: string) => ({
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
    maxlength="4000"
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
      purpose = pickFrom(availablePurposes);
      currentState = pickFrom(availableStates);
      scale = pickFrom(dungeonConfig.scales);
      onSurprise?.();
    }}
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

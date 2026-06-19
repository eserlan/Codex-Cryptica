<script lang="ts">
  import { kingdomConfig, pickFrom } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

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

<SelectWithCustomOption
  id="kingdom-polity-select"
  label="Polity type"
  bind:value={polityType}
  choices={kingdomConfig.polityTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom polity type"
/>

<SelectWithCustomOption
  id="kingdom-govt-select"
  label="Government style"
  bind:value={governmentStyle}
  choices={kingdomConfig.governmentStyles.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom government style"
/>

<SelectWithCustomOption
  id="kingdom-geo-select"
  label="Geography"
  bind:value={geography}
  choices={kingdomConfig.geographies.map((g: string) => ({ value: g, label: g }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom geography"
/>

<SelectWithCustomOption
  id="kingdom-scale-select"
  label="Scale"
  bind:value={scale}
  choices={kingdomConfig.scales.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scale"
/>

<SelectWithCustomOption
  id="kingdom-conflict-select"
  label="Conflict level"
  bind:value={conflictLevel}
  choices={kingdomConfig.conflictLevels.map((c: string) => ({ value: c, label: c }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom conflict level"
/>

<SelectWithCustomOption
  id="kingdom-magic-select"
  label="Magic level"
  bind:value={magicLevel}
  choices={kingdomConfig.magicLevels.map((m: string) => ({ value: m, label: m }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom magic level"
/>

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

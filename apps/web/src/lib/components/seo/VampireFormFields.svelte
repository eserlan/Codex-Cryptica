<script lang="ts">
  import { vampireConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    archetype = $bindable(vampireConfig.archetypes[0]),
    bloodline = $bindable(vampireConfig.bloodlines[0]),
    feedingHabit = $bindable(vampireConfig.feedingHabits[0]),
    weakness = $bindable(vampireConfig.weaknesses[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    archetype: string;
    bloodline: string;
    feedingHabit: string;
    weakness: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
  const hintClass = "text-[9px] text-theme-muted/75 leading-snug";

  function getParenthetical(val: string) {
    return val.match(/\(([^)]+)\)/)?.[1] ?? "";
  }

  const feedingHint = $derived(getParenthetical(feedingHabit));
  const weaknessHint = $derived(getParenthetical(weakness));
</script>

<SelectWithCustomOption
  id="vampire-archetype-select"
  name="vampire_archetype"
  label="Choose their nature"
  bind:value={archetype}
  choices={vampireConfig.archetypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom nature"
/>

<SelectWithCustomOption
  id="vampire-bloodline-select"
  name="vampire_bloodline"
  label="Choose their bloodline"
  bind:value={bloodline}
  choices={vampireConfig.bloodlines.map((b: string) => ({ value: b, label: b }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom bloodline"
/>

<div class="flex flex-col gap-1.5">
  <SelectWithCustomOption
    id="vampire-feeding-select"
    name="vampire_feeding"
    label="Choose how they feed"
    bind:value={feedingHabit}
    choices={vampireConfig.feedingHabits.map((f: string) => ({ value: f, label: f }))}
    className="flex flex-col gap-1.5"
    labelClass={labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom feeding habit"
  />
  {#if feedingHint}
    <p class={hintClass}>{feedingHint}</p>
  {/if}
</div>

<div class="flex flex-col gap-1.5">
  <SelectWithCustomOption
    id="vampire-weakness-select"
    name="vampire_weakness"
    label="Choose their weakness"
    bind:value={weakness}
    choices={vampireConfig.weaknesses.map((w: string) => ({ value: w, label: w }))}
    className="flex flex-col gap-1.5"
    labelClass={labelClass}
    inputClass={selectClass}
    customPlaceholder="Enter a custom weakness"
  />
  {#if weaknessHint}
    <p class={hintClass}>{weaknessHint}</p>
  {/if}
</div>

<div class="flex flex-col gap-1.5">
  <label for="vampire-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="vampire-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="vampire-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="vampire-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a city, gothic metropolis, investigator guild, or campaign threat to aim
    the clan at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      archetype =
        vampireConfig.archetypes[
          Math.floor(Math.random() * vampireConfig.archetypes.length)
        ];
      bloodline =
        vampireConfig.bloodlines[
          Math.floor(Math.random() * vampireConfig.bloodlines.length)
        ];
      feedingHabit =
        vampireConfig.feedingHabits[
          Math.floor(Math.random() * vampireConfig.feedingHabits.length)
        ];
      weakness =
        vampireConfig.weaknesses[
          Math.floor(Math.random() * vampireConfig.weaknesses.length)
        ];
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

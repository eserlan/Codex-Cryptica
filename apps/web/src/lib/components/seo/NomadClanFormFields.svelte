<script lang="ts">
  import { nomadClanConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    role = $bindable(nomadClanConfig.roles[0]),
    tone = $bindable(nomadClanConfig.tones[0]),
    territory = $bindable(nomadClanConfig.territories[0]),
    conflict = $bindable(nomadClanConfig.conflicts[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    role: string;
    tone: string;
    territory: string;
    conflict: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<SelectWithCustomOption
  id="nomad-role-select"
  name="nomad_role"
  label="Clan role"
  bind:value={role}
  choices={nomadClanConfig.roles.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom role"
/>

<SelectWithCustomOption
  id="nomad-tone-select"
  name="nomad_tone"
  label="Tone"
  bind:value={tone}
  choices={nomadClanConfig.tones.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom tone"
/>

<SelectWithCustomOption
  id="nomad-territory-select"
  name="nomad_territory"
  label="Primary territory"
  bind:value={territory}
  choices={nomadClanConfig.territories.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom territory"
/>

<SelectWithCustomOption
  id="nomad-conflict-select"
  name="nomad_conflict"
  label="Main conflict"
  bind:value={conflict}
  choices={nomadClanConfig.conflicts.map((c: string) => ({ value: c, label: c }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom conflict"
/>

<div class="flex flex-col gap-1.5">
  <label for="nomad-campaign-context" class={labelClass}>Add campaign context</label>
  <textarea
    id="nomad-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="nomad-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="nomad-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a city, megacorp, rival clan, or active threat to aim the clan at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      role = nomadClanConfig.roles[Math.floor(Math.random() * nomadClanConfig.roles.length)];
      tone = nomadClanConfig.tones[Math.floor(Math.random() * nomadClanConfig.tones.length)];
      territory = nomadClanConfig.territories[Math.floor(Math.random() * nomadClanConfig.territories.length)];
      conflict = nomadClanConfig.conflicts[Math.floor(Math.random() * nomadClanConfig.conflicts.length)];
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

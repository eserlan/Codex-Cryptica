<script lang="ts">
  import { npcConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

  let {
    race = $bindable(npcConfig.races[0]),
    role = $bindable(npcConfig.roles[0]),
    alignment = $bindable(npcConfig.alignments[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    race: string;
    role: string;
    alignment: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";
</script>

<SelectWithCustomOption
  id="npc-race-select"
  name="npc_race"
  label="Choose their ancestry"
  bind:value={race}
  choices={npcConfig.races.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom ancestry"
/>

<SelectWithCustomOption
  id="npc-role-select"
  name="npc_role"
  label="Choose their role"
  bind:value={role}
  choices={npcConfig.roles.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom role"
/>

<SelectWithCustomOption
  id="npc-alignment-select"
  name="npc_alignment"
  label="Choose their morality"
  bind:value={alignment}
  choices={npcConfig.alignments.map((a: string) => ({ value: a, label: a }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom morality"
/>

<div class="flex flex-col gap-1.5">
  <label for="npc-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="npc-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="npc-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="npc-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a city, faction, dungeon, or current campaign problem to aim the NPC at
    your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      race =
        npcConfig.races[Math.floor(Math.random() * npcConfig.races.length)];
      role =
        npcConfig.roles[Math.floor(Math.random() * npcConfig.roles.length)];
      alignment =
        npcConfig.alignments[
          Math.floor(Math.random() * npcConfig.alignments.length)
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

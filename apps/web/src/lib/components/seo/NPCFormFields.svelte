<script lang="ts">
  import { npcConfig } from "$lib/services/seo/generator-engine";

  let {
    race = $bindable(npcConfig.races[0]),
    role = $bindable(npcConfig.roles[0]),
    alignment = $bindable(npcConfig.alignments[0]),
    campaignContext = $bindable(""),
  }: {
    race: string;
    role: string;
    alignment: string;
    campaignContext: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<div class="flex flex-col gap-1.5">
  <label for="race-select" class={labelClass}>Race</label>
  <select id="race-select" bind:value={race} class={selectClass}>
    {#each npcConfig.races as r (r)}
      <option value={r}>{r}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="role-select" class={labelClass}>Role / Class</label>
  <select id="role-select" bind:value={role} class={selectClass}>
    {#each npcConfig.roles as r (r)}
      <option value={r}>{r}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="alignment-select" class={labelClass}>Alignment</label>
  <select id="alignment-select" bind:value={alignment} class={selectClass}>
    {#each npcConfig.alignments as a (a)}
      <option value={a}>{a}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a city, faction, dungeon, or current campaign problem to aim the NPC at
    your table.
  </p>
</div>

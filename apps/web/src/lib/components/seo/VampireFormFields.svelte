<script lang="ts">
  import { vampireConfig } from "$lib/services/seo/generator-engine";

  let {
    archetype = $bindable(vampireConfig.archetypes[0]),
    bloodline = $bindable(vampireConfig.bloodlines[0]),
    feedingHabit = $bindable(vampireConfig.feedingHabits[0]),
    weakness = $bindable(vampireConfig.weaknesses[0]),
    campaignContext = $bindable(""),
  }: {
    archetype: string;
    bloodline: string;
    feedingHabit: string;
    weakness: string;
    campaignContext: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<div class="flex flex-col gap-1.5">
  <label for="vampire-archetype-select" class={labelClass}>Clan Archetype</label
  >
  <select
    id="vampire-archetype-select"
    name="vampire_archetype"
    bind:value={archetype}
    class={selectClass}
  >
    {#each vampireConfig.archetypes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="vampire-bloodline-select" class={labelClass}
    >Bloodline / Heritage</label
  >
  <select
    id="vampire-bloodline-select"
    name="vampire_bloodline"
    bind:value={bloodline}
    class={selectClass}
  >
    {#each vampireConfig.bloodlines as b (b)}
      <option value={b}>{b}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="vampire-feeding-select" class={labelClass}>Feeding Habit</label>
  <select
    id="vampire-feeding-select"
    name="vampire_feeding"
    bind:value={feedingHabit}
    class={selectClass}
  >
    {#each vampireConfig.feedingHabits as f (f)}
      <option value={f}>{f}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="vampire-weakness-select" class={labelClass}>Clan Weakness</label>
  <select
    id="vampire-weakness-select"
    name="vampire_weakness"
    bind:value={weakness}
    class={selectClass}
  >
    {#each vampireConfig.weaknesses as w (w)}
      <option value={w}>{w}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="vampire-campaign-context" class={labelClass}
    >Optional Campaign Context</label
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
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a city, gothic metropolis, investigator guild, or campaign threat to aim
    the clan at your table.
  </p>
</div>

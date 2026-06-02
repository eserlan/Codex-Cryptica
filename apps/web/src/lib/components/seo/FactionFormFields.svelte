<script lang="ts">
  import { factionConfig } from "$lib/services/seo/generator-engine";

  let {
    type = $bindable(factionConfig.types[0]),
    scope = $bindable(factionConfig.scopes[1]),
    alignment = $bindable(factionConfig.alignments[0]),
    campaignContext = $bindable(""),
  }: {
    type: string;
    scope: string;
    alignment: string;
    campaignContext: string;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<div class="flex flex-col gap-1.5">
  <label for="faction-type-select" class={labelClass}>Faction Type</label>
  <select
    id="faction-type-select"
    name="faction_type"
    bind:value={type}
    class={selectClass}
  >
    {#each factionConfig.types as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="faction-scope-select" class={labelClass}>Operating Scope</label>
  <select
    id="faction-scope-select"
    name="faction_scope"
    bind:value={scope}
    class={selectClass}
  >
    {#each factionConfig.scopes as s (s)}
      <option value={s}>{s}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="faction-alignment-select" class={labelClass}>Moral Posture</label>
  <select
    id="faction-alignment-select"
    name="faction_alignment"
    bind:value={alignment}
    class={selectClass}
  >
    {#each factionConfig.alignments as a (a)}
      <option value={a}>{a}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="faction-campaign-context" class={labelClass}
    >Optional Campaign Context</label
  >
  <textarea
    id="faction-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="faction-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="faction-campaign-context-help"
    class="text-[10px] text-theme-muted leading-relaxed"
  >
    Add a city, frontier, villain, war, or campaign tension to aim the faction
    at your table.
  </p>
</div>

<script lang="ts">
  import {
    factionConfig,
    npcThemeConfig,
    npcConfig,
  } from "$lib/services/seo/generator-engine";

  let {
    theme = $bindable(factionConfig.themes[0]),
    ancestry = $bindable(""),
    role = $bindable(""),
    alignment = $bindable(""),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    ancestry: string;
    role: string;
    alignment: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  const availableAncestries = $derived(
    npcThemeConfig.ancestries[theme] ?? npcConfig.races,
  );
  const availableRoles = $derived(
    npcThemeConfig.roles[theme] ?? npcConfig.roles,
  );
  const availableMoralities = $derived(npcThemeConfig.moralities[theme] ?? []);

  $effect(() => {
    if (!availableAncestries.includes(ancestry)) {
      ancestry = availableAncestries[0];
    }
  });

  $effect(() => {
    if (!availableRoles.includes(role)) {
      role = availableRoles[0];
    }
  });

  $effect(() => {
    const ids = availableMoralities.map((m) => m.id);
    if (!ids.includes(alignment)) {
      alignment = ids[0] ?? "";
    }
  });
</script>

<div class="flex flex-col gap-1.5">
  <label for="rpgnpc-theme-select" class={labelClass}>Choose a vibe</label>
  <select
    id="rpgnpc-theme-select"
    name="npc_theme"
    bind:value={theme}
    class={selectClass}
  >
    {#each factionConfig.themes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="rpgnpc-ancestry-select" class={labelClass}
    >Choose their ancestry</label
  >
  <select
    id="rpgnpc-ancestry-select"
    name="npc_ancestry"
    bind:value={ancestry}
    class={selectClass}
  >
    {#each availableAncestries as a (a)}
      <option value={a}>{a}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="rpgnpc-role-select" class={labelClass}>Choose their role</label>
  <select
    id="rpgnpc-role-select"
    name="npc_role"
    bind:value={role}
    class={selectClass}
  >
    {#each availableRoles as r (r)}
      <option value={r}>{r}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="rpgnpc-alignment-select" class={labelClass}
    >Choose their moral stance</label
  >
  <select
    id="rpgnpc-alignment-select"
    name="npc_alignment"
    bind:value={alignment}
    class={selectClass}
  >
    {#each availableMoralities as m (m.id)}
      <option value={m.id}>{m.label}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="rpgnpc-campaign-context" class={labelClass}
    >Add campaign context</label
  >
  <textarea
    id="rpgnpc-campaign-context"
    name="campaign_context"
    bind:value={campaignContext}
    maxlength="240"
    rows="4"
    aria-describedby="rpgnpc-campaign-context-help"
    class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
  ></textarea>
  <p
    id="rpgnpc-campaign-context-help"
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a location, faction, villain, or active problem to aim the NPC at your
    table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      ancestry =
        availableAncestries[
          Math.floor(Math.random() * availableAncestries.length)
        ];
      role = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      if (availableMoralities.length) {
        alignment =
          availableMoralities[
            Math.floor(Math.random() * availableMoralities.length)
          ].id;
      }
      if (onSurprise) onSurprise();
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

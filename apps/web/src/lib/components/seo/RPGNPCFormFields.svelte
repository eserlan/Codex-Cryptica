<script lang="ts">
  import {
    factionConfig,
    npcThemeConfig,
    npcConfig,
  } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

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
  type MoralityOption = { id: string; label: string };

  const availableAncestries = $derived(
    npcThemeConfig.ancestries[theme] ?? npcConfig.races,
  );
  const availableRoles = $derived(
    npcThemeConfig.roles[theme] ?? npcConfig.roles,
  );
  const availableMoralities = $derived(npcThemeConfig.moralities[theme] ?? []);
  const knownAncestries = $derived(
    Array.from(
      new Set([
        ...npcConfig.races,
        ...((Object.values(npcThemeConfig.ancestries) as string[][]).flat()),
      ]),
    ),
  );
  const knownRoles = $derived(
    Array.from(
      new Set([
        ...npcConfig.roles,
        ...((Object.values(npcThemeConfig.roles) as string[][]).flat()),
      ]),
    ),
  );
  const allMoralities = $derived(
    (Object.values(npcThemeConfig.moralities) as MoralityOption[][]).flat(),
  );
  const knownMoralityIds = $derived(
    Array.from(
      new Set(allMoralities.map((morality: MoralityOption) => morality.id)),
    ),
  );

  $effect(() => {
    if (
      ancestry &&
      knownAncestries.includes(ancestry) &&
      !availableAncestries.includes(ancestry)
    ) {
      ancestry = availableAncestries[0];
    }
  });

  $effect(() => {
    if (role && knownRoles.includes(role) && !availableRoles.includes(role)) {
      role = availableRoles[0];
    }
  });

  $effect(() => {
    const ids = availableMoralities.map((m: MoralityOption) => m.id);
    if (alignment && knownMoralityIds.includes(alignment) && !ids.includes(alignment)) {
      alignment = ids[0] ?? "";
    }
  });
</script>

<SelectWithCustomOption
  id="rpgnpc-theme-select"
  name="npc_theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="rpgnpc-ancestry-select"
  name="npc_ancestry"
  label="Choose their ancestry"
  bind:value={ancestry}
  choices={availableAncestries.map((a: string) => ({ value: a, label: a }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom ancestry"
/>

<SelectWithCustomOption
  id="rpgnpc-role-select"
  name="npc_role"
  label="Choose their role"
  bind:value={role}
  choices={availableRoles.map((r: string) => ({ value: r, label: r }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom role"
/>

<SelectWithCustomOption
  id="rpgnpc-alignment-select"
  name="npc_alignment"
  label="Choose their moral stance"
  bind:value={alignment}
  choices={availableMoralities.map((m: MoralityOption) => ({
    value: m.id,
    label: m.label,
  }))}
  className="flex flex-col gap-1.5"
  labelClass={labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom moral stance"
/>

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

<script lang="ts">
  import { factionConfig } from "$lib/services/seo/generator-engine";

  let {
    theme = $bindable(factionConfig.themes[0]),
    type = $bindable(factionConfig.types[0]),
    scope = $bindable(factionConfig.scopes[1]),
    alignment = $bindable(factionConfig.alignments[0]),
    campaignContext = $bindable(""),
    onSurprise = undefined,
  }: {
    theme: string;
    type: string;
    scope: string;
    alignment: string;
    campaignContext: string;
    onSurprise?: () => void;
  } = $props();

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-text/80";

  const thematicTypes: Record<string, string[]> = {
    "Classic Fantasy": [
      "Temple Order",
      "Arcane Circle",
      "Merchant Guild",
      "Secret Society",
      "Mercenary Company",
      "Criminal Syndicate",
      "Rebel Cell",
    ],
    "Cyberpunk / Corporate": [
      "Megacorporation Megagroup",
      "Corporate Syndicate",
      "Rebel Cell",
      "Hacker Collective",
      "Street Gang Alliance",
      "Secret Society",
      "Mercenary Company",
    ],
    "Vampire / Gothic Noir": [
      "Vampire Coven",
      "Arcane Circle",
      "Temple Order",
      "Inquisition Watch",
      "Secret Society",
      "Criminal Syndicate",
    ],
    "Sci-Fi / Space Opera": [
      "Megacorporation Megagroup",
      "Stellar Federation Alliance",
      "Rebel Cell",
      "Mercenary Company",
      "Merchant Guild",
      "Secret Society",
    ],
    "Modern Conspiracy": [
      "Secret Society",
      "Intelligence Agency",
      "Criminal Syndicate",
      "Corporate Syndicate",
      "Hacker Collective",
    ],
    "Post-Apocalyptic": [
      "Scavenger Tribe",
      "Rebel Cell",
      "Wasteland Cult",
      "Mercenary Company",
      "Street Gang Alliance",
    ],
  };

  const availableTypes = $derived(thematicTypes[theme] || factionConfig.types);

  $effect(() => {
    if (theme && !availableTypes.includes(type)) {
      type = availableTypes[0] || factionConfig.types[0];
    }
  });
</script>

<div class="flex flex-col gap-1.5">
  <label for="faction-theme-select" class={labelClass}>Choose a vibe</label>
  <select
    id="faction-theme-select"
    name="faction_theme"
    bind:value={theme}
    class={selectClass}
  >
    {#each factionConfig.themes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="faction-type-select" class={labelClass}
    >Choose what they are</label
  >
  <select
    id="faction-type-select"
    name="faction_type"
    bind:value={type}
    class={selectClass}
  >
    {#each availableTypes as t (t)}
      <option value={t}>{t}</option>
    {/each}
  </select>
</div>

<div class="flex flex-col gap-1.5">
  <label for="faction-scope-select" class={labelClass}>Choose their scale</label
  >
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
  <label for="faction-alignment-select" class={labelClass}
    >Choose their morality</label
  >
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
    >Add campaign context</label
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
    class="text-[10px] text-theme-text/60 leading-relaxed"
  >
    Add a city, frontier, villain, war, or campaign tension to aim the faction
    at your table.
  </p>
</div>

<div class="pt-2 flex justify-end">
  <button
    type="button"
    onclick={() => {
      const types = thematicTypes[theme] || factionConfig.types;
      type = types[Math.floor(Math.random() * types.length)];
      scope =
        factionConfig.scopes[
          Math.floor(Math.random() * factionConfig.scopes.length)
        ];
      alignment =
        factionConfig.alignments[
          Math.floor(Math.random() * factionConfig.alignments.length)
        ];
      if (onSurprise) {
        onSurprise();
      }
    }}
    class="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-bg hover:border-theme-primary transition-all cursor-pointer"
    title="Randomize all options and generate a draft from the result"
  >
    <span class="icon-[lucide--dices] w-3.5 h-3.5"></span>
    Surprise Me
  </button>
</div>

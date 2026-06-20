<script lang="ts">
  import { factionConfig } from "$lib/services/seo/generator-engine";
  import SelectWithCustomOption from "$lib/components/forms/SelectWithCustomOption.svelte";

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
    Steampunk: [
      "Guild Cartel",
      "Airship Consortium",
      "Aetheric Research Order",
      "Imperial Intelligence Bureau",
      "Underclass Rebel Cell",
      "Secret Society",
      "Merchant Guild",
    ],
  };

  const availableTypes = $derived(thematicTypes[theme] || factionConfig.types);
  const knownTypes = $derived(
    Array.from(
      new Set([...factionConfig.types, ...Object.values(thematicTypes).flat()]),
    ),
  );

  $effect(() => {
    if (
      theme &&
      type &&
      knownTypes.includes(type) &&
      !availableTypes.includes(type)
    ) {
      type = availableTypes[0] || factionConfig.types[0];
    }
  });
</script>

<SelectWithCustomOption
  id="faction-theme-select"
  name="faction_theme"
  label="Choose a vibe"
  bind:value={theme}
  choices={factionConfig.themes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom vibe"
/>

<SelectWithCustomOption
  id="faction-type-select"
  name="faction_type"
  label="Choose what they are"
  bind:value={type}
  choices={availableTypes.map((t: string) => ({ value: t, label: t }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom faction type"
/>

<SelectWithCustomOption
  id="faction-scope-select"
  name="faction_scope"
  label="Choose their scale"
  bind:value={scope}
  choices={factionConfig.scopes.map((s: string) => ({ value: s, label: s }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom scale"
/>

<SelectWithCustomOption
  id="faction-alignment-select"
  name="faction_alignment"
  label="Choose their morality"
  bind:value={alignment}
  choices={factionConfig.alignments.map((a: string) => ({
    value: a,
    label: a,
  }))}
  className="flex flex-col gap-1.5"
  {labelClass}
  inputClass={selectClass}
  customPlaceholder="Enter a custom morality"
/>

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

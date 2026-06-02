<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import {
    generatorEngine,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let factionType = $state(factionConfig.types[0]);
  let factionScope = $state(factionConfig.scopes[1]);
  let factionAlignment = $state(factionConfig.alignments[0]);
  let factionCampaignContext = $state("");
  let useAI = $state(true);

  async function generate() {
    return generatorEngine.generateFaction({
      type: factionType,
      scope: factionScope,
      alignment: factionAlignment,
      campaignContext: factionCampaignContext,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/tools/dnd-npc-generator", label: "D&D NPC generator" },
    { href: "/solutions/worldbuilding-tool", label: "Worldbuilding tool" },
    { href: "/free-rpg-campaign-manager", label: "Free RPG campaign manager" },
  ];

  const faqs = [
    {
      question: "What does the faction generator create?",
      answer:
        "It creates a fantasy RPG faction with a name, type, operating scope, public face, agenda, internal conflict, rival faction, notable NPCs, and adventure hook.",
    },
    {
      question: "Can I use the faction generator without an account?",
      answer:
        "Yes. You can generate and copy faction notes on the public page without logging in, then save the draft into a browser-local Codex Cryptica vault.",
    },
    {
      question: "Can I aim the faction at my current campaign?",
      answer:
        "Yes. Add optional campaign context such as a city, war, villain, frontier, or political tension, and the generated faction will include a campaign fit section.",
    },
    {
      question: "How does saving a generated faction work?",
      answer:
        "The page stores the generated faction draft in browser localStorage and opens the app, where it imports as a Faction entity in your local vault.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/faction-generator"
  pageTitle="Faction Generator | Free Fantasy RPG Organization Tool | Codex Cryptica"
  metaDescription="Generate fantasy RPG factions with goals, internal conflict, rival groups, notable NPCs, and adventure hooks. Copy the draft or save it into your local campaign vault."
  eyebrow="Faction Generator"
  introTitle="Faction Generator"
  introText="Create a campaign-ready fantasy faction with a public face, agenda, internal conflict, rival group, notable NPCs, and adventure hook. Works without login, then saves into your local Codex Cryptica campaign vault."
  {relatedLinks}
  {faqs}
  {generate}
>
  {#snippet formFields()}
    <div class="flex flex-col gap-1.5">
      <label
        for="faction-type-select"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Faction Type</label
      >
      <select
        id="faction-type-select"
        name="faction_type"
        bind:value={factionType}
        class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
      >
        {#each factionConfig.types as type (type)}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="faction-scope-select"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Operating Scope</label
      >
      <select
        id="faction-scope-select"
        name="faction_scope"
        bind:value={factionScope}
        class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
      >
        {#each factionConfig.scopes as scope (scope)}
          <option value={scope}>{scope}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="faction-alignment-select"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Moral Posture</label
      >
      <select
        id="faction-alignment-select"
        name="faction_alignment"
        bind:value={factionAlignment}
        class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
      >
        {#each factionConfig.alignments as alignment (alignment)}
          <option value={alignment}>{alignment}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="faction-campaign-context"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Optional Campaign Context</label
      >
      <textarea
        id="faction-campaign-context"
        name="campaign_context"
        bind:value={factionCampaignContext}
        maxlength="240"
        rows="4"
        aria-describedby="faction-campaign-context-help"
        class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
      ></textarea>
      <p
        id="faction-campaign-context-help"
        class="text-[10px] text-theme-muted leading-relaxed"
      >
        Add a city, frontier, villain, war, or campaign tension to aim the
        faction at your table.
      </p>
    </div>

    <div class="flex items-center gap-2 pt-2">
      <input
        type="checkbox"
        id="ai-toggle"
        bind:checked={useAI}
        class="w-4 h-4 rounded border-theme-border/60 bg-theme-bg/60 text-theme-primary focus:ring-theme-primary/40 focus:outline-none"
      />
      <label
        for="ai-toggle"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted cursor-pointer flex items-center gap-1"
      >
        <span class="icon-[lucide--sparkles] text-theme-primary w-3.5 h-3.5"
        ></span>
        AI Lore Co-Author Mode
      </label>
    </div>
  {/snippet}
</SEOGeneratorLayout>

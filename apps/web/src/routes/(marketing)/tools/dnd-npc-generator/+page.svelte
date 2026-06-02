<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import {
    generatorEngine,
    npcConfig,
  } from "$lib/services/seo/generator-engine";

  let npcRace = $state(npcConfig.races[0]);
  let npcRole = $state(npcConfig.roles[0]);
  let npcAlignment = $state(npcConfig.alignments[0]);
  let npcCampaignContext = $state("");
  let useAI = $state(true);

  async function generate() {
    return generatorEngine.generateNPC({
      race: npcRace,
      role: npcRole,
      alignment: npcAlignment,
      campaignContext: npcCampaignContext,
      useAI,
    });
  }

  const relatedLinks = [
    { href: "/solutions/ai-gm-assistant", label: "AI GM assistant" },
    { href: "/free-rpg-campaign-manager", label: "Free RPG campaign manager" },
  ];

  const faqs = [
    {
      question: "Does the D&D NPC generator require an account?",
      answer:
        "No. You can generate an NPC on the public page without logging in, then copy the result or save it into a local Codex Cryptica vault.",
    },
    {
      question: "What does each generated NPC include?",
      answer:
        "Each NPC includes a name, species or ancestry, role, alignment, personality notes, a hidden secret, motivation, faction connection, and a plot hook.",
    },
    {
      question: "Can I use it outside D&D?",
      answer:
        "Yes. The output is written for fantasy RPGs and can be adapted for D&D, Pathfinder, OSR games, homebrew campaigns, and other tabletop systems.",
    },
    {
      question: "How does saving to Codex Cryptica work?",
      answer:
        "The page stores the generated draft in browser localStorage and opens the app, where the draft is imported as a Character entity in your local vault.",
    },
  ];
</script>

<SEOGeneratorLayout
  canonicalPath="/tools/dnd-npc-generator"
  pageTitle="D&D NPC Generator | Free Fantasy RPG Character Tool | Codex Cryptica"
  metaDescription="Generate D&D NPCs with ancestry, role, personality, secret, motivation, faction connection, and plot hook. Copy the draft or save it into your local campaign vault."
  eyebrow="D&D NPC Generator"
  introTitle="D&D NPC Generator"
  introText="Create a ready-to-run fantasy NPC with structured GM notes, a secret, faction tie, and plot hook. Works without login, then saves into your local Codex Cryptica campaign vault."
  {relatedLinks}
  {faqs}
  {generate}
>
  {#snippet formFields()}
    <div class="flex flex-col gap-1.5">
      <label
        for="race-select"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Race</label
      >
      <select
        id="race-select"
        bind:value={npcRace}
        class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
      >
        {#each npcConfig.races as r (r)}
          <option value={r}>{r}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="role-select"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Role / Class</label
      >
      <select
        id="role-select"
        bind:value={npcRole}
        class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
      >
        {#each npcConfig.roles as r (r)}
          <option value={r}>{r}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="alignment-select"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Alignment</label
      >
      <select
        id="alignment-select"
        bind:value={npcAlignment}
        class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
      >
        {#each npcConfig.alignments as a (a)}
          <option value={a}>{a}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="campaign-context"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
        >Optional Campaign Context</label
      >
      <textarea
        id="campaign-context"
        name="campaign_context"
        bind:value={npcCampaignContext}
        maxlength="240"
        rows="4"
        aria-describedby="campaign-context-help"
        class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
      ></textarea>
      <p
        id="campaign-context-help"
        class="text-[10px] text-theme-muted leading-relaxed"
      >
        Add a city, faction, dungeon, or current campaign problem to aim the NPC
        at your table.
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

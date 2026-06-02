<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";

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
  slug="npc"
  canonicalPath="/tools/dnd-npc-generator"
  pageTitle="D&D NPC Generator | Free Fantasy RPG Character Tool | Codex Cryptica"
  metaDescription="Generate D&D NPCs with ancestry, role, personality, secret, motivation, faction connection, and plot hook. Copy the draft or save it into your local campaign vault."
  eyebrow="D&D NPC Generator"
  introTitle="D&D NPC Generator"
  introText="Create a ready-to-run fantasy NPC with structured GM notes, a secret, faction tie, and plot hook. Works without login, then saves into your local Codex Cryptica campaign vault."
  {relatedLinks}
  {faqs}
/>

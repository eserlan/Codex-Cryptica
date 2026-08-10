import type { LandingPageConfig } from "../schema";

export const vampireTheMasquerade: LandingPageConfig = {
  slug: "vampire-the-masquerade",
  kind: "system",
  theme: "horror",
  seo: {
    title:
      "Vampire: The Masquerade Campaign Manager & Chronicle Tools | Codex Cryptica",
    description:
      "Manage gothic conspiracies, coteries, Elysium political webs, domain claims, and mortal contacts with an interactive relationship graph for VtM.",
  },
  hero: {
    eyebrow: "World of Darkness Chronicle Hub",
    title: "Codex Cryptica for Vampire: The Masquerade",
    tagline:
      "Orchestrate gothic conspiracies, coterie loyalties, and urban domain webs without losing control of the Night.",
    problemStatement:
      "Running a VtM chronicle means balancing intricate webs of Blood Bonds, Primogen feuds, Anarch territories, and mortal assets. Standard campaign notes quickly fracture under the weight of interconnected undead politics.",
  },
  useCases: [
    {
      title: "Interactive Web of Shadow Politics",
      description:
        "Map Blood Bonds, sire-childe lineages, Primogen rivalries, and mortal puppets in a real-time visual graph.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Domain & Elysium Territory Tracking",
      description:
        "Delineate hunting grounds, Elysium sanctuaries, rack territories, and clan domains across your nocturnal city.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Humanity, Resonance & Touchstones",
      description:
        "Keep track of coterie touchstones, convictions, feeding grounds, and human disguises alongside undead stats.",
      icon: "icon-[lucide--heart-crack]",
    },
    {
      title: "Session Log & Secret Lore Binders",
      description:
        "Store secret notes, elder decrees, ancient lore fragments, and NPC motives with local-first, private vault storage.",
      icon: "icon-[lucide--book-open]",
    },
  ],
  exampleGraph: {
    title: "Sample City Conspiracy Structure",
    description:
      "A visual snapshot of how coteries, Camarilla court hierarchy, and mortal assets connect inside Codex Cryptica.",
    steps: [
      { label: "Prince Quintus", sublabel: "Ventrue • City Ruler" },
      { label: "Sheriff Cross", sublabel: "Gangrel • Enforcer" },
      { label: "Primogen Council", sublabel: "Toreador / Tremere / Nosferatu" },
      { label: "Coterie: The Velvet Pact", sublabel: "PC Players" },
      { label: "Mortal Touchstones & Feeders", sublabel: "Kine Network" },
    ],
  },
  recommendedTools: [
    {
      title: "Vampire Clan Generator",
      description:
        "Generate evocative bloodlines, clan histories, and founder lore for homebrew or custom VtM factions.",
      href: "/generators/vampire-clan",
      badge: "Generator",
    },
    {
      title: "NPC & Rival Kindred Generator",
      description:
        "Instantly spin up detailed vampires with motives, clan disciplines, feeding habits, and secrets.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Gothic Settlement & Haven Creator",
      description:
        "Design atmospheric urban havens, underground nightclubs, and secluded havens.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Chronicle Event & Quest Hooks",
      description:
        "Generate Masquerade breach investigations, Sabbat incursions, and political coups.",
      href: "/generators/quest",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Claim Your Night",
    description:
      "Start managing your VtM chronicle with local-first security and deep visual campaign graphs.",
    buttonText: "Launch Codex Cryptica",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Paradox Interactive or World of Darkness. Vampire: The Masquerade is a registered trademark of Paradox Interactive AB.",
};

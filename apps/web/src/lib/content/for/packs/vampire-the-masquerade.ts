import type { LandingPageConfig } from "../schema";

export const vampireTheMasquerade: LandingPageConfig = {
  slug: "vampire-the-masquerade",
  kind: "system",
  seo: {
    title: "Codex Cryptica for Vampire: The Masquerade",
    description:
      "Build and run your chronicle without losing track of your city.",
  },
  hero: {
    title: "Codex Cryptica for Vampire: The Masquerade",
    tagline: "Build and run your chronicle without losing track of your city.",
    problemStatement:
      "Running a VtM chronicle gets complicated quickly. Between coteries, Elysium etiquette, Prince decrees, domain claims, and mortal contacts, keeping your gothic conspiracy connected during play requires more than standard notes.",
  },
  useCases: [
    {
      title: "Track Coteries & Factions",
      description: "Connect Primogen, Anarch barons, and mortal pawns.",
      icon: "icon-[lucide--eye]",
    },
    {
      title: "Domain Claims",
      description: "Map out Elysium and hunting grounds across the city.",
      icon: "icon-[lucide--map]",
    },
  ],
  exampleGraph: {
    title: "City Structure",
    steps: [
      { label: "Prince", sublabel: "Ventrue" },
      { label: "Sheriff", sublabel: "Gangrel" },
      { label: "Primogen Council" },
      { label: "Coterie Havens" },
      { label: "Mortal Contacts" },
    ],
  },
  recommendedTools: [
    {
      title: "Vampire Clan Generator",
      description: "Generate bloodlines and clan histories.",
      href: "/generators/vampire-clan",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Start your Chronicle",
    buttonText: "Try Codex Cryptica",
    buttonHref: "/app",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Paradox Interactive or World of Darkness.",
};

import type { LandingPageConfig } from "../schema";

export const gothicHorror: LandingPageConfig = {
  slug: "gothic-horror",
  kind: "genre",
  theme: "horror",
  seo: {
    title: "Codex Cryptica for Gothic Horror Worldbuilding",
    description:
      "Organise gothic horror campaigns and worldbuilding with connected ancestral lineages, decaying estates, family curses, and dark secrets.",
  },
  hero: {
    eyebrow: "Gothic Horror Worldbuilding",
    title: "Codex Cryptica for Gothic Horror",
    tagline:
      "Keep noble lineages, decaying estates, ancestral curses, and dark secrets connected in one place.",
    problemStatement:
      "Gothic horror campaigns thrive on ancestral secrets, family curses, isolated settlements, and tragic character histories. When players uncover a hidden chamber in a decaying estate, you shouldn't have to search through loose notes to remember which ancestor forged the pact — or how it haunts the living.",
  },
  useCases: [
    {
      title: "Ancestral Lineages & Curses",
      description:
        "Map noble bloodlines, family tragedies, and generational pacts with a visual relationship graph.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Decaying Estates & Landmarks",
      description:
        "Connect manors, ancestral tombs, isolated villages, and dark wilderness locations to the figures tied to them.",
      icon: "icon-[lucide--castle]",
    },
    {
      title: "Forbidden Manuscripts & Relics",
      description:
        "Link cursed heirlooms, family journals, and dark rituals to the histories they haunt.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Session Recaps & Gothic Mysteries",
      description:
        "Keep active rumours, investigation notes, session recaps, and campaign milestones connected to the people and places they involve.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Sample Gothic Horror Campaign Web",
    description:
      "See how noble heirs, decaying manors, ancestral journals, and family curses connect in a gothic web.",
    steps: [
      {
        label: "Baroness Eleanor Blackwood",
        sublabel: "Estate Heir",
        relation: "inherits",
      },
      {
        label: "Blackwood Manor",
        sublabel: "Decaying Estate",
        relation: "conceals",
      },
      {
        label: "The Family Journal",
        sublabel: "Forbidden Manuscript",
        relation: "reveals",
      },
      {
        label: "The Crimson Covenant",
        sublabel: "Ancestral Cult",
        relation: "cursed",
      },
      {
        label: "Lord Malachi Blackwood",
        sublabel: "Original Patriarch",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Fantasy Name Generator",
      description:
        "Generate names for noble lineages, ancient ruins, ancestral estates, and gothic figures.",
      href: "/tools/fantasy-name-generator",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build isolated mountain villages, gloomy port towns, and decaying aristocratic manors.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Design secret societies, dark covens, fanatical inquisitions, and noble houses.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Magic Item Generator",
      description:
        "Create cursed heirlooms, dark relics, ancient talismans, and story hooks.",
      href: "/generators/magic-item",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Organise Your Gothic Campaign",
    description:
      "Keep your gothic horror world connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

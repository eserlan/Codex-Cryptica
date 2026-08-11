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
      "Gothic horror campaigns often revolve around inherited secrets, family curses, isolated estates, and tragic histories. When the players uncover a sealed room or forgotten journal, you shouldn't have to dig through scattered notes to remember which ancestor made the pact — or who is still paying for it.",
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
      title: "Heirlooms, Journals & Forbidden Lore",
      description:
        "Link cursed heirlooms, family journals, and dark rituals to the histories they haunt.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Secrets, Rumours & Session Notes",
      description:
        "Keep active rumours, investigation notes, session recaps, and campaign milestones connected to the people and places they involve.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Sample Gothic Horror Campaign Web",
    description:
      "See how an inheritance leads from a manor to a journal, a secret society, and the ancestor who swore its pact.",
    badgeLabel: "Relationship Graph",
    palette: "oxblood",
    surface: "dark",
    steps: [
      {
        label: "Lady Elspeth Vale",
        sublabel: "Last Surviving Heir",
        relation: "inherits",
        category: "character",
      },
      {
        label: "Harrowmere House",
        sublabel: "Inherited Estate",
        relation: "conceals",
        category: "location",
      },
      {
        label: "The West Wing Journal",
        sublabel: "Forgotten Journal",
        relation: "reveals",
        category: "item",
      },
      {
        label: "The Society of the Hollow Bell",
        sublabel: "Secret Organisation",
        relation: "reveals",
        category: "faction",
      },
      {
        label: "Sir Alaric Vale",
        sublabel: "Founder of the Estate",
        relation: "swore the pact",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "NPC Generator",
      description:
        "Create heirs, servants, family rivals, and gothic figures with distinct motives and secrets.",
      href: "/generators/npc",
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
      title: "Secret Society Generator",
      description:
        "Design secret societies, dark covens, fanatical inquisitions, and noble houses.",
      href: "/generators/secret-society",
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
    title: "Build Your Gothic World",
    description:
      "Keep your gothic horror world connected with relationship graphs, interactive maps, and local-first storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

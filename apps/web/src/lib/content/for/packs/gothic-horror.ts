import type { LandingPageConfig } from "../schema";

export const gothicHorror: LandingPageConfig = {
  slug: "gothic-horror",
  kind: "genre",
  theme: "horror",
  hub: "vampire",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Gothic Horror Worldbuilding & Campaigns",
    description:
      "Organise your gothic horror campaigns and worldbuilding with connected ancestral lineages, isolated country estates, family heirlooms, and session notes in one local-first workspace.",
  },
  hero: {
    eyebrow: "Gothic Horror Worldbuilding & Campaign Management",
    title: "Codex Cryptica for Gothic Horror",
    tagline:
      "Keep noble lineages, country estates, ancestral secrets, and family heirlooms connected in one local-first workspace.",
    problemStatement:
      "Gothic horror campaigns turn on the weight of the past: inherited debts, estranged relatives, isolated manors, and buried family transgressions. When your players uncover a sealed portrait or confront a secretive parish vicar, you shouldn't have to scramble through loose notes to recall which ancestor made the original promise — or who stands to lose everything when the truth comes to light.",
  },
  useCases: [
    {
      title: "Ancestral Lineages & Inherited Debts",
      description:
        "Map noble dynasties, disputed inheritances, family estrangements, and generational pacts with a visual relationship graph.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Country Estates & Cloistered Parishes",
      description:
        "Connect ancestral manors, family crypts, isolated villages, and locked wings directly to the figures and histories tied to them.",
      icon: "icon-[lucide--castle]",
    },
    {
      title: "Heirlooms, Letters & Family Archives",
      description:
        "Link sealed correspondence, family journals, locked lockboxes, and inherited relics to the transgressions they conceal.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Obsessions, Scandals & Campaign Notes",
      description:
        "Keep unresolved family secrets, local gossip, social standing, and session records connected across every arc of your campaign.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Estate & Lineage Web",
    description:
      "One heir, her ancestral seat, the correspondence she uncovers, the society hounding her family, and the forebear whose pact she inherits.",
    badgeLabel: "Lineage & Estate Web",
    palette: "oxblood",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "Lady Elspeth Vale",
        sublabel: "Sole Surviving Heir",
        category: "character",
      },
      {
        label: "Harrowmere House",
        sublabel: "Inherited Estate",
        relation: "Inherits",
        category: "location",
      },
      {
        label: "The West Wing Journal",
        sublabel: "Family Journal",
        relation: "Uncovers",
        category: "item",
      },
      {
        label: "The Society of the Hollow Bell",
        sublabel: "Aristocratic Society",
        relation: "Targeted by",
        category: "faction",
      },
      {
        label: "Sir Alaric Vale",
        sublabel: "Ancestor • 3rd Baronet",
        relation: "Descended from",
        category: "character",
      },
    ],
  },
  recommendedTools: [
    {
      title: "NPC & Lineage Generator",
      description:
        "Create noble heirs, family stewards, melancholic scholars, and parish figures with distinct motives and secrets.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement & Estate Generator",
      description:
        "Build secluded moorside villages, parish hamlets, coastal towns, and aristocratic country seats.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Design clandestine brotherhoods, aristocratic dining clubs, fanatical orders, and family cabals.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
    {
      title: "Relic & Heirloom Generator",
      description:
        "Create inherited heirlooms, cursed portraits, locked lockboxes, and relics tied to ancestral histories.",
      href: "/generators/magic-item",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Chart Your Gothic World",
    description:
      "Keep noble bloodlines, estate topography, heirlooms, and session notes connected in a local-first workspace.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

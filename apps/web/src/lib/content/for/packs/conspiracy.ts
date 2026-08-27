import type { LandingPageConfig } from "../schema";

export const conspiracy: LandingPageConfig = {
  slug: "conspiracy",
  kind: "genre",
  theme: "modern",
  hub: "modern",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Conspiracy Campaigns & Intrigue Worldbuilding",
    description:
      "Organise conspiracy RPG campaigns and intrigue worldbuilding with connected shadow cabals, shell organisations, compromised assets, and classified dossiers.",
    image: "https://assets.codexcryptica.com/og/conspiracy.jpg",
    imageAlt:
      "Dimly lit investigator desk with red string cork evidence board, redacted dossiers, tape recorder, and retro terminal",
  },
  hero: {
    eyebrow: "Conspiracy & Intrigue Campaign Management",
    title: "Codex Cryptica for Conspiracy Campaigns",
    tagline:
      "Keep organisations, operatives, fronts, evidence, and hidden relationships connected in one local-first workspace.",
    problemStatement:
      "Running a conspiracy campaign means tracking what people and organisations appear to be, who they really answer to, and who knows which part of the truth. When an ally turns out to be an intermediary, a company is revealed as a front, or leaked evidence implicates someone higher up, you shouldn't have to dig through scattered notes to reconstruct the chain.",
  },
  useCases: [
    {
      title: "Front Organisations & Hidden Networks",
      description:
        "Map public organisations, intermediaries, handlers, and the people or groups pulling the strings behind them.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Contacts, Informants & Compromised Allies",
      description:
        "Track who is compromised, who is an unwitting informant, and what leverage each handler holds over their assets.",
      icon: "icon-[lucide--user-check]",
    },
    {
      title: "Dossiers, Wiretaps & Redacted Evidence",
      description:
        "Connect surveillance logs, transcripts, memos, and physical evidence to the people, places, and operations they reference.",
      icon: "icon-[lucide--file-text]",
    },
    {
      title: "Safehouses, Covert Sites & Operations",
      description:
        "Track safehouses, meeting points, covert facilities, and active operations alongside the people and organisations involved.",
      icon: "icon-[lucide--map-pin]",
    },
  ],
  exampleGraph: {
    title: "Sample Conspiracy & Intrigue Network",
    description:
      "A private policy network, its corporate front, a compromised senator, a covert programme, and the leaked recording threatening exposure.",
    badgeLabel: "Conspiracy Network",
    palette: "default",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "The Meridian Group",
        sublabel: "Policy Network • Shadow Leadership",
        category: "faction",
      },
      {
        label: "Calder Biomedical Holdings",
        sublabel: "Corporate Front • Shell Company",
        relation: "Funds via",
        category: "faction",
      },
      {
        label: "Senator Julian Vance",
        sublabel: "Public Official • Compromised Contact",
        relation: "Blackmails",
        category: "character",
      },
      {
        label: "Project Glasshouse",
        sublabel: "Covert Programme • Active Operation",
        relation: "Directs",
        category: "faction",
      },
      {
        label: "Meeting Recording, 14 March",
        sublabel: "Leaked Audio • Physical Evidence",
        relation: "Incriminated by",
        category: "item",
      },
      {
        label: "Northfield Research Annex",
        sublabel: "Restricted Facility • Covert Site",
        relation: "Operates",
        category: "location",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Create organisations and factions you can adapt into fronts, political groups, and secret networks.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create contacts, officials, operatives, and informants with motives, loyalties, and secrets.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Generate districts and settlements you can adapt into government, corporate, or covert locations.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate conspiracy leads, blackmail schemes, leaks, missing persons, and cover-up operations.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Map the Conspiracy",
    description:
      "Keep people, organisations, evidence, and timelines connected with relationship graphs and local-first notes.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

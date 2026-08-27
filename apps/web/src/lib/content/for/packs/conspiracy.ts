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
      "Keep shadow cabals, puppet masters, compromised assets, and classified evidence connected in one local-first workspace.",
    problemStatement:
      "Running a conspiracy campaign means tracking what everyone appears to be versus who is actually pulling the strings. When an ally turns out to be an unwitting cut-out, a corporate front launders black budget funds, or a leaked tape implicates a high-ranking official, you shouldn't have to sift through tangled notes to remember who knows what — or who stands behind the curtain.",
  },
  useCases: [
    {
      title: "Shadow Cabals, Shell Orgs & Handlers",
      description:
        "Map the hidden hierarchy between public front organisations, puppet figures, and the shadow handlers directing them.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Compromised Assets, Double Agents & Cut-Outs",
      description:
        "Track who is compromised, who is an unwitting informant, and what leverage each handler holds over their assets.",
      icon: "icon-[lucide--user-check]",
    },
    {
      title: "Dossiers, Wiretaps & Redacted Evidence",
      description:
        "Connect surveillance logs, leaked transcripts, classified project memos, and physical clues directly to the truths they conceal.",
      icon: "icon-[lucide--file-text]",
    },
    {
      title: "Black Sites, Safehouses & Operations",
      description:
        "Catalogue covert facilities, encrypted drop sites, black budgets, and escalation countdowns across your campaign.",
      icon: "icon-[lucide--map-pin]",
    },
  ],
  exampleGraph: {
    title: "Sample Conspiracy & Intrigue Network",
    description:
      "A shadow cabal, its corporate front, a compromised senator, a black-ops program, and the leaked evidence threatening exposure.",
    badgeLabel: "Conspiracy Network",
    palette: "default",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "The Obsidian Syndicate",
        sublabel: "Shadow Cabal • Handlers",
        category: "faction",
      },
      {
        label: "Aegis Global BioTech",
        sublabel: "Corporate Front • Shell Company",
        relation: "Funds via",
        category: "faction",
      },
      {
        label: "Senator Julian Vance",
        sublabel: "Public Official • Compromised Asset",
        relation: "Blackmails",
        category: "character",
      },
      {
        label: "Operation Black Glass",
        sublabel: "Black Ops Program • Covert Project",
        relation: "Directs",
        category: "faction",
      },
      {
        label: "Intercepted Audio Tape 09",
        sublabel: "Classified Evidence • Leaked Wiretap",
        relation: "Incriminated by",
        category: "item",
      },
      {
        label: "Site 44 Research Outpost",
        sublabel: "Black Site Facility • Quarantine Lab",
        relation: "Operates",
        category: "location",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Design shadow cabals, corporate fronts, intelligence agencies, and secret societies.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create handlers, double agents, whistleblowers, and puppet officials with secret motives.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build government districts, black site compounds, corporate research facilities, and safehouses.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Generate conspiracy leads, blackmail schemes, whistleblowing crises, and cover-up operations.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Uncover the Conspiracy",
    description:
      "Keep your conspiracy campaigns and political intrigue worlds connected with relationship graphs, classified timelines, and local-first notes.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

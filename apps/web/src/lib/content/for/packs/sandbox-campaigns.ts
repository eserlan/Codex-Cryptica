import type { LandingPageConfig } from "../schema";

export const sandboxCampaigns: LandingPageConfig = {
  slug: "sandbox-campaigns",
  kind: "use-case",
  seo: {
    title: "Codex Cryptica for Sandbox Campaigns",
    description:
      "Organise a player-driven sandbox campaign: many live hooks at once, factions with their own agendas, connected settlements, and the consequences your players leave behind.",
    image: "https://assets.codexcryptica.com/og/sandbox-campaigns.jpg",
    imageAlt:
      "A game master's table covered in overlapping notes, a regional map and faction cards linked by pencil lines",
  },
  hero: {
    eyebrow: "Player-Driven Campaign Management",
    title: "Codex Cryptica for Sandbox Campaigns",
    tagline:
      "Keep every live thread, faction and consequence in one place, so the world holds together whichever way your players go.",
    problemStatement:
      "Sandbox play falls apart in your notes long before it falls apart at the table. The party ignores the thing you prepared and goes after a cartel you sketched out three months ago — and you need to know, right now, who runs it, who owes them, what they wanted before the players got involved, and what changed when the players burnt two of their wagons. Kept as separate documents, none of that is answerable at speed.",
  },
  useCases: [
    {
      title: "Several Live Threads, Not One Plot",
      description:
        "Hold every hook the table has heard about at once, with what each one connects to, so the party choosing an unexpected one is a good session rather than an emergency.",
      icon: "icon-[lucide--git-branch]",
    },
    {
      title: "Factions That Want Something",
      description:
        "Give each faction its goal, its rivals, the people who speak for it and the move it makes next if nobody interferes — and see where two of them are already in each other's way.",
      icon: "icon-[lucide--swords]",
    },
    {
      title: "A World That Stays Connected",
      description:
        "Settlements, sites, routes and the people in them link to one another, so following a rumour three steps out never means opening four unrelated documents.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Consequences You Can Find Again",
      description:
        "What the players changed lives on the faction, place or person it happened to — not buried in a session log — so it comes back the moment they return.",
      icon: "icon-[lucide--history]",
    },
  ],
  exampleGraph: {
    title: "A Faction the Party Did Not Expect to Matter",
    description:
      "A cartel sketched out months ago, ready to run the moment the players turn towards it — with everything it holds, wants and now blames them for.",
    badgeLabel: "Faction Web",
    steps: [
      {
        label: "The Coldway Combine",
        sublabel: "Grain and toll cartel",
        category: "faction",
      },
      {
        label: "Two Burnt Wagons",
        sublabel: "Consequence • Last Session",
        relation: "Retaliating for",
        category: "event",
      },
      {
        label: "Verrin Coll",
        sublabel: "Combine Factor • Town Council",
        relation: "Is represented by",
        category: "character",
      },
      {
        label: "The Dry-Season Levy",
        sublabel: "Faction Move • Planned",
        relation: "Plans",
        category: "event",
      },
      {
        label: "Ashgate",
        sublabel: "Market Town",
        relation: "Controls",
        category: "location",
      },
      {
        label: "The Bargemen's Rest",
        sublabel: "Rival hauliers",
        relation: "Undercut by",
        category: "faction",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Faction Generator",
      description:
        "Create factions with goals, rivals and something they are about to do, ready to be pulled into the campaign.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Quest Hook Generator",
      description:
        "Keep more leads on the table than the party can follow, which is what makes the choice theirs.",
      href: "/tools/quest-hook-generator",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build places worth returning to, with the local powers and problems that outlast one visit.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Populate the sandbox with people who want things, so the party always has someone to lean on or cross.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Campaign Knowledge Graph",
      description:
        "See how the relationship graph draws the links between your factions, places and people as one map of the campaign.",
      href: "/solutions/rpg-knowledge-graph",
      badge: "Feature",
    },
    {
      title: "See a Sandbox Settlement Example",
      description:
        "Read Gull's Roost in full: a smuggling town where the council and the dock crews want different things.",
      href: "/examples/gulls-roost-coastal-smuggling-town",
      badge: "Example",
    },
    {
      title: "Codex Cryptica for West Marches Campaigns",
      description:
        "Running an open table with a rotating roster and player-scheduled expeditions? Start here.",
      href: "/for/west-marches",
      badge: "Guide",
    },
  ],
  cta: {
    title: "Let Them Go Wherever They Like",
    description:
      "Build a world where every thread you have prepared is one link away from the one they chose.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

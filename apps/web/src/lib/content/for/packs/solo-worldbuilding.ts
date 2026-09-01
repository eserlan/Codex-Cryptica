import type { LandingPageConfig } from "../schema";

export const soloWorldbuilding: LandingPageConfig = {
  slug: "solo-worldbuilding",
  kind: "use-case",
  seo: {
    title: "Codex Cryptica for Solo Worldbuilding",
    description:
      "Turn prompts and random-table results into connected canon for solo worldbuilding, while keeping unanswered questions, consequences and contradictions in view.",
    image: "https://assets.codexcryptica.com/og/solo-worldbuilding.jpg",
    imageAlt:
      "A lone worldbuilder writing beside an unfinished map, dice and connected notes under warm lamplight",
  },
  hero: {
    eyebrow: "Solo Discovery & World Journalling",
    title: "Codex Cryptica for Solo Worldbuilding",
    tagline:
      "Follow each prompt, keep what becomes true, and let every answer change the questions you ask next.",
    problemStatement:
      "When you are both asking the questions and deciding what becomes true, the difficult part is not producing one more idea. It is remembering which random-table result became canon, what that discovery changed, and which unanswered question should shape the next prompt. In separate journal pages, those connections disappear just when the world starts to feel alive.",
  },
  useCases: [
    {
      title: "Prompts Become Canon",
      description:
        "Record each answer beside the place, person or faction it changes. A surprising roll becomes part of the world instead of a loose sentence you have to rediscover later.",
      icon: "icon-[lucide--sparkles]",
    },
    {
      title: "Keep the Unanswered Questions",
      description:
        "Hold mysteries, omens and uncertain details as linked notes. When you sit down again, the next useful question is already waiting beside the lore that raised it.",
      icon: "icon-[lucide--circle-help]",
    },
    {
      title: "Discover Without Contradicting Yourself",
      description:
        "See the people, places and events around a new idea before declaring it true, so a revelation deepens established canon instead of quietly contradicting it.",
      icon: "icon-[lucide--network]",
    },
    {
      title: "Let Consequences Suggest the Next Prompt",
      description:
        "Attach every change to what caused it. A failed bargain, strange weather or vanished road then gives you a concrete thread to follow on the next roll.",
      icon: "icon-[lucide--milestone]",
    },
  ],
  exampleGraph: {
    title: "A Region Discovered One Answer at a Time",
    description:
      "One place at the centre, with each random answer preserved as a person, faction, event or unresolved thread that now belongs to it.",
    badgeLabel: "Solo Discovery Journal",
    steps: [
      {
        label: "The Ashen Reach",
        sublabel: "Region • Partly known",
        category: "location",
      },
      {
        label: "The Bell Beneath Kestrel Hill",
        sublabel: "Unanswered Question",
        relation: "Hides",
        category: "note",
      },
      {
        label: "The Cinder Pilgrims",
        sublabel: "Travelling Faction",
        relation: "Is crossed by",
        category: "faction",
      },
      {
        label: "The First Black Rain",
        sublabel: "Discovery • Last Roll",
        relation: "Was changed by",
        category: "event",
      },
      {
        label: "Mara Vale",
        sublabel: "Cartographer • Missing",
        relation: "Is being mapped by",
        category: "character",
      },
      {
        label: "The Glass Road",
        sublabel: "Rumour • Unconfirmed",
        relation: "May contain",
        category: "note",
      },
    ],
  },
  recommendedTools: [
    {
      title: "World Generator",
      description:
        "Start with a broad premise, then keep only the details that give you questions worth following.",
      href: "/generators/world",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Discover a place through its people, pressures and local details, ready to connect to what you already know.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Introduce a group with a goal and a rival, then follow the consequences of putting it into your world.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Encounter Generator",
      description:
        "Answer what happens here and now, then preserve the people, places and changes the encounter reveals.",
      href: "/generators/encounter",
      badge: "Generator",
    },
    {
      title: "Codex Cryptica for Fantasy Worldbuilding",
      description:
        "Building a large fantasy setting rather than discovering one prompt at a time? Start with the setting-scale guide.",
      href: "/for/fantasy-worldbuilding",
      badge: "Guide",
    },
    {
      title: "Codex Cryptica for Sandbox Campaigns",
      description:
        "Bringing the same web of places, factions and consequences to a group campaign? Continue with the sandbox workflow.",
      href: "/for/sandbox-campaigns",
      badge: "Guide",
    },
  ],
  cta: {
    title: "Follow the Next Question",
    description:
      "Give every prompt somewhere to land, and every discovery a connection to what came before.",
    buttonText: "Start Building Solo",
    buttonHref: "/app",
  },
};

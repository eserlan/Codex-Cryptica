import type { LandingPageConfig } from "../schema";

export const cosmicHorror: LandingPageConfig = {
  slug: "cosmic-horror",
  kind: "genre",
  theme: "horror",
  hub: "cosmic-horror",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Cosmic Horror Worldbuilding & Campaigns",
    description:
      "Organise cosmic horror campaigns and weird fiction worldbuilding with connected cults, occult archives, expedition sites, and research notes in one local-first workspace.",
  },
  hero: {
    eyebrow: "Cosmic Horror Worldbuilding & Setting Management",
    title: "Codex Cryptica for Cosmic Horror",
    tagline:
      "Keep occult orders, research archives, expedition logs, and incomprehensible entities connected in one local-first workspace.",
    problemStatement:
      "Cosmic horror settings turn on the fragile boundary between mundane reality and the incomprehensible. When your world spans secret government projects, remote polar digs, esoteric cults, and classified manuscripts, you shouldn't have to search through disconnected notes to trace how an obscure incident in the archives connects to a looming catastrophe.",
  },
  useCases: [
    {
      title: "Occult Orders, Cabals & Research Societies",
      description:
        "Map esoteric sects, academic research foundations, classified task forces, and doomsday cults across your world.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Expeditions, Ruins & Anomalous Sites",
      description:
        "Connect remote research stations, sunken monoliths, forgotten observatories, and contaminated zones to the events that uncovered them.",
      icon: "icon-[lucide--map-pin]",
    },
    {
      title: "Classified Archives, Manuscripts & Relics",
      description:
        "Link translated grimoires, strange specimens, sensor logs, and classified dossiers to the entities and phenomena they describe.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Investigation Timelines & Case Notes",
      description:
        "Track chronological escalations, unfolding anomalies, research milestones, and session records across every stage of your campaign.",
      icon: "icon-[lucide--scroll]",
    },
  ],
  exampleGraph: {
    title: "Cosmic Anomaly Web",
    description:
      "See how a research institute, an oceanic dig, classified sensor data, and a submerged megalith connect across an unfolding cosmic mystery.",
    badgeLabel: "Anomaly & Investigation Web",
    palette: "oxblood",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "The Tethys Institute",
        sublabel: "Research Foundation",
        category: "faction",
      },
      {
        label: "Dr Corin Ward",
        sublabel: "Chief Oceanographer",
        relation: "Employs",
        category: "character",
      },
      {
        label: "The Abyssal Trench Project",
        sublabel: "Deep-Sea Expedition",
        relation: "Funds",
        category: "event",
      },
      {
        label: "Acoustic Anomaly 7",
        sublabel: "Classified Sensor Log",
        relation: "Discovers",
        category: "item",
      },
      {
        label: "The Drowned Monolith",
        sublabel: "Submerged Megalith",
        relation: "Investigates",
        category: "location",
      },
      {
        label: "Order of the Black Tide",
        sublabel: "Coastal Cult",
        relation: "Hounded by",
        category: "faction",
      },
    ],
  },
  recommendedTools: [
    {
      title: "NPC Generator",
      description:
        "Create occult scholars, expedition leaders, naval officers, and cult leaders with distinct motives and buried pasts.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Design clandestine research circles, esoteric orders, doomsday cults, and corporate research fronts.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
    {
      title: "News Sheet & Handout Generator",
      description:
        "Generate in-world press clippings, radio bulletins, police logs, and notices to immerse your players.",
      href: "/generators/cosmic-horror/news-sheet-generator",
      badge: "Generator",
    },
    {
      title: "Adventure Idea Generator",
      description:
        "Generate cosmic horror scenario seeds, anomalous incidents, countdown pressures, and setting complications.",
      href: "/generators/cosmic-horror/adventure-idea-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Chart the Unknown",
    description:
      "Keep your cults, expedition logs, classified dossiers, and session notes connected in a local-first workspace.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

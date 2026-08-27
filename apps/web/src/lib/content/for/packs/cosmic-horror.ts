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
    image: "https://assets.codexcryptica.com/og/cosmic-horror.jpg",
    imageAlt:
      "Cosmic horror research desk with deep-sea telemetry charts of a submerged monolith, classified dossiers, and anomalous specimens",
  },
  hero: {
    eyebrow: "Cosmic Horror Worldbuilding & Setting Management",
    title: "Codex Cryptica for Cosmic Horror",
    tagline:
      "Keep occult orders, research archives, expedition logs, and incomprehensible entities connected in one local-first workspace.",
    problemStatement:
      "Cosmic horror mysteries rarely reveal themselves in a straight line. A symbol found in session two turns out to belong to the research group mentioned six sessions later; an expedition log contradicts an official report; an NPC who seemed like a footnote is the only living person who has seen the same phenomenon. Codex Cryptica keeps those connections visible as the mystery grows so you always know what has been uncovered — and what is still waiting in the dark.",
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
      title: "Clues, Revelations & Forbidden Knowledge",
      description:
        "Connect eyewitness accounts, recovered documents, physical evidence, and contradictory theories to the truths they gradually expose.",
      icon: "icon-[lucide--book-open]",
    },
    {
      title: "Timelines, Manifestations & Incident Logs",
      description:
        "Track contradictory accounts, sudden disappearances, escalating manifestations, and session records as the mystery unfolds.",
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
      title: "Artifact & Relic Generator",
      description:
        "Create anomalous devices, contaminated specimens, classified relics, and strange technologies.",
      href: "/generators/artifact-generator",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Build the Mystery. Keep the Connections.",
    description:
      "Map the hidden web of cults, anomalies, and classified files. Let your players uncover the rest in a fast, private, local-first workspace.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

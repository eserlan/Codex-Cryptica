import type { LandingPageConfig } from "../schema";

export const mothership: LandingPageConfig = {
  slug: "mothership",
  kind: "system",
  theme: "horror",
  hub: "cosmic-horror",
  surfaceStyle: "sharp",
  seo: {
    title: "Codex Cryptica for Mothership Warden Prep & Campaign Notes",
    description:
      "Prep Mothership scenarios with connected ships, crew, employers, evidence and escalating threats. Story notes for the Warden in one local-first workspace.",
    image: "https://assets.codexcryptica.com/og/mothership.jpg",
    imageAlt:
      "Dim corridor of a derelict refinery ship, with a flickering emergency light, a sealed quarantine door and a crew locker standing open",
  },
  hero: {
    eyebrow: "Warden Prep & Campaign Notes",
    title: "Codex Cryptica for Mothership",
    tagline:
      "Keep the ship, the crew and the things they should never have found connected in one local-first workspace.",
    problemStatement:
      'A sci-fi horror scenario is a pile of connected secrets. The derelict\'s deck plan, the contractor who never made it back from the last shift, the employer who knew more than the briefing said, the log nobody has played yet, and the trouble that gets worse every time the crew stays aboard. Keep it all linked as story notes for the Warden, so you can answer "who signed that work order?" mid-session without paging through folders. These are notes for you, not rules automation.',
  },
  useCases: [
    {
      title: "Ship Decks, Derelicts & Dangerous Locations",
      description:
        "Map each deck, airlock and sealed section of a derelict, and link it to what is waiting there and who was last aboard.",
      icon: "icon-[lucide--rocket]",
    },
    {
      title: "Crew, Contractors & Employers",
      description:
        "Track the crew, the expendable personnel, the contractors who went missing and the company that hired them, with every tie between them.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Clues, Logs & Signals",
      description:
        "Keep black box recordings, ship logs and stray signals linked to the places they came from, and note what the crew has not learned yet.",
      icon: "icon-[lucide--radio]",
    },
    {
      title: "Threats, Stress & Escalation",
      description:
        "Write down how a threat grows, what stress and panic look like as consequences in the story, and what changes next if the crew stays. These are story notes for the Warden, not rules automation.",
      icon: "icon-[lucide--triangle-alert]",
    },
  ],
  exampleGraph: {
    title: "Derelict & Crew Web",
    description:
      "One derelict refinery ship, the crew member who is missing, the recording that explains why, the company that sent them and the quarantine nobody lifted.",
    badgeLabel: "Salvage Incident Web",
    palette: "oxblood",
    surface: "dark",
    // Hub-and-spoke: every relation reads outward from the first node.
    steps: [
      {
        label: "RV Ostrander's Rest",
        sublabel: "Derelict • Refinery Ship",
        category: "item",
      },
      {
        label: "Tamsin Okoro",
        sublabel: "Missing Crew • Pump Technician",
        relation: "Lost her crew member",
        category: "character",
      },
      {
        label: "Black Box Recording 7",
        sublabel: "Evidence • Partly Corrupted",
        relation: "Holds",
        category: "note",
      },
      {
        label: "Halvorsen Deepwater Holdings",
        sublabel: "Employer • Salvage Contractor",
        relation: "Is owned by",
        category: "faction",
      },
      {
        label: "The Deck Nine Quarantine",
        sublabel: "Incident • Sealed From Inside",
        relation: "Was put under",
        category: "event",
      },
      {
        label: "The Humming Condenser",
        sublabel: "Anomaly • Still Warm",
        relation: "Contains",
        category: "item",
      },
      {
        label: "Processing Deck Nine",
        sublabel: "Location • Flooded Section",
        relation: "Includes",
        category: "location",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Ship Generator",
      description:
        "Generate a ship with a purpose, a crew complement and a secret, ready to use as the derelict the crew boards.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "NPC & Contact Generator",
      description:
        "Generate contractors, company representatives and survivors, each with a secret and a hook the Warden can play straight away.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Encounter Generator",
      description:
        "Generate a tense encounter for a sealed corridor or a silent cargo bay, with a complication that makes it worse.",
      href: "/generators/encounter",
      badge: "Generator",
    },
    {
      title: "Mystery & Investigation Generator",
      description:
        "Generate a mystery with clues, red herrings and a truth the crew can piece together from logs and recordings.",
      href: "/generators/mystery-investigation",
      badge: "Generator",
    },
    {
      title: "Cosmic Horror Generators",
      description:
        "Browse generators for dread, strange signals and things that should have stayed buried, useful for an anomaly aboard a ship.",
      href: "/generators/cosmic-horror",
      badge: "Hub",
    },
    {
      title: "Venting Helix Derelict Hazard",
      description:
        "See a worked example of a derelict hazard written up as connected notes the Warden can reuse.",
      href: "/examples/the-venting-helix-derelict-hazard",
      badge: "Example",
    },
  ],
  cta: {
    title: "Run the Scenario. Keep the Ship's Secrets.",
    description:
      "Connect ships, crew, employers and evidence in a fast, local-first workspace built for long-running campaigns.",
    buttonText: "Open Your Warden Notes Free",
    buttonHref: "/",
  },
  disclaimer:
    "Codex Cryptica is an independent campaign management tool and is not affiliated with, endorsed, sponsored, or specifically approved by Tuesday Knight Games. Mothership is a trademark of Tuesday Knight Games.",
};

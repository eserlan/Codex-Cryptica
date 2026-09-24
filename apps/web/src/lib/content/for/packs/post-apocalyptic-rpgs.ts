import type { LandingPageConfig } from "../schema";

export const postApocalypticRpgs: LandingPageConfig = {
  slug: "post-apocalyptic-rpgs",
  kind: "genre",
  theme: "apocalyptic",
  hub: "post-apocalyptic",
  seo: {
    title: "Codex Cryptica for Post-Apocalyptic RPG Campaigns",
    description:
      "Keep wasteland settlements, raider factions, radiation zones, mutant threats, and scarce supplies connected across your post-apocalyptic campaign.",
    image: "https://assets.codexcryptica.com/og/post-apocalyptic-rpgs.jpg",
    imageAlt:
      "A fortified wasteland settlement gathers around a water pump beneath a radioactive storm, with threats approaching across the desert",
  },
  hero: {
    eyebrow: "Wasteland Campaigns & Survival Webs",
    title: "Codex Cryptica for Post-Apocalyptic RPGs",
    tagline:
      "Track the settlements, factions, hazards, and dwindling supplies that make every journey through the wasteland matter.",
    problemStatement:
      "A water shortage in one settlement can start a feud with the people guarding the aquifer; a raider truce can collapse when the next dust season ruins the trade route; and a radiation zone can make the only safe road too dangerous to use. Keep the people, places, supplies, and threats connected, so the consequences of survival choices are easy to follow between sessions.",
  },
  useCases: [
    {
      title: "Settlements & Supply Lines",
      description:
        "Record who controls clean water, food, fuel, medicine, and working equipment — and which neighbours depend on the same stores.",
      icon: "icon-[lucide--house]",
    },
    {
      title: "Raider Factions & Fragile Deals",
      description:
        "Connect gangs, militias, traders, and settlement councils through tribute, truces, rival claims, and promises that can fail.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Radiation Zones & Mutant Threats",
      description:
        "Map contaminated ruins, dangerous routes, and creatures that change where people can travel, scavenge, or settle.",
      icon: "icon-[lucide--radiation]",
    },
    {
      title: "Ruins Worth the Risk",
      description:
        "Keep salvage sites, pre-collapse technology, and the people hunting for them tied to the needs and dangers around each expedition.",
      icon: "icon-[lucide--landmark]",
    },
  ],
  exampleGraph: {
    title: "A Wasteland Settlement Web",
    description:
      "One settlement depends on a failing pump, faces pressure from raiders, and prepares for a seasonal hazard and the creatures it drives into the open.",
    steps: [
      {
        label: "Dustbridge",
        sublabel: "Wasteland Settlement",
        category: "location",
      },
      {
        label: "The Greywater Pump",
        sublabel: "Last reliable water source",
        relation: "Depends on for clean water",
        category: "location",
      },
      {
        label: "The Cinder Jackals",
        sublabel: "Raider gang demanding fuel",
        relation: "Faces demands from",
        category: "faction",
      },
      {
        label: "Red Wind Season",
        sublabel: "Dust storm and fallout weather",
        relation: "Shelters from",
        category: "event",
      },
      {
        label: "Glassback Stalkers",
        sublabel: "Mutants driven towards the pump",
        relation: "Defends the pump against",
        category: "creature",
      },
      {
        label: "Mara Venn",
        sublabel: "Water-route scout",
        relation: "Relies on to guide supply runs",
        category: "character",
      },
      {
        label: "The Last Filter Core",
        sublabel: "Salvaged purifier part",
        relation: "Needs to repair the pump with",
        category: "item",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Post-Apocalyptic Generators",
      description:
        "Open the wasteland generator hub for people, settlements, factions, ruins, and adventure hooks.",
      href: "/generators/post-apocalyptic",
      badge: "Hub",
    },
    {
      title: "Settlement Generator",
      description:
        "Create settlements with leaders, local pressures, resources, and trouble the party can act on.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Build raider gangs, militias, and trading groups with goals, resources, and rivals.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "NPC Generator",
      description:
        "Create wasteland survivors with useful skills, personal trouble, and ties to the people around them.",
      href: "/generators/npc",
      badge: "Generator",
    },
    {
      title: "Dungeon Generator",
      description:
        "Turn a ruined bunker, sealed shelter, or dangerous site into an explorable location with factions and hazards.",
      href: "/generators/dungeon-generator",
      badge: "Generator",
    },
    {
      title: "Silo Zero-Seven Fallout Repository",
      description:
        "Explore a four-sector shelter with two factions, a failing water system, and a secret buried in its records.",
      href: "/examples/silo-zero-seven-fallout-repository",
      badge: "Example",
    },
  ],
  cta: {
    title: "Keep the Wasteland Connected",
    description:
      "Tie your settlements, supplies, factions, and threats together in a campaign vault you control.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

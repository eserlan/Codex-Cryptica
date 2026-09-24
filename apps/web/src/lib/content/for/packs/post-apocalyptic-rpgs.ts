import type { LandingPageConfig } from "../schema";

export const postApocalypticRpgs: LandingPageConfig = {
  slug: "post-apocalyptic-rpgs",
  kind: "genre",
  theme: "apocalyptic",
  hub: "post-apocalyptic",
  seo: {
    title: "Codex Cryptica for Post-Apocalyptic RPG Campaigns",
    description:
      "Connect post-apocalyptic settlements, factions, scarce supplies, and hazards from radiation to disease, extreme weather, and hostile machines.",
    image: "https://assets.codexcryptica.com/og/post-apocalyptic-rpgs.jpg",
    imageAlt:
      "A fortified wasteland settlement gathers around a water pump beneath a radioactive storm, with threats approaching across the desert",
  },
  hero: {
    eyebrow: "Wasteland Campaigns & Survival Webs",
    title: "Codex Cryptica for Post-Apocalyptic RPGs",
    tagline:
      "Follow the dependency chains behind survival: who controls clean water, where it travels, who relies on it, and what happens when supply breaks.",
    problemStatement:
      "A water shortage can spark a feud over the aquifer; a raider truce can collapse when dust season damages the trade route, and a radiation zone can make the safest road too dangerous. Link the people, places, supplies, and threats behind those choices, so their consequences carry between sessions.",
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
      title: "Hazard Zones & Altered Threats",
      description:
        "Map radiation, infected areas, toxic weather, machine patrols, and other threats that change where people can travel, scavenge, or settle.",
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
        relation: "Gets clean water from",
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
        relation: "Uses as supply-route scout",
        category: "character",
      },
      {
        label: "The Last Filter Core",
        sublabel: "Salvaged purifier part",
        relation: "Needs for pump repairs",
        category: "item",
      },
    ],
  },
  recommendedTools: [
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
        "Create an explorable post-collapse site, from bunkers, vaults, and shelters to ruined facilities or sealed research sites, with factions and hazards.",
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
    {
      title: "Post-Apocalyptic Generators",
      description:
        "Browse the full generator hub for people, settlements, factions, ruins, and adventure hooks.",
      href: "/generators/post-apocalyptic",
      badge: "Hub",
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

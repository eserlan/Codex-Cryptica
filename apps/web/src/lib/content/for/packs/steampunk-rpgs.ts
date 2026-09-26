import type { LandingPageConfig } from "../schema";

export const steampunkRpgs: LandingPageConfig = {
  slug: "steampunk-rpgs",
  kind: "genre",
  theme: "steampunk",
  hub: "steampunk",
  seo: {
    title: "Codex Cryptica for Steampunk & Victorian Industrial Campaigns",
    description:
      "Organise steampunk and Victorian industrial campaigns with clockwork inventions, industrial guilds, aristocratic houses, airship fleets, and brass-and-steam conspiracies in one connected setting bible.",
    image: "https://assets.codexcryptica.com/og/steampunk-rpgs.jpg",
    imageAlt:
      "A brass airship drifting above a smoke-stained industrial city at dusk",
  },
  hero: {
    eyebrow: "Brass & Steam Worldbuilding",
    title: "Codex Cryptica for Steampunk & Victorian Industrial Campaigns",
    tagline:
      "Keep your inventions, guilds, noble houses, and airship fleets connected across every foggy street and smoking foundry.",
    problemStatement:
      "A steampunk campaign runs on patents, debts, and secrets. When the party's prototype is stolen by a rival guild or a duke's heir turns out to be funding the strike, keep inventions, factories, families, and conspiracies together in Codex Cryptica, not scattered across inventor's notes and session logs. The same workflow suits airship crews, gaslamp investigators, guild intrigue, and industrial-revolution fantasy.",
  },
  useCases: [
    {
      title: "Clockwork Inventions & Patents",
      description:
        "Track each prototype's inventor, workings, flaws, and owner, so a stolen patent or failed engine has consequences later in the campaign.",
      icon: "icon-[lucide--cog]",
    },
    {
      title: "Industrial Guilds & Foundries",
      description:
        "Connect factories, engineers' guilds, and trade unions with the contracts, strikes, and sabotage that set them against one another.",
      icon: "icon-[lucide--factory]",
    },
    {
      title: "Aristocracies & Airship Armadas",
      description:
        "Keep noble houses, aerial fleets, and captains visible, with their debts, titles, and rivalries in view.",
      icon: "icon-[lucide--crown]",
    },
    {
      title: "Brass-and-Steam Conspiracies",
      description:
        "Follow a forged blueprint, a coded ledger, or a suspicious boiler explosion to the secret society behind it. One reveal can change who funds the city and who hunts the crew.",
      icon: "icon-[lucide--eye]",
    },
  ],
  exampleGraph: {
    title: "Sample Steampunk Campaign Web",
    description:
      "See how one invention binds a foundry, a noble patron, a rival guild, and the conspiracy that wants it.",
    steps: [
      {
        label: "The Aetherwheel Engine",
        sublabel: "Experimental Prototype",
        category: "item",
      },
      {
        label: "Blackbrass Foundry",
        sublabel: "Industrial Works",
        relation: "Is built in",
        category: "location",
      },
      {
        label: "Lady Ophelia Crane",
        sublabel: "Noble Patron",
        relation: "Is funded by",
        category: "character",
      },
      {
        label: "The Guild of Cogwrights",
        sublabel: "Engineers' Guild",
        relation: "Is claimed by",
        category: "faction",
      },
      {
        label: "The Skyward Concord",
        sublabel: "Airship Armada",
        relation: "Is coveted by",
        category: "faction",
      },
      {
        label: "The Great Boiler Strike",
        sublabel: "Labour Crisis",
        relation: "Is threatened by",
        category: "event",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Steampunk Hub",
      description:
        "Open steampunk-ready generators for the inventors, guilds, and airship crews around your campaign.",
      href: "/generators/steampunk",
      badge: "Hub",
    },
    {
      title: "Artifact Generator",
      description:
        "Create clockwork devices and lost prototypes with histories, flaws, and people who want them.",
      href: "/generators/artifact-generator",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Build industrial guilds, noble houses, and secret societies with competing agendas.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Ship Generator",
      description:
        "Create airships and river steamers with crews, complications, and secrets.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build foundry towns, smog-choked districts, and trading cities with the trade and trouble that define them.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Secret Society Generator",
      description:
        "Create the hidden hands behind the patents, strikes, and sabotage.",
      href: "/generators/secret-society",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Wind Up Your Next Campaign",
    description:
      "Build a connected city where every patent, strike, and secret changes who holds power next.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

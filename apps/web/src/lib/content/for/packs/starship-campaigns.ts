import type { LandingPageConfig } from "../schema";

export const starshipCampaigns: LandingPageConfig = {
  slug: "starship-campaigns",
  kind: "genre",
  theme: "startrek",
  hub: "optimistic-exploration-sci-fi",
  seo: {
    title: "Codex Cryptica for Starship Campaign Management",
    description:
      "Run starship campaigns with connected bridge crews, ship systems, sector maps, starbases, diplomatic missions, and fleet command webs.",
    image: "https://assets.codexcryptica.com/og/starship-campaigns.jpg",
    imageAlt:
      "Starship bridge with glowing star charts, crew stations, a sector map, and a planet rising over a starbase",
  },
  hero: {
    eyebrow: "Bridge Crews & Fleet Operations",
    title: "Codex Cryptica for Starship Campaigns",
    tagline:
      "Keep bridge crews, ship systems, sector maps, starbases, and fleet orders connected in one place.",
    problemStatement:
      "A starship campaign splits its story across decks, planets, and headquarters: the bridge crew rotates between watches, the ship carries refit debt and battle damage from three sectors back, a trade pact signed last month now constrains this week's first contact, and fleet command keeps issuing orders that contradict the captain's log. When diplomacy, exploration, and fleet politics collide mid-session, you should not have to dig through scattered notes to remember which admiral promised what, which system is under quarantine, and who on the crew still owes the quartermaster an explanation.",
  },
  useCases: [
    {
      title: "Bridge Crews & Landing Teams",
      description:
        "Track officers, watches, specialisms, personal arcs, and landing team assignments alongside the chain of command they report through.",
      icon: "icon-[lucide--users]",
    },
    {
      title: "Ship Systems, Refit & Damage",
      description:
        "Record drive status, weapon mounts, laboratories, shuttle complements, battle damage, and refit schedules next to the missions that caused them.",
      icon: "icon-[lucide--ship]",
    },
    {
      title: "Sector Maps, Starbases & Shipping Lanes",
      description:
        "Chart surveyed systems, quarantined worlds, starbase facilities, patrol routes, and trade lanes with visual relationship graphs.",
      icon: "icon-[lucide--map]",
    },
    {
      title: "Diplomacy, First Contact & Fleet Orders",
      description:
        "Connect treaties, first-contact protocols, rival polities, and standing fleet orders to the sessions where ideals get tested.",
      icon: "icon-[lucide--heart-handshake]",
    },
  ],
  exampleGraph: {
    title: "Sample Starship Campaign Web",
    description:
      "See how a survey cruiser, its crew, sector command, a starbase, and a first contact connect across one frontier sector.",
    steps: [
      {
        label: "RSS Meridian",
        sublabel: "Survey Cruiser",
        category: "item",
      },
      {
        label: "Captain Ilsa Renn",
        sublabel: "Commanding Officer",
        relation: "Commanded by",
        category: "character",
      },
      {
        label: "Sector Command",
        sublabel: "Fleet Authority",
        relation: "Receives orders from",
        category: "faction",
      },
      {
        label: "Starbase Tressel",
        sublabel: "Frontier Resupply Post",
        relation: "Resupplied at",
        category: "location",
      },
      {
        label: "The Vey Pact",
        sublabel: "Rival Polity",
        relation: "Negotiating with",
        category: "faction",
      },
      {
        label: "First Contact at Kell Minor",
        sublabel: "Active Diplomatic Incident",
        relation: "Diverted to",
        category: "event",
      },
    ],
  },
  recommendedTools: [
    {
      title: "Ship Generator",
      description:
        "Create survey cruisers, frigates, and couriers with crew profiles, system quirks, and maintenance headaches.",
      href: "/generators/ship-generator",
      badge: "Generator",
    },
    {
      title: "Star System Generator",
      description:
        "Chart surveyed systems, quarantined worlds, and disputed border zones for the sector map.",
      href: "/generators/star-system",
      badge: "Generator",
    },
    {
      title: "Faction Generator",
      description:
        "Build fleet commands, rival polities, and colonial administrations with agendas and treaties.",
      href: "/generators/faction",
      badge: "Generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Detail starbases, orbital docks, and colony ports with governors, shortages, and dockside rumours.",
      href: "/generators/settlement",
      badge: "Generator",
    },
    {
      title: "Quest Generator",
      description:
        "Frame diplomatic missions, survey assignments, and relief operations as ready-to-run briefings.",
      href: "/generators/quest",
      badge: "Generator",
    },
  ],
  cta: {
    title: "Take the Conn of Your Campaign",
    description:
      "Keep your crew, ship, sector maps, and fleet orders organised with intuitive relationship graphs and offline-ready local storage.",
    buttonText: "Start Building Free",
    buttonHref: "/app",
  },
};

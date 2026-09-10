import type { AnswerConfigInput } from "../schema";

export const whatKindOfShipShouldASciFiRpgPartyStartWith: AnswerConfigInput = {
  slug: "what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
  category: "getting-started",
  publishedAt: "2026-09-10",
  question: "What kind of ship should a sci-fi RPG party start with?",
  kind: "framework",
  shortAnswer:
    "Start the party with a ship that creates play rather than one that solves it: capable enough to travel and survive, but limited enough to leave room for upgrades, debts, repairs, compromises, and difficult choices. A scrappy freighter, a scout ship, and a salvage tug all work; a fully armed cruiser with no weaknesses does not, because there is nothing left for the campaign to give the crew.",
  sections: [
    {
      kind: "prose",
      heading: "The ship's job is to create problems, not remove them",
      paragraphs: [
        "A starting ship that can outrun anything, out-arm anything, and never needs fuel or repairs takes an entire category of story away from the table: nobody has to choose between fixing the engine and paying the crew, nobody gets caught by a faster patrol boat, nobody has to decide whether a job is worth the wear on the hull. The ship stops being a source of decisions and becomes furniture.",
        "Give the ship exactly enough capability to do its intended job and no more, so that every situation outside that job is a genuine problem. A freighter should be good at hauling cargo and bad at combat. A scout ship should be good at surveying and bad at carrying anything heavy. The gap between what the ship can do and what the situation demands is where play happens.",
      ],
    },
    {
      kind: "list",
      heading: "Six starter-ship archetypes, and what each one encourages",
      intro:
        "Pick the archetype that matches the campaign you actually want to run, not the one that sounds most impressive.",
      items: [
        {
          term: "Scrappy freighter",
          text: "Encourages cargo runs, odd jobs, smuggling, and crew friction over limited space and shared money. The ship is rarely the fastest or best-armed vessel in a scene, which makes every job a negotiation with risk.",
        },
        {
          term: "Scout ship",
          text: "Encourages exploration, surveying, first contact, and frontier play. Fast and sensor-heavy, but thin on cargo space and firepower, so the crew survives dangerous places by leaving rather than fighting.",
        },
        {
          term: "Ex-military patrol craft",
          text: "Encourages combat-capable play with political baggage attached: stolen, decommissioned, or grey-market ownership, plus maintenance the crew cannot always afford and old chains of command that occasionally resurface.",
        },
        {
          term: "Science vessel",
          text: "Encourages investigation, anomalies, expeditions, and research missions. Excellent instruments, fragile hull, and a crew that solves problems by understanding them rather than shooting them.",
        },
        {
          term: "Smuggler or courier",
          text: "Encourages speed, secrecy, pursuit, and criminal contacts. Built to outrun trouble rather than survive it, which makes every cargo hold search and every checkpoint a real threat.",
        },
        {
          term: "Salvage tug",
          text: "Encourages wreck-diving, resource scarcity, and engineering challenges. Strong on towing and cutting gear, weak on everything else, so the crew's problem-solving is mechanical and improvised rather than tactical.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A five-part recipe for a memorable starter ship",
      intro:
        "Whichever archetype you pick, give the specific ship these five things before the first session.",
      items: [
        {
          term: "One clear strength",
          text: "A thing this ship is genuinely good at, stated plainly enough that players can plan around it: cargo capacity, sensor range, top speed, stealth, or firepower. Pick one, not several.",
        },
        {
          term: "One serious weakness",
          text: "A thing it is genuinely bad at, in the same plain terms. A fast ship that cannot fight. A tough ship that is slow. A stealthy ship with almost no cargo space.",
        },
        {
          term: "One debt, obligation, or ownership problem",
          text: "A reason the ship is not simply, cleanly the crew's own: a loan against it, a former owner with a claim, a registration that will not survive inspection, or a patron who can recall it.",
        },
        {
          term: "One strange or distinctive feature",
          text: "A quirk that has nothing to do with combat stats: a superstition among the crew, a section that never quite stopped being someone else's, a system that only works if you talk to it, a smell nobody can identify.",
        },
        {
          term: "One reason the crew cannot easily replace it",
          text: "Rare parts, an illegal modification, sentimental or narrative weight, or simply that nobody sells this model anymore. Without this, damage to the ship is just a repair bill instead of a real stake.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Scale, ownership, capability, and upgrades",
      paragraphs: [
        "Size the ship to the party, not to genre spectacle. Enough rooms that the crew has personal space and enough cargo or passenger capacity to matter, but small enough that one system failure or one boarding action affects everyone. A ship built for a crew of forty, crewed by four player characters, mostly produces empty corridors.",
        "Decide ownership deliberately rather than by default. Full, clean ownership removes an entire pressure source; a loan, a lease, a stolen registration, or a patron's ship on loan gives the campaign something to threaten and something to pay off. If the crew does own it outright, that ownership should have cost them something specific to earn, not simply be assumed at character creation.",
        "Keep starting combat capability below what the setting's real dangers require. The ship should be able to handle nuisances and lose to serious threats, which is what makes running, hiding, negotiating, and calling in favours into real options instead of theatre before an inevitable win.",
        "Upgrade potential matters because it turns the ship into a long-term goal rather than a fixed asset. If players can name the next thing they want installed (better shielding, a second gun mount, a proper medical bay), the ship gives the campaign a visible, in-fiction progress track that does not depend on levelling up a character.",
        "Treat the ship as a recurring location and, eventually, a character. Let its condition carry over between sessions, let NPCs recognise it, let its quirks come up unprompted, and let damage from one adventure still be unrepaired at the start of the next. A ship that never changes is scenery; a ship that accumulates history is part of the party.",
      ],
    },
    {
      kind: "example",
      heading: "The same freighter, with and without the recipe",
      paragraphs: [
        "A player party starts with a mid-sized cargo hauler. Compare a version built on spec alone against one built with the five-part recipe.",
      ],
      items: [
        {
          term: "Spec sheet only",
          text: "The Hauler-9 has a large cargo bay, decent speed, light shielding, and a small crew complement. It is a competent, forgettable ship that never comes up in play except as a place characters happen to be standing.",
        },
        {
          term: "With the recipe applied",
          text: "The same hull becomes the Long Debt: strength is cargo capacity, weakness is it cannot outrun a customs cutter, the debt is three more payments owed to the broker who fronted the down payment, the strange feature is a cargo bay that reads four degrees colder than it should for no diagnosed reason, and it cannot be replaced because the broker holds the only paperwork proving it is not stolen.",
        },
        {
          term: "Why it works",
          text: "Nothing about the ship's raw capability changed. What changed is that the ship now generates its own adventure hooks: a job the crew cannot afford to refuse because of the debt, a mystery in the cold cargo bay, and a broker who can make the crew's life difficult at any point the GM needs leverage.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "See the recipe applied to a real generated ship",
      paragraphs: [
        "The Cinder Wren, a Space Western scout ship, shows the five-part recipe working in a finished vessel: a compromised captain in place of a clean owner, disputed salvage standing in for the debt, a hidden AI core as the strange feature, and a practical crew built around what the ship can and cannot do.",
      ],
      cta: {
        text: "Read the Cinder Wren ship example",
        href: "/examples/the-cinder-wren-space-western-ship",
      },
    },
    {
      kind: "checklist",
      heading: "Before the campaign's first jump",
      items: [
        "You can name the ship's one clear strength and one serious weakness in a sentence each.",
        "There is a debt, obligation, or ownership problem attached to the ship, not clean ownership by default.",
        "The ship has one strange or distinctive feature unrelated to combat stats.",
        "You know why this specific ship cannot simply be replaced if it is lost or badly damaged.",
        "Starting combat capability is below what the setting's real threats require.",
        "You have at least one upgrade the crew could plausibly want first.",
      ],
    },
  ],
  codexConnection: {
    heading: "Generate the ship, keep its history",
    paragraphs: [
      "The Ship Generator produces a vessel with a crew, a current mission, a dominant complication, and a hidden secret in one pass, which covers most of the five-part recipe directly. Saving the result into a Codex vault means the ship's condition, debts, and quirks stay recorded and connected to the crew, the broker, and every location the campaign visits, instead of living only in a session's notes.",
    ],
    linkText: "Try the Ship Generator",
    href: "/generators/ship-generator",
  },
  relatedTools: [
    {
      title: "Ship generator",
      description:
        "Generate a campaign-ready vessel for any genre, with crew, mission, complication, and secret.",
      href: "/generators/ship-generator",
    },
    {
      title: "Star system generator",
      description:
        "Give the ship somewhere to go: stars, major bodies, transit routes, and factions.",
      href: "/generators/star-system",
    },
    {
      title: "Faction generator",
      description:
        "Create the broker, patron, or authority behind the ship's debt or ownership problem.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Space Opera",
      description:
        "Organise starship crews, colonies, interstellar politics, and linked adventure locations.",
      href: "/for/space-opera",
    },
    {
      title: "Codex Cryptica for Traveller",
      description:
        "Track subsectors, trade, patrons, ships, and the consequences of travel between worlds.",
      href: "/for/traveller",
    },
  ],
  relatedAnswers: [
    "how-to-create-a-sci-fi-star-system-for-an-rpg",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-i-run-a-successful-session-0",
    "what-kind-of-ship-should-a-pirate-crew-start-with",
  ],
  labels: ["sci-fi"],
  discovery: {
    id: "answer-starter-ship-sci-fi",
    parentCluster: "ship-creation",
    primaryIntent: "what kind of ship should a sci-fi rpg party start with",
    intentAliases: [
      "best starter ship for a sci-fi rpg",
      "what spaceship should my rpg party have",
      "how big should a player ship be",
      "should the party own their ship at the start of a campaign",
    ],
    uniqueValue:
      "Six starter-ship archetypes tied to campaign style, a five-part recipe for a memorable specific ship, and direct guidance on scale, ownership, combat capability, and upgrade potential, rather than a single 'best ship' recommendation.",
    relatedIntents: [
      "generator-ship-generator",
      "generator-star-system",
      "for-space-opera",
      "for-traveller",
      "answer-create-sci-fi-star-system",
      "answer-session-zero",
      "example-cinder-wren",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-starter-ship-pirate",
        reason:
          "Both pages help a party choose a starting vessel, but this page addresses starships and spacefaring campaign pressures, while the pirate page addresses sailing-era hulls, crews, coastal sailing limits, and prize-taking.",
      },
      {
        with: "answer-create-sci-fi-star-system",
        reason:
          "The star system answer builds the destinations, routes, and factions the crew travels between; this answer builds the vessel that does the travelling, with its own distinct design recipe.",
      },
    ],
  },
  seo: {
    title: "What Ship Should a Sci-Fi RPG Party Start With? | Codex Cryptica",
    description:
      "Six starter-ship archetypes tied to campaign style, a five-part recipe for a memorable ship, and guidance on scale, ownership, combat capability, and upgrades.",
    image:
      "https://assets.codexcryptica.com/og/what-kind-of-ship-should-a-sci-fi-rpg-party-start-with.jpg",
    imageAlt:
      "A weathered cargo freighter docked at a rundown space station airlock, cargo containers being loaded under a starfield",
  },
};

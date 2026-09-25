import type { AnswerConfigInput } from "../schema";

export const whatShouldPlayersBeAbleToUpgradeInAnRpgBase: AnswerConfigInput = {
  slug: "what-should-players-be-able-to-upgrade-in-an-rpg-base",
  category: "session-prep",
  publishedAt: "2026-09-25",
  question: "What should players be able to upgrade in an RPG base?",
  kind: "framework",
  shortAnswer:
    "Let players upgrade the parts of a base that change what they can attempt, who they deal with, or what they must look after: capabilities, defences, reach, people and services, standing, supplies and information. A forge, a hidden dock or a sensor array is worth building when it opens new actions and brings a cost or complication with it. An upgrade that only adds a small bonus is usually decoration, so offer fewer, larger choices with more than one good path.",
  sections: [
    {
      kind: "prose",
      heading: "Why upgrade lists go flat",
      paragraphs: [
        "Most base upgrade lists start as a reward table. Walls add defence, a library adds a bonus to research, a better galley improves recovery. Each item is reasonable, and after a few purchases the base is stronger without being any more interesting. Players stop reading the list because nothing on it changes what happens next session.",
        "A useful test is to imagine the upgrade missing. If the campaign would play the same way without it, the upgrade is a number. If the players would have to find a different route, a different ally or a different answer to a problem, the upgrade is doing work. Build the list from the second kind and let the first kind stay in the background as flavour.",
      ],
    },
    {
      kind: "table",
      heading: "Upgrade categories at a glance",
      headers: [
        "Category",
        "The question it answers",
        "Example upgrades",
        "Typical cost or complication",
      ],
      rows: [
        [
          "Capability",
          "What new things can the group do?",
          "Forge or workshop, laboratory, archive, hangar or stables, ritual chamber, training yard",
          "Rare materials, specialist staff, accidents and failed projects",
        ],
        [
          "Safety and resilience",
          "What can the base survive?",
          "Walls or armour plating, watch posts, infirmary, backup power, stores, escape routes, flood or fire protection",
          "Staffing, upkeep, and a stronger base drawing a more serious attacker",
        ],
        [
          "Reach",
          "How far does the party's influence extend?",
          "Scouts, transport, messenger network, portal or jump gate, agents abroad, trade routes",
          "Exposure, rival claims on the same territory, people far away who need protecting",
        ],
        [
          "People and services",
          "Who becomes available?",
          "Artisans, healers, spies, scholars, guards, merchants, diplomats, residents or crew specialists",
          "Wages, loyalty, personal wants, and people who can be threatened or bribed",
        ],
        [
          "Standing and political power",
          "How does the base change the party's social position?",
          "Audience hall, guild charter, legal authority, embassy, public works",
          "Obligations to superiors, envoys with agendas, envy from established powers",
        ],
        [
          "Economy and logistics",
          "How does the base sustain itself?",
          "Farms and granaries, workshops, market rights, salvage processing, fuel or power supply",
          "Supply chains that can be cut, taxes, bad harvests, labour disputes",
        ],
        [
          "Information",
          "What can the party learn earlier or more reliably?",
          "Observatory, spy network, records office, long-range sensors, paid informants",
          "Leaks, false reports, and the question of who else is listening",
        ],
      ],
    },
    {
      kind: "list",
      heading: "The upgrade design test",
      intro:
        "Run each proposed upgrade through five questions before it goes on the list. You do not need a strong answer to every one, but an upgrade should manage at least two:",
      items: [
        {
          term: "What new action does this enable?",
          text: "Name something the party can now try that they could not before: forge a key from a wax impression, reach an island in one tide, hear about a raid before it lands.",
        },
        {
          term: "What new problem or obligation can it create?",
          text: "A workshop can catch fire. An infirmary attracts wounded strangers. A spy network costs money every month and occasionally sells the party out.",
        },
        {
          term: "Who in the world notices or cares?",
          text: "A guild, a lord, a rival crew, a customs office, the neighbours. If nobody would react, the upgrade has no hooks outside the walls.",
        },
        {
          term: "What does it cost to build or maintain?",
          text: "Coin is the obvious answer and often the dullest. Time, materials from a particular place, a specialist who must be persuaded, or a favour owed to a faction all give the build a story.",
        },
        {
          term: "How does it alter future adventures?",
          text: "Some upgrades change which jobs the party can take, how far they can travel, or what they learn first. Those are the ones players remember.",
        },
      ],
      outro:
        'If the answer to all five is "not much", the upgrade is probably decoration. Keep it as colour, or fold it into a larger upgrade that does pass.',
    },
    {
      kind: "list",
      heading: "Ways to make upgrades available",
      intro:
        "How players earn an upgrade shapes what they chase between sessions. Each model suits a different campaign, and most tables do well mixing two or three:",
      items: [
        {
          term: "Resources and treasure",
          text: "Upgrades cost coin, salvage or trade goods. Simple to run and easy to understand, though it can turn the base into a shop if nothing else is involved.",
        },
        {
          term: "Downtime projects",
          text: "Building takes time between adventures, and someone has to oversee it. Good for tables that already use downtime, and it creates natural moments for things to go wrong mid-build.",
        },
        {
          term: "Mission objectives",
          text: "The upgrade requires something the party must go and get: a master shipwright, a surveyed site, a stolen blueprint, a charter signed by a reluctant official. This turns the upgrade list into a source of adventures.",
        },
        {
          term: "Reputation and faction relationships",
          text: "Some upgrades only become possible once a faction trusts the party, or tolerates them. The guild will not send artisans to a hold that cheated them last season.",
        },
        {
          term: "Population and workforce",
          text: "The base can only run what it has people for. Attracting residents, crew or labourers becomes a goal in itself, and every new arrival brings wants of their own.",
        },
        {
          term: "Discoveries and blueprints",
          text: "Exploration finds plans, techniques or ancient machinery that make an upgrade possible. Good for campaigns where the world outside the base is the main event.",
        },
        {
          term: "Tiered prerequisites",
          text: "A dry dock needs a harbour wall first; a spy network needs a trusted handler. Tiers give players a sense of direction, though long chains can harden into a single correct path.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep more than one good path",
      paragraphs: [
        "Players invest in a base when their choices shape it. If one sequence of upgrades is obviously best, the group will follow it and the base will look the same as every other group's. Offer two or three options at each step that pull in different directions: a stronger wall or a better-paid watch, a trading post or a hidden dock, a research wing or a training yard. Each should be good at something different, and each should bring its own complications.",
        "Let the fiction propose upgrades too. When a player says the crew needs somewhere to keep a prisoner, or the village needs a well that does not freeze, that request is often a better upgrade than anything on a prepared list. Ask what it would take, name the cost, and add it.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the same smithy, two ways",
      paragraphs: [
        "A fantasy party holds a small keep and has saved enough to build a smithy. The GM has to decide what the smithy does.",
      ],
      items: [
        {
          term: "The bonus version",
          text: "The smithy grants a bonus to crafting and repair checks made at the keep. The players buy it, note the bonus, and rarely mention it again. It is a reasonable choice, and it changes nothing about the campaign.",
        },
        {
          term: "The version that opens play",
          text: "The smithy lets the party repair gear between expeditions and attempt items they cannot buy, provided they supply the materials. Its master, Ilsa, will only stay if the keep can source good iron, so the party now cares about the ore road through the hills. Her work attracts two apprentices and a travelling tinker with rumours. The local lord notices that the keep can now arm its own guards.",
        },
        {
          term: "Why it works",
          text: "The upgrade adds a capability, a person with a want, a supply problem and a political reaction. The next session has a reason to visit the ore road and a lord who wants to know what the party is arming for.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Cross-genre upgrades that change play",
      paragraphs: [
        "The same pattern holds outside fantasy strongholds. Each upgrade below gives the party something to do and something to handle:",
      ],
      items: [
        {
          term: "Criminal crew: a hidden dock",
          text: "The crew can move goods by water and slip out of the district when the watch closes the streets. The dock also sits on a rival gang's stretch of the canal, so every shipment is now a question of territory.",
        },
        {
          term: "Sci-fi ship: a long-range sensor array",
          text: "The party spots derelicts, patrols and distress calls earlier than anyone nearby. The array draws power the engines sometimes need, and its emissions are easy to detect for anyone who knows what to look for.",
        },
        {
          term: "Settlement: a clinic",
          text: "Wounded characters and residents recover faster, and the settlement becomes known as a place of care. Refugees start to arrive, food runs short sooner, and the healer asks the party to escort a supply caravan.",
        },
        {
          term: "Why these work",
          text: "None of them is a bigger number. Each one changes where the party goes, who they meet, or what they have to protect.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Common problems and how to avoid them",
      intro: "Watch for these as the base grows:",
      items: [
        {
          term: "Too many tiny upgrades",
          text: "Ten small choices produce less play than three large ones. Combine minor improvements into a single upgrade with a clear purpose.",
        },
        {
          term: "Upgrades that only grant passive modifiers",
          text: "A bonus is fine as part of an upgrade. Pair it with a new action, person or obligation so the table has something to do with it.",
        },
        {
          term: "A mandatory correct build path",
          text: "If one route is plainly best, adjust the costs or give the alternatives stronger reasons to exist. Players should argue about priorities, not look up the answer.",
        },
        {
          term: "Upgrades with no visible fiction",
          text: "Describe the new building, the new faces and the new noise. If the players cannot picture the change, they will not remember it.",
        },
        {
          term: "No maintenance or consequences",
          text: "A base that never needs anything stops being a concern. Light upkeep, a supply that can be interrupted, or a person who needs something keeps it in the conversation.",
        },
        {
          term: "Upgrades as punishment magnets",
          text: "If every new building is attacked the following session, players learn to stop building. Let threats be telegraphed, occasional and answerable, and let some upgrades simply work.",
        },
        {
          term: "Spreadsheet micromanagement",
          text: "Some groups enjoy tracking every sack of grain. Many do not. Unless the table has asked for it, track a few resources that matter and handle the rest in the fiction.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you offer the next upgrade",
      intro: "Check the options you are about to put in front of the players:",
      items: [
        "Each option passes at least two of the five design questions.",
        "At least two options pull in different directions, and neither is clearly best.",
        "Each option names who in the world will notice it.",
        "The cost includes something other than coin: time, materials from a specific place, a person, or a favour.",
        "Any ongoing upkeep is light enough that the table will actually track it.",
        "You can describe how the base looks, sounds or feels different once it is built.",
        "At least one option could lead directly to an adventure.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Blades in the Dark",
      rationale:
        "The crew sheet lists lair and crew upgrades such as a boat, a hidden lair, a vault and a workshop, which the crew earns through advancement.",
      href: "https://bladesinthedark.com/crew",
    },
    {
      system: "Stonetop",
      rationale:
        "The steading sheet ties each improvement to specific requirements such as people, materials, communal work or time, and some improvements change what the town can do.",
      href: "https://www.dropbox.com/scl/fi/gw4o6sz4kujw08t3ax707/Playbook-Steading.pdf?rlkey=13ugeg56x0lbs56j65rj7e5xo&dl=0",
    },
    {
      system: "Forbidden Lands",
      rationale:
        "Stronghold rules let characters spend treasure and resources on facilities such as a forge, mill or better defences once they have claimed a castle or ruin.",
      href: "https://freeleaguepublishing.com/games/forbidden-lands/",
    },
  ],
  codexConnection: {
    heading: "Keep upgrades tied to the people and places they affect",
    paragraphs: [
      "Every upgrade that passes the design test creates links: a smithy to its master, the master to an ore road, the ore road to the lord who taxes it. Codex Cryptica keeps each of those as its own entry with connections between them, so when the party considers the next upgrade you can see who it will affect and what is already under strain.",
      "Generate the settlement or ship that serves as the base, add the residents and factions who care about it, and record each upgrade with its cost, its keeper and the complication it brought.",
    ],
    linkText: "Generate a settlement",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement Generator",
      description:
        "Holdings, villages and outposts with people and problems to build upgrades around.",
      href: "/generators/settlement",
    },
    {
      title: "Ship Generator",
      description:
        "Ships and mobile bases with crews, systems and complications to improve.",
      href: "/generators/ship-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Guilds, lords and rivals who react when the base gains new power.",
      href: "/generators/faction",
    },
    {
      title: "NPC Generator",
      description:
        "Artisans, healers and specialists who arrive with an upgrade and want something from it.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Sandbox Campaigns",
      description:
        "Track locations, factions and consequences in an open, party-driven world.",
      href: "/for/sandbox-campaigns",
    },
    {
      title: "Codex Cryptica for Starship Campaigns",
      description:
        "Keep crews, ship systems and sectors connected as one campaign web.",
      href: "/for/starship-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-i-make-a-player-base-matter-in-an-rpg-campaign",
    "what-ttrpgs-let-you-build-and-upgrade-a-base",
    "what-should-an-rpg-settlement-contain",
    "what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
    "what-kind-of-ship-should-a-pirate-crew-start-with",
    "how-do-you-track-faction-turns-between-rpg-sessions",
  ],
  discovery: {
    id: "answer-base-upgrade-ideas",
    parentCluster: "base-building",
    clusters: ["base-building", "session-prep"],
    primaryIntent: "what should players be able to upgrade in an rpg base",
    intentAliases: [
      "rpg base upgrade ideas",
      "stronghold upgrade ideas",
      "settlement upgrades for rpg",
      "what can players build in their base",
      "ttrpg headquarters upgrades",
      "spaceship upgrade ideas for rpg campaign",
      "player stronghold facilities",
    ],
    uniqueValue:
      "A system-neutral upgrade framework for player bases: seven upgrade categories, a five-question design test, a comparison of progression models, cross-genre examples, and fixes for passive-bonus and micromanagement traps.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-make-player-base-matter",
      "answer-base-building-system-selection",
      "answer-settlement-contents",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-make-player-base-matter",
        reason:
          "That page covers how a base earns a lasting role in the campaign as a whole; this one focuses narrowly on designing the upgrade options and how players earn them.",
      },
      {
        with: "answer-base-building-system-selection",
        reason:
          "That page helps a group choose a system with base-building rules; this one helps a GM design upgrade options in any system.",
      },
    ],
  },
  seo: {
    title: "What Should Players Upgrade in an RPG Base? | Codex Cryptica",
    description:
      "Upgrade ideas for strongholds, settlements, lairs and ships, sorted into seven categories, with a five-question design test, progression models and traps to avoid.",
    image:
      "https://assets.codexcryptica.com/og/what-should-players-be-able-to-upgrade-in-an-rpg-base.jpg",
    imageAlt:
      "A fortified courtyard at golden hour with a smithy under construction, scaffolding on a watchtower and a steward studying plans",
  },
};

import type { AnswerConfigInput } from "../schema";

export const whatShouldPlayersBeAbleToUpgradeInAnRpgBase: AnswerConfigInput = {
  slug: "what-should-players-be-able-to-upgrade-in-an-rpg-base",
  category: "session-prep",
  publishedAt: "2026-09-25",
  question: "What should players be able to upgrade in an RPG base?",
  kind: "framework",
  shortAnswer:
    "Let players upgrade the parts of a base that change what they can attempt, who they deal with, or what they can protect: capabilities, defences, reach, people and services, standing, supplies and information. A forge, hidden dock or sensor array earns its place when it opens new actions, changes future choices or creates relationships. Costs and complications can add play, but they need not come with every upgrade. A passive bonus can help, but works best alongside a visible capability or choice. Offer fewer, larger choices with more than one good path.",
  sections: [
    {
      kind: "prose",
      heading: "Why upgrade lists go flat",
      paragraphs: [
        "Most base upgrade lists start as a reward table. Walls add defence, a library adds a bonus to research, a better galley improves recovery. Each item is reasonable, and after a few purchases the base is stronger without being any more interesting. Players stop reading the list because nothing on it changes what happens next session.",
        "A useful test is to imagine the upgrade missing. If the campaign would play the same way without it, the upgrade may be only a number. If it gives the group a new route, ally or answer to a problem, it is doing visible work. A passive bonus can still be useful, but it should usually reinforce a capability or choice rather than be the whole reason the upgrade exists.",
      ],
    },
    {
      kind: "table",
      heading: "Upgrade categories at a glance",
      headers: [
        "Category",
        "The question it answers",
        "Example upgrades",
        "Possible cost, dependency or consequence",
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
          "Staffing or upkeep if the group wants to track it; a stronger base may draw a more serious attacker",
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
          "Wages or personal wants; people may also be threatened or bribed",
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
          "Supply chains, taxes, bad harvests or labour disputes",
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
          term: "What new relationship or complication might it create?",
          text: "A workshop may depend on a craftsperson or rare material. An infirmary can simply save lives, though it might also draw people seeking care. A spy network may create a new source or a risk of leaks. These are possible hooks, not required drawbacks.",
        },
        {
          term: "Who in the world notices or cares?",
          text: "A guild, a lord, a rival crew, a customs office, the neighbours. If nobody would react, the upgrade has no hooks outside the walls.",
        },
        {
          term: "What does it take to build, and does it need upkeep?",
          text: "A build requirement can be coin, time, materials from a particular place, a specialist or a faction's favour; it can give the project a story. Treat upkeep separately: wages, fuel or maintenance belong in the campaign only if recurring management is part of the fun.",
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
      heading: "Five ways to make upgrades available",
      intro:
        "How players earn an upgrade shapes what they chase between sessions. Each model suits a different campaign, and most tables do well mixing two or three:",
      items: [
        {
          term: "Pay for it",
          text: "Spend coin, salvage or trade goods. Simple to run, though it can turn the base into a shop if nothing else is involved.",
        },
        {
          term: "Work on it",
          text: "Use downtime or projects to build between adventures, and attract residents, crew or labourers if the work needs them. Oversight can matter if the table wants to play it out; the build need not go wrong by default.",
        },
        {
          term: "Adventure for it",
          text: "Require a mission or discovery: recruit a master shipwright, survey a site, recover a blueprint or learn an old technique. The project can point towards an adventure.",
        },
        {
          term: "Earn permission or access",
          text: "Tie some upgrades to reputation or faction relationships. The guild may send artisans only once it trusts the party or accepts an apology for last season's betrayal.",
        },
        {
          term: "Build prerequisites",
          text: "Make one facility depend on another: a dry dock may need a harbour wall, or a spy network a trusted handler. Tiers give direction, but long chains can harden into one correct path.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Player priorities and more than one good path",
      paragraphs: [
        "Players invest in a base when their choices shape it. A group that builds a clinic, an intelligence network and guest quarters is creating a different kind of stronghold from one that builds walls, barracks and siege workshops. Ask: what does choosing this upgrade say about the base the players want?",
        "Keep more than one good path. If one sequence is obviously best, the group will follow it and the base will look like every other group's. Offer two or three options that pull in different directions: a stronger wall or a better-paid watch, a trading post or a hidden dock, a research wing or a training yard. Each should be good at something different; complications are optional.",
        "Let the fiction propose upgrades too. When a player says the crew needs somewhere to keep a prisoner, or the village needs a well that does not freeze, that request may be better than anything on a prepared list. Agree a clear build requirement and add it.",
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
        "The same pattern holds outside fantasy strongholds. Each upgrade below changes what the group can do; some also create a complication:",
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
          text: "Wounded characters and residents recover faster, and the settlement becomes known as a place of care. That benefit may be enough on its own; if the campaign wants another hook, refugees might arrive or the healer might ask for an escort.",
        },
        {
          term: "Why these work",
          text: "None is only a bigger number. Each creates a visible capability, even when it does not add a new problem to solve.",
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
          text: "A bonus is fine as part of an upgrade. It works best when it reinforces a visible capability or choice, but it need not come with an obligation or complication.",
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
          term: "Upkeep by default",
          text: "Recurring costs are useful only when the group wants ongoing management. Settle one-time build requirements separately, and let a facility simply work if tracking its upkeep would add bookkeeping without play.",
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
      kind: "list",
      heading: "Build a quick upgrade menu",
      intro:
        "Before the next base-planning session, prepare two or three options:",
      items: [
        {
          term: "Offer different priorities",
          text: "Give the options distinct strengths, with no single correct choice.",
        },
        {
          term: "Name the capability",
          text: "State what new action, protection or reach each upgrade provides.",
        },
        {
          term: "Make the build requirement concrete",
          text: "Name the materials, work, person or permission needed. Include ongoing upkeep only if recurring management suits the campaign.",
        },
        {
          term: "Show who will notice",
          text: "Name a person, faction or neighbour who may care, without making their reaction a required penalty.",
        },
        {
          term: "Leave room for another idea",
          text: "Invite the players to propose an alternative that fits the fiction.",
        },
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

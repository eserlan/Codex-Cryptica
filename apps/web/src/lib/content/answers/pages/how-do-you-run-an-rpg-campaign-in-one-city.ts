import type { AnswerConfigInput } from "../schema";

export const howDoYouRunAnRpgCampaignInOneCity: AnswerConfigInput = {
  slug: "how-do-you-run-an-rpg-campaign-in-one-city",
  category: "session-prep",
  publishedAt: "2026-09-07",
  question: "How do you run an RPG campaign in one city?",
  kind: "framework",
  shortAnswer:
    "Run a campaign in one city by trading breadth for depth: prepare a handful of districts instead of a whole map, build a small recurring cast the party keeps running into, let locations change permanently when the party acts, and layer secrets so each one implicates people the table already knows. A city campaign works when the same names, streets, and debts keep resurfacing rather than when new ones get introduced every session.",
  sections: [
    {
      kind: "prose",
      heading: "The city becomes a hub, not a setting",
      paragraphs: [
        "The usual failure is not underprepping a city; it is overprepping it the wrong way. A GM drafts a dozen districts, a guild for every trade, and a council with a dozen seats, then discovers the party only ever visits three streets. The rest sits unused, and worse, nothing in those three streets connects back to anything the party has already touched, so every session introduces new names instead of paying off old ones.",
        "A city sustains a whole campaign the same way a good ensemble cast sustains a long-running show: a small, fixed set of places and people who keep returning, each carrying more history every time. Scope shrinks; depth grows.",
      ],
    },
    {
      kind: "list",
      heading: "Four things that make a city hold a campaign",
      intro:
        "Build these once, then spend every session deepening them rather than adding new ones:",
      items: [
        {
          term: "Three to five districts, not a map",
          text: "Pick districts the way you would pick locations for a settlement: each one earns its place by doing a job for the city (docks, markets, temple quarter, slums, the seat of power). Prepare each to the same shallow depth as a single settlement page. Do not draw streets between them; the party moves by scene, not by grid.",
        },
        {
          term: "A recurring cast of six to eight",
          text: "Fewer named NPCs than a sandbox campaign would use across a whole region, because the same few have to carry the whole campaign. Give each one a want, a district they are tied to, and at least one relationship to another NPC on the list, so pulling one thread moves a second person.",
        },
        {
          term: "Locations that change and stay changed",
          text: "When the party burns down the smugglers' warehouse, sinks a rival's ship, or gets a magistrate removed, that change has to still be true three sessions later. A city campaign proves itself is real by never quietly resetting a consequence the party caused.",
        },
        {
          term: "Secrets layered across the cast, not hidden in one NPC",
          text: "Instead of one villain holding one secret, split a single conspiracy across several of the recurring NPCs, each knowing a partial, plausible piece. Following any one lead should point toward someone else on the cast list rather than dead-ending or pointing somewhere new.",
        },
      ],
    },
    {
      kind: "example",
      heading: "The same guild problem, played wide versus played deep",
      paragraphs: [
        "A dockworkers' guild is skimming cargo tariffs. Compare running that as a one-off encounter against running it as part of a single-city campaign's recurring cast.",
      ],
      items: [
        {
          term: "Played wide",
          text: "The party exposes the guild in one session. The guildmaster is arrested, a new NPC replaces them off-screen, and the campaign moves to an unrelated problem in a different district next week. The city has not become more familiar; it has simply produced its next plot.",
        },
        {
          term: "Played deep",
          text: "The guildmaster is one of the eight recurring NPCs, already tied to the temple quarter's chief inquisitor through an old debt. Exposing the skimming does not end the guild; it forces the guildmaster to call in that debt, which pulls the inquisitor into direct conflict with the party three sessions later over an unrelated favour. The docks district itself changes: tariffs rise, a rival guild moves into the gap, and the change is still visible when the party passes through months afterward.",
        },
        {
          term: "Why it works",
          text: "Nothing new had to be invented to escalate the second version. The consequence travelled along a relationship that already existed, which is what makes a city feel inhabited rather than generated on demand.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Resist the urge to add a new district",
      paragraphs: [
        "The strongest instinct to fight in a single-city campaign is reaching for a new location whenever a session runs short on material. A city with six well-worn districts and eight NPCs the players can predict the reactions of will outlast a city with fifteen thin ones. When a session needs fresh material, it almost always comes cheaper from an existing NPC's unresolved want than from a new street.",
        "Keep a single page per district and per NPC listing only what has changed since the last time the party interacted with them. That page, not a map, is what makes the city legible six months into the campaign.",
      ],
    },
    {
      kind: "checklist",
      heading: "The city is ready to sustain a campaign when",
      intro: "Confirm before session one:",
      items: [
        "You have three to five districts, each with a job the city needs done.",
        "You have six to eight named NPCs, each tied to a district and to at least one other NPC on the list.",
        "At least one past consequence the party could plausibly cause is written down as permanent, not resettable.",
        "A citywide secret is split across at least two NPCs rather than held by one.",
        "You can name what changes in a district if the party ignores it for a month of game time.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping a whole city consistent across a long campaign",
    paragraphs: [
      "A single-city campaign lives or dies on continuity: whether the guildmaster's debt to the inquisitor is still there in session twenty, and whether the docks are still short-staffed after the party's raid. Codex Cryptica's campaign graph holds districts, NPCs, and factions as connected entities, so a consequence recorded once stays visible everywhere it touches instead of depending on session notes you have to reread.",
      "The settlement generator is a fast way to seed each district with a reason to exist; the NPC and faction generators can build out the recurring cast and the relationships that tie them together.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Free, no login. Districts and neighbourhoods with a reason to exist, across any genre.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Build the recurring cast, with motives, mannerisms, and relationship hooks.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Create the guilds and power groups the recurring cast belongs to.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Sandbox RPG Campaigns",
      description:
        "Manage player-directed campaigns with live relationship maps and faction tracking.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "what-should-an-rpg-settlement-contain",
    "how-do-you-create-a-fantasy-city-that-feels-alive",
    "how-to-create-a-cyberpunk-city-district",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-organise-npc-relationships",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-many-npcs-does-an-rpg-town-need",
  ],
  discovery: {
    id: "answer-single-city-campaign",
    parentCluster: "sandbox-campaigns",
    primaryIntent: "how to run an rpg campaign in one city",
    intentAliases: [
      "single city rpg campaign",
      "urban sandbox campaign",
      "how to run a campaign confined to one city",
    ],
    uniqueValue:
      "A depth-over-breadth framework for confining a whole campaign to one city: three to five districts, a recurring cast of six to eight NPCs with relationships to each other, locations that change permanently, and secrets split across the cast rather than held by one villain.",
    relatedIntents: [
      "answer-sandbox-campaign-prep",
      "answer-settlement-contents",
      "answer-cyberpunk-city-district",
      "answer-run-factions-sandbox",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-sandbox-campaign-prep",
        reason:
          "That page preps a breadth-first regional sandbox (one hub, three sites, six rumours) that expands outward as players travel. This page assumes the campaign stays inside one city and goes for depth instead: fewer locations and NPCs, reused repeatedly, with consequences that compound.",
      },
      {
        with: "answer-settlement-contents",
        reason:
          "That page covers what a single settlement needs for a session or two. This page covers structuring an entire multi-session campaign around one city: districts as recurring sites, a cast that persists, and secrets layered across sessions.",
      },
    ],
  },
  seo: {
    title: "How do you run an RPG campaign in one city? | Codex Cryptica",
    description:
      "Run a whole campaign in one city with a depth-over-breadth framework: a few districts, a recurring NPC cast, permanent consequences, and layered secrets.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-an-rpg-campaign-in-one-city.jpg",
    imageAlt:
      "An isometric night-time view of a fantasy city with a lantern-lit market square, dockside quarter, and temple district connected by threads of light",
  },
};

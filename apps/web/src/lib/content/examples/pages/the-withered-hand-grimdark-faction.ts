import type { ExampleConfigInput } from "../schema";

/**
 * Source: discussion #2666. Fills the first example page for the new Dark
 * Fantasy / Grimdark Faction generator (#1136, PR #2634). Output reproduced
 * verbatim, following the generator's own content/lore structure.
 */
export const theWitheredHand: ExampleConfigInput = {
  slug: "the-withered-hand-grimdark-faction",
  name: "The Withered Hand",
  title: "Dark Fantasy faction example: The Withered Hand",
  kind: "faction",
  genre: "Dark Fantasy",
  summary:
    "A corpse guild that keeps a plague-stricken city from drowning in its own dead, funded by a bargain its founder made that is about to come due at everyone else's expense.",
  provenance: "raw",
  generator: {
    name: "Dark Fantasy / Grimdark Faction generator",
    href: "/generators/dark-fantasy-faction",
  },
  context: [
    { label: "Dark Fantasy Mode", value: "Corpse Economy" },
    { label: "Faction Type", value: "Corpse Guild" },
    { label: "Operating Scope", value: "A cursed city under martial law" },
    {
      label: "Moral Posture",
      value:
        "Necessary evil — everyone knows what they do and needs it done anyway",
    },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/faction-withered-hand.jpg",
    alt: "Masked wardens of The Withered Hand tending corpse carts and bone-rendering cauldrons in the Ashfield Charnel Exchange",
  },
  output: [
    {
      kind: "prose",
      heading: "What they control",
      paragraphs: [
        "The Withered Hand holds the city's only standing contract for corpse removal, and has for three generations — since the last outbreak, no other guild has been willing to bid against them for it. They control the Ashfield Charnel Exchange, the fortified rendering yard built into the old cattle markets, and with it the entire legal supply of what the dead leave behind: reclaimed bone for the masons' guild, rendered fat for the lamp-oil trade, and organs for the college of alchemists, all sold at prices the city magistrate has stopped even pretending to regulate.",
      ],
    },
    {
      kind: "prose",
      heading: "What they want",
      paragraphs: [
        "Bury the truth of how the last outbreak actually started, before the pact that pays for their silence comes due and someone forces the question into the open.",
      ],
    },
    {
      kind: "prose",
      heading: "Why they are dangerous",
      paragraphs: [
        "The pact that funds them is coming due, and paying it means betraying the people they protect — the Hand's founder bargained away something specific to end the last outbreak, and the price was never publicly named. Their posture — necessary evil, the kind everyone quietly depends on — means they will not stop simply because they are shown to be wrong. A city that needs its dead handled by someone will keep choosing the Hand over the alternative, even once it knows exactly what the Hand has been hiding.",
      ],
    },
    {
      kind: "prose",
      heading: "How to use them at the table",
      paragraphs: [
        "Bring the Withered Hand into play the moment the party needs a body identified, disposed of, or exhumed — they are the only guild in the cursed city with the authority to do any of it legally, and they will always help, for a price that is never quite money. Let them be useful, even indispensable, long before the party learns what the guild's founding pact actually cost, and who is still paying it.",
      ],
    },
    {
      kind: "list",
      heading: "At a Glance",
      items: [
        {
          term: "📍 Base",
          text: "The Ashfield Charnel Exchange, a fortified rendering yard built into the old cattle markets, its gates watched day and night by guild wardens in wax-sealed masks.",
        },
        {
          term: "Resource",
          text: "Exclusive legal control of the city's dead — bone, fat, and organs — sold through contracts no rival guild has been permitted to bid against in three generations.",
        },
        {
          term: "Symbol",
          text: "A stitched grey hand sewn onto every burial shroud the guild processes, marking it as handled and therefore safe.",
        },
        {
          term: "Secret",
          text: "The pact that funds them is coming due, and paying it means betraying the people they protect.",
        },
        {
          term: "Immediate Hook",
          text: "A body turns up bearing the guild's mark, in a district the guild insists it has never operated in.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Notable NPCs",
      items: [
        {
          term: "👤 Warden-Superior Ansel Coyt",
          text: "Signed the founding pact himself as a young journeyman and has spent forty years making sure no one else ever reads the terms he agreed to.",
        },
        {
          term: "👤 Journeyman Mira Falk",
          text: "Handles the exhumations no one else will touch, keeps a private ledger of every irregular corpse she's processed, and has started asking Coyt questions he won't answer.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Internal Conflict",
      paragraphs: [
        "The pact that funds them is coming due, and paying it means betraying the people they protect — Coyt knows the exact date, has known for years, and has told no one else in the guild what the payment actually requires. Falk's private ledger, if she ever puts the irregular exhumations together in the right order, gets her to the same answer in a fraction of the time it took Coyt to accept it.",
      ],
    },
    {
      kind: "list",
      heading: "Rival Faction",
      items: [
        {
          term: "👥 The College of Alchemists",
          text: "Buys the Hand's rendered organs at guild-set prices and resents every markup, and has spent a decade quietly petitioning the magistrate to open corpse contracts to competitive bid.",
        },
      ],
    },
  ],
  annotation: {
    heading: "What makes this read as grimdark rather than just grim",
    paragraphs: [
      "It would be easy to make a corpse guild that's simply villainous — desecrating the dead for profit, menacing anyone who asks questions. What the moral posture axis does instead is force the faction to be doing something the city actually needs, and doing it in a way that becomes indefensible only once you look closely. Nobody in this cursed city wants the Withered Hand gone; they just don't know yet what its founder traded to make the last outbreak stop.",
      "That's the load-bearing difference between grimdark and generic evil: a standard fantasy faction can be opposed cleanly, because stopping them is unambiguously good. Opposing the Withered Hand means taking away the only guild capable of handling a plague-stricken city's dead, with nothing lined up to replace them. A party that exposes Coyt's pact doesn't get a clean victory — they get a city with no corpse guild in the middle of a mortality crisis, and a very reasonable magistrate asking what their plan is now.",
      "Notice, too, that the guild's internal conflict isn't a rival trying to seize power — it's a subordinate stumbling toward a truth her own superior has spent decades protecting her from. That's a much more usable hook for a party than a coup plot: Falk can be recruited, warned off, or raced to the answer, and each choice changes what the party learns about the pact before Coyt has to explain it himself.",
    ],
  },
  relatedGenerators: [
    {
      title: "Dark Fantasy / Grimdark Faction generator",
      description:
        "Generate fallen orders, cursed noble houses, plague cults, witch-hunter lodges, and corpse guilds doing something defensible in the worst possible way. Free, no login.",
      href: "/generators/dark-fantasy-faction",
    },
    {
      title: "Faction generator",
      description:
        "For a standard fantasy faction rather than a grimdark one — guilds, courts, and cults without the moral-posture axis.",
      href: "/generators/faction",
    },
  ],
  relatedAnswers: [
    {
      title: "How do you create a fantasy faction?",
      description:
        "The building blocks — goal, resource, obstacle — that both the standard and grimdark faction generators share.",
      href: "/answers/how-do-you-create-a-fantasy-faction",
    },
  ],
  relatedForPages: [],
  relatedExamples: ["the-low-tide-rust-dock-syndicate"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/discussions/2666",
  seo: {
    title: "Dark Fantasy faction example: The Withered Hand | Codex Cryptica",
    description:
      "A grimdark corpse-guild roll from the new Dark Fantasy / Grimdark Faction generator, doing something a plague-stricken city genuinely needs in the worst possible way.",
  },
};

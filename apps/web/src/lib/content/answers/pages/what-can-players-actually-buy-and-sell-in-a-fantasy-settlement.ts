import type { AnswerConfigInput } from "../schema";

export const whatCanPlayersActuallyBuyAndSellInAFantasySettlement: AnswerConfigInput =
  {
    slug: "what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
    category: "session-prep",
    publishedAt: "2026-09-27",
    question: "What can players actually buy and sell in a fantasy settlement?",
    kind: "framework",
    shortAnswer:
      "Give each settlement a small market profile: its scale, the common goods always about, the imports that arrive irregularly, the specialists who make or commission the rest, the buyers able to absorb treasure or bulk, and the current pressure bending all of it. A hamlet sells bread and buys nothing precious; a regional market stocks ordinary gear and takes ordinary treasure; only a city or port moves luxuries, bulk cargo, or extraordinary items, and then through named brokers, guild permission, or waiting time. Availability stays separate from affordability: the sword can hang on the rack beyond any purse, or sit affordable in the capital but absent here.",
    sections: [
      {
        kind: "prose",
        heading: "The universal shop breaks belief on arrival",
        paragraphs: [
          "Most settlements sell from the same invisible stock: whatever the party wants is either on the shelf at list price or it is not, and selling works the same way in reverse. A hamlet buys a dragon hoard without blinking, a mining camp stocks plate armour in six sizes, and nobody ever needs to wait, travel, or ask permission. The economy answers built earlier in this cluster stop mattering the moment the party opens a purse.",
          "The repair is a profile, not an inventory. Six short lines per settlement decide what is routinely about, what arrives sometimes, what must be made to order, and who can actually pay for what the party carries in. Written once, the profile answers every buy and sell question for sessions without a single exhaustive list.",
        ],
      },
      {
        kind: "list",
        heading: "Six lines of a market profile",
        intro:
          "Draft these when the party first heads somewhere, starting from the settlement ledger this cluster already built:",
        items: [
          {
            term: "Scale",
            text: "Place the market on a rough ladder: hamlet, town, regional centre, major city, trade hub. Scale governs breadth and buyer depth together. A hamlet feeds its own; a regional centre gathers the surplus of a dozen villages; only a city or port holds enough coin and craft in one place to move the exceptional. Keep the ladder loose: it guides judgement, never acts as a locked gate.",
          },
          {
            term: "Common goods",
            text: "Name what residents routinely produce, stock, or use: grain, livestock, timber, basic tools, ordinary cloth. These are easy to find in ordinary quantities at steady prices, and they stay steady unless a pressure from the scarcity answer bends them. If the party wants rope, nails, bread, or a mule, this line ends the discussion.",
          },
          {
            term: "Imported and irregular goods",
            text: "Name what arrives through caravans, ships, seasonal fairs, or travelling merchants: salt, iron, wine, lamp oil, decent steel. Such goods may be present but never reliably, so answer with timing rather than price: the caravan is due, the fair ended last week, one merchant has three barrels left. Absence here is ordinary, not a crisis.",
          },
          {
            term: "Specialists and commissions",
            text: "Name who can make what cannot be bought off a shelf: the armourer, the apothecary, the shipwright, the scribe, the alchemist, the enchanter where the setting allows one. Each entry needs its terms: unusual materials, time, advance payment, and any guild or political permission. Fine weapons, plate, and extraordinary items live here or nowhere; there are no magic shops unless the settlement's institutions explain who stocks them and why.",
          },
          {
            term: "Buyer capacity",
            text: "Name who can actually pay, separately for three kinds of sale. Ordinary valuables go to any resident merchant. Bulk cargo needs a merchant house, a guild factor, or a noble provisioning a household. Rare, prestigious, or magical pieces need a patron, a temple treasury, a fence with distant contacts, an auction, or a journey to a larger market. A town can overflow with bread and still have nobody able to buy a legendary jewel, and that gap is a feature.",
          },
          {
            term: "Current pressure",
            text: "Note the one strain bending the profile right now, borrowed from the scarcity and trade-route answers: a closed pass, a late caravan, a festival, a levy, a new route. Pressure moves goods between lines: salt slides from imported to scarce, wool collapses from export to unsellable, commissions stall for lack of materials. Update one line when the world changes and the market stays honest.",
          },
        ],
        outro:
          "Six lines fit on an index card. Anything the party asks maps to exactly one of them, which is what keeps rulings fast and consistent across sessions.",
      },
      {
        kind: "prose",
        heading: "Two distinctions that prevent most arguments",
        paragraphs: [
          "First, availability is not affordability. A breastplate can hang in the city armoury at a price no starting purse can meet; a healing draught can be cheap in the capital and absent in the village at any price; a commission can be agreed today and delivered after six weeks of waiting. Say which of the three blocks the purchase: too dear, not here, or not yet. Players accept all three when the reason is visible, and dispute all three when it is not.",
          "Second, the daily market is not the specialist market. A settlement can feed and clothe everyone in it while supporting none of the following: arms in bulk, luxuries, magical services, high-value treasure purchases, or large cargo deals. Never reduce a market to one number. A big prosperous town can still send the party to the city for plate, to the port for a buyer, and to a named broker for anything enchanted.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: Harrowgate, regional market town",
        paragraphs: [
          "Harrowgate gathers the surplus of a dozen villages and sits on a fair calendar. The northern pass has just closed.",
        ],
        items: [
          {
            term: "The profile",
            text: "Common: grain, livestock, timber, basic tools. Imported: salt, iron, wine. Specialists: an armourer and an apothecary; fine weapons by commission with steel and six weeks. Rare: extraordinary items only through named brokers or visiting merchants. Buyer capacity: ordinary treasure sells easily; exceptional pieces need a noble, a temple, a guild, or a larger-city buyer. Current pressure: with the pass closed, salt and lamp oil are scarce while wool prices have collapsed locally.",
          },
          {
            term: "At the table",
            text: "The party restocks rope, rations, and horseshoes without a roll. The fighter's commission for a fine sword is accepted with half in advance and a midsummer delivery. The salt they hoped to buy costs triple and comes with a warning, not a refusal. Their captured jewelled cup finds no local buyer at anything near its worth: the broker offers a letter of introduction to a temple treasurer in the city, which is the next session's travel plan writing itself. Nobody consulted a price table; the six lines answered everything.",
          },
          {
            term: "Why it works",
            text: "Each ruling followed from a named line rather than improvisation, so the players could have predicted most of it: common means easy, imported means timing, specialist means terms, buyer capacity means travel for the exceptional. The closed pass did not add a new rule; it moved salt and wool between lines the party already understood.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before the party reaches the market",
        intro: "For each settlement on the route, confirm:",
        items: [
          "Can you place its scale on the ladder in one phrase?",
          "Are common goods listed narrowly enough that most requests end quickly?",
          "Do imports carry timing (due, just missed, last barrels) rather than flat refusals?",
          "Does every specialist have terms: materials, time, payment, and permission?",
          "Do you know who buys ordinary loot, who buys bulk, and who buys the exceptional, by name or office?",
          "Is the current pressure written as moved lines, not as a mood?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keeping every market beside its settlement",
      paragraphs: [
        "A market profile only stays honest while it sits next to the facts behind it: the ledger that says what the town makes, the route that brings the imports, the faction that grants or withholds permission, the pressure currently bending two of the lines. Scattered notes let the profile drift until every town sells everything again. Codex Cryptica holds the profile against its settlement entity, beside the suppliers, specialists, and buyers involved, so a closed pass updates the market in the same place you prep from.",
        "The settlement generator drafts the shell the profile hangs on: surroundings, people, tensions, and places worth visiting. The six lines above turn that draft into a counter the party can actually stand at.",
      ],
      linkText: "Try the settlement generator",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Draft the town behind the counter, then hang the six-line profile on it.",
        href: "/generators/settlement",
      },
      {
        title: "Faction generator",
        description:
          "Create the merchant houses, guilds, and patrons who commission and buy the exceptional.",
        href: "/generators/faction",
      },
      {
        title: "Rumour generator",
        description:
          "Spread word of fairs, caravans due, scarce goods, and buyers looking for sellers.",
        href: "/generators/rumour",
      },
      {
        title: "World generator",
        description:
          "Place the larger markets the party must travel to when local capacity runs out.",
        href: "/generators/world",
      },
    ],
    relatedForPages: [
      {
        title: "TTRPG Economy & Trade",
        description:
          "Build believable prices, trade, scarcity, wealth, and economic pressures without simulating an entire economy.",
        href: "/for/economy-trade",
      },
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep markets, settlements, routes, and buyers connected across a campaign.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
      "how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
      "how-do-i-upgrade-a-player-characters-weapon-without-replacing-it",
      "how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses",
    ],
    discovery: {
      id: "answer-settlement-market-buy-sell",
      parentCluster: "economy-trade",
      clusters: ["economy-trade"],
      primaryIntent:
        "what can players actually buy and sell in a fantasy settlement",
      intentAliases: [
        "what can players buy in a fantasy town",
        "can players sell treasure in a small town",
        "how to handle shops in a fantasy rpg",
        "fantasy market availability for adventurers",
      ],
      uniqueValue:
        "A six-line market profile (scale, common, imported, specialists, buyer capacity, pressure) that rules every buy, commission, and sale at the counter, with a Harrowgate worked example and explicit availability-versus-affordability guidance.",
      userJob: "create",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-settlement-production-imports-exports",
        "answer-trade-routes-shape-cities-kingdoms",
        "answer-scarcity-shortages-prices-conflict",
        "answer-economic-pressures-adventure-hooks",
        "for-economy-trade",
        "generator-settlement",
        "generator-faction",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-settlement-production-imports-exports",
          reason:
            "The ledger answer derives what a settlement makes and depends on from its surroundings. This page starts where the ledger ends and rules the player-facing counter: what can be bought, commissioned, or sold, and to whom.",
        },
        {
          with: "answer-scarcity-shortages-prices-conflict",
          reason:
            "The scarcity answer traces how a missing good produces competing claims and conflict. This page treats pressure as one line of the market profile and rules what remains purchasable or saleable while the shortage lasts.",
        },
      ],
    },
    seo: {
      title: "What Can Players Buy and Sell in a Settlement? | Codex Cryptica",
      description:
        "Rule every market trip with a six-line profile: scale, common goods, imports, specialists, buyer capacity, and current pressure.",
      image:
        "https://assets.codexcryptica.com/og/what-can-players-actually-buy-and-sell-in-a-fantasy-settlement.jpg",
      imageAlt:
        "A fantasy market square with stalls, a smithy, and merchants weighing coins beside laden pack animals",
    },
  };

import type { AnswerConfigInput } from "../schema";

export const howDoIRunACampaignWhereThePlayersOwnABusiness: AnswerConfigInput =
  {
    slug: "how-do-i-run-a-campaign-where-the-players-own-a-business",
    category: "session-prep",
    publishedAt: "2026-09-30",
    question: "How do I run a campaign where the players own a business?",
    kind: "framework",
    shortAnswer:
      "Let the business generate adventures, not replace adventuring. Track five or six abstract traits such as profit, reputation, staff, supplies, security and debt rather than coin-by-coin bookkeeping, resolve business activity in turns between adventures, let players invest in visible improvements, and turn every complication and success into relationships and hooks the party must handle in normal play.",
    sections: [
      {
        kind: "prose",
        heading: "The trap is turning the campaign into accounting",
        paragraphs: [
          "A player-owned tavern, shop, guildhall, inn, mercenary company, trading house or salvage yard can give a campaign a centre, a reason to stay in one place and a cast of people who depend on the party. It can also quietly become a second job: daily ledgers, wage calculations, stock lists and price tables that eat session time without producing a decision the players remember.",
          "The useful principle is simple. The business should generate adventures, not replace adventuring. If a rule or record does not create a choice, a person or a problem the party can interact with, it is adding bookkeeping without adding play. Keep the management loop light enough that you can resolve it in a few minutes between sessions, and spend the saved time on what happens because of it.",
        ],
      },
      {
        kind: "list",
        heading: "Treat the business as a handful of traits, not a spreadsheet",
        intro:
          "Track enough about the business that investments and setbacks feel different from each other, but not so much that you need a calculator. Five or six traits are usually enough:",
        items: [
          {
            term: "Profit and cash flow",
            text: "Whether the business covers its costs, builds a small reserve or loses money. Use a simple scale such as struggling, stable or thriving rather than exact coin counts. Players should be able to see that takings have changed without auditing every sale.",
          },
          {
            term: "Reputation",
            text: "What customers, neighbours and local notables think the place is: reliable, fashionable, rowdy, secretive, cheap, honest. Reputation decides who walks through the door and what they expect when they arrive.",
          },
          {
            term: "Staff",
            text: "The handful of people who keep the place running when the party is away. Track competence and loyalty in broad strokes, not individual wages. A named cook, a guard or a clerk with a clear want is worth more than six stat blocks.",
          },
          {
            term: "Supplies and capacity",
            text: "Whether the business can meet demand: stock, workspace, rooms, tools, transport or berths. Shortages and bottlenecks create pressure long before the ledger shows a loss.",
          },
          {
            term: "Security",
            text: "How well the premises, goods and people are protected. Stronger security does not merely prevent trouble, it changes what trouble looks like when it arrives.",
          },
          {
            term: "Debt and obligations",
            text: "Loans, favours, charters, guild dues or promises made to get the doors open. Every debt is a relationship with someone who will one day want something.",
          },
        ],
        outro:
          "You do not need all six at once. Pick the four or five that fit the business the players actually run and leave the rest as colour until play makes them relevant. A smugglers' den may care more about security and debt than about public reputation, while a fashionable salon cares about reputation above all else.",
      },
      {
        kind: "prose",
        heading: "Decide how much bookkeeping is actually useful",
        paragraphs: [
          "Ask the table how much management they want. If they mainly want a home base that produces hooks and familiar faces, keep finances abstract and resolve the business in a single scene when the party returns. If they enjoy projects and trade-offs, give the traits more room and let investment choices carry into the next turn.",
          "A practical rule is to handle ongoing costs in the fiction rather than as a recurring tax. When the party hires a guard, upgrading security is the visible change; you do not need to deduct wages each week unless the group has asked for that kind of play. Reserve detailed tracking for the trait that is currently under strain, and let the others simply work until something challenges them.",
          "Some groups want merchant-company or domain-management play, and some systems already have strong business mechanics. Keep those mechanics when they suit the table, and use this lightweight turn as the narrative and adventure layer around them.",
          "Avoid simulating every day. Players remember the week the cellar flooded or the guild inspector arrived, not the fourteen ordinary Tuesdays between them.",
        ],
      },
      {
        kind: "list",
        heading: "A five-step business turn between adventures",
        intro:
          "Resolve business activity in turns, for example weekly, monthly or between adventures, rather than day by day. Each turn should take a few minutes and end with something the party can act on:",
        items: [
          {
            term: "Choose one priority",
            text: "The players pick one investment, project or focus for the turn: repair the roof, hire a specialist, court a supplier, advertise, pay down a debt or expand into a new service. One choice keeps the business legible and makes the consequences easy to trace.",
          },
          {
            term: "Resolve one business event",
            text: "Make one or two relevant checks with the system you already use, or simply decide based on the fiction and the priority the players chose. Do not roll for every trait; let most things run as expected and focus the dice on the thing under pressure.",
          },
          {
            term: "Adjust a small number of traits",
            text: "Move one or two traits a step on their scale. A successful turn might raise reputation or stabilise profit, while a neglected supply problem might reduce capacity. Keep the change visible and name it in the fiction: fuller tables at lunch, a new face behind the bar, emptier shelves.",
          },
          {
            term: "Generate a complication, opportunity or relationship change",
            text: "Turn the result into something playable. A complication is a person who wants something, an opportunity is a door that has opened, and a relationship change is a faction or customer whose attitude has shifted. You do not need one every turn; when nothing pressing arises, let the business recalibrate or simply improve quietly.",
          },
          {
            term: "Bring major consequences to the table",
            text: "Anything that matters should become a scene, a choice or an adventure hook in normal play, not a modifier that sits on a sheet. The business earns its place at the centre of the campaign when its results walk through the door.",
          },
        ],
        outro:
          "If a step would not produce a visible change, skip it and move on. The loop is a prompt for play, not a simulation that must be completed each time.",
      },
      {
        kind: "list",
        heading: "Let players invest in improvements they choose",
        intro:
          "Investments work best when they express what the players want the business to become. Offer a few distinct directions, each with a clear benefit and a new connection or responsibility:",
        items: [
          {
            term: "Better premises",
            text: "A larger taproom, a private dining room, sturdier walls, a hidden cellar, a workshop, a stable or extra berths. The building now allows something new: more customers, discreet meetings, crafting, storage or a faster getaway.",
          },
          {
            term: "Specialist staff",
            text: "A brewer, a chef, a healer, a clerk, a guard captain, an artificer or a navigator. Each one solves a problem and brings their own contacts, habits and trouble.",
          },
          {
            term: "Security",
            text: "Locks, guards, watch arrangements, wards or a deal with a local protector. Better security raises the stakes of any breach, because an attacker who gets past it clearly wanted in.",
          },
          {
            term: "New services",
            text: "A lunch trade, a courier run, a repair bench, a bulletin board for jobs, a bathhouse or a shrine. Each service invites a new kind of customer through the door.",
          },
          {
            term: "Advertising and reputation",
            text: "Signage, sponsorship of a festival, patronage of a local performer, a consistent house style. Reputation work changes who has heard of the place and what they expect from it.",
          },
          {
            term: "Supply relationships",
            text: "A reliable brewer, a fisher with a private catch, a caravan master, a scrap dealer or a foresters' lodge. A named supplier turns a generic shortage into a conversation with someone the party knows.",
          },
          {
            term: "Magical or technological upgrades",
            text: "Where the genre supports it, a cold room, a message relay, a purification charm, a compact power core or an enchanted till. Treat these like any other improvement: a new capability with a keeper and a dependency, not a free bonus.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Turn complications into adventure hooks",
        intro:
          "Owning a business should create problems and opportunities that only an owner gets. Frame each complication as a hook produced by the business, not as a random encounter that could have happened anywhere:",
        items: [
          {
            term: "A missing shipment or supply shortage",
            text: "The supplier the party relies on has not delivered, perhaps because someone diverted the shipment, kept it or is holding it for a price. A closed road, failed catch, strike or late harvest can also leave the business short. Recovery means tracing the chain the business depends on or finding another source before customers notice.",
          },
          {
            term: "Protection rackets",
            text: "A crew, guild or official offers safety for a share. Refusal has consequences, but accepting also creates an obligation that will return later.",
          },
          {
            term: "Rival sabotage",
            text: "A competitor undercuts prices, poaches staff, spreads a rumour or damages stock. The rival has a name, a reason to resent the party's success and a weakness the party can find.",
          },
          {
            term: "A corrupt or exacting inspector",
            text: "Health, fire, guild charter, mooring or doctrine: the inspector can close the place or impose a fine, and wants a favour to look the other way. The file they carry matters.",
          },
          {
            term: "Staff in trouble",
            text: "A trusted employee is in debt, in love, in danger or in league with someone else. Helping them changes loyalty; ignoring them changes it too.",
          },
          {
            term: "An important or dangerous customer",
            text: "A noble, a crime boss, a celebrity, an inquisitor or a creature that does not usually sit at tables. Their patronage is valuable and their presence is a statement to everyone watching.",
          },
          {
            term: "Monsters or hazards in or beneath the premises",
            text: "A cellar that floods, a nest behind the wall, an old shrine under the flagstones, a faulty reactor. The building itself becomes an adventure site the players already care about.",
          },
          {
            term: "Guild or faction pressure",
            text: "A guild demands membership, a faction wants exclusive service, a temple wants a shrine on site. The price may be coin, loyalty or a public stance.",
          },
          {
            term: "Debt collection",
            text: "A lender calls in a marker: not always coin, sometimes a job, a favour or a choice about who the business serves. The collector should be a person the party recognises.",
          },
          {
            term: "A lucrative but morally awkward contract",
            text: "A large booking, a bulk order or a charter that pays well and asks the party to look the other way. This works best when the customer is someone the party already has a relationship with.",
          },
        ],
        outro:
          "You need only one such hook at a time. When the party resolves it, let the choice change a trait or a relationship visibly before the next complication arrives.",
      },
      {
        kind: "prose",
        heading: "As the business grows, more of the world cares about it",
        paragraphs: [
          "A small concern touches its street. A thriving one touches its district, then its town, then the trade around it. Success should widen the circle of people who notice, want something from the business, or feel threatened by it: customers, rivals, guilds, nobles, criminals, suppliers, officials and the local community around the premises.",
          "Show that attention through ordinary play. Prices, queues and booking lists change; neighbours comment; officials visit; a rival sends a polite note; a supplier asks for exclusive terms. When the party acts or refuses to act, let the attitude of one group shift and make that shift visible the next time the party returns. The business matters because its relationships do, not because its income does.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: a party takes over a tavern",
        paragraphs: [
          "After clearing out a cellar infestation for the previous landlord, the party inherits the Hearth and Hound, a tired tavern near the market. The GM notes five traits on an index card: profit (struggling), reputation (unremarkable), staff (one loyal cook, Mara, and a young potboy, Joss), supplies (adequate), security (poor). Debt is a single favour owed to the landlord who holds the lease note.",
          "The players agree the tavern should become a reliable, welcoming place where travellers, workers and locals mix, not a front or a fortress. That purpose shapes every turn.",
        ],
        items: [
          {
            term: "Turn one: stop the leak",
            text: "Priority: repair the roof and the cellar drain. The party makes a relevant check and succeeds. Profit stays struggling for now, but supplies and security each improve a step. Complication: Mara mentions the brewer has started shorting the tavern by a barrel a week, selling the missing stock to a new alehouse up the street. The players now know their supplier and their rival by name.",
          },
          {
            term: "Turn two: fix the supply",
            text: "Priority: secure the brewer relationship. The party visits the brewery, discovers the brewer is being squeezed by the rival alehouse, and negotiates a fair split that favours reliable customers over the highest bidder. Supplies become good and profit moves to stable. Opportunity: a travelling cartographer who lodges upstairs offers to add the Hearth and Hound to her published road guide if the party can vouch for the road beyond the bridge. The tavern's reputation now has a lever outside its walls.",
          },
          {
            term: "Turn three: hire with care",
            text: "Priority: hire a steward so Mara is not running the whole house herself. The party recruits Tomas, a former quartermaster who is good with stock and strict with strangers. Staff improves, security improves, but Tomas quietly asks that Joss be kept away from the cellar after a crate goes missing. The GM does not turn this into an accusation mystery yet; it is a note that loyalty and oversight now have faces.",
          },
          {
            term: "Turn four: choose what the house stands for",
            text: "Priority: advertise a weekly story night and offer the back room for a neighbourhood council meeting. Reputation rises to respected. Consequence: the council meeting draws a guild factor who wants the tavern to join the victuallers' guild, and a local family who ask that the meeting continue even if it costs a night of takings. A debt-holder also returns: the landlord will forgive part of the lease note if the party houses his courier discretely. Each one is the same growth seen from a different direction, and each will change a trait or a relationship depending on what the party chooses.",
          },
          {
            term: "Why it works",
            text: "Every turn involved one choice, one resolution and a small adjustment to the traits on the card. No turn required a ledger, yet each one produced a person, a relationship or a problem the party could meet in ordinary play. The tavern never replaced adventuring; it supplied a steady reason to adventure, and the players can point to the roof, the brewer, Tomas, and the council meeting as things they chose.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Genre-neutral tweaks with the same loop",
        paragraphs: [
          "The same traits and turns work beyond fantasy taverns because the loop tracks what the business does for the campaign, not the colour around it.",
          "A guildhall may run on commissions and trainees rather than barrels and tables; a trading house on routes and warehouse space; a mercenary company on contracts, reputation for reliability and the loyalty of its captains; a starship on berths, fuel, sensor range and docking privileges; a workshop on commissions, raw material and bench space. In each case the players choose one priority, you resolve one event, you move one or two traits, and you translate the result into a person who arrives or a decision that cannot be ignored.",
          "Keep the genre detail for the fiction. The management stays light: a card, a turn between adventures, and consequences the party can see.",
        ],
      },
      {
        kind: "checklist",
        heading: "Set up a player-owned business in ten minutes",
        intro: "Before the business opens, sketch these with the players:",
        items: [
          "Agree what the business is for and who it serves. One sentence the group chooses together is enough.",
          "Pick four or five traits to track and note their starting level on a single card.",
          "Name two or three staff or regulars, each with something they want. Give at least one person a loyalty the party will need to earn or keep.",
          "Name a supplier, a rival and a person or faction the business owes something to.",
          "Decide the turn length for this campaign: weekly, monthly or between adventures.",
          "Prepare one opening complication from the list above that fits the street the business sits on, not a generic encounter.",
          "Agree how much table time management should take. Note which costs can remain in the fiction and which the group wants to track.",
          "Choose the first investment together and explain what new option or relationship it will open if it succeeds.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep the business, its people and its pressures linked",
      paragraphs: [
        "A business is a small web: premises tied to staff, staff tied to suppliers, suppliers tied to rivals, rivals tied to factions and all of them tied to the building the party owns. Codex Cryptica keeps each of those as its own entry with links between them, so when the next business turn produces a complication you can see who is affected, who is waiting for a favour, and what changed last time because of the players' choice.",
        "Start with the settlement or district that holds the business, add the staff and regulars as NPCs, note the rival and the creditor as factions, and use a rumour or social hub for the next hook that walks through the door.",
      ],
      linkText: "Generate a settlement",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "NPC Generator",
        description:
          "Staff, suppliers, rivals and inspectors with motives the party can engage.",
        href: "/generators/npc",
      },
      {
        title: "Faction Generator",
        description:
          "Guilds, rivals and creditors who notice when a business grows or stumbles.",
        href: "/generators/faction",
      },
      {
        title: "Settlement Generator",
        description:
          "The neighbourhood, town or station that gives the business customers and context.",
        href: "/generators/settlement",
      },
      {
        title: "Rumour Generator",
        description:
          "Leads and warnings that reach the party through their own premises.",
        href: "/generators/rumour",
      },
      {
        title: "Tavern Generator",
        description:
          "A detailed tavern or social hub to use as the business itself or its inspiration.",
        href: "/generators/tavern",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Sandbox Campaigns",
        description:
          "Track businesses, factions and consequences in an open, party-driven world.",
        href: "/for/sandbox-campaigns",
      },
    ],
    relatedAnswers: [
      "how-do-i-make-a-player-base-matter-in-an-rpg-campaign",
      "what-should-players-be-able-to-upgrade-in-an-rpg-base",
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "what-should-an-rpg-settlement-contain",
      "how-do-you-create-a-fantasy-faction",
      "how-do-you-generate-useful-rpg-rumours",
    ],
    discovery: {
      id: "answer-run-player-owned-business",
      parentCluster: "base-building",
      clusters: ["base-building", "session-prep"],
      primaryIntent: "how to run a campaign where the players own a business",
      intentAliases: [
        "how to run a player owned tavern in dnd",
        "how to run a player owned shop in an rpg",
        "player business mechanics for tabletop rpg",
        "running a player guildhall or mercenary company",
        "tavern management rules for rpg campaign",
        "player owned inn business rpg hooks",
      ],
      uniqueValue:
        "A system-neutral framework for player-owned businesses: six lightweight traits, a five-step business turn, investment options, eleven adventure-generating complications and a multi-turn tavern example.",
      userJob: "adopt-workflow",
      relatedIntents: [
        "answer-make-player-base-matter",
        "answer-base-upgrade-ideas",
        "answer-believable-fantasy-economy",
        "answer-economic-pressures-adventure-hooks",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-make-player-base-matter",
          reason:
            "That page covers making any base or stronghold matter through purpose, capabilities and a homecoming loop; this one focuses specifically on running a commercial business with traits, turns and profit-related complications.",
        },
        {
          with: "answer-base-upgrade-ideas",
          reason:
            "That page provides a general upgrade framework for any base; this one applies the same thinking to commercial investments, supply relationships and reputation in a business context.",
        },
      ],
    },
    seo: {
      title: "How to Run a Player-Owned Business in an RPG | Codex Cryptica",
      description:
        "Run a player-owned tavern, shop or guildhall without the spreadsheets: traits, a five-step business turn, investments and hooks that keep the business generating adventures.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-a-campaign-where-the-players-own-a-business.jpg",
      imageAlt:
        "A cosy tavern interior at evening with a busy bar, warm lantern light and patrons gathered around tables",
    },
  };

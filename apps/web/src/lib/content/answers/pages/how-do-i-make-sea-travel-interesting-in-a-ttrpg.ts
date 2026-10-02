import type { AnswerConfigInput } from "../schema";

export const howDoIMakeSeaTravelInterestingInATtrpg: AnswerConfigInput = {
  slug: "how-do-i-make-sea-travel-interesting-in-a-ttrpg",
  category: "adventure-design",
  publishedAt: "2026-10-04",
  question: "How do I make sea travel interesting in a TTRPG?",
  kind: "framework",
  shortAnswer:
    "Make sea travel interesting by deciding which passages can be summarised and where a meaningful choice deserves close attention. Offer different courses or sailing strategies, then bring in only the pressures, sightings, and discoveries that matter to this voyage. Let consequences carry forward whether the crew sails for merchants or a navy, leads an expedition, works a fishing fleet, or raids as pirates.",
  sections: [
    {
      kind: "prose",
      heading: "Why sea voyages drift into slog or hand-wave",
      paragraphs: [
        "Sea travel in most campaigns settles into one of two defaults. Either every day at sea is rolled for, with weather checks, random encounters, and supply tallies that consume a full session without moving a plot, or the whole voyage vanishes in a single sentence and the sea may as well not exist between ports. Both habits hide the same problem: the voyage asks for bookkeeping or rolls without offering a decision the table can own.",
        "A voyage becomes worth playing when the crew must choose what kind of voyage they are making, and when that choice changes what they see and what it costs. If cutting along the coast saves water but risks a patrol, if running before a gale saves days but strains a patched hull, if chasing a wreck rumour delays a delivery, the sea has scale without needing a separate encounter for each sunrise. The same structure suits merchant schedules, naval orders, exploration expeditions, pilgrimages, refugee passages, and fishing or whaling seasons; change the stakes and who has a say. It keeps a passage manageable without giving it your whole evening.",
      ],
    },
    {
      kind: "list",
      heading: "Decide when to zoom in and when to montage",
      intro:
        "Not every voyage deserves the same attention. Set an expectation before casting off, then let the scope change as the passage unfolds: zoom in when a meaningful decision or uncertainty appears, and back out when it is resolved.",
      items: [
        {
          term: "Montage the routine passage",
          text: "Use when the route is familiar, the sea is settled, and nothing the crew wants depends on this leg. Summarise in two or three beats: what the coast looked like, one small sighting or rumour gathered underway, and what the ship needs on arrival. Then ask whether anything from the previous voyage should change the summary, such as a damaged spar, a naval order, or a debt that closes a port. If the answer is no, let the montage be brief. If a storm, sighting, or choice makes the passage matter, zoom in for that moment.",
        },
        {
          term: "Play one leg in detail",
          text: "Use when the voyage carries a real choice or a deadline. Isolate the leg that matters, such as a strait with contrary winds, a shoal where local knowledge helps, or an open-water crossing where water is short. Play that leg with the details that can affect the outcome, and montage the remainder. If preparation removes the uncertainty or the crew reaches known water, zoom back out. Players learn that you change scope when their decisions matter, not because the calendar demands it.",
        },
        {
          term: "Run the full crossing when it is the adventure",
          text: "Use this for passages where reaching the destination is itself the prize or the test: a storm-season crossing, a naval blockade, an evacuation, or an expedition into uncharted water. Run the crossing as three or four meaningful legs or phases rather than an undifferentiated ocean. Each can cover hours or days and need only bring in a distinct condition, sighting, or decision when it matters. Zoom in or out as the situation changes.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Six pressures that turn a passage into choices",
      intro:
        "Treat these as a menu, not a set of tracks to fill. Choose the one to three pressures that matter to this passage, or none for a routine leg. An open-water crossing might bring weather, water, and hull condition into play; a reef passage might turn on navigation and tide; a covert coastal run might hinge on patrols, secrecy, and time.",
      items: [
        {
          term: "Weather and sea state",
          text: "Name the wind, swell, and visibility for this leg and what it permits or denies: close-hauled beating, running free, heaving to, or seeking shelter. State the cost of pushing on and the cost of waiting. A backing wind that promises a gale by nightfall matters because it forces timing, not because it applies a modifier. Skilled observation should give useful early warning, enough to create a decision before the weather hits; let the chosen system set the mechanical benefit.",
        },
        {
          term: "Navigation and hazards",
          text: "Identify a hazard the chosen course may encounter: a reef, a sandbar, a tidal race, a lee shore, or a current that sets the ship off course. Charts, pilots, soundings, landmarks, and local knowledge can reduce uncertainty, reveal options, or lower risk. They need not be the only way through: let the crew improvise another approach when the fiction supports it, and make the risks legible.",
        },
        {
          term: "Supplies and water",
          text: "Track water and food honestly but simply. Mark how many days the ship can sail before resupply becomes urgent, and what quality remains. Low water is interesting when it forces a choice between a dry but safe island and a brackish but convenient one, not when it is a silent countdown. Let the quartermaster decide where to economise and who goes short.",
        },
        {
          term: "Hull, rigging, and repairs",
          text: "Give the ship one condition that will worsen if ignored: a cracked spar, a leaking seam, fouled rigging, a strained pump, or patched sails that complain in a blow. State what care it needs and what fails if that care is skipped. Damage then explains delays, harbour stops, and costs without needing a full damage spreadsheet. It also carries consequence forward: what was patched at sea must still be properly repaired in port.",
        },
        {
          term: "Crew pressure and morale",
          text: "If the crew's situation matters, connect it to people rather than a morale meter: exhaustion after a gale, an unpaid share, sickness, a split between old hands and new recruits, or fear of a cape or wreck. What do they want, fear, or believe? What were they promised, and what conditions will they not accept? Rest, shore leave, a shared ritual, negotiation, or a hard order may address the pressure; a tired or divided crew may need more hands or time.",
        },
        {
          term: "Time, tide, and season",
          text: "Add one temporal constraint that players cannot talk away: a tide window for a bar, a convoy sailing date, a patrol rota, a market that pays best on a saint's day, or a storm season that closes a passage after a fortnight. Time makes speed and secrecy compete instead of running free. If nothing is time-bound, say so, and let the crew choose leisure at its own pace.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Offer a course or voyage strategy with meaningful trade-offs",
      intro:
        "Where the geography offers branches, give two or three named routes with different trade-offs. In open water, offer two or more meaningfully different ways to pursue the voyage goal; they might be courses, timing, pace, company, or what the crew chooses to investigate. No option should be best at everything.",
      items: [
        {
          term: "Speed",
          text: "The quickest line shortens exposure to weather and spoilage but often pushes the ship into open water, foul currents, or a weather window that will not wait. A fast passage saves days at the cost of strain on hull and crew. If the crew must arrive before a market closes or a pursuer, speed competes directly with the other three aims.",
        },
        {
          term: "Safety",
          text: "The safest line stays near shelter, soundings, and help: pilotage, friendly harbours, and known anchorages. It costs time and often money in harbour dues, pilot fees, or extra provisions. Choose it when the hull is tender, the crew is thin, or the cargo cannot be risked. Show the price before they choose, not after they arrive.",
        },
        {
          term: "Secrecy",
          text: "A covert approach might keep a ship off the shipping lane and out of signal range: a mangrove cut, a night passage past a battery, or a reef route suited to a shallow-draft vessel. It trades speed and ease for a lower chance of being noticed. Secrecy can matter to smugglers, but also to a naval patrol avoiding detection, a refugee ship evading a blockade, or an expedition protecting a sensitive landfall.",
        },
        {
          term: "Profit",
          text: "A profitable line connects a surplus to a shortage: a harbour with cheap salt and a distant port short of it, or a seasonal catch a market is eager to buy. Profit depends on scarcity, competition, season, and demand as well as institutions. Where relevant, a factor, council, or navy may shape access through tariffs, licences, monopoly rights, warehousing, credit, or purchase restrictions, making a detour a question of negotiation as well as arithmetic.",
        },
        {
          term: "How to present the choice",
          text: "For each option, show what it gains, what it risks, and a visible clue that makes the trade-off understandable. The choices might be direct crossing or coastal hops, sail hard or conserve rigging, leave now or wait for better weather, travel by day or night, join a convoy or sail independently, make a known landfall or risk a shortcut, or pursue a sighting and accept the delay. When players can see the stakes, they can choose and accept the cost rather than waiting for a surprise.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Stock the sea with sightings that teach the setting",
      intro:
        "Avoid context-free filler encounters. Use prepared situations, evolving encounter tables, or random checks tied to the route, season, weather, shipping, factions, ecology, or current regional events. The result should reveal the world or change the voyage.",
      items: [
        {
          term: "Sightings that invite action",
          text: "Place things the lookout can spot and the crew can approach or avoid: a sail on the horizon showing a known flag, a drifting boat with a signal still flying, cut rigging in the water, an oil slick from a recent fight, or lights on a headland that should be dark. Each sighting points to a faction, a recent event, or a place the party may visit next, not to an isolated stat block.",
        },
        {
          term: "Rumours tied to a teller",
          text: "Attach two rumours to named tellers, such as a pilot, a chandler, or a fisherman met at the last harbour. One tells where a wreck still holds a pay chest, one warns of a patrol that has moved to the outer roadstead, one repeats what a rival crew claimed after its last voyage. A rumour with a source can be tested, bargained with, or disproved at sea when the party finds the place or the ship it described.",
        },
        {
          term: "Wrecks, ruins, and strange landmarks as route features",
          text: "Treat a wreck, reef, ruined battery, lighthouse, or rock formation as part of the navigation problem. A wreck that marks a safe channel is useful until someone strips its spars for timber. A ruined lighthouse that flashes on storm nights is a warning and a rumour in one. Keep each to one practical effect: what it offers, what it hides, and what makes approaching it a risk on this tide and in this weather.",
        },
        {
          term: "Encounters that reveal rather than merely tax",
          text: "When a meeting at sea occurs, frame it as a situation in progress rooted in the region's factions, work, or trade: a company cutter inspecting casks, a fishing fleet blocked by a naval closure, a rival crew careening on a fever-struck beach, or a temple barge seeking witnesses to a wreck. Where the fiction supports it, the situation may invite different kinds of action: negotiation, avoidance, deception, navigation, aid, payment, force, or simply leaving. Present the circumstances and let the crew find its approach.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make the sea remember previous voyages",
      paragraphs: [
        "The strongest cure for repetitive travel is recurrence. When a voyage leaves marks that the next one must handle, players stop seeing the sea as a reset between harbours. A channel buoy dragged by a storm, a reef that took a ship because the markers were pulled to punish smugglers, a port that now charges double for water after the crew broke its well monopoly, or a pilot who refuses to guide a crew that burned his cove all teach the table that choices carry forward.",
        "Record whatever meaningfully changed, using chart, access or cost, and relationships as prompts. A corrected sounding may be enough; another voyage may shift a price, change a patrol, and settle a debt all at once. Bring a consequence back as a sighting, a harbour welcome, or a price before the next voyage begins. Even a montaged passage then feels sequenced rather than repeated.",
      ],
    },
    {
      kind: "prose",
      heading: "Avoid repetitive encounter tables",
      paragraphs: [
        "A table that lists only creatures or hazards may repeat without reference to what the crew has done. Prepared situations are one useful option: keep a small deck you can shuffle, retire, or evolve. Random procedures work just as well when their results reflect the route, season, weather, shipping density, faction activity, ecology, or current regional state. A result should reveal something or change the voyage, rather than fill space. A drifting launch with survivors might become a port rumour; a cutter that once demanded papers might return with a new officer and a different price.",
        "Restock with material from play. After a voyage, you might add a situation based on what happened: the rival who escaped, the wreck the crew marked, the patrol whose cutter they outran, or an island whose elders now demand a tithe. A table that grows from the campaign will feel less arbitrary than one that could describe any ocean. Keep a compact reference of sightings and factions the crew have met, so you can call back a flag, hull colour, or price instead of inventing a disconnected encounter.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the same passage, twice",
      paragraphs: [
        "The crew must carry salt from Greyhaven to Saltmouth, two days along a reef-marked coast. They sail the sloop Mercy's Wake, which still carries the cracked foremast that may fail in a hard chase. The GM has prepared three routes between the ports.",
      ],
      items: [
        {
          term: "The slog and hand-wave version",
          text: "The GM asks for a sailing check and a provisioning check, then rolls twice on a generic ocean table. The first roll produces gulls, the second a fight with reef sharks that drains spells before the party reaches harbour. The sharks have no connection to the company that controls powder, the patrol that watches the bar, or the wreck of the Saint Elmo the crew heard about at Greyhaven. When the crew returns along the same route next session, the same table offers gulls again and a different sea creature. The voyage costs time but teaches the players nothing about the coast between the two ports.",
        },
        {
          term: "The choice-driven version",
          text: "Before casting off, the GM names three routes. The inner channel is the safest: a sheltering headland and soundings all the way, but it adds half a day, requires a pilot who charges a cask of water as his fee, and passes the company cutter's regular anchorage. The outer road is the fastest: open water and a fair wind, but the cracked foremast complains in any blow and a gale is building to windward by nightfall. The reef cut is the most secret: a narrow passage past the wreck of the Saint Elmo that only the sloop's shallow draft can use, where the crew could dive the wreck for its pay chest but must time the tide and risk the hull. Each route shows one gain, one price, and one landmark: the white Jaws cliffs, the Elmo's leaning spar, or the Widow Hill battery light.",
        },
        {
          term: "Playing the leg the crew chooses",
          text: "The crew chooses the reef cut for secrecy and the chance at the chest, accepting tide timing and a navigation risk. The lookout spots the gale's advance early enough for the crew to decide whether to continue, the navigator plots the channel using the white rock on the headland, and the carpenter steadies the cracked spar with a jury brace that will need proper timber in port. Mid-leg they sight oil and cut rigging near the Elmo, with a single drifting launch showing the company flag. The crew can hail, take on survivors, keep clear, or study what the current suggests about the reef. They take the survivors aboard, learn the cutter dragged the channel markers after the last smuggling incident, and mark a corrected sounding on their chart. That corrected sounding reduces navigation risk on the next passage, the survivors' report raises goodwill at Saltmouth but puts the charter factor in a harder mood, and the jury brace commits the crew to buy timber before the next gale. The same coast now has a geography the players helped map.",
        },
        {
          term: "Why it works",
          text: "The table chose a course and paid a price they had seen before deciding. The few pressures that mattered gave the navigator, lookout, and carpenter ways to shape the passage. The encounter revealed the coast's trade and patrol story instead of spending resources for its own sake, and its outcome left consequences for the next voyage: a safer but still tender channel, a warmer welcome at the next harbour, and a hull that remembers the blow it did not take.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before the crew next puts to sea",
      intro: "Run through these checks for the current chart and season.",
      items: [
        "What scope fits the passage for now, and what might make you zoom in or out?",
        "What two or more courses or sailing strategies pursue the voyage goal differently, and what does each gain or risk?",
        "Which one to three pressures, if any, can the crew meaningfully affect on this passage?",
        "What sighting, rumour, or landmark might matter here, and what does it reveal about this sea or its people?",
        "Could a prepared situation or contextual random result reveal something or change the voyage? What approaches fit the circumstances?",
        "What meaningfully changed that is worth carrying into the next passage? Consider the chart, access or cost, and relationships.",
        "Would evolving a situation or encounter table help it reflect what has happened on this voyage?",
      ],
    },
  ],
  codexConnection: {
    heading: "Carry the voyage into the next harbour",
    paragraphs: [
      "Keep each ship's condition, cargo, and handling alongside its crew, charts, debts, and the harbours that set its prices and patrols. When a leg changes a sounding, a flag over a fort, or a pilot's willingness to guide the crew, record it alongside the harbour and faction it belongs to.",
      "The same graph then shapes the next choice of route without rebuilding the world between sessions. A reef the crew corrected, a marker pulled to punish smugglers, or a price that shifted after their last delivery can appear as a sighting or a cost at the harbour bar rather than as a briefing the table has to remember.",
    ],
    linkText: "Generate a pirate ship",
    href: "/generators/ship-generator",
  },
  relatedTools: [
    {
      title: "Ship Generator",
      description:
        "Create a vessel with a crew, handling quirks, damage history, and details the party can recognise at distance.",
      href: "/generators/ship-generator",
    },
    {
      title: "Settlement Generator",
      description:
        "Build ports, harbours, hidden coves, and island towns where repair, resupply, and price shifts close the leg.",
      href: "/generators/settlement",
    },
    {
      title: "Faction Generator",
      description:
        "Give a crew, navy, or trading company a goal and pressure that shapes access to the strait.",
      href: "/generators/faction",
    },
    {
      title: "Rumour Generator",
      description:
        "Draft wrecks, sightings, and harbour gossip tied to named tellers who can be tested at sea.",
      href: "/generators/rumour",
    },
    {
      title: "Encounter Generator",
      description:
        "Sketch sea encounters tied to place and circumstance, whether they begin as prepared situations or random results.",
      href: "/generators/encounter",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Pirate & High Seas Campaigns",
      description:
        "Organise ships, islands, fleets, expeditions, and trade routes in one connected campaign bible.",
      href: "/for/pirates-high-seas",
    },
  ],
  relatedAnswers: [
    "how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
    "what-kind-of-ship-should-a-pirate-crew-start-with",
    "how-do-i-make-rival-captains-navies-and-pirate-factions-matter",
    "how-do-i-run-ship-to-ship-combat-without-sidelining-the-party",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "what-makes-a-good-random-encounter",
    "how-do-you-build-a-point-crawl-for-an-rpg",
    "what-is-a-point-crawl",
    "what-should-an-rpg-settlement-contain",
    "how-do-you-create-a-fantasy-city-that-feels-alive",
    "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-run-a-chase-in-a-tabletop-rpg",
    "how-do-i-run-a-pirate-campaign-focused-on-exploration",
    "what-ttrpg-should-i-play-for-a-pirate-campaign",
  ],
  labels: ["pirate"],
  discovery: {
    id: "answer-sea-travel-interesting",
    parentCluster: "pirates-high-seas",
    clusters: ["pirates-high-seas", "pirate"],
    primaryIntent: "how to make sea travel interesting in a ttrpg",
    intentAliases: [
      "how to make sea voyages interesting ttrpg",
      "how to run sailing travel without random encounter slog",
      "sea travel weather navigation supplies repairs crew pressure",
      "sea travel rumours sightings wrecks landmarks route choices",
      "sea travel speed vs safety vs secrecy vs profit",
      "sea voyage recurring consequences previous voyages",
      "how to avoid repetitive sea encounter tables",
      "when to montage sea travel vs play in detail",
    ],
    uniqueValue:
      "A flexible voyage framework that uses only the pressures that matter, offers meaningful course or sailing-strategy choices, and carries discoveries and consequences between passages.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-islands-ports-pirate-campaign",
      "answer-rival-captains-navies-pirate-factions-matter",
      "answer-starter-ship-pirate",
      "answer-ship-to-ship-combat-without-sidelining-party",
      "answer-travel-interesting",
      "answer-random-encounter",
      "answer-point-crawl",
      "answer-settlement-contents",
      "answer-trade-routes-shape-cities-kingdoms",
      "answer-run-factions-sandbox",
      "answer-run-chase-in-tabletop-rpg",
      "generator-ship-generator",
      "generator-settlement",
      "generator-faction",
      "generator-rumour",
      "generator-encounter",
      "hub-pirate",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-travel-interesting",
        reason:
          "That answer gives a general overland travel structure with branching routes and camp roles. This page applies that philosophy to sea voyages, with voyage-scope decisions, maritime pressures, four-way route trade-offs, and sightings and wreck mechanics that only apply at sea.",
      },
      {
        with: "answer-islands-ports-pirate-campaign",
        reason:
          "That page builds memorable islands, ports, and nearby coves, reefs, and wrecks as destinations. This page builds the sailing between them, with weather, navigation, supplies, and recurring chart consequences that connect one harbour to the next.",
      },
      {
        with: "answer-ship-to-ship-combat-without-sidelining-party",
        reason:
          "That page runs combat once ships meet, with claimable stations and simultaneous objectives. This page runs the voyage before ships meet, with route choices and sightings that set up whether combat, chase, or parley is even needed.",
      },
      {
        with: "answer-rival-captains-navies-pirate-factions-matter",
        reason:
          "That page keeps rival captains and factions acting between sessions on clocks. This page shows how those faction moves appear at sea as patrol routes, prices, and pulled markers that change the next voyage.",
      },
    ],
  },
  seo: {
    title: "How to Make Sea Travel Interesting in a TTRPG | Codex Cryptica",
    description:
      "Make TTRPG sea voyages matter without the slog. Use voyage scope, weather and crew pressures, route trade-offs, and sightings that carry consequences.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-make-sea-travel-interesting-in-a-ttrpg.jpg",
    imageAlt:
      "A small sailing ship on a grey-blue sea under low cloud, with distant reefs, a wreck spar, and a headland light marking the channel",
  },
};

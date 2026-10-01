import type { AnswerConfigInput } from "../schema";

export const howDoIRunAPirateCampaignFocusedOnExploration: AnswerConfigInput = {
  slug: "how-do-i-run-a-pirate-campaign-focused-on-exploration",
  category: "adventure-design",
  publishedAt: "2026-10-05",
  question:
    "How do I run a pirate campaign that feels like exploration rather than a series of naval battles?",
  kind: "framework",
  shortAnswer:
    "Structure a pirate campaign around a voyage, discovery, and consequence loop rather than encounters at sea: each voyage presents two or three competing rumours, maps, or treasure leads that point to distinct islands, and each discovery visibly changes prices, patrols, alliances, or sea routes so the next voyage begins with new choices. Keep rival crews on their own clocks between sessions, stock every island as a different kind of adventure site, and treat the sea as connective tissue that links discoveries instead of empty travel time between fights.",
  sections: [
    {
      kind: "prose",
      heading: "Why pirate campaigns drift into back-to-back ship fights",
      paragraphs: [
        "Most pirate campaigns start with an open sea and a promise of freedom, then settle into a narrow pattern. The crew sails, the table rolls for a random encounter, ships meet, cannon fire, and the voyage resets at the next harbour. After three repetitions the ocean feels smaller, not larger, because the only question it asks is whether the party wins the next fight.",
        "The sea is not short of action, but a campaign that treats every voyage as a combat delivery loop turns exploration into commuting. Players stop caring where they sail because every destination offers the same loop: arrive, hear a hook, sail, fight, return. Exploration returns when the sea asks where the crew wants to go and what they are willing to leave unexplored, and when the answer changes what the coast looks like next time they pass it. The structure below keeps naval combat available as one tool among several, without letting it set the rhythm of every session.",
      ],
    },
    {
      kind: "list",
      heading: "The voyage, discovery, and consequence loop",
      intro:
        "Use this single loop to pace every session or two, whether the crew is chasing a treasure chart or simply looking for a safe harbour.",
      items: [
        {
          term: "Voyage as a choice between destinations",
          text: "Open each voyage with two or three leads that compete for time, goodwill, and position. A chart to an unmarked cay promises a wreck but expires when the trades shift, a harbour factor offers paid work that closes a patrol gap, a rival's rumour points to a ruin that will be stripped if the crew wait. Give each lead a source the party can judge, one clear gain, one price, and one window that forces a decision. The voyage matters because picking one destination means abandoning or delaying another.",
        },
        {
          term: "Discovery as a distinct adventure site",
          text: "Treat every island, port, cove, reef, and wreck as its own kind of play, not as a reskinned harbour. One site rewards social bargaining with a faction that sets local law, one rewards surveying and navigating a tide-bound channel, one rewards piecing together a mystery from a ruined battery's log, one tests water and food discipline along a dry coast. When each site asks for different skills and different risks, the campaign feels like exploration rather than a queue of fights that happen to be near islands.",
        },
        {
          term: "Consequence that rewrites the chart and the welcome",
          text: "Close the loop with one chart change, one harbour change, and one relationship change that the next voyage will inherit. A sounding corrected, a reef marker pulled to punish smugglers, a flag flying over a new fort, a pilot who now refuses the crew, or a price that has doubled because the crew broke a monopoly all carry forward. Record each as a single visible sentence. The sea then has memory: the coast the crew left is not the coast they revisit, and the next choice of destination starts from that altered map.",
        },
        {
          term: "Why the loop replaces the encounter roll",
          text: "A random naval encounter asks what attacks the crew today. The voyage, discovery, and consequence loop asks what the crew chose to pursue, what that place revealed, and what the choice cost elsewhere. Violence can still happen inside any leg of the loop, but it happens because the crew picked a risky route, backed the wrong patron, or arrived where a rival already waits, not because the table needed an event to fill the distance between harbours.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Make islands distinct adventure sites",
      intro:
        "If every island offers a fight and a shop, exploration has nowhere to go. Give each island a different reason to be visited and a different reason it has not already been stripped.",
      items: [
        {
          term: "Assign one primary mode of play per site",
          text: "Tag each island before it reaches the table. Grey Harbour is a social site: a harbour council that taxes powder and a fishing guild that will guide the crew for a share. Ash Cay is an exploration site: a mangrove maze whose channel only opens at half tide. The Saint Elmo wreck is a survival and mystery site: a reef that sinks boats at flood and a pay chest whose log names a patron. A single tag stops you preparing five interchangeable harbours and forces the chart to offer real variety.",
        },
        {
          term: "Give each site a landmark, a problem, and a keeper",
          text: "A landmark sailors can name and navigate by, such as the white Jaws cliffs or a ruined lighthouse that flashes on storm nights. A problem locals cannot solve alone, such as brackish wells, a blocked bar, or a garrison that demands a well tithe. A keeper who sets local law and price, such as a company factor, a temple elder, or a privateer who claims the bay. Together these three turn entry into a decision about tide, law, and who the crew must deal with to stay.",
        },
        {
          term: "Place two or three nearby features that explain the harbour",
          text: "Anchor each port with a cove, reef, wreck, or ruin that explains a quayside price or patrol. A hidden careenage explains why smugglers bypass the harbour dues. A reef that wrecks company ships explains why powder is scarce. A battery ruin that still watches the bar explains who can close the channel. When an offshore feature explains the harbour, sailing between the two feels like learning the coast rather than ticking off stops.",
        },
        {
          term: "Decide in advance what a return visit will show",
          text: "Note one positive change, one price or law that shifts, and one new face or absence that makes the consequence visible without a briefing. The innkeeper who now guards his yard, the missing pilot, or the new flag over the fort tells the story faster than any recap. If the crew helped, ignored, or exploited the place, the harbour they left is not the harbour they revisit.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Rumours, maps, and treasure leads that compete",
      intro:
        "Exploration needs more destinations than the crew can visit at once, and rumours are how the table learns what exists beyond the horizon.",
      items: [
        {
          term: "Tie every lead to a named teller who can be tested",
          text: "A chandler who wants the fort's garrison evicted, a pilot who will guide the bar at night for a share, a clerk who will pay for a diver to raise a pay chest. A rumour with a source can be bargained with, checked at sea, or disproved when the party finds the place it described. Two such leads per harbour is enough to create choice without flooding the chart.",
        },
        {
          term: "Keep maps partial and in conflict",
          text: "Offer one chart that is accurate about reefs but vague about cays, one sketch that marks a wreck by a landmark that has since been taken for timber, one log that names a lagoon but warns of fever. When maps disagree, the crew must decide whose correction to trust and which older sounding to verify. A corrected sounding then becomes a small treasure in itself: it makes the next passage safer for them and valuable to sell or withhold.",
        },
        {
          term: "Let treasure leads point to different kinds of prize",
          text: "Not every lead should promise gold. One points to a pay chest, one to a water source that restores a dry port's goodwill, one to a palm grove that can refit a sprung spar, one to a set of letters that shift a faction's standing. Variety gives different characters a reason to argue for different destinations and stops the campaign from becoming only a hunt for coin.",
        },
        {
          term: "Make competing destinations time-bound",
          text: "Give one lead a tide window, one a patron who will hire a rival if the crew refuse, one a season that closes a passage after a fortnight. Time makes speed and secrecy compete instead of running free. When the party can see what waiting costs, choosing one cay over another feels like a genuine voyage decision rather than a menu pick.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Rival crews and factions that move between sessions",
      intro:
        "A coast feels explored when someone else is exploring it too. Rivals turn the chart into contested ground rather than a list of places that wait for the party.",
      items: [
        {
          term: "Give each rival one goal, one need, and one clock",
          text: "A naval squadron trying to blockade a strait before the sugar convoy sails, a company trying to seize a wreck's pay chest to fund a well, a rival captain chasing the same ruin because her powder is short. Keep each to a four-step clock with concrete steps you can describe as a rumour, a preparation, an attempt, and an outcome. One line after the session is enough: what it tried, what happened, what changed.",
        },
        {
          term: "Advance clocks off-table and show the result in harbour",
          text: "Move each active clock one step between sessions when its path is clear, or mark the consequence of a blocked attempt. Translate the outcome into something the next port visit can show: a price that shifted because a company now controls supply, a new patrol route, a flag over the battery hill, a bounty board with a revised figure, or a rumour that names the captain who succeeded. Players read rivals through evidence, not announcements.",
        },
        {
          term: "Let rivals claim or spoil what the party delays",
          text: "If the crew ignore a lead, let a rival take it, spoil it, or change its price. The cay they skipped now flies a rival's signal, the wreck's spar has been taken for timber, the pilot they slighted now guides the other crew. This is not punishment, it is the coast remembering who acted whilst the party looked elsewhere. It also keeps the chart from filling with places that stay perfectly preserved until the party arrives.",
        },
        {
          term: "Evolve a rival after contact",
          text: "When a rival wins or loses against the party, change one visible thing before the next appearance: a new ship, a shifted goal, a lost ally, a harder bargain, or a grudge that narrows their options. A captain who returns visibly changed signals that encounters have lasting weight and that the relationship will not reset to a neutral harbour exchange.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Mix social, exploration, mystery, survival, and combat",
      intro:
        "A campaign that mixes modes of play stops naval combat from becoming the default way every session matters.",
      items: [
        {
          term: "Social: bargain for entry, pilotage, and price",
          text: "Let a harbour's law, custom, and price be negotiable with the right person. Present casks for inspection to keep goodwill with fishing elders, pay the well tithe or break it by negotiation, secure a factor's charter or smuggle around it. When law and custom set real costs, talking in port becomes part of the exploration, not a pause before the next sail.",
        },
        {
          term: "Exploration: read water, coast, and landmarks",
          text: "Turn reefs, channels, and headlands into navigation puzzles that reward charts, local pilots, and landmarks rather than a single sailing check. A reef cut that only a shallow-draft vessel can use, a bar that covers at half tide, or a lighthouse that flashes on storm nights all turn the sea into terrain the crew can learn. A corrected sounding or a renamed headland then carries forward as a discovery that makes later voyages different.",
        },
        {
          term: "Mystery: piece together what the coast has buried",
          text: "Leave logs, wreck marks, ruined batteries, and temple ruins that point to a sequence rather than a single treasure. A battery log that names a cove, a cove chart that marks a reef, a reef wreck whose manifest points back to a harbour ledger create a thread that requires visiting several sites in an order the party must deduce. Each visit answers one question and raises the next, which keeps discovery moving without needing a new fight to justify the voyage.",
        },
        {
          term: "Survival: make water, food, and hull condition decisions",
          text: "Track supplies and hull simply: how many days before resupply becomes urgent, and what single condition will worsen if ignored, such as a cracked spar or fouled rigging. Low water is interesting when it forces a choice between a dry but safe island and a brackish but convenient one, not when it is a silent countdown. A patched hull that still needs timber in port commits the crew to a destination without needing an encounter to enforce it.",
        },
        {
          term: "Combat as one handle among several",
          text: "Keep ship-to-ship combat, duels, and boarding available, but frame each potential fight with at least two non-combat handles: papers, payment, parley, pilotage, or a favour owed. A cutter demanding to inspect casks, a battery signalling the ship to heave to, or a rival careening on a beach that fever makes dangerous all give the crew a way to win without firing. When combat is chosen, it should feel like the crew picked the riskiest answer to a real pressure, not the only answer the sea offered.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep the sea as connective tissue, not empty travel",
      paragraphs: [
        "The sea should link discoveries rather than filling time between them. On any voyage that deserves attention, name the wind, one hazard the chosen route must handle, and one sighting that teaches the region: a sail showing a known flag, cut rigging in the water, or lights on a headland that should be dark. Each sighting points to a faction, a recent event, or a place the party may visit next, not to an isolated stat block.",
        "Decide in advance when to play the sea in detail and when to montage. Montage the routine passage on a familiar coast in settled weather, playing only the leg that carries a real choice or a deadline: the strait with contrary winds, the shoal only a local pilot can read, or the open-water crossing where water is short. Even on a full crossing, frame the passage as three or four linked legs with distinct wind and decision, so the middle of the voyage does not sag. Reserve close attention for passages where reaching the destination is itself the test, such as a storm season crossing or a blockade run.",
        "Carry discoveries forward as seamanship. A corrected channel, a tide table bargained from a pilot, a reef named after events, or a harbour whose price shifted because the crew acted all become seamanship the party can use next time they weigh anchor. When a past sighting returns as a landmark or a cost at the harbour bar, even a montaged passage feels sequenced rather than repeated.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the same archipelago, two ways",
      paragraphs: [
        "The crew sails the sloop Mercy's Wake from Greyhaven with two known leads. Old Joss the pilot offers a tide-bound reef cut past the wreck of the Saint Elmo for a share of whatever they raise. Mistress Varl's clerk at the factor's store will pay for a diver to recover the same pay chest and use it to fund a new well. A third sail, rival captain Selene Varga, is known to be short of powder and last seen taking on shot at Skerry Cove. The archipelago holds Greyhaven, Saltmouth behind the white Jaws cliffs, Ash Cove in the mangroves, the Elmo wreck on the outer reef, and the ruined battery on Widow Hill.",
      ],
      items: [
        {
          term: "The naval battle loop",
          text: "The GM offers a single destination and rolls for a sea encounter en route. A naval cutter demands inspection. The crew fights, win or lose, then reaches Saltmouth where prices are unchanged. Next session the same structure repeats: a new harbour, a new patrol, another fight on the same water. The wreck remains on the chart because nothing removes it, the rival never moves, and Saltmouth has no reason to remember the crew. The sea is distance to be crossed between harbours, not terrain that changes.",
        },
        {
          term: "The exploration loop",
          text: "Before casting off, the GM lays out two competing leads to the same wreck and one time-bound alternative: sail the reef cut now on Joss's tide window and dive the Elmo, run to Saltmouth to take Varl's paid recovery contract before Varga claims it, or resupply at Ash Cove where fever is low this week but no pay chest waits. Each lead shows one gain, one price, and one landmark that marks it. The crew also know Varga's clock: she is on step two of securing powder at Skerry Cove and will attempt the Elmo next week if nobody beats her there.",
        },
        {
          term: "Playing the voyage and discovery",
          text: "The crew choose the reef cut for secrecy and the chance to keep the whole chest. The detailed leg is the channel past the Elmo: a cracked foremast that complains in any blow, a lee shore if they miss stays, and the white rock on the headland as a leading mark. The lookout character gets the wind warning, the navigator plots the channel, and the carpenter steadies the spar with a jury brace that will need proper timber in port. Mid-leg they sight oil and cut rigging near the Elmo with a drifting launch flying the company flag. The situation offers parley or inspection rather than only a fight. They take survivors aboard, learn the cutter dragged the channel markers after the last smuggling incident, and mark a corrected sounding on their own chart.",
        },
        {
          term: "Consequence that rewrites the next voyage",
          text: "They dive the Elmo and raise the chest, but spend two days doing it. Between sessions Varga completes her powder run and moves to blockade the harbour mouth at Saltmouth, Varl's factor raises the powder price and raises the company flag over the battery at Widow Hill, and Old Joss now charges double for guiding any crew that backed the company. If the crew had taken Varl's contract, they would have had a legal claim and a lower powder price, but Joss would have refused them as pilots and Varga would have contested the wreck in force. Because the corrected sounding stays on their chart, the reef route is safer next time, yet the flagged battery and the blockade make Saltmouth a different harbour on return. The next voyage begins with a real choice: use the safer channel to slip past the blockade to Ash Cove, bargain with the flagged battery, or run to Greyhaven for timber to properly repair the jury-braced mast.",
        },
        {
          term: "Why it works",
          text: "The table chose which lead to pursue and what to leave for a rival, then played a leg where different roles shaped the passage and where one sighting revealed the coast's trade and patrol story. The discovery was not interchangeable: the reef cut demanded seamanship, the wreck demanded a tide-bound dive, the harbours offered different patrons and prices. Three visible threads carried forward without a briefing: a chart the players helped correct, a flag and price that show who now controls the battery, and a hull that remembers the blow it did not take. Even the sea between the cays taught the region, and the rival's independent progress meant delay had a cost the players could see the next time they weighed anchor.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before the next voyage in your pirate campaign",
      intro: "Run through these checks for the current chart and season.",
      items: [
        "Do you have two or three competing rumours, maps, or treasure leads, each tied to a named teller with one gain, one price, and one window?",
        "Does each island or site on the chart have a distinct primary mode of play, a landmark, a local problem, and a keeper who sets law and price?",
        "What two or three nearby coves, reefs, wrecks, or ruins explain each harbour's prices and patrols within a day's sail?",
        "Which rival crew or faction clock will advance between sessions, and what single harbour change will show its outcome?",
        "Which lead will a rival claim or spoil if the party delay, and how will the table learn of it without a lecture?",
        "What one encounter, social negotiation, or mystery thread will give non-martial and non-nautical characters a directed choice on this leg?",
        "What three carry-overs will you note after the voyage: one chart correction, one price or patrol change, and one relationship shift?",
        "Which voyage scope will you use for the next passage: montage, single detailed leg, or full crossing, and which landmark and hazard anchor the detailed leg?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the chart, the coast, and the contest connected",
    paragraphs: [
      "Save each island, cove, reef, wreck, and harbour as a linked location with its landmark, keeper, trade need, and nearby sites, then tie every rumour, chart, and treasure lead to the teller or faction that spreads it. Link rival crews and their clocks to the same graph so a corrected sounding, a flagged battery, or a pilot who now refuses the crew shows up wherever that coast is read.",
      "When a voyage ends, the same graph carries distance, tide windows, prices, and who controls the strait into the next session. A return visit can then show a missing spar, a doubled water tithe, or a new flag over the fort without rebuilding the world from memory, and the sea remains what it should be in a pirate campaign: the thread that stitches discoveries together rather than the empty water between set pieces.",
    ],
    linkText: "Generate an island harbour",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement Generator",
      description:
        "Build island harbours, hidden coves, and port towns with landmarks, law, trade, and nearby dangers.",
      href: "/generators/settlement",
    },
    {
      title: "Faction Generator",
      description:
        "Create rival crews, navies, and trading companies with goals, pressures, and clocks that move between sessions.",
      href: "/generators/faction",
    },
    {
      title: "Rumour Generator",
      description:
        "Draft wrecks, treasure leads, and harbour gossip tied to named tellers who can be checked at sea.",
      href: "/generators/rumour",
    },
    {
      title: "Ship Generator",
      description:
        "Give the crew and their rivals vessels with handling quirks, damage history, and secrets the party can recognise at distance.",
      href: "/generators/ship-generator",
    },
    {
      title: "Encounter Generator",
      description:
        "Sketch situation-first sightings and negotiations at sea with handles beyond combat.",
      href: "/generators/encounter",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Pirate & High Seas Campaigns",
      description:
        "Organise ships, islands, rival fleets, treasure hunts, and trade routes in one connected campaign bible.",
      href: "/for/pirates-high-seas",
    },
  ],
  relatedAnswers: [
    "how-do-i-make-sea-travel-interesting-in-a-ttrpg",
    "how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
    "how-do-i-make-rival-captains-navies-and-pirate-factions-matter",
    "how-do-i-run-ship-to-ship-combat-without-sidelining-the-party",
    "what-kind-of-ship-should-a-pirate-crew-start-with",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-generate-useful-rpg-rumours",
    "how-do-you-build-a-point-crawl-for-an-rpg",
    "what-is-a-point-crawl",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "what-should-an-rpg-settlement-contain",
    "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
    "how-do-you-run-a-chase-in-a-tabletop-rpg",
    "what-makes-a-good-random-encounter",
    "what-ttrpg-should-i-play-for-a-pirate-campaign",
  ],
  labels: ["pirate"],
  discovery: {
    id: "answer-pirate-campaign-exploration-not-naval-battles",
    parentCluster: "pirates-high-seas",
    clusters: ["pirates-high-seas", "pirate"],
    primaryIntent:
      "how to run a pirate campaign focused on exploration not naval battles",
    intentAliases: [
      "how to run pirate campaign exploration not just ship combat",
      "pirate campaign structure island hopping not naval battles",
      "voyage discovery consequence loop pirate campaign",
      "how to make pirate campaign about discovery and treasure hunting",
      "islands as adventure sites pirate campaign",
      "pirate campaign rumours maps treasure leads competing destinations",
      "mixing social exploration mystery survival combat pirate game",
    ],
    uniqueValue:
      "A voyage, discovery, and consequence loop that turns competing rumours and maps into distinct island adventure sites, with rival clocks and sea-as-connective-tissue that carry discoveries between voyages.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-sea-travel-interesting",
      "answer-islands-ports-pirate-campaign",
      "answer-rival-captains-navies-pirate-factions-matter",
      "answer-ship-to-ship-combat-without-sidelining-party",
      "answer-starter-ship-pirate",
      "answer-travel-interesting",
      "answer-create-fantasy-town-rumours",
      "answer-point-crawl",
      "answer-run-factions-sandbox",
      "answer-settlement-contents",
      "answer-trade-routes-shape-cities-kingdoms",
      "answer-run-chase-in-tabletop-rpg",
      "answer-random-encounter",
      "generator-settlement",
      "generator-faction",
      "generator-rumour",
      "generator-ship-generator",
      "generator-encounter",
      "hub-pirate",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-sea-travel-interesting",
        reason:
          "That page provides the per-voyage seamanship framework with scope, pressures, route trade-offs, and sightings. This page provides the campaign pacing that those voyages sit inside, with the charter-wide loop that decides which island the table visits and how discoveries rewrite later voyages.",
      },
      {
        with: "answer-islands-ports-pirate-campaign",
        reason:
          "That page builds memorable islands and ports as destinations with landmarks, law, and trade imbalances. This page decides which of those destinations the table chases at any time, how rumours and maps compete, and how return visits show consequence across the archipelago.",
      },
      {
        with: "answer-rival-captains-navies-pirate-factions-matter",
        reason:
          "That page builds rivals and factions as engines with clocks and port-visible outcomes. This page uses those clocks to put pressure on the exploration choice: what a rival claims if the crew delay, which harbour price shifts, and which chart becomes harder to use.",
      },
      {
        with: "answer-ship-to-ship-combat-without-sidelining-party",
        reason:
          "That page runs combat once ships meet, with claimable stations and simultaneous objectives. This page keeps combat as one of several handles inside a voyage leg alongside parley, pilotage, and mystery, so a voyage can resolve without ships meeting at all.",
      },
    ],
  },
  seo: {
    title: "How to Run a Pirate Campaign as Exploration | Codex Cryptica",
    description:
      "Run a pirate campaign around discovery, not naval battles. Use the voyage, discovery, and consequence loop, distinct islands, and rival clocks.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-a-pirate-campaign-focused-on-exploration.jpg",
    imageAlt:
      "A pirate archipelago chart spread under lantern light showing compass, sounding marks, scattered islands, and a small sloop linking the chain",
  },
};

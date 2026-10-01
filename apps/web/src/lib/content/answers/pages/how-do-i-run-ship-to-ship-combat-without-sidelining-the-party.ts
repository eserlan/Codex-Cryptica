import type { AnswerConfigInput } from "../schema";

export const howDoIRunShipToShipCombatWithoutSideliningTheParty: AnswerConfigInput =
  {
    slug: "how-do-i-run-ship-to-ship-combat-without-sidelining-the-party",
    category: "running-the-game",
    publishedAt: "2026-10-03",
    question:
      "How do I run ship-to-ship combat without sidelining half the party?",
    kind: "framework",
    shortAnswer:
      "Run ship-to-ship combat as a set of simultaneous station problems so every character has a decision each round. Treat the ship as a shared platform with distinct stations for helm and navigation, guns, damage control, lookout and signals, boarding preparation, and morale or command, and let players claim a station each round based on what the situation needs rather than locking them to one job. Pair that with visible objectives, environmental complications, and a clean handover to boarding, chase, or escape so non-martial and non-nautical characters always have useful choices.",
    sections: [
      {
        kind: "prose",
        heading: "Why one helm roll leaves most of the table waiting",
        paragraphs: [
          "Most naval combat sidelines players because the ship becomes one character. The pilot or captain makes a sailing check, the gunner fires, and everyone else waits for boarding to start. If the rules ask for a single check to move the ship, a single roll to shoot, and then a long pause while the game resolves range and heading, there is little reason for the scholar, healer, face, or spellcaster to act. The combat feels like watching someone else play.",
          "The crew already knows this problem from ordinary travel. A sea voyage is interesting when the route, weather, and supplies create decisions for the whole table, not when one navigator handles a check while the rest mark rations. Ship combat needs the same treatment at a faster pace: a handful of urgent problems that happen at the same time, each requiring attention, so the party must decide who handles what right now and what they are willing to leave unhandled for a round.",
        ],
      },
      {
        kind: "list",
        heading: "Seven shipboard stations, not fixed jobs",
        intro:
          "Present stations as positions anyone can claim each round, not as character classes. A fighter can haul on a brace, a cleric can direct damage control, a wizard can read wind or veil the ship in fog. Let the fiction and the immediate danger decide who steps where.",
        items: [
          {
            term: "Helm and navigation",
            text: "Steering, sail trim, choosing the approach angle, and reading wind, tide, reef, or current. Use this station to decide whether the ship closes, holds distance, turns to bring guns to bear, or breaks for open water. A character without sailing skill can still help by hauling lines on command, spotting a shoal the helmsman cannot see from the wheel, or relaying orders.",
          },
          {
            term: "Guns and ordnance",
            text: "Aiming, loading, and choosing what to target: hull, rigging, rudder, guns, or crew. Keep gunnery as one clear decision per round, such as cripple their rigging to slow them, silence a gun, or punch the hull to force a surrender check. Characters who dislike artillery can still pass powder, clear a jam, or choose the target the captain should prioritise.",
          },
          {
            term: "Damage control and hull",
            text: "Pumping, patching, fighting fires, and shoring a sprung spar. Every round the ship does not address a fire, leak, or fouled line should make the next helm or gunnery check harder in a visible way. This is where tough, practical, or healing characters shine without needing naval training.",
          },
          {
            term: "Lookout, signals, and pilotage",
            text: "Reading the other vessel, the coastline, and the weather. Calling sail changes, spotting a hidden battery, flag signals, or a squall building to windward. A keen-eyed, learned, or magically assisted character can give the helm an advantage, reveal an ambush, or identify which flag the approaching ship is really flying.",
          },
          {
            term: "Boarding and repelling",
            text: "Grapples, boarding planks, small arms, and deck fighting preparation. Even before hulls touch, this station covers readying lines, positioning crew, and protecting the quarterdeck. It gives martial characters a clear build-up without forcing the whole fight to become a boarding action.",
          },
          {
            term: "Magic, lore, and strange seas",
            text: "Wind calling, fog weaving, hull mending, warding shot, reading a cursed chart, or negotiating with something in the water. If your setting has supernatural seas, treat this as a station that can help any other: soften a gust for the helm, shield a gun crew, or calm the crew instead of the sea.",
          },
          {
            term: "Command, morale, and shipboard order",
            text: "Issuing clear orders, steadying the crew, settling a dispute that flares under fire, and deciding when to risk people to save the ship. The party face, leader, or anyone the crew trusts can keep a frightened gun crew at its post, rotate exhausted sailors, or call for a surrender or parley before panic decides it for them.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Run simultaneous objectives, not one queue",
        intro:
          "Naval combat works when the party faces more problems than it has hands. Structure each round around two or three concurrent pressures so choices matter.",
        items: [
          {
            term: "Open with a visible situation and a clock",
            text: "Name the range, the wind, and what each ship wants. The enemy wants to cripple your rudder and board, or to escape with the prize. Put a simple track on the table, such as Closing, Cannon Range, Boarding Range, or Escaped, or mark Hull, Rigging, and Crew strain with a few boxes. Advance the track when the fiction and checks call for it, whether or not the party acted.",
          },
          {
            term: "Offer two or three problems at once",
            text: "For example: the enemy is turning to rake your stern whilst smoke from a hit gun blocks the helm's view and a wounded topman dangles from the main yard. The party can only address some of them this round. Let the unhandled problem make next round harder or change the objective.",
          },
          {
            term: "Let unhandled stations create visible costs",
            text: "If no one pumps, water rises and the ship answers the helm more slowly. If no one tends the guns, the next broadside is late or wild. If no one steadies the crew, a frightened team hesitates before reloading. State the cost before the next round so the table can choose what to accept.",
          },
          {
            term: "Change the objective before it goes stale",
            text: "After two rounds of cannon fire, alter the premise: a reef forces a turn, a squall reaches the ships, a third sail appears on the horizon, the enemy tries to foul your rigging and board, or the chart shows a channel only one ship can use. A new objective reopens the station choices for characters whose earlier station is no longer the priority.",
          },
          {
            term: "Give non-martial and non-nautical characters directed choices",
            text: "Do not ask a scholar or healer to make a sailing check to feel included. Instead give them problems their skills already solve: identify the flag and what it signals about the enemy's intent, recall the reef's local name and safe passage, treat burns and keep a gun crew working, negotiate a brief parley to buy a round for repairs, or use lore or magic to read the weather one round early.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Abstract or tactical: choose by table, not by dogma",
        intro:
          "Either model can work. Pick the one that matches the time you want to spend and the decisions you want the table to make.",
        items: [
          {
            term: "Abstract, theatre-of-the-mind",
            text: "Best when the story needs a naval beat inside a larger session. Use range bands (distant, long, close, alongside), facing as an advantage rather than a precise heading, and three to five ship states that change on failed checks or enemy action. Resolve helm, guns, and damage as one check per station per round, with clear fictional consequences. A whole engagement then fits in thirty to forty minutes and leaves room for what happens on deck after.",
          },
          {
            term: "Tactical, map or grid",
            text: "Best when the group wants manoeuvre to matter and has time for it. Use speed, turning radius, and wind as constraints that limit where the ship can be next round, not as trivia to track for its own sake. Keep the map focused on the two or three ships that matter; reefs, shoals, and coastline are more interesting than counting hexes of open water. If a rule would take a minute to resolve and changes nothing about the next decision, summarise it.",
          },
          {
            term: "A practical hybrid",
            text: "Many tables run the approach and gunnery as abstract range bands, then lay out a simple deck plan only when boarding, fire, or a fouled rigging puts characters in specific places. That keeps the sailing decisions quick and makes the moment hulls touch feel distinct without requiring a full naval wargame for every exchange.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Use weather, water, and coastline to keep the fight moving",
        intro:
          "Environmental complications stop naval combat from becoming a flat exchange of broadsides. Introduce one, resolve it, then introduce the next as a consequence of movement.",
        items: [
          {
            term: "Wind and sea state",
            text: "A backing wind, a calm patch, or a building swell should change what the ship can credibly do next: lose sternway, miss stays, roll guns out of bearing, or force the crew to shorten sail. Let a character who reads the sky give the helm one round of warning, turning weather into a choice rather than a surprise penalty.",
          },
          {
            term: "Reefs, shoals, channels, and coastline",
            text: "A narrow channel, a lee shore, or a reef that only a shallow-draft vessel can cross turns pursuit into a navigation problem. This is where charts, local pilots, and the lookout station matter more than gunnery. A ship that knows the water can force a larger enemy to break off rather than follow.",
          },
          {
            term: "Smoke, fire, and fouled gear",
            text: "A hit gun that smokes, a sail that catches, a brace that parts, or a deck slick with water and blood creates a problem only someone on that part of the ship can solve. Spread these across the deck so two characters are not racing to do the same repair.",
          },
          {
            term: "Third parties and changing stakes",
            text: "A harbour battery opening, a patrol appearing to windward, a merchant the enemy was escorting trying to flee, or a signal from shore demanding both ships stand off. These complications change the objective from sink them to drive them off, take the prize, or escape before a larger force arrives.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: a brig tries to take a sloop off a lee shore",
        paragraphs: [
          "The party's sloop has a shallow-draft advantage and a cracked foremast that may fail in a hard chase, from their starter ship. A naval brig wants their prize cargo and is trying to force them onto a reef-marked lee shore. The round-by-round comparison shows how stations and simultaneous pressures change the session.",
        ],
        items: [
          {
            term: "The sidelining approach",
            text: "The GM calls for a sailing check from the helmsman, then resolves a broadside with the gunner. The scholar, healer, and face have no check to make, so the GM asks them to roll to aid the sailing check for a small bonus. Two players aid, one watches. The brig closes, fires again, and the sloop eventually boards because the table is waiting for a fight where everyone can act. The ship's draft, the cracked mast, and the reef never matter.",
          },
          {
            term: "The station approach",
            text: "Round one opens with three problems: the brig is reaching to rake the sloop's stern, smoke from a hit carronade blinds the helm, and the lookout spots breakers ahead marking the reef that only the sloop can cross. The helmsman claims the helm and must choose between turning to spoil the rake or holding course for the channel. The healer claims damage control and must decide whether to clear the smoke for the helm or pump water that is already slowing the rudder. The scholar claims lookout and pilotage, recalling the channel's local name and calling the turn by a white rock on the headland. The face claims command, steadying a gun crew shaken by the hit, whilst magic veils the sloop's exact heading for one round. Each station resolves with one check and a visible consequence that changes the next round's choices.",
          },
          {
            term: "Why it works",
            text: "Every character had a decision that required their actual strengths, not a generic aid bonus tacked onto the helm roll. An unhandled problem was allowed to cost something: if no one had cleared the smoke, the helm would have turned late; if no one had steadied the crew, the next broadside would have been delayed. The reef and the draft gave the scholar a way to win the encounter through pilotage rather than gunnery, which meant the sloop could escape without needing to outfight a larger ship.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Handover cleanly to boarding, chase, or escape",
        paragraphs: [
          "Naval combat should end with a new situation, not with a vague permission to board. When ships reach alongside, say what is true about the contact: which rails meet, where lines are fouled, what is burning, and which crew members are already committed to holding a line or a pump. Then ask the party what they do from that exact position. If the goal was to take the ship, the question becomes whether they can secure the quarterdeck, cut the enemy's colours, or protect prisoners below. If the goal was to escape, the question becomes whether they can clear the channel, repair enough sail to hold the wind, and lose the pursuer before the patrol arrives.",
          "If boarding is not the aim, name the alternative exit as soon as the naval objective is met. A driven-off enemy that breaks for deeper water becomes a chase with the same stations but a different track: distance opening rather than closing, with the lookout and helm trading primacy and gunnery shifting to stern chasers. A surrender becomes a negotiation where the face and the commander matter more than the guns. Mark what damage, debts, and prisoners carry forward to the next port so the fight leaves traces the crew will feel when they try to repair, resupply, or sell the prize.",
        ],
      },
      {
        kind: "checklist",
        heading: "Prep checklist before running ship combat",
        items: [
          "Name what each ship wants and what will make it break off: capture, cripple, delay, or escape.",
          "Prepare seven station cards or lines on paper: helm, guns, damage control, lookout, boarding, magic or lore, and command. Note that any player can claim any station each round.",
          "Write two simultaneous problems for the opening round and one environmental complication that will appear on round two or three, such as a reef, squall, smoke, fire, or third sail.",
          "Decide whether you will run this engagement as abstract range bands or as a tactical map, and note the one ship state that will worsen if unhandled, such as hull, rigging, or crew strain.",
          "Give one non-martial and one non-nautical character a directed problem only they can solve well, such as identifying the flag, reading the channel, treating burns, or steadying the crew.",
          "Plan the threshold that ends the naval phase and starts the next scene: alongside with fouled lines for boarding, channel cleared for escape, or colours struck for surrender, and what damage and prisoners carry forward.",
        ],
      },
    ],
    codexConnection: {
      heading: "Link ship, sea, and shore in one place",
      paragraphs: [
        "Keep each vessel's stations, damage, cargo, and handling alongside its captain, crew, debts, and the harbours that can repair it. When a cracked mast, a reef-marked channel, or a shaken gun crew changes during a fight, the relationship graph shows what else should react next session without rebuilding the voyage from memory.",
      ],
      linkText: "Generate a pirate ship",
      href: "/generators/ship-generator",
    },
    relatedTools: [
      {
        title: "Ship Generator",
        description:
          "Create a pirate vessel with crew roles, handling quirks, damage history, and secrets the party can recognise at a distance.",
        href: "/generators/ship-generator",
      },
      {
        title: "Settlement Generator",
        description:
          "Build the ports, hidden coves, and island harbours where the crew will repair, resupply, and face the consequences of a fight.",
        href: "/generators/settlement",
      },
      {
        title: "Faction Generator",
        description:
          "Give the opposing captain, navy, or trading company a goal, territory, and pressure that explains why it is hunting the crew.",
        href: "/generators/faction",
      },
      {
        title: "Encounter Generator",
        description:
          "Build the deck-level boarding, fire, and damage-control encounters that follow once hulls touch.",
        href: "/generators/encounter",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Pirate & High Seas Campaigns",
        description:
          "Organise ships, islands, rival fleets, and treasure hunts in one connected campaign bible.",
        href: "/for/pirates-high-seas",
      },
    ],
    relatedAnswers: [
      "what-kind-of-ship-should-a-pirate-crew-start-with",
      "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
      "how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign",
      "how-do-i-make-rival-captains-navies-and-pirate-factions-matter",
      "how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army",
      "how-do-you-run-a-chase-in-a-tabletop-rpg",
      "what-should-an-rpg-settlement-contain",
      "how-do-you-prepare-a-sandbox-rpg-campaign",
    ],
    labels: ["pirate"],
    discovery: {
      id: "answer-ship-to-ship-combat-without-sidelining-party",
      parentCluster: "pirates-high-seas",
      clusters: ["pirates-high-seas", "pirate"],
      primaryIntent:
        "how to run ship to ship combat without sidelining the party",
      intentAliases: [
        "how to run naval combat so every player has something to do",
        "naval combat roles for players ttrpg",
        "ship combat stations without locking characters into jobs",
        "abstract vs tactical naval combat tabletop",
        "how to run ship combat for non martial characters",
        "naval encounter simultaneous objectives ttrpg",
        "ship combat environmental complications reef squall fire",
        "how to transition from ship combat to boarding chase or escape",
      ],
      uniqueValue:
        "A station-based naval encounter framework with seven claimable shipboard roles, simultaneous objectives, and environmental complications that gives non-martial and non-nautical characters directed choices and a clean handover to boarding, chase, or escape.",
      userJob: "adopt-workflow",
      relatedIntents: [
        "answer-starter-ship-pirate",
        "answer-travel-interesting",
        "answer-islands-ports-pirate-campaign",
        "answer-rival-captains-navies-pirate-factions-matter",
        "answer-large-battle-pcs-in-army",
        "answer-chase",
        "answer-settlement-contents",
        "answer-prep-sandbox-campaign",
        "generator-ship-generator",
        "generator-settlement",
        "generator-faction",
        "generator-encounter",
        "hub-pirate",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-large-battle-pcs-in-army",
          reason:
            "That page nests character-scale objectives inside an army battle tracked with a few visible states. This page nests character-scale stations inside a ship tracked the same way, with helm, guns, damage control, lookout, and morale as the shared platform rather than a battlefield front.",
        },
        {
          with: "answer-travel-interesting",
          reason:
            "That page makes sea and land journeys interesting through branching routes and travel roles. This page applies simultaneous roles and environmental pressures at combat tempo, with range, wind, and coastline changing the objective each round rather than each day.",
        },
        {
          with: "answer-rival-captains-navies-pirate-factions-matter",
          reason:
            "That page builds the rival captains and faction clocks that produce a naval encounter. This page runs the encounter itself, using faction goals to set what each ship wants and when it will break off.",
        },
      ],
    },
    seo: {
      title:
        "How to Run Ship-to-Ship Combat Without Sidelining Players | Codex Cryptica",
      description:
        "Run naval combat where every player acts each round. Use claimable ship stations, simultaneous objectives, and weather and coastline to keep the fight moving.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-ship-to-ship-combat-without-sidelining-the-party.jpg",
      imageAlt:
        "Two sailing ships exchanging broadsides off a reef-marked coastline at dusk, with crew visible at helm, guns, and rigging",
    },
  };

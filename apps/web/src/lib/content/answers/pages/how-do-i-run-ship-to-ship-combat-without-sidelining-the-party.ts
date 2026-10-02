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
      "Treat the ship as a shared battlefield with several simultaneous problems, so specialist actions change what the rest of the party can do next. Present shipboard functions such as helm, guns, damage control, lookout, boarding, command, and setting-specific support; let character expertise shape who leads, assists, or finds another approach. The ordinary crew handles routine work while the PCs make exceptional decisions, direct crises, and choose priorities. Use the game’s normal rules, visible consequences, environmental complications, and a clear handover to boarding, chase, escape, or surrender.",
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
        heading: "Seven shipboard functions, not universal job slots",
        intro:
          "Treat these as shipboard functions and pressure areas, not interchangeable jobs. Make each function available to the party, while the fiction, character expertise, and chosen game system determine who can lead it well, who can assist, and who needs another approach. The ordinary sailors load guns, pump, and handle routine sail work; PCs usually make exceptional decisions, lead the crew, or deal with a crisis. A useful contribution might be choosing a priority, spending a resource, using an ability, preparing for the next phase, or accepting an unhandled cost. Not every PC needs a separate roll each round.",
        items: [
          {
            term: "Helm and navigation",
            text: "Deciding the manoeuvre, approach angle, and response to wind, tide, reef, or current. The helmsman or officer chooses whether to close, hold distance, bring guns to bear, or break for open water; the deck crew carries out routine sail work. Someone without sailing expertise might spot a shoal, relay an order, or help in a way the rules support, while a specialist leads the manoeuvre.",
          },
          {
            term: "Guns and ordnance",
            text: "Choosing a target and the purpose of a broadside: slow the ship by damaging its rigging, silence a gun, or threaten the hull. The gun crew normally loads and fires; a PC might direct its aim, take over after casualties, or solve a jam under fire. Characters without gunnery expertise can contribute through another function or help in a way the game supports.",
          },
          {
            term: "Damage control and hull",
            text: "Deciding how to respond to flooding, fire, a sprung spar, or fouled gear. Sailors can pump and make routine repairs; a PC might divert more hands, shore a critical breach, or keep the crew working under pressure. Treat a spreading fire or serious leak as an active crisis if it fits the fiction, and show the cost of leaving it alone using the game’s normal rules.",
          },
          {
            term: "Lookout, signals, and pilotage",
            text: "Reading the other vessel, coastline, and weather; spotting a hidden battery, interpreting a signal, or noticing a squall building to windward. A lookout’s expertise can reveal an ambush or identify which flag the approaching ship is really flying. Apply the result through the game’s normal mechanics and fiction.",
          },
          {
            term: "Boarding and repelling",
            text: "Deciding how to prepare for grapples, boarding, or an enemy assault. The crew can ready lines and hold the quarterdeck; a PC might choose where to reinforce, protect a vulnerable person, or prepare an escape. This gives martial characters a build-up without forcing the whole fight to become a boarding action.",
          },
          {
            term: "Lore, special abilities, and supernatural support (if the setting has it)",
            text: "Unusual expertise or abilities can change another live shipboard problem rather than becoming a separate mini-game. Depending on the character and setting, that might mean reading a cursed chart, calling wind, weaving fog, mending a hull, warding a gun crew, or negotiating with something in the water. If the setting has no supernatural elements, use relevant lore or other special abilities here instead.",
          },
          {
            term: "Command, morale, and shipboard order",
            text: "Setting priorities, allocating crew, steadying morale, and deciding when to risk people to save the ship. A commander may have authority over the vessel and its NPC crew, but that authority does not let one player decide another PC’s actions. If the campaign has a formal chain of command, agree out of character how PC authority works, then honour that fiction. Orders can affect crew morale, surrender, parley, or the risks the group accepts.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Run simultaneous objectives, not one queue",
        intro:
          "Naval combat works when the party faces more problems than it can address at once. Present two or three concurrent pressures so choices matter, without requiring a roll from every PC each round.",
        items: [
          {
            term: "Open with a visible situation and a clock",
            text: "Name the range, the wind, and what each ship wants, including what would make it break off. The enemy might want to cripple your rudder and board, or escape with the prize. If useful, add a simple track such as Closing, Cannon Range, Boarding Range, or Escaped, or a few boxes for Hull, Rigging, and Crew strain. These are optional abstractions: use the game’s normal resolution mechanics and advance a track when the fiction and rules call for it. Ship state describes what the vessel can still do; a local deck crisis describes what needs attention now; character state describes who is injured, exposed, or committed. For example, a hit might worsen Rigging state, create a snapped brace as the immediate crisis, and injure someone only if the fiction and system support it.",
          },
          {
            term: "Offer two or three problems at once",
            text: "For example: the enemy is turning to rake your stern whilst smoke from a hit gun blocks the helm's view and a wounded topman dangles from the main yard. The party can only address some of them now. Decide what follows from the fiction: an active crisis such as fire, flooding, broken rigging, or panic may worsen if ignored; an opportunity such as a favourable wind or exposed enemy gun may pass; routine work can continue through the NPC crew unless disrupted.",
          },
          {
            term: "Make consequences visible when functions are disrupted",
            text: "Use the game’s normal resolution mechanics. Ignored active crises can worsen; missed opportunities can disappear; and routine functions can carry on through the crew until casualties, panic, exhaustion, or reassignment reduce its capacity. State likely costs when the rules and situation allow, so players can decide what to accept. Crew capacity can be a shared ship state rather than a separate turn for every sailor.",
          },
          {
            term: "Change the objective before it goes stale",
            text: "After two rounds of cannon fire, alter the premise: a reef forces a turn, a squall reaches the ships, a third sail appears on the horizon, the enemy tries to foul your rigging and board, or the chart shows a channel only one ship can use. A new objective reopens the choices for characters whose earlier function is no longer the priority.",
          },
          {
            term: "Give non-martial and non-nautical characters directed choices",
            text: "Do not ask a scholar or healer to make a sailing check just to include them. Let their expertise shape an existing problem: identify the flag and the enemy's intent, recall the reef's local name and safe passage, treat burns, negotiate a brief parley, or use relevant lore or an ability to read the weather. Sometimes their contribution is a choice, a resource, leading sailors, preparing for the next phase, or helping a specialist under the system’s rules. Every player should have a meaningful way to influence the current problem, but each PC need not make a bespoke roll every round.",
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
            text: "Best when the naval engagement should occupy only part of the session, leaving substantial time for its consequences, boarding, or shore scenes. Range bands (distant, long, close, alongside), broad facing, and a few ship states are optional ways to keep the situation legible. Use the game’s normal rules for actions and resolution; what matters is that ignored problems produce visible consequences and each resolved action changes the shared situation.",
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
          "The party's sloop has a shallow-draft advantage and a cracked foremast that may fail in a hard chase, from their starter ship. A naval brig wants their prize cargo and is trying to force them onto a reef-marked lee shore. The comparison shows how shipboard functions and simultaneous pressures change the session.",
        ],
        items: [
          {
            term: "The sidelining approach",
            text: "The GM calls for a sailing check from the helmsman, then resolves a broadside with the gunner. The scholar, healer, and face have no check to make, so the GM asks them to roll to aid the sailing check for a small bonus. Two players aid, one watches. The brig closes, fires again, and the sloop eventually boards because the table is waiting for a fight where everyone can act. The ship's draft, the cracked mast, and the reef never matter.",
          },
          {
            term: "The shared-problem approach",
            text: "Round one opens with three problems: the brig is reaching to rake the sloop's stern, smoke from a hit carronade blinds the helm, and the lookout spots breakers ahead marking the reef that only the sloop can cross. The experienced helmsman chooses between turning to spoil the rake or holding course for the channel, while the sailors carry out the manoeuvre. The healer decides whether to direct hands to clear the smoke or shore the leak already slowing the rudder. The scholar uses local knowledge to identify the channel and call the turn by a white rock on the headland. The face steadies a gun crew shaken by the hit; if the setting supports it, magic veils the sloop's exact heading. The game’s own rules resolve these actions, and each consequence changes the shared situation for the next choice.",
          },
          {
            term: "Why it works",
            text: "The players influenced the same naval problem through their characters’ strengths, rather than adding generic aid to the helm roll. The crew handled routine labour, while PCs made the decisions and addressed the crisis. If no one cleared the smoke, the helm might have turned late; if no one steadied the crew, its capacity to reload might fall. The reef and shallow draft let the scholar’s knowledge shape the escape without requiring them to become the helmsman or outfight a larger ship. A PC who has no useful action in this moment can prepare for the next phase or accept an unhandled cost; participation does not require a roll every round.",
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
          "List the shipboard functions that matter here: helm, guns, damage control, lookout, boarding, command, and any setting-specific support. Note who has the expertise to lead, who could assist under the rules, and what other approaches are possible; do not assign every PC a function each round.",
          "Write two simultaneous problems for the opening round and one environmental complication that will appear on round two or three, such as a reef, squall, smoke, fire, or third sail.",
          "Choose abstract range bands, a tactical map, or a hybrid according to the spotlight and time you want. Separate ship state (what the vessel can still do), local crises, and character consequences. Decide which crises may worsen, which opportunities may pass, and which routine functions the crew can maintain; use tracks or state boxes only if they suit your system.",
          "Give one non-martial and one non-nautical character a directed problem only they can solve well, such as identifying the flag, reading the channel, treating burns, or steadying the crew.",
          "Plan the threshold that ends the naval phase and starts the next scene: alongside with fouled lines for boarding, channel cleared for escape, or colours struck for surrender, and what damage and prisoners carry forward.",
        ],
      },
    ],
    codexConnection: {
      heading: "Link ship, sea, and shore in one place",
      paragraphs: [
        "Keep each vessel's shipboard functions, damage, cargo, and handling alongside its captain, crew, debts, and the harbours that can repair it. When a cracked mast, a reef-marked channel, or a shaken gun crew changes during a fight, the relationship graph shows what else should react next session without rebuilding the voyage from memory.",
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
      "how-do-i-make-sea-travel-interesting-in-a-ttrpg",
      "how-do-i-run-a-pirate-campaign-focused-on-exploration",
      "what-ttrpg-should-i-play-for-a-pirate-campaign",
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
        "A fiction-first naval encounter framework with concurrent shipboard problems, environmental complications, specialist contributions, crew capacity, and a clean handover to boarding, chase, escape, or surrender.",
      userJob: "adopt-workflow",
      relatedIntents: [
        "answer-starter-ship-pirate",
        "answer-travel-interesting",
        "answer-islands-ports-pirate-campaign",
        "answer-rival-captains-navies-pirate-factions-matter",
        "answer-large-battle-pcs-in-army",
        "answer-run-chase-in-tabletop-rpg",
        "answer-settlement-contents",
        "answer-sandbox-campaign-prep",
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
            "That page nests character-scale objectives inside an army battle tracked with a few visible states. This page nests character-scale problems inside a ship tracked the same way, with helm, guns, damage control, lookout, and morale as the shared platform rather than a battlefield front.",
        },
        {
          with: "answer-travel-interesting",
          reason:
            "That page makes sea and land journeys interesting through branching routes and travel roles. This page applies simultaneous shipboard functions and environmental pressures at combat tempo, with range, wind, and coastline changing the objective each round rather than each day.",
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
        "Run naval combat through shared problems, specialist contributions, crew capacity, and changing weather, then hand over to boarding, chase, escape, or surrender.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-ship-to-ship-combat-without-sidelining-the-party.jpg",
      imageAlt:
        "Two sailing ships exchanging broadsides off a reef-marked coastline at dusk, with crew visible at helm, guns, and rigging",
    },
  };

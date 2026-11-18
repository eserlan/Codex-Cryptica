import type { AnswerConfigInput } from "../schema";

export const howDoIRunASciFiHorrorRpg: AnswerConfigInput = {
  slug: "how-do-i-run-a-sci-fi-horror-rpg",
  category: "running-the-game",
  labels: ["sci-fi"],
  publishedAt: "2026-11-18",
  question: "How do I run a sci-fi horror RPG?",
  kind: "how-to",
  shortAnswer:
    "Run sci-fi horror by making the situation dangerous, understandable and open-ended. Give a small, vulnerable crew ordinary work and a clear reason to stay, cut off easy help through distance, failing equipment or limited authority, and seed observable clues early enough that players can act on them. Then escalate through visible clocks, costs and changed environments rather than scripted jump scares, reveal the threat in stages, and agree tone boundaries in advance so fear comes from hard choices the players made with fair information.",
  sections: [
    {
      kind: "prose",
      heading: "Run the danger, not the scare",
      paragraphs: [
        "Sci-fi horror works when players can see trouble coming, understand roughly what it will cost them, and still have more than one way to respond. A Warden in Mothership, or the Game Master (GM) in another sci-fi horror game, does not need a timetable of shocks. You need a place that can hurt the crew, systems it depends on, and a threat that changes both while the crew works.",
        "Use your chosen game's own checks, damage and fear procedures. What follows is the situation you build around those procedures: who is exposed, what help cannot reach them, what they can learn before the worst arrives, and what each delay changes.",
      ],
    },
    {
      kind: "list",
      heading: "Start with a vulnerable crew and a reason to stay",
      intro:
        "Horror needs something ordinary to threaten. Establish these points before the first strange event, in play or in brief prep notes:",
      items: [
        {
          term: "Workaday stakes",
          text: "Give the crew a job they recognise: finish a repair shift, deliver medical supplies, survey a claim, restart a beacon or hand over a station watch. Pay, a contract, a rescue obligation or a crewmate's record gives them a reason to enter the dangerous place and a reason not to leave at the first odd reading.",
        },
        {
          term: "Known limits",
          text: "Name what the crew cannot easily replace. A patched coolant loop, one working shuttle, limited oxygen candles or a medic with two trauma kits tells players where they are exposed without a lecture about the setting.",
        },
        {
          term: "A reason the place matters",
          text: "Attach the site to a person or promise: the previous crew left a log, a family member is on the roster, or the company's bonus pays for a relative's care. Players stay for reasons their characters chose, not because the GM closed every exit.",
        },
        {
          term: "Ordinary routine first",
          text: "Let one normal job go roughly as expected. A routine airlock cycle, cargo check or shift handover teaches the layout and sounds of the place, so later changes register as wrong.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Build isolation from constraints, not from closed doors",
      intro:
        "Isolation is credible when it follows from distance, equipment, communications and authority that were visible from the start. Use two or three constraints rather than all of them:",
      items: [
        {
          term: "Distance and time",
          text: "Help exists but arrives too late for the immediate problem. A rescue ship is nine days out, or a message takes hours each way. Players can call for help and plan around its arrival instead of learning that calling was pointless.",
        },
        {
          term: "Equipment limits",
          text: "Suits hold a set charge, the only cutter is in the flooded bay, or sensors cannot see through the hull material. State the limit before it matters, and let the engineer change it at a cost in time, power or noise.",
        },
        {
          term: "Communications limits",
          text: "Interference, a damaged relay or light delay means advice arrives late and incomplete. Let the crew send a short warning or request anyway; a reply that answers yesterday's question can still change today's choice.",
        },
        {
          term: "Authority and orders",
          text: "A charter, quarantine rule or company order restricts what the crew may do openly. Breaking it should be possible and consequential, with a record, a lost bonus or a commander who must answer for it, rather than impossible because the GM says so.",
        },
      ],
      outro:
        "Test the constraints together rather than one by one: after applying them, can the crew still make choices that change the outcome, even if every choice costs time, resources or standing? One hard limit can be fair on its own. Light delay, for example, may simply rule out timely advice while leaving navigation, repair and retreat in the crew's hands. A constraint set becomes a wall only when it leaves no meaningful response, not when a single limit cannot be bypassed.",
    },
    {
      kind: "list",
      heading: "Seed clues players can act on before disaster",
      intro:
        "A clue in sci-fi horror is an observable fact that changes a decision. Reveal information in stages, and keep observation separate from interpretation:",
      items: [
        {
          term: "Show effects before causes",
          text: "Frost on the inside of one airlock, a shift log with the same hour recorded twice, or a cargo manifest that lists mass the hold cannot contain. Players can measure, compare and argue about these before they know what made them.",
        },
        {
          term: "Give each key fact more than one route",
          text: "If the crew must learn that a deck is unsafe, let a sensor reading, a maintenance record and a survivor's account each carry part of it. One failed check then costs time or certainty rather than ending the session's progress.",
        },
        {
          term: "Reveal in usable stages",
          text: "Move from something is wrong, to where it is wrong, to what it wants or needs, to what can be done about it. Each stage should open a new choice: seal a deck, move the sleep shift, reroute power or abandon the cargo.",
        },
        {
          term: "Let expertise sharpen, not gate, knowledge",
          text: "A scientist can identify frost as rapid decompression residue rather than ordinary condensation, while any crew member can notice that only one door is frosted. Specialist knowledge improves speed and safety; it should not be the only way the table learns the situation is dangerous.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Escalate through clocks, costs and changed places",
      intro:
        "Escalation is the situation getting harder to ignore, not the GM raising their voice. Track it where players can feel it, even if the clock itself stays in your notes:",
      items: [
        {
          term: "Use visible clocks",
          text: "Oxygen reserves, a docking window, a reactor that runs hotter each shift or a quarantine inspection on its way. Advance a clock when time passes or a choice spends it, and show the new state through alarms, queues, heat or shortened tempers.",
        },
        {
          term: "Change the environment",
          text: "A corridor that was safe now needs suits. Condensation shorts a panel, gravity fails in one section, or the mess hall becomes the only warm room. Familiar places becoming harder to use is scarier than a new room with a monster in it.",
        },
        {
          term: "Reveal the threat by appetite and effect",
          text: "Show what the threat does before what it is. It interrupts power, follows heat, avoids bright work areas or stops when the crew stops transmitting. Players who can predict part of its behaviour can plan around it. If its behaviour later changes, tie the change to a condition already established or a cause the crew can observe, such as a warmed deck, a cut feed or a new heat source, so players can revise what they think they know rather than find that a reliable precaution stopped working without warning.",
        },
        {
          term: "Let consequences persist",
          text: "A sealed deck stays sealed, a burned relay limits later repairs, and an injured crew member changes who can work the next shift. Horror grows when earlier choices narrow later ones in ways the table can point to.",
        },
        {
          term: "Know when to show the threat plainly",
          text: "Reveal it directly when hiding it would stop players making informed choices, when they have earned the confrontation through their precautions, or when delay would only repeat the same warning. A clear sighting should answer one question and raise a worse one about cost, not end the mystery at once.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep agency, pacing and safety on the same side",
      paragraphs: [
        "Horror becomes adversarial when the GM protects a planned scare from player action. Let good precautions work. If the crew seals the right deck, reviews the logs and posts a watch, reward that with time, information or a safer route. The threat can adapt through its established behaviour, but do not invent a second threat to cancel a plan the table is proud of.",
        "Pace by alternating work, warning and consequence. A repair scene teaches the ship, a clue reframes the repair, and a clock advance changes where the next job can happen. Cut a scene when the decision in it is made or the cost is clear. Long stretches of pure atmosphere give players nothing to do with their fear, while constant attacks leave no room to dread the next one.",
        "Agree tone boundaries before play, in a session zero or a five-minute conversation before a one-shot. Ask which subjects are off the table, which can happen off screen, and how graphic injury, infection, body horror or harm to children may be described. Use whatever safety tools your group already trusts, and treat a boundary raised mid-session as final for that session. A player can also set a limit on what happens to their own character without ending the scenario for everyone else.",
        "Keep character death and lasting harm inside what the group agreed and the system supports. Fear of losing a character works when players chose the risk with fair information. It curdles when a hidden effect removes a character for missing a clue nobody could have found.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the cold berth",
      paragraphs: [
        "Setup: an original one-shift scenario for any sci-fi horror system. The four-person relief crew is aboard its own ore carrier, the Sable Hymn, docked at a cold berth. Forward is the warm crew deck, with a small exterior lock. Aft, behind a single sealable pressure door, is the ship's unheated cargo deck, with its own cargo airlock for loading and holding cargo already stowed for delivery. The emergency coolant to load waits in canisters on the berth outside the hull, and the nearest patrol ship is two days away. The crew has six hours before the docking window closes and it loses the completion bonus. Restarting and testing the berthing arm and loading the essential coolant takes four hours through the cargo deck, or six hours by hand through the crew deck lock. One final, optional coolant canister would add another hour by the exterior route.",
        "What the GM holds back: the threat starts in the cold cargo deck. On camera it has the shape of a figure in a pressure suit, but the scenario never confirms who or what it is. It moves only through cold spaces and only while unobserved; a watcher in person or a fixed camera holding it in frame stops it where it stands. It senses heat through the cold and moves towards it, towards crew members and towards the warm air released when a lock cycles, but warm air itself slows it and drives it back to the nearest cold space. If it reaches a crew member who is alone and unobserved in the cold, it can grapple and injure them; use your system's normal injury procedure. It does not damage ship systems on its own, and it cannot open a sealed pressure door or cycle a lock by itself. Sealing the pressure door therefore genuinely blocks it, and venting a lock can only expel it if it has first been driven or lured into that lock and held there under observation.",
      ],
      items: [
        {
          term: "Set the ordinary job",
          text: "The crew cycles the airlock, signs the shift log and starts the berthing arm test. Everything works except a pressure reading that dips for three seconds and recovers. They have a working ship, a known layout, the sealable pressure door between decks and a job they can finish.",
        },
        {
          term: "Seed clues in stages",
          text: "First, effects they can check: frost forms inside the cargo airlock only, and a cold berth in the sleep deck sits empty with its blankets folded. Second, records that test how it moves: the cargo camera log shows a suited shape at the edge of the hold holding still for as long as the camera held it in frame, then gone during the short gap between camera sweeps, three nights running. The crew can repeat that test themselves by fixing a camera or keeping watch on the cold corridor. Third, a documented response to heating: the previous engineer's log notes that warming the sleep deck for a repair pushed a patch of abnormal cold aft through the pressure door and into the cargo deck, where it stayed until the deck cooled again. Players now know two usable facts before they must commit: continuous observation stops it, and warming a space drives it out of that space towards the cold. They still do not know what it is.",
        },
        {
          term: "Offer informed choices",
          text: "With those facts the crew can seal the pressure door and hand-load the essential coolant from the berth through the small lock on the crew deck, travelling outside the hull rather than through the cargo deck. That keeps the threat aft on the slower exterior route, which fills the six hours, and leaves the cargo already stowed in the cargo deck unreachable while the door stays sealed. They can instead try to clear the ship: keep the crew deck warm, then warm the cargo deck itself while the cargo airlock stays cold and unwatched, so it retreats from the warming hold into the one cold space left to it, then hold it there on camera and vent the lock, at the cost of the air in the lock and any coolant already staged inside it. Or they can keep to schedule and post a continuous watch, saving time while tying up one crew member and accepting that any lapse in observation lets it move again.",
        },
        {
          term: "Escalate from their choice",
          text: "Suppose they seal the cargo deck and hand-load. The precaution works as established: on the cargo camera the shape stays aft of the sealed door, still while watched and shifting only in the gaps between sweeps, and it never reaches the crew deck. What advances is the cost they chose. The exterior work uses the six hours, so the final berth canister becomes the hard decision: one more trip outside, in full view of a watcher at the small lock, would take them past the docking window, or they leave that canister on the berth and lose only its payment.",
        },
        {
          term: "Reveal and resolve",
          text: "The plain reveal comes from the crew's own test. Watched continuously, the figure stands frozen mid-stride in the cold hold; when the watch lapses, it closes distance towards the nearest heat. That confirms the camera log in person, without settling its identity. From there the endings follow the route they secured, and each keeps a different cost. If they finish hand-loading and undock with the door still sealed, the crew is safe, but the threat and the stowed cargo travel with the ship inside the sealed aft deck. The crew must keep that door sealed for the voyage and radio ahead for a patrol rendezvous or port quarantine to clear the deck before that cargo can be reached or delivered. If they prefer a clear ship, the trap set out above expels it, and the air and staged coolant spent in the lock are gone for the voyage home. A crew that skips both precautions faces the contact they were warned about, on terms their earlier observations let them predict and prepare for.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "A one-page Warden worksheet",
      intro:
        "Use this as an optional starting template, not a quota. One line per prompt is enough for a compact scenario, and one limit may do several jobs at once: a single light delay can isolate the crew, explain late advice and set the clock. Adapt or skip prompts your scenario does not need, but keep enough written down that key facts do not depend on improvisation in the moment:",
      items: [
        "The crew's ordinary job, and the pay, duty or promise that makes them stay when it turns strange.",
        "The limit or limits that make the crew vulnerable, such as one shuttle, failing sensors or a medic's short supplies. Note what response each limit still leaves open.",
        "The isolation that matters here, and what the crew can still do about their situation, at what cost in time, resources or standing.",
        "The observable clues that carry each key fact, ordered from something is wrong to what can be done about it. Give facts the crew must act on a second route where you can.",
        "One clock the players can see or feel, what advances it, and what changes at each stage.",
        "What the threat does, what it avoids or needs, and the point at which you will show it plainly.",
        "Any consequence that will persist after the first encounter, such as a sealed deck or a burned relay. A short scenario may need only one.",
        "Tone boundaries agreed with the group, subjects that stay off screen, and how a player can pause or redirect a scene.",
        "One way the scenario can end early, badly or well because of a crew decision, so no single planned finale has to survive contact with the players.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the ship, the clues and the clock together",
    paragraphs: [
      "A sci-fi horror scenario spreads quickly across a vessel or station: which deck is sealed, which relay is burned, which clue pointed where, and what the docking window has left. Keeping those as linked notes rather than separate lists makes it easier to bring a consequence back at the right moment and to see which warning the crew never followed up.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Sketch a station, outpost or colony with authority, trade and pressure for a crew to run into.",
      href: "/generators/settlement",
    },
    {
      title: "Rumour generator",
      description:
        "Loose talk from previous crews and dock workers that can carry an early, checkable warning.",
      href: "/generators/rumour",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for cosmic horror",
      description:
        "Support for dread, unnatural entities and slow-burn campaigns at a cosmic scale.",
      href: "/for/cosmic-horror",
    },
    {
      title: "Codex Cryptica for dystopian sci-fi",
      description:
        "Organise crews, employers and failing systems in bleak science fiction settings.",
      href: "/for/dystopian-sci-fi",
    },
  ],
  relatedAnswers: [
    "how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
    "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
    "what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
    "how-do-i-pace-an-rpg-one-shot",
    "how-do-you-make-an-alien-species-feel-believable",
    "what-rpg-should-i-play-for-investigative-horror",
    "how-do-i-run-a-stealth-mission-in-a-tabletop-rpg",
  ],
  discovery: {
    id: "answer-run-sci-fi-horror-rpg",
    parentCluster: "running-the-game",
    clusters: ["running-the-game", "sci-fi-space-opera"],
    primaryIntent: "how to run a sci-fi horror rpg",
    intentAliases: [
      "sci-fi horror gm tips",
      "how to run a space horror rpg",
      "how to gm mothership style horror",
      "science fiction horror rpg warden advice",
      "running horror on a spaceship rpg",
      "sci-fi horror scenario prep for gms",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A system-neutral method for running sci-fi horror through vulnerable crews, credible isolation, staged clues, visible clocks and persistent consequences, with an original one-shift worked example and a one-page Warden worksheet. It covers the horror situation itself rather than crew roles, investigative horror archetypes or system choice.",
    relatedIntents: [
      "answer-sci-fi-character-roles",
      "answer-character-roles-investigative-horror",
      "answer-run-mystery-without-railroading",
      "answer-campaign-threat-without-railroading",
      "answer-starter-ship-sci-fi",
      "answer-pace-rpg-one-shot",
      "answer-make-alien-species-believable",
      "answer-investigative-horror-system-selection",
      "answer-run-stealth-mission-in-tabletop-rpg",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-sci-fi-character-roles",
        reason:
          "That page runs pilot, engineer, scientist, medic and other crew functions inside shared sci-fi play; this page builds the horror situation around any crew: isolation, clues, escalation and consequences.",
      },
      {
        with: "answer-character-roles-investigative-horror",
        reason:
          "That page covers investigator, journalist, occultist and related archetypes inside an investigation; this page covers GM technique for sci-fi horror scenarios regardless of which roles are present.",
      },
      {
        with: "answer-investigative-horror-system-selection",
        reason:
          "That page compares systems for investigative horror; this page assumes a system is already chosen and gives system-neutral running technique without reproducing any game's rules.",
      },
      {
        with: "answer-campaign-threat-without-railroading",
        reason:
          "That page builds urgency from a campaign threat's agenda across sessions; this page applies clocks and consequences inside a single ship, station or site scenario where isolation limits the crew's options.",
      },
    ],
  },
  seo: {
    title: "How do I run a sci-fi horror RPG? | Codex Cryptica",
    description:
      "System-neutral sci-fi horror GM advice: vulnerable crews, credible isolation, staged clues, visible clocks and hard choices, with a worked example and Warden worksheet.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-a-sci-fi-horror-rpg.jpg",
    imageAlt:
      "Three crew members in worn pressure suits with torches face a frost-covered airlock door under a red warning light in a dark spaceship corridor",
  },
};

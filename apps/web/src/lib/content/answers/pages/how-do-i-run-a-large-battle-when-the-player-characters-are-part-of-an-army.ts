import type { AnswerConfigInput } from "../schema";

export const howDoIRunALargeBattleWhenThePlayerCharactersArePartOfAnArmy: AnswerConfigInput =
  {
    slug: "how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army",
    category: "running-the-game",
    publishedAt: "2026-09-29",
    question:
      "How do I run a large battle when the player characters are part of an army?",
    kind: "framework",
    shortAnswer:
      "Treat the wider battle as a changing environment that surrounds normal, player-scale scenes, not as hundreds of combats to resolve one by one. Give the party one concrete objective at a time, track the army fight with a handful of visible states such as front, momentum or morale, and let the outcome of the party's actions nudge those states. Intercut short updates on the larger battle between standard encounters so the war feels consequential whilst play stays at a scale the table can run.",
    sections: [
      {
        kind: "prose",
        heading: "The trap of simulating every soldier",
        paragraphs: [
          "The impulse when the player characters join an army is to put the whole battle on the table: formations, flanks, casualty rates, morale checks for every unit. That simulation is honest work but it pulls the game away from the thing the table is there to play, which is what four to six characters do and decide in the next few minutes.",
          "At army scale, hundreds of similar rolls compress into noise. At character scale, one held gate, one carried message, one broken shield wall is a decision with a visible price. The most useful model is two parallel resolutions: a small number of army-level states that you update infrequently, and a normal encounter-scale scene where the party acts. The former tells the table what is happening around them; the latter lets them touch it.",
        ],
      },
      {
        kind: "list",
        heading: "Run two scales and keep them distinct",
        intro: "Use this split every time steel meets steel at army scale:",
        items: [
          {
            term: "Player-scale scenes stay normal",
            text: "Where the party stands, run the game exactly as you would a standard fight or challenge: positions, actions, skills and hit points as written. The difference is framing, not mechanics. The enemy in front of them is the one they can affect right now; the rest of the battlefield is context that may change the next scene.",
          },
          {
            term: "Army-scale resolution stays small and visible",
            text: "Track the wider battle with three to five states the whole table can see. Common choices are lines or fronts (left, centre, right), momentum or advantage (who is pressing), morale or cohesion (will a formation hold), and time or reserves (when help arrives or breaks). Update a state only when the fiction earns it, not on a fixed turn. A whiteboard, index cards or a simple track is enough.",
          },
          {
            term: "Let PC outcomes feed the track",
            text: "Decide in advance what a player success or failure moves. Holding a gate for three rounds shifts the centre from wavering to steady. Reaching an officer with new orders lets the reserve move one step sooner. Losing a flank does not require twenty die rolls; it requires the party to see the consequence in their next objective.",
          },
          {
            term: "Move between the scales on beats",
            text: "Alternate short army updates with normal scenes. A thirty to sixty second update (where the line moved, a horn sounded, smoke thickened over the ridge) is enough to reframe the next player-scale choice. Avoid resolving army turns whilst the party is mid-action; let one scale settle before you shift to the other.",
          },
          {
            term: "Use terrain, command and reserves to make the battle feel alive",
            text: "A hedge, a dry riverbed, a rise in the ground, a commander who cannot be heard over the din, a runner who never arrived, a fresh company cresting a hill: these ordinary facts change what the party can credibly do next. Introduce one or two per beat rather than a long list at the start, so the field evolves as the party moves through it.",
          },
          {
            term: "Skip per-unit rolls unless the table chose a mass-combat subsystem",
            text: "If your chosen RPG already gives you a mass-battle procedure you trust, use it for the army layer and keep it separate from the player layer. If not, do not invent one mid-battle that asks for dozens of extra rolls. The states above are the subsystem: they cost almost no time and they keep attention on the characters.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Give the party objectives inside the chain of command",
        intro:
          "An army gives the GM a ready way to tell the players what matters, and a real risk that the party has no choice. Use the hierarchy to provide purpose whilst preserving agency:",
        items: [
          {
            term: "Issue orders that name a task, not a result",
            text: "Hold the river crossing until the baggage clears, get word to the left flank, keep the standard upright, open a gap for the reserve. A task tells the party where to stand and what success looks like without dictating how they do it. A prescribed result (you will charge and break them) leaves nothing to decide.",
          },
          {
            term: "Offer choice inside the order",
            text: "Let the party decide the method, the risk or the priority. They can obey literally, reinterpret creatively, stall to gather information, or refuse with consequences. A commander who values results over protocol will tolerate a different route to the same outcome; a rigid one will note the deviation for later. State the expectation before they decide.",
          },
          {
            term: "Make command a conduit, not a cage",
            text: "Runners go missing, horns are misheard, smoke hides signals, officers fall. Use these breakdowns as prompts that return initiative to the party: the order has not arrived, so they must judge; the officer is down, so someone must carry the signet or the standard; the plan failed on the next hill, so their position is now the key one. Rank explains why they are there; friction explains why they must choose.",
          },
          {
            term: "Show the price of the structure",
            text: "Discipline has visible costs. Refusing an order may save lives at the cost of favour. Obeying a poor order may hold the line but waste a resource. If every choice inside the army leads to the same approved outcome, the hierarchy is scenery. Let the chain of command react in ways the party can see in the next scene.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: a hoplite line in five beats",
        paragraphs: [
          "A classical phalanx battle: two lines of spear and shield, a dusty plain, captains trying to be heard over bronze and shouting. The party are rankers in the centre-right, close enough to act but not in command of the field. Each beat is one player-scale scene plus a single army-state update.",
        ],
        items: [
          {
            term: "Beat 1: Hold formation during the initial clash",
            text: "Objective: keep shields locked whilst the lines meet. At player scale this is a short, brutal exchange where the threat is being pushed out of formation rather than simply losing hit points. Success: the centre holds and the army state for Centre Front stays steady. Failure: the centre is wavering, and the next scene starts with the file leader shouting for the party to close a gap that has opened to their left.",
          },
          {
            term: "Beat 2: React when the left flank begins to fail",
            text: "Update: dust, a horn, and a runner gasping that the left is giving ground. New objective: the polemarch cannot spare the reserve yet, so the party must prevent a rout by reaching the flank captain and steadying that file. At player scale this is movement under pressure, perhaps a contested advance through broken ground and missile fire. Success nudges Left Flank from failing to wavering and buys one more beat before collapse. Failure keeps it failing and the party arrives to find the captain down.",
          },
          {
            term: "Beat 3: Protect or reach an officer carrying new orders",
            text: "Objective: a junior officer has the order to commit the reserve, but his escort is cut off behind a knot of enemy spearmen. The party can cut through, lay down covering fire, or haul the wounded officer out by another route. Success moves Reserves from committed late to committed now, visible when fresh shields appear on the ridge. Failure delays the reserve, and the centre will have to hold one beat longer without help. Either way, the officer's fate is a person the party will see again.",
          },
          {
            term: "Beat 4: Exploit a break in the enemy line",
            text: "Update: the enemy centre overextended chasing the earlier flank collapse. A seam appears two files wide. Objective: the party leads a wedge into the gap, not to kill the whole army but to force the enemy to turn or split. At player scale this is a focused push with a clear exit: create the opening, then decide whether to hold it or pull back. Success shifts Enemy Cohesion from steady to wavering and opens a choice for the final beat. Failure still costs the enemy but leaves the party exposed, and the next scene starts with them needing to disengage.",
          },
          {
            term: "Beat 5: Show how each objective changed the wider battle",
            text: "Close with a brief battlefield coda that names what the party's actions bought. A held formation meant the baggage train cleared the ford. A steadied flank meant the wounded were carried off instead of lost. A delivered order meant the reserve arrived before the line broke. A wedge in the enemy line meant the enemy withdrew rather than routed the army. Not every combination ends in victory; if several states are still failing, let the cost be plain, such as a retreat under shield, a lost standard, or a captain who will remember who held and who ran.",
          },
          {
            term: "Why it works",
            text: "Never did the table roll for every spear. Five visible states (Left Flank, Centre Front, Reserves, Enemy Cohesion, and casualties the party can see) were enough to make the wider battle responsive. Each player-scale scene had a concrete task that a small group can perform inside a large force, and each success or failure changed the next task rather than adding a numerical modifier the players never saw. The hoplite dressing can be swapped for any pre-modern or fantasy line battle with the same structure.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Make consequences visible before the next scene",
        paragraphs: [
          "A battle state only matters if the party encounters it. Translate every shift immediately into something they can see, hear or be asked to do. A held gate produces a quieter street behind it and a breathing space for the chirurgeons. A fallen officer produces a standard on the ground, a horn that stops sounding, or a runner who now treats the party as the nearest authority. A failed flank produces missiles from a new angle, wounded coming the wrong way, or a captain who cancels the next order because it no longer makes sense.",
          "Write each consequence as a change to the next objective, not as a ledger entry. If a line buckles, the party is not told the modifier has moved from plus one to minus one; they are told the file to their left is gone and the enemy is trying to turn their shields. If morale holds, they see a neighbouring file cheer when the standard is raised rather than being told a number went up. You do not need to announce the track's numbers; keep the fiction in front of the table.",
        ],
      },
      {
        kind: "checklist",
        heading: "Prep checklist before a battle with the party in the ranks",
        intro: "Set this up before initiative, not once the clash begins:",
        items: [
          "Name the battle's purpose in one line: what the army must achieve before nightfall and what happens if it does not.",
          "Sketch three to five army states on cards or a small track (for example Left, Centre, Right, Morale, Reserves) and mark their starting positions.",
          "Decide for each state what player-scale success or failure moves it one step, in plain language the table will recognise.",
          "Write three concrete objectives the party could plausively be given in order (hold, carry, exploit), plus one that appears only if a state fails.",
          "Place two pieces of terrain or friction that will change between beats (a hedge, a ford, smoke, a hill, a broken signal), and note when each becomes visible.",
          "Plan the signal that tells the table the scale is shifting: a horn, a runner, a captain's shout, standards moving, so the cut between army update and player scene is crisp.",
          "Agree how you will use your system's existing rules for the player layer, and whether you will use any mass-combat subsystem for the army layer or keep the track abstract.",
          "Note what visible cost or benefit each state produces for the next scene, so every shift can be shown rather than reported.",
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "Savage Worlds Adventure Edition",
        rationale:
          "Mass Battles are a dedicated abstract procedure that resolves the army fight with opposed rolls and modifiers from player actions, designed to sit beside normal character-scale encounters.",
        href: "https://peginc.com/savage-worlds/",
      },
      {
        system: "Pathfinder Second Edition",
        rationale:
          "Troop rules package many soldiers into a single creature with shared hit points and area weaknesses, letting the wider battle appear as a few credible opponents rather than dozens of individual stat blocks.",
        href: "https://2e.aonprd.com/Rules.aspx?ID=3365",
      },
    ],
    codexConnection: {
      heading: "Keep the battle's moving parts linked in Codex Cryptica",
      paragraphs: [
        "A large battle is easier to track when its states, objectives and consequences are not buried in one long document. Record the battle as a location or event, link the officers, units and terrain that surround the party, and keep each objective as a small, linked note with its own success and failure branch. When a front wavers or a runner never arrives, the graph shows what else should react.",
        "Generate the immediate encounter or the factions behind the war, then tie their motives, reserves and signals together so the next army update is a lookup rather than something you have to invent mid-fight.",
      ],
      linkText: "Try the encounter generator",
      href: "/generators/encounter",
    },
    relatedTools: [
      {
        title: "Encounter Generator",
        description:
          "Build the player-scale fights that sit inside the larger battle, with terrain and stakes that match the wider field.",
        href: "/generators/encounter",
      },
      {
        title: "Faction Generator",
        description:
          "Give each side a motive, leader and pressure that explains why the battle is happening and what each army cannot afford to lose.",
        href: "/generators/faction",
      },
      {
        title: "NPC Generator",
        description:
          "Create the officers, runners and standard-bearers whose fate makes the army states feel personal.",
        href: "/generators/npc",
      },
    ],
    relatedAnswers: [
      "what-rpg-should-i-use-for-tactical-combat",
      "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
      "how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg",
      "what-makes-a-good-random-encounter",
      "how-do-you-handle-character-death-in-a-tabletop-rpg",
      "how-do-i-run-political-intrigue-and-faction-play",
      "how-do-you-run-dnd-for-a-large-group-of-players",
    ],
    discovery: {
      id: "answer-large-battle-pcs-in-army",
      parentCluster: "encounter-design",
      clusters: ["encounter-design", "running-the-game"],
      primaryIntent:
        "how to run a large battle when player characters are part of an army",
      intentAliases: [
        "how to run a mass battle in dnd",
        "running pcs in a large army battle",
        "mass combat without rolling for every unit",
        "how to handle army battles in tabletop rpg",
        "players as soldiers in a large battle",
        "running a large scale battle in an rpg",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "Reframes mass combat as a changing environment tracked with a few visible states, linked to concrete player-scale objectives and visible army-level consequences rather than per-unit simulation.",
      relatedIntents: [
        "answer-encounter-balance",
        "answer-how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg",
        "answer-tactical-combat-system-selection",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-encounter-balance",
          reason:
            "Encounter balance teaches how to size a single fight; this page teaches how to nest those fights inside a tracked army battle with shared consequences.",
        },
        {
          with: "answer-tactical-combat-system-selection",
          reason:
            "That page helps groups choose a system for tactical depth; this page is system-independent procedure for running characters inside a mass battle in any system.",
        },
      ],
    },
    seo: {
      title: "How to Run a Large Battle With PCs in an Army | Codex Cryptica",
      description:
        "Run PCs inside a large army battle without rolling for every soldier. Track a few army states, give concrete objectives, and let player success shift the wider fight.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army.jpg",
      imageAlt:
        "Hoplite shield wall clashing on a dusty plain at dusk, with standards and reserve banners visible behind the front ranks",
    },
  };

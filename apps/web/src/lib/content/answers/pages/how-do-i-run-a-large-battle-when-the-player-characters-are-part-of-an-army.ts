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
      "Treat the wider battle as a changing environment that surrounds player-scale scenes, not as hundreds of combats to resolve one by one. Give the battle a trajectory of its own, then let the party's actions alter it where they have plausible leverage. Track a handful of visible states such as fronts, momentum or morale, and intercut updates with focused scenes so the war feels consequential whilst play stays at a scale the table can run.",
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
            text: "Resolve the immediate battlefield question with the tools your game already uses. That might be a short combat, a challenge, movement under fire, holding a position for a set time, an escort or rescue, sabotage, rallying troops, or a withdrawal. The scene ends when its question is answered, not necessarily when every enemy is defeated. The rest of the battlefield is context that may change what comes next.",
          },
          {
            term: "Army-scale resolution stays small and visible",
            text: "Track the wider battle with three to five states the whole table can see. Common choices are lines or fronts (left, centre, right), momentum or advantage (who is pressing), morale or cohesion (will a formation hold), and time or reserves (when help arrives or breaks). Let these change when the fiction, enemy plans, command decisions, terrain, weather, troop quality, supply, reinforcements or chance call for it, whether or not the party has acted. A whiteboard, index cards or a simple track is enough.",
          },
          {
            term: "Prepare causal links, not fixed state moves",
            text: "Before the battle, decide what is likely to happen if the party does nothing, then sketch how their plausible actions might affect it. If they hold the ford long enough for the baggage to cross, the army keeps its supplies and the centre may be less likely to break later. If they reach an officer with new orders, reserves may deploy sooner. Update whichever state or situation actually follows from play; an unexpected solution need not fit a pre-written track change.",
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
        kind: "prose",
        heading: "Give the battle a trajectory of its own",
        paragraphs: [
          "Before play, decide what happens if the party does nothing. Perhaps the left flank is likely to collapse after two beats unless reinforced, the centre can probably hold, enemy cavalry will reach the baggage train unless delayed, or reserves will arrive late unless communication is restored. These are pressures and likely outcomes, not a script for what the characters must do. Their choices can alter the course where their position and actions give them real leverage.",
          "Match the scale of an effect to that leverage. Saving a unit, securing a gate, capturing an officer, holding a street or recovering a standard is a local result. Opening a route for reserves, preventing a flank collapse or disrupting enemy command can change the operation. Changing whether the army wins, retreats or achieves its campaign purpose is strategic. Rankers usually affect local events, specialists may have operational reach, and commanders can choose priorities and allocate forces whilst still facing uncertainty in execution. Let dramatic actions matter without making every local success decide the whole war.",
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
            term: "Change the next objective when a plan fails",
            text: "Failure should create a new battlefield problem before it worsens a track. If the flank breaks, the party may need to escort the wounded out. If an officer dies, they must choose whether to assume command or carry the orders. If reserves never arrive, they may have to hold long enough for an organised withdrawal. If a gate falls, protecting civilians or baggage may matter more than trying the same fight again.",
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
          "A classical phalanx battle: two lines of spear and shield, a dusty plain, captains trying to be heard over bronze and shouting. The party are rankers in the centre-right, close enough to act but not in command of the field. If they do nothing, the left flank is likely to give way after two beats, the centre should hold, and enemy cavalry will threaten the baggage train. Each beat pairs a player-scale scene with any army changes the battle's causes warrant; the party can influence events near them without controlling every outcome.",
        ],
        items: [
          {
            term: "Beat 1: Hold formation during the initial clash",
            text: "Objective: keep shields locked whilst the lines meet. At player scale this is a short, brutal exchange where the threat is being pushed out of formation rather than simply losing hit points. If the party holds, the centre is better placed to withstand pressure; if they are pushed back, a gap opens to their left and the next task is to close it. Either way, the rest of the centre responds to its own officers and the pressure of the clash.",
          },
          {
            term: "Beat 2: React when the left flank begins to fail",
            text: "Update: dust, a horn, and a runner gasping that the left is giving ground. New objective: the polemarch cannot spare the reserve yet, so the party can try to prevent a rout by reaching the flank captain and steadying that file. At player scale this is movement under pressure, perhaps a contested advance through broken ground and missile fire. If they reach the captain, the flank may hold long enough for an organised response; if they do not, they arrive to find the captain down and the wounded falling back past them.",
          },
          {
            term: "Beat 3: Protect or reach an officer carrying new orders",
            text: "Objective: a junior officer has the order to commit the reserve, but his escort is cut off behind a knot of enemy spearmen. The party can cut through, draw enemy attention while another character reaches the officer, or haul him out by another route. If the order reaches the commander, the reserve may deploy sooner; if not, the centre faces pressure without that help and the party must decide whether to recover the officer or carry the order themselves. Either way, his fate is a person the party will see again.",
          },
          {
            term: "Beat 4: Exploit a break in the enemy line",
            text: "Update: the enemy centre overextended chasing the earlier flank collapse. A seam appears two files wide. Objective: the party leads a wedge into the gap, not to kill the whole army but to force the enemy to turn or split. At player scale this is a focused push with a clear exit: create the opening, then decide whether to hold it or pull back. If they open the gap, nearby enemy troops may turn to face them, giving the centre a chance to press. If they are pinned, the party must disengage whilst the larger line continues to shift around them.",
          },
          {
            term: "Beat 5: Show how each objective changed the wider battle",
            text: "Close with a brief battlefield coda that names what the party's actions changed and what the wider battle did on its own. Perhaps the baggage cleared the ford, the wounded were carried off, or the enemy withdrew before the line broke. The outcome need not be a simple victory or defeat: the army might lose the field but escape intact, win at a cost that reshapes the next campaign, delay the enemy until nightfall, protect civilians or baggage, preserve a unit or commander, or capture an enemy leader during a retreat. A withdrawal or rescue can be as consequential an objective as taking the hill; battle lost need not mean the session failed.",
          },
          {
            term: "Why it works",
            text: "Never did the table roll for every spear. Five visible states (Left Flank, Centre Front, Reserves, Enemy Cohesion, and casualties the party can see) were enough to make the wider battle responsive. The scenes gave the party concrete tasks, and consequences changed the next situation rather than adding a numerical modifier the players never saw. The hoplite dressing can be swapped for any pre-modern or fantasy line battle with the same structure.",
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
          "Decide what is likely to happen if the party does nothing, including which parts of the battle may change through command, terrain, troops, supplies, enemy plans or chance.",
          "Sketch causal links between plausible party actions and local, operational or strategic consequences; leave room for unexpected solutions.",
          "Write a few concrete objectives the party could face, plus new tasks that could follow from setbacks or a changed battlefield.",
          "Place two pieces of terrain or friction that will change between beats (a hedge, a ford, smoke, a hill, a broken signal), and note when each becomes visible.",
          "Plan the signal that tells the table the scale is shifting: a horn, a runner, a captain's shout, standards moving, so the cut between army update and player scene is crisp.",
          "Agree how you will use your system's existing rules for the player layer, and whether you will use any mass-combat subsystem for the army layer or keep the track abstract.",
          "Note what visible cost or benefit each state produces for the next scene, so every shift can be shown rather than reported.",
          "Consider what retreat, defeat, costly success or partial victory could still let the party protect, preserve or achieve.",
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
      "how-do-fantasy-cities-defend-against-flying-creatures-and-teleportation",
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
        "Run PCs inside a large army battle without rolling for every soldier. Track a few army states and let plausible player actions change the wider fight.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army.jpg",
      imageAlt:
        "Hoplite shield wall clashing on a dusty plain at dusk, with standards and reserve banners visible behind the front ranks",
    },
  };

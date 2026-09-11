import type { ExampleConfigInput } from "../schema";

/**
 * Source: issue #2895 (puzzle cluster expansion). Generated directly through
 * the production puzzle generator for this content pass, not sourced from a
 * community discussion. Reformatted into the example page's block structure
 * and given editorial headings; the generated text itself is unaltered.
 */
export const theNullKeyReliquary: ExampleConfigInput = {
  slug: "the-null-key-reliquary-cyberpunk-puzzle",
  labels: ["cyberpunk", "puzzle"],
  name: "The Null-Key Reliquary",
  title: "Cyberpunk puzzle example: The Null-Key Reliquary",
  kind: "encounter",
  genre: "Cyberpunk",
  theme: "cyberpunk",
  summary:
    "Inside the flooded Arasaka Transit Exchange, a biometric-free vault holds the stolen Ghostseed ledger behind a mechanical train-routing maze whose brass relays must be synchronized before the district-wide security purge floods the chamber in eleven minutes.",
  provenance: "lightly-edited",
  provenanceNote:
    "Generated directly through the puzzle generator for this content pass rather than pulled from a community discussion. The generated text is unaltered; only headings and block structure were added to fit the example page format.",
  generator: { name: "Puzzle generator", href: "/generators/puzzle" },
  image: {
    src: "https://assets.codexcryptica.com/announcements/puzzle-null-key-reliquary.jpg",
    alt: "A flooded underground transit vault with a six by six grid of brass route plates and glowing indicator lamps",
  },
  context: [
    { label: "Genre", value: "Cyberpunk" },
    { label: "Purpose", value: "Retrieve object" },
    { label: "Complexity", value: "Elaborate" },
    { label: "Puzzle style", value: "Mechanical" },
    { label: "Failure pressure", value: "Time pressure" },
    { label: "System", value: "System-neutral" },
  ],
  output: [
    {
      kind: "prose",
      heading: "Player-Facing Setup",
      paragraphs: [
        "The abandoned Arasaka Transit Exchange lies beneath a corporate arcology, half drowned by coolant and rainwater. Your target, the Ghostseed ledger, is sealed in a black ceramic reliquary mounted inside the old dispatch-control vault.",
        "The vault has no active network connection, no readable interface, and no conventional lock. Its face is a six-by-six grid of metal route plates, each bearing a station symbol, beside three horizontal brass rails and a hand-sized crank. Above it, a dead maintenance display flickers: “EMERGENCY MANUAL DISPATCH MODE — ROUTE MUST BE VALIDATED BEFORE PURGE — REMAINING AUXILIARY POWER: 11:00”.",
        "A paper evacuation diagram, several brass relay modules, and a rack of numbered train tokens are scattered around the control room. Some components are corroded, but nothing is obviously useless. The vault periodically emits a heavy internal clunk, as though something is trying to turn from the other side.",
        "The immediate objective is to open the reliquary and retrieve the Ghostseed ledger before the emergency purge floods the vault with conductive coolant and wipes the room's mechanical controls.",
        "The room contains: a six-by-six route-plate grid, where each plate can be pressed down, rotated a quarter-turn, or left raised; three brass rails beneath the grid, each with five sliding contact shoes and a colored end terminal (amber, cyan, or magenta); a crank connected to an unpowered mechanical signal engine; twelve train tokens, numbered 0 through 11, each with a different silhouette on its reverse side; a wall map showing the pre-collapse metro system, with several stations crossed out by hand; four relay modules marked NORTH, EAST, SOUTH, and WEST; a maintenance logbook with water damage and several pages torn out; and a ceiling speaker that occasionally announces fragments of obsolete transit messages.",
        "Players may manipulate, dismantle, bridge, rotate, label, or repurpose anything in the room. The puzzle does not require a particular character ability or specialized tool; force, electronics, observation, social knowledge, improvisation, and deliberate sabotage can all matter.",
      ],
    },
    {
      kind: "list",
      heading: "Clues",
      intro:
        "Present these discoveries through inspection, experimentation, or interaction rather than as a single handout dump:",
      items: [
        {
          text: "The route plates have tiny contact points on their undersides. Pressed plates complete circuits; rotated plates redirect current toward one of four edges.",
        },
        {
          text: "The three rails are not independent locks. Their contact shoes can touch multiple route plates, and their colored terminals correspond to three separate validation circuits.",
        },
        {
          text: "The evacuation map and the route grid use the same station symbols, but the grid contains six symbols absent from the map.",
        },
        {
          text: "Every train token has a conductive strip on one edge. The strip positions differ between tokens.",
        },
        {
          text: "The numbered faces of the train tokens are not in numerical order when placed in the rack. Several rack slots have scrape marks around them.",
        },
        {
          text: "The four relay modules contain different numbers of coils. Their internal wiring is visible through cracked inspection windows.",
        },
        {
          text: "A station symbol shaped like a black crescent appears on the grid, the map, and one train token, but not in the active timetable.",
        },
        {
          text: "The ceiling speaker repeats three fragments whenever the crank is moved: “origin confirmed,” “service suspended,” and “arrival impossible.” The order varies with the rail configuration.",
        },
        {
          text: "The maintenance log includes legible phrases: “Never route through an occupied platform,” “Dead stations remain valid endpoints,” and “The dispatcher validates the path, not the train.”",
        },
        {
          text: "When a wrong configuration is engaged, the vault does not reset completely. It records one or more lit fault lamps on the control panel, and the corresponding relay module becomes warm.",
        },
        {
          text: "A successful partial configuration causes the route plates to click into alignment, while an invalid one causes a brass indicator to descend and block one section of the grid.",
        },
        {
          text: "The reliquary has a narrow slot shaped like a train token, but the slot is too deep for a token to be withdrawn once inserted unless the mechanical route is valid.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Character Spotlight Opportunities",
      items: [
        {
          text: "A mechanically minded character can map contact points, trace the rails, or modify a relay without needing a formal technical check.",
        },
        {
          text: "A netrunner or electronics specialist can identify that the chamber is deliberately air-gapped and instead use exposed circuits to observe state changes, power a lamp, or create a temporary bridge.",
        },
        {
          text: "A streetwise character may recognize obsolete transit symbols, corporate sabotage marks, or the significance of a “dead” station remaining legally registered.",
        },
        {
          text: "A physically strong character can hold a rail, crank the signal engine against resistance, brace a relay, or prevent coolant-driven machinery from locking in place.",
        },
        {
          text: "A stealth-oriented character can enter the maintenance crawlspace to inspect the rear of the vault, discover the mechanical cam stack, or reach a manual release.",
        },
        {
          text: "A face can use the speaker's maintenance channel, imitate a dispatch announcement, or persuade an automated service drone to reveal which station codes remain recognized.",
        },
        {
          text: "Any character can test hypotheses, keep time, mark the grid, listen for changes in the mechanism, or coordinate simultaneous actions.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Alternate Solutions",
      items: [
        {
          text: "Solve the route normally by reconstructing a valid dispatch path and using the appropriate token.",
        },
        {
          text: "Bypass the route validation by removing the rear cam cover and manually setting the release cams. This opens the reliquary but risks damaging the ledger's environmental seal.",
        },
        {
          text: "Use the train-token slot as a mechanical probe: insert different tokens and observe which contacts move, gradually mapping the vault's requirements.",
        },
        {
          text: "Bridge the three colored circuits with wire, foil, weapon parts, or stripped cable. This can force an opening, but causes a loud transit alarm and accelerates the purge.",
        },
        {
          text: "Jam the vault's locking dogs with a relay module or tool, then physically pry the reliquary open. The object can be retrieved, but the room begins filling with coolant immediately.",
        },
        {
          text: "Rebuild the route from the physical map, then intentionally route the mechanism through a crossed-out station. The obsolete station's legal status can satisfy the validation engine if its symbol is correctly oriented.",
        },
        {
          text: "Cut power to the building before the purge completes. The lock remains mechanically engaged, but the sudden loss of pressure allows the rear maintenance hatch to be opened from inside the crawlspace.",
        },
        {
          text: "Feed the speaker a simulated dispatch sequence using a radio, vocoder, or recorded announcement. This does not directly open the lock, but can suppress one automated fault response and buy time.",
        },
        {
          text: "Separate the reliquary from its mounting bracket and carry the entire assembly away. This is noisy, heavy, and likely to trigger corporate response, but it retrieves the object without fully solving the mechanism.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Failure & Escalation",
      intro:
        "Use a visible countdown. Start at eleven minutes and reduce it when the crew makes a major configuration attempt, creates noise, or pauses for extended planning. Do not reduce time for ordinary conversation or careful examination.",
      items: [
        {
          term: "9 minutes",
          text: "Coolant begins dripping through the ceiling. Any exposed electrical bridge becomes dangerous, but improvised insulation remains possible.",
        },
        {
          term: "7 minutes",
          text: "The transit exchange wakes an autonomous maintenance drone. It begins restoring the room and will remove loose components unless distracted, disabled, or redirected.",
        },
        {
          term: "5 minutes",
          text: "The purge system seals the main exit and vents conductive coolant ankle-deep across the floor. Movement and exposed wiring become harder, but the coolant also makes some hidden continuity faults visible as glowing trails.",
        },
        {
          term: "3 minutes",
          text: "The vault records its current configuration as a partial route. The crew can exploit that state, but each further invalid attempt locks one additional route plate in its current orientation.",
        },
        {
          term: "1 minute",
          text: "The reliquary's environmental seal starts collapsing. The ledger can still be retrieved, but its most sensitive data begins degrading.",
        },
        {
          term: "0 minutes",
          text: "The vault floods and the chamber's mechanical logic freezes. The crew may still escape with a damaged ledger by using the maintenance hatch, brute force, or a dangerous power-system intervention.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Running the Puzzle",
      paragraphs: [
        "A wrong attempt should always reveal something: a relay warms, a route plate changes, a fault lamp identifies one circuit, a speaker fragment plays, or a token becomes visibly unsuitable. Never erase useful progress. If the crew creates a dangerous short, apply a concrete consequence such as a burned relay, blinding arc, alarm, or lost time rather than simply declaring failure.",
        "Describe the machine in physical terms: clicks, resistance, heat, misaligned teeth, moving shoes, and changing indicator lamps. Let players draw their own map or place physical markers on a copied six-by-six grid.",
        "Treat every component as manipulable. Ask what a character does, then describe the immediate mechanical result. If a proposed action is plausible, let it produce information even if it does not solve the lock.",
        "The intended solution is a route-validation problem, but players do not need to discover that vocabulary. They need to infer that the grid represents a path, the rails test three properties of that path, and the token supplies the remaining physical pattern. The route must begin at the origin symbol, pass through valid connected stations without occupying a blocked platform, and terminate at the black-crescent dead station. The three rails must each make a continuous contact pattern, and the inserted token must match the route's three validation circuits.",
        "Do not require a single exact drawing. Accept equivalent routes when they satisfy the machine's physical constraints. If the crew proposes a clever alternative that creates the same three circuit states, treat it as valid unless it would contradict something already established in the fiction.",
        "When the correct conditions are met, the crank turns freely, the speaker announces “arrival impossible,” all three terminal lamps go dark, and the token slot releases its grip. The reliquary opens with a pressure hiss and presents the Ghostseed ledger in a shockproof sleeve.",
        "If the crew gets close but misses one condition, show which class of condition failed through sound or motion without naming the answer. For example, one rail may retract, one relay may remain cold, or the token may be ejected halfway. Let players revise their model.",
      ],
    },
    {
      kind: "prose",
      heading: "Scaling",
      paragraphs: [
        "For a shorter session, use a four-by-four grid, two rails, six tokens, and a six-minute countdown. Remove the maintenance drone and make the map mostly legible.",
        "For a standard challenge, use the full six-by-six grid, three rails, twelve tokens, the damaged logbook, and the eleven-minute countdown.",
        "For a harder challenge, add several route plates that can be rotated only while the crank is held, make the relay modules interchangeable, and require the crew to keep one character operating the signal engine while others configure the grid. Add misleading but physically testable routes rather than arbitrary false clues.",
        "For a high-action version, have a corporate retrieval team breach the exchange at 6 minutes. Their presence does not change the mechanism, but it forces the crew to divide attention, negotiate, flee, or solve under fire.",
        "For a low-combat version, replace the drone and retrieval team with worsening coolant, unreliable lighting, and a remote corporate operator attempting to reset the exchange. The operator can be delayed by social engineering or false maintenance reports.",
      ],
    },
  ],
  annotation: {
    heading: "The clock never punishes thinking, only stalling",
    paragraphs: [
      "Every fault state in this puzzle teaches something instead of just costing time: a warm relay names which of three circuits failed, a half-ejected token shows which condition was close. That is the fail-forward property in mechanical form — the countdown is real pressure, but it never resets the party to zero information.",
      "The alternate-solutions list is unusually wide for a mechanical lock: bypass the cam stack, bridge the terminals, probe with tokens, cut power, even just carry the whole reliquary away. A GM running this at the table can let a player who ignores the grid entirely still make progress, which is exactly the non-gating design the companion hints answer argues for.",
      'Notice that the six-minute and eleven-minute variants in Scaling aren\'t just "make it shorter" — they also strip specific supporting props (the maintenance drone, the damaged logbook) rather than compressing the same content into less time, which keeps a shortened version actually easier rather than just rushed.',
    ],
  },
  relatedGenerators: [
    {
      title: "Puzzle generator",
      description:
        "Roll obstacles with layered clues and multiple solutions. Free, no login.",
      href: "/generators/puzzle",
    },
    {
      title: "Encounter generator",
      description:
        "Situations already in progress, across combat, social and environmental types.",
      href: "/generators/encounter",
    },
    {
      title: "Faction generator",
      description:
        "For Arasaka or whichever corporate authority built and still hunts this vault.",
      href: "/generators/faction",
    },
  ],
  relatedAnswers: [
    {
      title: "How do you design RPG puzzles that do not stall the game?",
      description:
        "The four properties this output demonstrates, and the safety valves to prepare in advance.",
      href: "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    },
    {
      title:
        "How do you give players hints for an RPG puzzle without giving away the answer?",
      description:
        "The escalating-hint ladder this example's lore rail follows, and why it never states the exact solution up front.",
      href: "/answers/how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Cyberpunk Red",
      description:
        "Corporate vaults, netrunners, and heists built for a Cyberpunk Red campaign, all connected on the graph.",
      href: "/for/cyberpunk-red",
    },
  ],
  relatedExamples: [
    "the-venting-helix-derelict-hazard",
    "the-bell-beneath-blackglass-fantasy-puzzle",
  ],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/issues/2895",
  seo: {
    title: "Cyberpunk puzzle example: The Null-Key Reliquary | Codex Cryptica",
    description:
      "A table-ready cyberpunk puzzle: an air-gapped mechanical vault lock, a route-validation maze, and an eleven-minute countdown with informative failure at every wrong attempt.",
  },
};

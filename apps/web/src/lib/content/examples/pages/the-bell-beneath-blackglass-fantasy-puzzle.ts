import type { ExampleConfigInput } from "../schema";

/**
 * Source: issue #2895 (puzzle cluster expansion). Generated directly through
 * the production puzzle generator for this content pass, not sourced from a
 * community discussion. Reformatted into the example page's block structure
 * and given editorial headings; the generated text itself is unaltered.
 */
export const theBellBeneathBlackglass: ExampleConfigInput = {
  slug: "the-bell-beneath-blackglass-fantasy-puzzle",
  labels: ["fantasy"],
  name: "The Bell Beneath Blackglass",
  title: "Classic Fantasy puzzle example: The Bell Beneath Blackglass",
  kind: "encounter",
  genre: "Classic Fantasy",
  theme: "fantasy",
  summary:
    "Beneath the ruined Abbey of Saint Orra, the Moon-Eater Bell is draining the valley's protective ward, and the party must realign its three magical rings — or free the bound spirit powering it — before the next toll turns the living into silent shadows.",
  provenance: "lightly-edited",
  provenanceNote:
    "Generated directly through the puzzle generator for this content pass rather than pulled from a community discussion. The generated text is unaltered; only headings and block structure were added to fit the example page format.",
  generator: { name: "Puzzle generator", href: "/generators/puzzle" },
  image: {
    src: "https://assets.codexcryptica.com/announcements/puzzle-bell-beneath-blackglass.jpg",
    alt: "A tarnished silver bell hanging without chains over a basin of pale blue flame in a ruined stone abbey crypt",
  },
  context: [
    { label: "Genre", value: "Classic Fantasy" },
    { label: "Purpose", value: "Disable device" },
    { label: "Complexity", value: "Elaborate" },
    { label: "Puzzle style", value: "Magical" },
    { label: "Failure pressure", value: "Danger" },
    { label: "System", value: "System-neutral" },
  ],
  output: [
    {
      kind: "prose",
      heading: "Player-Facing Setup",
      paragraphs: [
        "A stair of black glass descends beneath the ruined Abbey of Saint Orra. At its end hangs a bell of tarnished silver, suspended without chain above a circular dais. No clapper hangs within it, yet the bell gives a low vibration that can be felt in the teeth.",
        "Three wide rings encircle the bell. Each bears twelve shifting sigils: a crowned sun, a shut eye, a thorned branch, a broken sword, a silver fish, a key, a cup, a wolf, a flame, a falling star, a hand, and a blank space. The rings rotate when touched, though each resists movement like a living thing.",
        "Beneath the bell is a stone basin containing a pale blue flame. Threads of that flame rise toward the bell, while dim strands descend through cracks in the floor toward the valley above. Every few minutes, the bell trembles and one more strand of light is pulled away.",
        "A sealed bronze door stands behind the dais. Its inscription reads: “WHAT WAS GIVEN IN TRUST MUST NOT BE TAKEN IN HUNGER.”",
        "When the characters enter, the bell's vibration deepens. Dust falls from the ceiling, and somewhere above, people begin shouting. The device will toll when the blue flame gutters completely.",
        "The characters may examine, touch, restrain, damage, bargain with, or circumvent the device. Describe visible results immediately. Avoid requiring a particular type of action or supernatural ability.",
      ],
    },
    {
      kind: "list",
      heading: "Clues",
      items: [
        {
          text: "The stolen light is not being destroyed; it is being drawn upward toward the valley.",
        },
        {
          text: "The bell's three rings rotate independently, but the central sigils brighten when two matching images are brought near one another.",
        },
        {
          text: "The blank space on each ring is not empty. Fine silver lines become visible there under moonlight, revealing a different symbol on each ring: a sun, a cup, and a hand.",
        },
        {
          text: "The basin's blue flame burns more strongly when someone speaks a sincere promise, offers a treasured object, or performs an act of protection near it.",
        },
        {
          text: "The bell produces different tones when struck, touched, or exposed to flame, water, blood, or reflected light. The lowest tone makes the stolen strands tighten; the highest tone makes them loosen briefly.",
        },
        {
          text: "The abbey's surviving wall mosaic shows Saint Orra holding a cup beneath a falling star, while a crowned sun shines behind her and a hand covers the mouth of a bell.",
        },
        {
          text: "The bronze door's inscription is repeated in an older language around its rim. Several words have been scratched away, but the remaining marks resemble the symbols of the cup, falling star, and hand.",
        },
        {
          text: "A faint human voice sometimes emerges from the bell: “Not silence. Release.”",
        },
        {
          text: "The floor cracks form three channels leading from the basin to the bell's rings. One is dry, one is damp, and one glows faintly with reflected blue light.",
        },
        {
          text: "The hostile shadows avoid the basin's flame but gather around anyone who tries to wrench a ring free.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Character Spotlight Opportunities",
      items: [
        {
          text: "A perceptive character can map the ring symbols, inspect the mosaic, compare inscriptions, or notice which marks change under different light.",
        },
        {
          text: "A strong or nimble character can hold a rotating ring in place, brace the bell, shield another character, or redirect a moving shadow.",
        },
        {
          text: "A persuasive, empathetic, or commanding character can address the trapped voice, make a binding promise, or convince it to stop resisting.",
        },
        {
          text: "A character with knowledge of faith, folklore, magic, or ancient customs can interpret the imagery of trust, offering, release, and guardianship.",
        },
        {
          text: "A practical character can use rope, oil, mirrors, water, tools, weapons, clothing, or rubble to alter the bell's motion, light, sound, or channels.",
        },
        {
          text: "A daring character can enter the basin's dangerous glow, climb the bell, or reach the rear of the mechanism while others distract the shadows.",
        },
        {
          text: "Any character can contribute by testing one safe interaction, recording its result, protecting an ally, carrying an object, repeating a promise, or proposing a symbolic interpretation.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Alternate Solutions",
      items: [
        {
          text: "Manipulate the rings and nearby symbols according to the abbey's imagery and the device's responses, then complete the interaction with a genuine act of giving or protection.",
        },
        {
          text: "Redirect the basin's blue flame through the three floor channels using mirrors, polished metal, water, crystal, or carefully arranged reflective surfaces. The device can be disabled without turning every ring if the stolen light is returned to the valley in a controlled flow.",
        },
        {
          text: "Free or appease the spirit inside the bell. It responds to recognition of its original duty, an oath that the valley will be protected, or the return of an object associated with Saint Orra. The characters may need to withstand the bell's attempts to imitate their voices.",
        },
        {
          text: "Muffle the bell and physically obstruct its rings while severing the strands of stolen light. This is dangerous but workable if the characters coordinate timing and accept damage to the ancient chamber.",
        },
        {
          text: "Flood the basin with consecrated, blessed, or simply symbolically meaningful water, wine, milk, or another offered substance. The exact substance matters less than the act of surrendering something valued to restore what was taken.",
        },
        {
          text: "Use the bronze door as a magical circuit: open it, turn it, or place an object in its inscription so that the door draws the bell's power into itself. This may seal the device rather than destroy it.",
        },
        {
          text: "Create a new interpretation of the mechanism. If the characters can make their actions embody trust rather than hunger, the device may accept an unconventional sequence, even if the symbols are not aligned as expected.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Failure & Escalation",
      items: [
        {
          text: "A wrong ring movement causes a pulse of sound. Everyone nearby experiences a brief memory that is not their own, and one shadow detaches from the floor.",
        },
        {
          text: "A careless physical attack cracks a ring or stone support. The device becomes less stable, but a fresh leak of blue fire ignites part of the chamber.",
        },
        {
          text: "Mishandling the basin causes the flame to flare. The character closest to it is marked by pale light, making them a target for the shadows but also allowing them to see hidden lines and inscriptions.",
        },
        {
          text: "Each failed major attempt advances the bell toward its toll. Escalate visibly: more cracks open, voices rise from above, shadows gain solidity, and the room's exits become harder to reach.",
        },
        {
          text: "At the first toll, the valley loses part of its ward. A nearby creature, tree, or building is drained and becomes a dangerous shadow echo. The puzzle remains solvable.",
        },
        {
          text: "At the second toll, the bell begins moving one ring by itself and the trapped spirit becomes frantic. The characters must divide attention between the mechanism and the attacking shadows.",
        },
        {
          text: "At the third toll, the device starts drawing life directly from the chamber. Disablement is still possible, but every round or dramatic exchange costs someone strength, memories, possessions, or the safety of an NPC.",
        },
        {
          text: "If the characters abandon the puzzle, the bell completes its working and the valley becomes vulnerable to night-born forces. Leave a partial route to recovery: a surviving flame, an opened archive, a wounded spirit, or a fragment of the bell that can be pursued later.",
        },
        {
          text: "Never make a failed check erase a clue. A failure should reveal a cost, alter the mechanism, create a new hazard, or provide a partial effect.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Running the Puzzle",
      paragraphs: [
        "Present the chamber as an interactive magical machine, not as a riddle with one permitted answer. Let every meaningful action produce a sensory response: a tone, flare, movement, whisper, shadow, or change in the stolen strands.",
        "Track three states: the bell's progress toward its next toll, the condition of the blue flame, and the number or strength of hostile shadows. Advance one state whenever the group spends too long debating, makes a dangerous mistake, or takes a loud destructive action. Reduce pressure whenever the characters make a genuine offering, protect someone at personal cost, return stolen light, gain the spirit's cooperation, or successfully alter one part of the mechanism.",
        "Use the symbols as a language of relationships rather than a code requiring a single roll. The sun suggests guardianship or revelation; the cup suggests receiving and giving; the hand suggests restraint or protection; the falling star suggests a gift that must be returned. Other symbols can acquire meanings through play. Reward coherent symbolism and observed cause-and-effect.",
        "Ask players what they physically do with available objects and the environment. Let ordinary tools matter. If an approach would plausibly affect sound, light, movement, spirit, or flow, allow it to produce progress, even if it also creates a new danger.",
        "The trapped spirit should not simply answer questions. It speaks in fragments, repeats the characters' promises, and reacts emotionally to acts of trust or selfishness. It may aid the characters after they demonstrate the principle the device was built to enforce.",
        "When the device is disabled, describe the stolen strands reversing direction, the bell becoming ordinary metal, and the blue flame settling into a small protective light. If the characters used a destructive method, the abbey may partially collapse or the valley ward may return imperfectly, creating a meaningful cost without negating success.",
      ],
    },
    {
      kind: "list",
      heading: "Scaling",
      items: [
        {
          text: "For a low-power group, slow the toll clock, make the shadows vulnerable to ordinary light or physical barriers, and allow the spirit to communicate more clearly.",
        },
        {
          text: "For a capable or experienced group, let the rings move during the puzzle, make each toll alter the chamber, and require the characters to maintain two or more effects at once.",
        },
        {
          text: "For a large group, give each ring its own immediate hazard or visible consequence so several characters can work simultaneously.",
        },
        {
          text: "For a small group, combine the rings into one mechanism and make the shadows fewer but more dangerous.",
        },
        {
          text: "To emphasize investigation, provide more surviving murals, inscriptions, and testable environmental effects.",
        },
        {
          text: "To emphasize action, shorten the intervals between pulses, have the shadows attack the basin, and make physical positioning central.",
        },
        {
          text: "To emphasize moral choice, have the device demand a visible sacrifice or promise that protects the valley but changes what the characters can keep.",
        },
        {
          text: "To emphasize magical weirdness, allow the bell to imitate voices, reverse cause and effect briefly, or show possible consequences before each major interaction.",
        },
      ],
    },
  ],
  annotation: {
    heading: "A machine that responds to meaning, not a single answer",
    paragraphs: [
      "The device never accepts one exact phrase or item. It reads for a relationship — receive, protect, return — and any coherent act that embodies that relationship counts: a sincere promise, a returned object, a protective sacrifice. That is the multiple-solutions property described in the companion design answer made mechanically concrete, not just stated as a design principle.",
      "Failure changes the room rather than stopping the table. A wrong ring movement plants a false memory and wakes a shadow; a careless attack cracks stone and lets fire loose. Each cost is visible and different from the last, which is what keeps three consecutive wrong guesses from feeling like the same dead end three times.",
      "The clues are almost entirely physical and sensory — tone, temperature, light under different angles — rather than a note someone reads aloud. A table that likes prop-and-gesture puzzles has more to work with here than a table that wants a single riddle to solve.",
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
      title: "NPC generator",
      description:
        "For the bound spirit itself, or the warden who altered the bell's purpose.",
      href: "/generators/npc",
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
      title: "Codex Cryptica for Dungeons & Dragons",
      description:
        "Wards, relics, and bound spirits built for a D&D campaign, all connected on the graph.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedExamples: [
    "the-venting-helix-derelict-hazard",
    "the-null-key-reliquary-cyberpunk-puzzle",
  ],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/issues/2895",
  seo: {
    title:
      "Classic Fantasy puzzle example: The Bell Beneath Blackglass | Codex Cryptica",
    description:
      "A table-ready fantasy puzzle: a draining magical bell, three symbol rings, a bound spirit, and a sacrifice-based resolution instead of a single riddle answer.",
  },
};

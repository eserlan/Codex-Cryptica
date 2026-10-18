import type { AnswerConfigInput } from "../schema";

export const howDoIRunSecretDoorsInDnd: AnswerConfigInput = {
  slug: "how-do-i-run-secret-doors-in-dnd",
  category: "running-the-game",
  publishedAt: "2026-10-18",
  question:
    "How do I run secret doors in D&D without endless Perception checks?",
  kind: "how-to",
  shortAnswer:
    "Use passive Perception to determine whether a character notices a secret door without searching; meeting its DC locates the door, though its catch can remain unknown. If passive detection fails but the party has a reason to search, call for one active check only when a plausible approach could still fail and failure has a cost. Once found, the door opens without another roll unless its mechanism is a distinct problem.",
  sections: [
    {
      kind: "prose",
      heading: "One door, three different decisions",
      paragraphs: [
        "Keep detection and opening separate. A successful passive or active detection locates the door; the clue can leave its catch unexplained. Opening is a further problem only when the mechanism earns that status, and a missed optional door can stay hidden.",
      ],
    },
    {
      kind: "list",
      heading: "Noticing: a passive success locates the door",
      intro:
        "In the 2014 fifth edition rules, the Dungeon Master's Guide uses passive Wisdom (Perception) to decide whether a character notices a secret door without actively searching, and an active check for a deliberate search. A passive score is 10 plus the character's Perception bonus, adjusted for advantage or disadvantage where it applies. When the score meets the door's detection DC, locate it for the players with a concrete sensory description. The catch can remain unknown:",
      items: [
        {
          term: "A draught where there should be none",
          text: "Cold air moves across ankles or bends a candle flame at the carved panel. The players know which part of the wall hides the door; the draught does not explain its catch.",
        },
        {
          term: "Wear that does not match the room",
          text: "Scrape marks arc around one panel, its mortar sits slightly proud or recessed, or dust is thin where hands keep touching stone. The wear locates the door without giving away how it opens.",
        },
        {
          term: "Sound and measure",
          text: "A panel sounds hollow when tapped, or measuring shows the room is shorter inside than the corridor outside suggests. These clues locate the door; tapping and measuring can also reveal it outright when the action settles the question.",
        },
        {
          term: "Check the senses before you award the clue",
          text: "Ask whether this character could plausibly notice it from here: light or darkvision, distance from the wall, noise and distraction, and whether they are hurrying or keeping watch for threats. A high score held by a character at the back of the party in pitch darkness has not automatically perceived the hidden door.",
        },
        {
          term: "A missed clue is not a locked scene",
          text: "If no passive score meets the DC and nobody searches, say nothing specific and move on. An optional door can simply stay hidden. A door the adventure needs is a design problem, covered below, not a reason to prompt roll after roll until someone succeeds.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Searching: roll only if the door remains undetected",
      intro:
        "Do not ask for another detection check after a passive success has located the door. If passive detection failed, or the players have a reason of their own to suspect a wall, hear their approach first. Call for an active check only when it could plausibly fail, the result is uncertain, and failure would cost something.",
      items: [
        {
          term: "No roll when the action settles it",
          text: "If a player holds a flame along the seam, puffs flour or chalk dust at the crack, pours water and watches where it runs, or taps stone by stone and listens, and that action would reveal the door, it reveals the door. Dice resolve uncertainty; they do not replace a decision the players have already made well.",
        },
        {
          term: "One lead search, with real help",
          text: "Let the best-placed character lead. In 2014, another character can help when they could attempt the task alone and their cooperation is productive, such as holding light steady or listening at the other end. In 2024, the helper must choose one of their own skill or tool proficiencies, and the check uses that proficiency; practical assistance alone does not qualify.",
        },
        {
          term: "Distinct jobs are not a dogpile",
          text: "There is a difference between four characters rolling Perception at the same wall and a search with divided labour: one listens, one measures the room, one checks the floor for wear, one watches the corridor. Give each distinct job its own consequence if it has one, or fold the help into the lead check. Identical rerolls after a failure add dice without adding play.",
        },
        {
          term: "Identical retries need a change",
          text: "If nothing has changed, the same search gets the same answer, so do not ask for the roll again. A new roll becomes fair when the approach changes, better tools or light arrive, new information turns up, or the party accepts a cost such as more time, more noise or a resource spent.",
        },
        {
          term: "Failure moves the scene",
          text: "A thorough search takes time whether it succeeds or fails. Let that time advance circumstances already in motion: the patrol on its regular round moves closer, for example. If time is unlimited, nobody is watching, and nothing changes during a slow search, consider letting a thorough search succeed without a roll; a check with no cost for failure only decides how long success takes.",
        },
        {
          term: "The ten-minute search is a house rule",
          text: "Some tables use a house rule that carefully searching one 10-foot section of wall takes ten minutes and finds a door there if one exists. That is a workable house rule, not a universal fifth edition rule. If you adopt it, say so plainly and let the cost be the time itself and whatever that time brings with it.",
        },
      ],
    },
    {
      kind: "table",
      heading: "Secret door decisions at a glance",
      headers: ["Situation", "What to do", "What happens next"],
      rows: [
        [
          "Door noticed: passive score meets detection DC",
          "Locate it with a concrete clue, such as a draught at the panel",
          "The door is found; its catch can remain unknown",
        ],
        [
          "Clue missed and nobody searches",
          "Describe the wall as unremarkable and play on",
          "An optional door stays hidden; an essential door needs another route, not prompted rerolls",
        ],
        [
          "Search succeeds after passive detection failed",
          "Locate it with a concrete clue, such as a seam or hollow panel",
          "The door is found; decide separately whether opening is a problem",
        ],
        [
          "Search fails while the door remains undetected",
          "Keep any existing clue and advance circumstances already in motion",
          "Players can try a materially different method or accept a cost",
        ],
        [
          "A player repeats the identical search",
          "Give the same result without a new roll",
          "A new roll waits for a new approach, tool, clue or accepted cost",
        ],
        [
          "Several characters search together",
          "Use one lead check with eligible Help, or split distinct jobs",
          "Cooperation helps once; it does not become four free attempts",
        ],
        [
          "The catch is obvious once found",
          "Let the door open with no further roll",
          "Play moves through the door the party earned",
        ],
        [
          "The mechanism is intricate by design",
          "Make understanding or forcing it a separate challenge with its own stakes",
          "A second check is a new problem, not a tax on the first success",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Opening: a second problem only when it earns its place",
      paragraphs: [
        "Discovery, understanding and opening can be three different tasks, but they do not have to be. The 2014 Dungeon Master's Guide makes the same distinction: once a secret door is detected, an Intelligence (Investigation) check might be required to work out how to open it if the mechanism is not obvious. The word to hold on to is might. A sliding panel with a worn thumb catch opens. A door held by a counterweight, a sequence of studs, a key kept elsewhere, a magical seal or a trap is a separate challenge because the fiction makes it one.",
        "The 2024 revision keeps passive Perception and gives deliberate searching clearer action labels: Search for discerning something that is not obvious, commonly with Perception, and Study for deducing how something works, commonly with Investigation. The labels change; the habit does not. Do not add a redundant Investigation roll as a default tax on a door the party has already found fairly, and if opening does need a roll, decide in advance what failure does: jam the mechanism, make noise, take time, or trigger the seal, rather than leaving the party staring at a found door they cannot interact with.",
        "Reward tools and preparation here as much as at the search stage. A crowbar, chalk, oil, a ten-foot pole, a familiar sent through the gap, or a rubbing of the stud pattern taken away to study can each change an uncertain opening into a settled one, or turn a failed attempt into information about how the mechanism resists.",
      ],
    },
    {
      kind: "prose",
      heading: "Essential doors and optional doors are different designs",
      paragraphs: [
        "An optional secret door can be missed. A vault of extra treasure, a shortcut that skips a guarded hall, or a shrine with lore rewards the observant and stays shut for everyone else; that is the reward working as intended, and the missed door costs the party something they never knew they had, which is a fair price for not searching.",
        "Never gate essential progress behind one easily failed check. If the only route to the next part of the adventure sits behind a DC 15 search, a bad roll has not created tension; it has ended the adventure. Give an essential door at least one backstop you prepare in advance: a second clue in another room, an occupant who uses the door where the party can witness it, a longer and more dangerous route around, a way to force it at a noisy cost, or information elsewhere that sends the party back to that wall with a new method. The backstop can be slower, louder or more expensive. It only has to exist.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a DC 15 stone door",
      paragraphs: [
        "A party explores a flooded crypt. Behind a carved stone panel in the north wall is a passage to the flooded vault, and a patrol already follows a regular route through the passage. The GM sets DC 15 to detect the door: passive Perception determines whether a character notices it without searching; an active Perception check can find it if they search deliberately. The ranger has Perception +5, so a passive score of 15, or 10 if a circumstance imposes disadvantage. The rogue has Perception +7. The wizard has Investigation +6.",
      ],
      items: [
        {
          term: "Noticing: passive success locates the door",
          text: "The ranger's passive Perception of 15 meets DC 15 as the party crosses with a lantern lit. The GM describes the flame bending toward the carved panel and cold air at the ranger's ankles. The players know that panel is a secret door; its catch is still unknown. No active check is needed to detect it again.",
        },
        {
          term: "Alternative: passive detection fails, then they search",
          text: "If disadvantage reduces the ranger's passive score to 10, she notices nothing while crossing. But as the party maps the crypt, they realise the room is shorter inside than the corridor outside suggests, giving them an independent reason to search the north wall. They hold the lantern along the carving and tap while the fighter listens. The rogue makes one active Perception check with advantage because the ranger steadies the light and the fighter listens at the other end: rolls of 9 and 14 take the 14, plus +7, for 21 against DC 15. They locate the panel and its seam.",
        },
        {
          term: "Active search, on a failure instead",
          text: "On a total below 15, the GM does not invite the wizard and fighter to repeat the same search. That careful search has taken time, and the patrol already on its route has moved closer to the crypt room. The party can change method: puffing flour at the suspected panel reveals the airflow and locates the door, while prising at the carving with a crowbar risks noise. Any new roll follows a genuinely different approach.",
        },
        {
          term: "Opening: obvious catch, no second roll",
          text: "The proud stone is worn smooth where thumbs have pressed it for years. Pressing it clicks and the panel swings inward on a counterweight, so no Investigation roll is needed. If three studs must be pressed in the order carved on a tomb across the crypt, the wizard can study that carving to work out the sequence. A failed reading does not jam a stud; only physically pressing or forcing the mechanism could trigger a consequence the GM has established.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you hide a secret door",
      items: [
        "Write down the clue in concrete terms: what a character can see, feel, hear or measure, and where it can be noticed from.",
        "Note the passive detection DC: a successful score locates the door; the catch can remain unknown.",
        "If passive detection fails, decide what might give the party an independent reason to search, and which described actions simply work without a roll.",
        "Set an active check DC only if that search could still fail, and note how its time advances existing circumstances or creates a concrete cost.",
        "Rule on help before the roll: who leads, whether the helper could attempt the task alone (2014), and which skill or tool proficiency they choose (2024).",
        "Decide whether opening is automatic once found or a distinct problem, and only choose the second if the mechanism, key, seal or trap makes it interesting.",
        "Classify the door as optional or essential. If it is essential, prepare an alternate clue, route or costly recovery before the session, not during the stall.",
        "If you use a timed thorough search that always succeeds, label it as a house rule at your table and track what the spent time changes.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the door, the clue and the way around in one place",
    paragraphs: [
      "A secret door is easy to run when its parts stay connected: the clue and where it can be noticed, the mechanism and how it opens, what sits behind it, and the alternate route you prepared in case the party misses it. Recording the location, the clue and the linked room as connected notes in Codex Cryptica means that preparation is in front of you during the session, including the backstop you wrote weeks earlier and might otherwise forget under pressure.",
    ],
    linkText: "Try the dungeon generator",
    href: "/generators/dungeon-generator",
  },
  relatedTools: [
    {
      title: "Dungeon generator",
      description:
        "Layouts with rooms, passages and places to hide a door, its clue and a second way around.",
      href: "/generators/dungeon-generator",
    },
    {
      title: "Puzzle generator",
      description:
        "Mechanisms, seals and catches for the doors where opening should be a distinct problem.",
      href: "/generators/puzzle",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "Locations, clues and mechanisms connected so dungeon preparation stays usable at the table.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
    "how-do-i-run-exploration-in-a-huge-ruined-city",
    "how-do-i-run-a-stealth-mission-in-a-tabletop-rpg",
    "how-do-i-prepare-a-dnd-session",
  ],
  discovery: {
    id: "answer-secret-doors-dnd",
    parentCluster: "adventure-mapping",
    clusters: ["adventure-mapping", "running-the-game"],
    primaryIntent: "how to run secret doors in d&d",
    intentAliases: [
      "passive perception and secret doors",
      "finding hidden doors in d&d",
      "repeated investigation checks for secret doors",
      "what happens when players fail to find a secret door",
      "how to open a secret door in d&d",
      "how to stop perception check dogpiles",
    ],
    uniqueValue:
      "Shows how passive Perception locates a secret door, when an independently motivated active search can still fail, and how to handle its opening without redundant checks.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-run-mystery-without-railroading",
      "answer-rpg-puzzles",
      "answer-rpg-puzzle-hints",
      "answer-huge-ruined-city-exploration",
      "answer-run-stealth-mission-in-tabletop-rpg",
      "answer-prepare-dnd-session",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-rpg-puzzles",
        reason:
          "The puzzle answer owns designing multi-solution puzzles that cannot stall play; this answer owns the narrower exploration procedure for one hidden door, from passive notice through search retries to opening.",
      },
      {
        with: "answer-run-mystery-without-railroading",
        reason:
          "The mystery answer owns redundant clue networks for essential conclusions; this answer applies the same care to a single door and covers the check-by-check adjudication the mystery page does not.",
      },
    ],
  },
  seo: {
    title: "Run Secret Doors in D&D Without Endless Checks | Codex Cryptica",
    description:
      "Run secret doors without redundant checks: passive detection, active searches after a missed door, and a DC 15 worked example.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-secret-doors-in-dnd.jpg",
    imageAlt:
      "Adventurers with a lantern noticing a cold draught along a carved stone wall with a faint secret door seam in a flooded crypt",
  },
};

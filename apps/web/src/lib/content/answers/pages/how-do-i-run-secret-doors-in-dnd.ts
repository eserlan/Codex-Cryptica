import type { AnswerConfigInput } from "../schema";

export const howDoIRunSecretDoorsInDnd: AnswerConfigInput = {
  slug: "how-do-i-run-secret-doors-in-dnd",
  category: "running-the-game",
  publishedAt: "2026-10-18",
  question:
    "How do I run secret doors in D&D without endless Perception checks?",
  kind: "how-to",
  shortAnswer:
    "Split every secret door into three separate decisions: noticing a clue, finding the door, and opening it. Let a strong passive Perception score reveal one concrete clue such as a cold draught or scrape marks, not the whole door. Ask for an active check only when the players describe a plausible search and the outcome is still uncertain, and let failure change the situation through time, noise or a new risk instead of inviting the same roll again. Once the door is found, let it open without another roll unless the mechanism itself is a distinct and interesting problem.",
  sections: [
    {
      kind: "prose",
      heading: "One door, three different decisions",
      paragraphs: [
        "Most secret door stalls happen because one DC is made to do three jobs at once. The party walks past a wall, someone rolls Perception, the roll fails, and nobody knows whether they missed a hint, missed the door itself, or found the door but cannot work it. Each stage then gets retried in turn, and exploration becomes a queue of identical checks.",
        "Run the stages separately. Noticing gives the players a clue they can act on. Finding confirms where the door is and what kind of thing it is. Opening is a third problem only when the mechanism earns that status. A secret door should reward curiosity and exploration, not punish a single failed die roll, so each stage needs its own answer to the question: what happens if this does not work?",
      ],
    },
    {
      kind: "list",
      heading: "Noticing: hand over a clue, not the door",
      intro:
        "In the 2014 fifth edition rules, the Dungeon Master's Guide section on secret doors uses passive Wisdom (Perception) to decide whether a character notices a secret door without actively searching, and an active Wisdom (Perception) check for a deliberate search. A passive score is 10 plus the character's Perception bonus, adjusted for advantage or disadvantage where it applies. Treat a passive success as noticing something worth investigating, described in concrete terms:",
      items: [
        {
          term: "A draught where there should be none",
          text: "Cold air moves across ankles or bends a candle flame along one short stretch of wall. The clue points at a gap; it does not outline a door or explain a catch.",
        },
        {
          term: "Wear that does not match the room",
          text: "Scrape marks arc across flagstones, mortar sits slightly proud or recessed in one rectangle, or dust is thinner where hands keep touching stone. These reward a second look at a specific place.",
        },
        {
          term: "Sound and measure",
          text: "One section sounds hollow when tapped, or the room is shorter inside than the corridor outside suggests it should be. Measuring, tapping and listening are player actions you can reward directly.",
        },
        {
          term: "Check the senses before you award the clue",
          text: "Ask whether this character could plausibly notice it from here: light or darkvision, distance from the wall, noise and distraction, and whether they are hurrying or keeping watch for threats. A high score held by a character at the back of the party in pitch darkness has not automatically perceived a hairline crack.",
        },
        {
          term: "A missed clue is not a locked scene",
          text: "If no passive score meets the DC and nobody searches, say nothing specific and move on. An optional door can simply stay hidden. A door the adventure needs is a design problem, covered below, not a reason to prompt roll after roll until someone succeeds.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Finding: roll only when a described search could still fail",
      intro:
        "Once players have a clue, or a reason of their own to suspect a wall, let them investigate it through described actions first. Call for an active check only when all three are true: the approach could plausibly work, the result is genuinely uncertain, and failure would cost something.",
      items: [
        {
          term: "No roll when the action settles it",
          text: "If a player holds a flame along the seam, puffs flour or chalk dust at the crack, pours water and watches where it runs, or taps stone by stone and listens, and that action would reveal the door, it reveals the door. Dice resolve uncertainty; they do not replace a decision the players have already made well.",
        },
        {
          term: "One lead search, with real help",
          text: "Let the best-placed character make the active check. A second character can give that check advantage through the Help action in the 2014 rules when they are doing something that genuinely assists, such as holding light steady, listening at the other end, or testing each stone in turn. In the 2024 revision, the same table habit still works: one character searches, another's concrete assistance is what earns advantage, not their presence in the room.",
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
          text: "A failed search leaves the clue in place and changes something else: ten minutes of light and rations pass, a patrol gets closer, rain starts erasing tracks outside, or the search itself makes noise. If time is unlimited, nobody is watching, and nothing punishes a slow search, consider skipping the roll and letting a thorough search succeed, because a check with no cost for failure only decides how long success takes.",
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
          "Clue spotted: a passive score meets the DC",
          "Describe one concrete clue, such as a draught or scrape marks",
          "Players choose how to investigate; the mechanism is still unknown",
        ],
        [
          "Clue missed and nobody searches",
          "Describe the wall as unremarkable and play on",
          "An optional door stays hidden; an essential door needs another route, not prompted rerolls",
        ],
        [
          "Active search succeeds",
          "Confirm the seam, outline or hollow section",
          "The door is found; decide separately whether opening is a problem",
        ],
        [
          "Active search fails",
          "Keep the clue, spend time or add pressure, and say what changed",
          "Players can try a materially different method or accept a cost",
        ],
        [
          "A player repeats the identical search",
          "Give the same result without a new roll",
          "A new roll waits for a new approach, tool, clue or accepted cost",
        ],
        [
          "Several characters search together",
          "Use one lead check with Help, or split the work into distinct jobs",
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
        "A party explores a flooded crypt. Behind a carved stone panel in the north wall is a passage to the flooded vault. The GM has set DC 15 to detect the door, using the 2014 secret door procedure: passive Perception to notice without searching, an active Perception check to search deliberately, and an Investigation check afterwards only if the opening mechanism is not obvious. The ranger has Perception +5, so a passive score of 15. The rogue has Perception +7. The wizard has Investigation +6.",
      ],
      items: [
        {
          term: "Noticing: the passive score meets the DC",
          text: "The ranger's passive Perception of 15 meets DC 15 as the party crosses the room with a lantern lit. The GM does not announce a secret door. She says the lantern flame keeps bending toward the north wall and the ranger's ankles feel cold air where the rest of the room is still. That is the clue: specific, located, and worth acting on. Had the highest passive score been 12, nobody would have noticed anything on the way through, and the GM would have described an ordinary wall.",
        },
        {
          term: "Finding: a described search, one roll",
          text: "The players hold the lantern along the carving, feel for the draught stone by stone, and tap the panel while the fighter listens. That is a plausible search of the right place, but the seam is fine enough that the result is still uncertain, so the GM asks the rogue for one active Perception check, with advantage because the ranger is holding the light steady and calling out where the flame moves. The rogue rolls 9 and 14, takes the 14, and adds +7 for a total of 21 against DC 15. The seam is found, along with one stone that sits a fraction proud of its neighbours.",
        },
        {
          term: "Finding, on a failure instead",
          text: "On a total below 15, the GM would not invite the wizard and fighter to roll the same search in turn. The draught is still there, so the clue remains true, but the tapping has taken time: the lantern has burned lower, and the GM marks that the things in the flooded passage have had ten quiet minutes to notice the light under their own door. The party can now change method, perhaps by puffing flour at the wall to show where air escapes, which the GM can simply let work, or by accepting more noise and prising at the carving with a crowbar. A new roll, if one is needed, follows the new approach rather than repeating the old one.",
        },
        {
          term: "Opening: obvious catch, no second roll",
          text: "The proud stone is worn smooth where thumbs have pressed it for years. Pressing it clicks and the panel swings inward on a counterweight. Because the catch is obvious once found, the GM asks for no Investigation roll; the party found this door fairly and it opens. In a variant where the panel is held by three studs that must be pressed in the order carved on a tomb across the crypt, understanding the mechanism is a genuine second problem. There the wizard's Investigation check is warranted, the tomb carving is the clue to study, and failure could jam a stud and make noise rather than relock a door the party has already earned.",
        },
        {
          term: "Why it works",
          text: "Each die roll answered a different question, and each result, success or failure, told the party what to do next. The passive score produced a clue instead of a reveal, one assisted search settled the finding, failure would have cost time and safety instead of inviting a queue of rerolls, and opening took a second roll only in the version where the mechanism itself was interesting.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you hide a secret door",
      items: [
        "Write down the clue in concrete terms: what a character can see, feel, hear or measure, and where it can be noticed from.",
        "Note the passive score that notices the clue, and decide what a character with that score learns: a suspicion, not the mechanism.",
        "Decide what a deliberate search looks like and which described actions simply work without a roll.",
        "Set the active check DC only if a plausible search could still fail, and note what failure costs in time, noise, resources or danger.",
        "Rule on help before the roll: who leads, what real assistance earns advantage, and which separate jobs deserve separate consequences.",
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
      "Splits secret doors into noticing, finding and opening, gives each stage its own rule for when to roll, and works a DC 15 stone door through passive notice, an assisted search, a failure that changes the scene, and an opening that needs no second roll.",
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
      "Notice, find and open secret doors without a queue of Perception rolls. Passive clues, assisted searches, failed checks that move the scene, and a DC 15 worked example.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-secret-doors-in-dnd.jpg",
    imageAlt:
      "Adventurers with a lantern noticing a cold draught along a carved stone wall with a faint secret door seam in a flooded crypt",
  },
};

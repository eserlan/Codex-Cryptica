import type { AnswerConfigInput } from "../schema";

export const whereDoIStartIfIHaveNeverPlayedATabletopRpg: AnswerConfigInput = {
  slug: "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
  category: "getting-started",
  question: "Where do I start if I have never played a tabletop RPG before?",
  kind: "how-to",
  shortAnswer:
    "You need less than it looks like: a game or beginner ruleset, a small group (or a solo-friendly option), some way to resolve uncertainty — usually dice — and one short scenario to try. You don't need to read a large rulebook cover to cover first, own special gear, or already know the jargon. You can start as a player in someone else's game, or as the GM running a short beginner adventure for others; both are completely valid entry points, and neither requires the other to happen first.",
  sections: [
    {
      kind: "list",
      heading: "What you actually need to begin",
      items: [
        {
          term: "A game or beginner ruleset",
          text: "Many systems publish a free or cheap quick-start version with everything needed for a first session and nothing else — that's a better starting point than a full rulebook.",
        },
        {
          term: "A small group, or a solo option",
          text: "Three to five people including whoever runs it is a common comfortable size, but some systems are built for solo or two-player play if a group isn't available yet.",
        },
        {
          term: "Something to resolve uncertainty",
          text: "Usually dice, sometimes cards or another randomiser depending on the system — the specific mechanism matters far less than having one.",
        },
        {
          term: "Character material for that system",
          text: "A character sheet or a pre-made character. Pre-generated characters are a completely normal way to start, not a lesser version of playing.",
        },
        {
          term: "One short scenario",
          text: "A single self-contained situation to play through — often called a one-shot — rather than committing to a long campaign before knowing if the hobby suits you.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Two valid starting points",
      items: [
        {
          term: "Start as a player",
          text: "Join an existing group or a beginner-friendly table and learn the shape of play by doing it, without needing to prepare anything in advance beyond a character.",
        },
        {
          term: "Start as a GM",
          text: "Equally valid, not a harder or more advanced route. Pick a beginner-friendly ruleset and adventure, keep the first session small and short, and learn the rest of the rules as they come up rather than mastering the book first.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A few terms, briefly",
      items: [
        {
          term: "GM / DM",
          text: "The person running the game — describing the world, playing everyone except the player characters, and adjudicating what happens. DM (Dungeon Master) is D&D's specific name for the same role.",
        },
        {
          term: "Player character (PC)",
          text: "The character a player controls, as opposed to everyone else in the story.",
        },
        { term: "NPC", text: "Any character the GM controls, not a player." },
        {
          term: "One-shot",
          text: "A single, self-contained session — start to finish in one sitting, no ongoing commitment.",
        },
        {
          term: "Campaign",
          text: "An ongoing story across multiple sessions, once a group knows they want to keep playing together.",
        },
        {
          term: "VTT",
          text: "Virtual tabletop — software for playing online with maps, tokens and dice rolling; entirely optional for a first game, especially in person.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A practical first-session sequence",
      paragraphs: ["One reasonable path from zero to playing, in order."],
      items: [
        {
          term: "1. Pick a genre you're excited about",
          text: "Fantasy, horror, sci-fi, something else — enthusiasm for the setting carries a first session further than picking the 'correct' beginner game.",
        },
        {
          term: "2. Choose a game with an approachable starting point",
          text: "A free quick-start rules document or a beginner box is easier to get moving with than a full core rulebook.",
        },
        {
          term: "3. Decide who's running it",
          text: "Someone needs to GM. It doesn't need to be the most experienced person in the room — it needs to be someone willing to read the quick-start once.",
        },
        {
          term: "4. Use pre-generated characters",
          text: "If building a character from scratch feels like the barrier stopping you from starting, skip it. Pre-made characters are how many people play their first session.",
        },
        {
          term: "5. Run or play one short scenario",
          text: "A single evening's worth of play, not a campaign commitment. Decide afterwards whether to continue.",
        },
        {
          term: "6. Learn more rules only when they come up",
          text: "Nobody at a first session needs the whole rulebook memorised. Look up the specific rule for the situation in front of you and move on.",
        },
      ],
    },
  ],
  codexConnection: {
    heading: "Where Codex Cryptica comes in — later, not first",
    paragraphs: [
      "You do not need campaign-management software to play your first game, or even your first several sessions — a pre-made character and a short scenario are enough. Codex becomes useful once a group decides to keep going and starts accumulating things worth remembering: recurring NPCs, a growing map, factions with their own agendas, a session's worth of notes that need to still make sense next week.",
      "At that point, public generators can help a new GM produce an NPC, encounter or location quickly without needing deep system knowledge yet, and a vault gives ongoing campaign notes somewhere to live that isn't scattered across notebooks and memory. None of that is a prerequisite for the first session — it's what tends to become useful once there's a campaign worth organising.",
    ],
    linkText: "See the NPC generator",
    href: "/generators/npc",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "A fast way for a new GM to produce a character on the spot without deep system knowledge yet.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    "what-rpg-system-should-we-try-instead-of-dnd",
    "how-do-i-run-a-successful-session-0",
    "how-do-i-find-a-tabletop-rpg-group-to-play-with",
  ],
  discovery: {
    id: "answer-beginner-start",
    parentCluster: "beginner-entry",
    primaryIntent: "how to start playing tabletop rpgs as a complete beginner",
    intentAliases: [
      "how to start playing tabletop rpgs",
      "beginner guide to rpgs",
      "what do i need to play dnd",
      "should i start as a player or gm",
      "tabletop rpgs for beginners",
    ],
    uniqueValue:
      "States the genuinely small minimum needed to start (no rulebook read-through, no gear list), covers both the player and GM entry points as equally valid, and is explicit that campaign-management software isn't needed for a first session.",
    relatedIntents: [
      "answer-find-rpg-group",
      "answer-system-selection",
      "answer-session-zero",
    ],
  },

  seo: {
    title:
      "Where do I start with tabletop RPGs as a beginner? | Codex Cryptica",
    description:
      "What a complete beginner actually needs to play, starting as a player or a GM, a few terms explained, and a practical sequence from zero to a first session.",
  },
};

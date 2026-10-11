import type { DiscoveryEntryInput } from "../schema";

/**
 * Topic hubs (`/topics/[slug]`).
 *
 * Dedicated entry points for coherent content clusters (#3118).
 * Bridges related Answers, Examples, and Generators into an interconnected
 * topic graph for human discovery, classic search engines, and AI retrieval.
 */
export const topicEntries: DiscoveryEntryInput[] = [
  {
    id: "topic-heists",
    pageKind: "hub",
    canonicalPath: "/topics/heists",
    primaryIntent: "tabletop rpg heist hub and resources",
    intentAliases: [
      "rpg heist topic hub",
      "tabletop heist resources",
      "designing and running rpg heists",
      "ttrpg heist hub",
      "rpg heist guides and generators",
    ],
    userJob: "navigate",
    uniqueValue:
      "Curates the complete RPG heist cluster in one crawlable hub, connecting the four-phase running framework, target design checklist, genre-specific worked examples, and generation tools.",
    parentCluster: "heist",
    clusters: ["heist", "adventure-mapping"],
    relatedIntents: [
      "generator-heist",
      "answer-run-heist-in-tabletop-rpg",
      "answer-heist-target-design",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "topic-puzzles",
    pageKind: "hub",
    canonicalPath: "/topics/puzzles",
    primaryIntent: "tabletop rpg puzzle hub and resources",
    intentAliases: [
      "rpg puzzle topic hub",
      "tabletop puzzle resources",
      "designing and running rpg puzzles",
      "ttrpg puzzle hub",
      "rpg puzzle guides and generators",
    ],
    userJob: "navigate",
    uniqueValue:
      "Curates the RPG puzzle cluster in one crawlable hub, connecting the stall-proof design guide, the hint ladder, genre-specific worked examples with alternate solutions, and the puzzle generator.",
    parentCluster: "puzzle-design",
    clusters: ["puzzle"],
    relatedIntents: [
      "generator-puzzle",
      "answer-rpg-puzzles",
      "answer-rpg-puzzle-hints",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "topic-pirates-high-seas",
    pageKind: "hub",
    canonicalPath: "/topics/pirates",
    primaryIntent: "pirate and high seas campaign guide hub",
    intentAliases: [
      "pirate campaign guides and resources",
      "high seas rpg campaign guides",
      "pirate campaign answers",
    ],
    audience: "Game masters planning pirate or high-seas campaigns",
    userJob: "navigate",
    uniqueValue:
      "Connects practical answers for choosing a system, exploration, sea travel, ship combat, islands and ports, and rival factions with the existing starter-ship guide, campaign page, pirate generators, and a worked adventure example. This is a guide navigator, distinct from the campaign-management focus of /for/pirates-high-seas and the content-creation focus of /generators/pirate.",
    parentCluster: "pirates-high-seas",
    clusters: ["pirate", "pirates-high-seas"],
    relatedIntents: [
      "for-pirates-high-seas",
      "hub-pirate",
      "answer-starter-ship-pirate",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "topic-dnd",
    pageKind: "hub",
    canonicalPath: "/topics/dnd",
    primaryIntent: "help running dnd as a dungeon master",
    intentAliases: [
      "dnd dm help",
      "dungeon master help hub",
      "i am running dnd what do i need",
      "dnd gm resources",
    ],
    audience: "Dungeon Masters running D&D",
    userJob: "navigate",
    uniqueValue:
      "A task-first hub organised by what a D&D Dungeon Master is trying to do (start, prep, build, run, world-build, track), routing to existing system-neutral Answers, generators and the Session Prep Builder. It is a navigator, distinct from the product positioning of /for/dungeons-and-dragons.",
    parentCluster: "system-guides",
    relatedIntents: [
      "for-dungeons-and-dragons",
      "tools-session-prep-builder",
      "answer-prepare-session-step-by-step",
      "topic-dnd-beginners",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "topic-dnd-beginners",
    pageKind: "hub",
    canonicalPath: "/topics/dnd-beginners",
    primaryIntent: "dnd for beginners what new players need to know",
    intentAliases: [
      "dnd for beginners",
      "beginner dnd guide",
      "what do i need to know before playing dnd",
      "dnd basics for new players",
      "dnd beginner hub",
    ],
    audience: "New players playing Dungeons & Dragons for the first time",
    userJob: "navigate",
    uniqueValue:
      "A player-first learning path through the core table conversation, character-sheet orientation, dice literacy, and combat turns, distinguishing what to learn immediately from what can wait, and routing between validated beginner guides without reading like a rules manual.",
    parentCluster: "dnd-new-player",
    clusters: ["dnd-new-player", "beginner-entry"],
    relatedIntents: [
      "topic-dnd",
      "answer-new-dnd-player-first-game",
      "answer-read-dnd-character-sheet-beginner",
      "answer-which-dice-to-roll-in-dnd",
      "answer-what-can-i-do-on-my-turn-in-dnd-combat",
      "answer-bring-to-first-dnd-game",
      "answer-new-dnd-player-learn-first",
    ],
    indexable: true,
    status: "live",
  },
];

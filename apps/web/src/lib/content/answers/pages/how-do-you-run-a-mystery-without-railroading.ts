import type { AnswerConfigInput } from "../schema";

export const howDoYouRunAMysteryWithoutRailroading: AnswerConfigInput = {
  slug: "how-do-you-run-a-mystery-without-railroading",
  category: "session-prep",
  question: "How do you run a mystery without railroading?",
  kind: "how-to",
  shortAnswer:
    "To run a mystery without railroading in a tabletop RPG, decouple your clues from rigid single solutions by applying the Three-Clue Rule: for any conclusion you want the investigators to reach, place at least three separate clues pointing toward it across distinct locations or witnesses. Never lock essential clues behind binary failure checks; if a player searches a crime scene, they find the evidence automatically, while die rolls dictate the speed, thoroughness, or stealth of the recovery. Finally, give the culprit an active agenda that progresses whenever the investigators hesitate.",
  sections: [
    {
      kind: "prose",
      heading: "The fragile glass railroad",
      paragraphs: [
        "Tabletop mysteries collapse most often because the Game Master envisions a single detective story in their head: the party must speak to the apothecary, discover the nightshade vial in the cellar, question the stable hand, and ambush the assassin at the docks. The instant players fail an Investigation check in the cellar or decide to tail the magistrate instead, the entire story grinds to an awkward halt.",
        "To keep the game moving without forcing players onto a single scripted track, you must abandon linear plot sequences. Treat your mystery not as a path of breadcrumbs, but as a network of interconnected evidence nodes. Regardless of which lead the party pursues first, multiple clues should guide them toward the next hub of revelation.",
      ],
    },
    {
      kind: "list",
      heading: "Three core principles of resilient mystery design",
      intro:
        "Build your investigative scenarios around these three structural rules:",
      items: [
        {
          term: "The Three-Clue Rule",
          text: "For every essential conclusion the party must make to progress the investigation, seed at least three independent clues across the world. If one is missed and one is misinterpreted, the third will still carry the momentum forward.",
        },
        {
          term: "Default discovery over gating checks",
          text: "Never gate essential information behind a pass or fail d20 check. If an investigator examines the desk, they find the forged shipping manifest. Use dice rolls only to determine secondary benefits, such as deciphering coded ink, noticing a hidden pouch, or avoiding detection by approaching guards.",
        },
        {
          term: "The culprit ticking timeline",
          text: "Write a four-step schedule of what the culprit will do if undisturbed. If the players spend three days arguing or searching the wrong warehouse, the culprit carries out their next objective. The world reacts to delays rather than freezing in place.",
        },
      ],
      outro:
        "When the culprit acts dynamically, stalled investigations reignite immediately as fresh consequences crash into the scene.",
    },
    {
      kind: "example",
      heading: "Worked example: The poisoning of Chancellor Corvo",
      paragraphs: [
        "See how structuring evidence across multiple vectors prevents an investigation from stalling.",
      ],
      items: [
        {
          term: "The linear single-choke-point design",
          text: "The GM decides the killer used rare marsh-viper venom purchased exclusively at Madame Zara Apothecary. The party examines the chancellor body, but the healer rolls poorly on a Medicine check. The GM says: You see no obvious wounds. The party wanders the tavern for two hours with zero leads, until the GM is forced to have an NPC enter and announce the answer.",
        },
        {
          term: "The multi-node Three-Clue design",
          text: "The conclusion is that the court physician poisoned the wine. Clue 1 (The Body): Blackened veins around the tongue indicate belladonna (discovered automatically by anyone inspecting the corpse). Clue 2 (The Cellar): A discarded apothecary receipt signed with the physician seal rests under an empty wine cask. Clue 3 (The Courtyard): A gossiping scullery maid reveals she saw the physician slipping out of the cellar just before the banquet toast.",
        },
        {
          term: "Why it works",
          text: "Even if the players ignore the body entirely and go straight to the kitchen, or fail their stealth roll in the cellar, they still gather enough puzzle pieces to formulate their own theory without GM interference.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "The mystery pre-flight checklist",
      intro:
        "Before presenting a mystery scenario to your group, verify these structural foundations:",
      items: [
        "A clear victim, crime, and motive established in the opening twenty minutes.",
        "Three distinct suspect factions or individuals, each with something to hide.",
        "At least three independent clues pointing to every required scene node.",
        "No essential clue hidden behind a mandatory binary d20 roll.",
        "A four-beat timeline of culprit actions that advance on in-game days or rests.",
      ],
    },
  ],
  codexConnection: {
    heading: "Connecting clues and suspects in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica's interactive knowledge graph is tailor-made for investigative campaigns. You can create entities for every suspect, location, and piece of physical evidence, drawing directional connection arrows between them.",
      "As your players uncover clues during the session, tag relationships with labels like 'Possesses weapon', 'Alibi verified', or 'Blackmailed by'. The visual graph ensures you never lose track of which clues your players have verified and which leads remain open.",
    ],
    linkText: "Track mystery campaign nodes in Codex Cryptica",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "Quest generator",
      description:
        "Generate murder mysteries, stolen artifact leads, and conspiratorial patron hooks.",
      href: "/generators/quest",
    },
    {
      title: "NPC generator",
      description:
        "Produce shifty suspects, tight-lipped witnesses, and corrupt magistrates on demand.",
      href: "/generators/npc",
    },
    {
      title: "Dungeon generator",
      description:
        "Map out sprawling manor houses, crime scenes, and underground hiding places.",
      href: "/generators/dungeon-generator",
    },
  ],
  relatedAnswers: [
    "how-do-you-write-a-one-shot-adventure",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
  ],
  discovery: {
    id: "answer-run-mystery-without-railroading",
    parentCluster: "adventure-mapping",
    primaryIntent: "how to run a mystery without railroading",
    intentAliases: [
      "how to run a mystery in dnd",
      "rpg mystery investigation without railroading",
      "three clue rule tabletop rpg",
      "designing tabletop mysteries",
      "how to make an investigation in an rpg",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A non-linear investigation framework combining the Three-Clue Rule with proactive culprit timelines to ensure mystery sessions never stall.",
    relatedIntents: ["answer-conspiracy-campaign", "answer-rpg-puzzles"],
  },
  seo: {
    title: "How to Run a Mystery Without Railroading | Codex Cryptica",
    description:
      "Learn how to run tabletop RPG mysteries that never stall. Master the Three-Clue Rule, clue networks, and dynamic culprit timelines.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-a-mystery-without-railroading.jpg",
    imageAlt:
      "Atmospheric tabletop RPG illustration of an investigator examining an illuminated candlelit crime scene with magnifying glass and parchment notes",
  },
};

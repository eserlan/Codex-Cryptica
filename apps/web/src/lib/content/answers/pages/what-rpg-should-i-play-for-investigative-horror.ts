import type { AnswerConfigInput } from "../schema";

export const whatRpgShouldIPlayForInvestigativeHorror: AnswerConfigInput = {
  slug: "what-rpg-should-i-play-for-investigative-horror",
  category: "getting-started",
  publishedAt: "2026-09-21",
  question: "What RPG should I play for investigative horror?",
  kind: "comparison",
  shortAnswer:
    "The right investigative horror system depends on the investigation your group wants. For classic cosmic horror with fragile researchers, Call of Cthulhu. For modern conspiracy horror played by competent federal agents, Delta Green. For folklore mysteries in a mythic Scandinavia, Vaesen. For investigations that cannot stall on a missed roll, Trail of Cthulhu. For collaborative mysteries where even the GM discovers the solution in play, Brindlewood Bay.",
  sections: [
    {
      kind: "prose",
      heading: "Start with the investigation your group wants",
      paragraphs: [
        "Groups who ask for investigative horror often want different evenings. One table wants ordinary people confronting truths that unsettle them; another wants trained agents containing an unnatural conspiracy; a third wants folklore, village secrets, and creatures with motives the investigators can understand. The rules determine which kind of investigation the group gets.",
        "Four questions narrow the choice: who are the investigators, can a missed roll stall the clue trail, how dangerous should the horror feel, and does the GM want to set the culprit in advance or discover the solution with the players? The recommendations below use those differences.",
      ],
    },
    {
      kind: "list",
      heading: "Choose by the kind of investigation",
      items: [
        {
          term: "Classic cosmic horror → Call of Cthulhu",
          text: "Chaosium's percentile game puts ordinary investigators against the Mythos, with research, interviews, and Sanity shaping a 1920s investigation. Adventures range from single-session scenarios to multi-mystery campaigns, and dangerous encounters can cost investigators their lives. Choose it for the period setting and vulnerable characters.",
        },
        {
          term: "Modern conspiracy horror → Delta Green",
          text: "Arc Dream's modern game casts the investigators as capable agents who investigate unnatural incidents for a secret government programme. Bonds connect Sanity loss to family and friends, while the Lethality rules make some firearm encounters decisive. Choose it for professional investigators whose operations strain their lives at home.",
        },
        {
          term: "Folklore investigation → Vaesen",
          text: "Free League's Nordic horror game follows Society members investigating folkloric beings through structured Mysteries that build towards a confrontation. A shared headquarters gives the group a home between cases. Choose it for local folklore, human motives, and a recurring group of investigators.",
        },
        {
          term: "Reliable clue flow → Trail of Cthulhu",
          text: "Pelgrane Press's GUMSHOE game gives a core clue without a roll when an investigator uses a relevant ability; point spends can reveal more detail. Stability and Sanity track different kinds of harm, while Purist and Pulp modes adjust the danger. Choose it when the group wants to interpret evidence without a failed clue roll creating a dead end.",
        },
        {
          term: "Build the solution together → Brindlewood Bay",
          text: "The GM prepares the town, suspects, and flexible clues without fixing the culprit. The Theorize move lets the players propose a solution from the evidence, with the rules adding complications when appropriate. A slow-burn Dark Conspiracy can bring cosmic horror into later sessions. Choose it when the group wants to discover the answer together.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "How should clues reach the players?",
      paragraphs: [
        "A missed roll can stall a mystery if one lead carries the only route forward. Call of Cthulhu and Delta Green use traditional skill checks, so GMs can keep another route to essential information ready. Some groups enjoy the risk of a failed roll; others prefer to lose time or take a cost rather than lose the trail.",
        "Trail of Cthulhu protects access to core clues when an investigator uses a relevant ability, without a roll. Brindlewood Bay leaves the culprit open, and Theorize lets the group use gathered clues to propose a solution. Vaesen gives the GM a structured Mystery with clues and escalating threats. These approaches change whether players hunt for clues, interpret them, or shape the answer.",
      ],
    },
    {
      kind: "prose",
      heading: "How much mystery prep does the GM want?",
      paragraphs: [
        "Call of Cthulhu, Delta Green, Trail of Cthulhu, and Vaesen all support prepared cases with facts for the investigators to uncover. The GM may need to know which clues matter and prepare another route when the group misses or ignores one. Trail of Cthulhu's core-clue rule protects access when an investigator uses a relevant ability, but the GM still needs to understand the case and its clue structure.",
        "Brindlewood Bay shifts that work: the GM prepares suspects and flexible clues but not a culprit. The Theorize move lets the players assemble and test a solution from the evidence. Choose a fixed-answer game if the GM enjoys arranging revelations; choose Brindlewood Bay if they prefer to prepare the material and discover the answer with the players.",
      ],
    },
    {
      kind: "prose",
      heading: "How lethal should the horror be",
      paragraphs: [
        "Lethality changes how vulnerable the investigators feel. Call of Cthulhu characters are ordinary people, and a dangerous fight can kill them. If a campaign loses an investigator, agree whether the group wants to introduce another character or would rather avoid that risk. Delta Green agents are trained, but firearms remain dangerous and Sanity loss can wear down their Bonds and home lives.",
        "Trail of Cthulhu's Purist and Pulp modes let the GM set different levels of danger; Stability can still take a toll after a character survives an encounter. Vaesen can put danger in the pressure and countdown of a Mystery as well as in direct threats. Brindlewood Bay puts pressure on the case, the community, and the Dark Conspiracy, which may suit groups that want the mystery to carry more of the tension.",
      ],
    },
    {
      kind: "example",
      heading: "One disappearance, three tables",
      paragraphs: [
        "A folklorist vanishes from a coastal town after mailing the party a sketch of something with too many joints. Three groups run the same premise in different systems.",
      ],
      items: [
        {
          term: "The classic table",
          text: "The party plays Call of Cthulhu. Evenings go to newspaper archives, uncomfortable interviews with the harbourmaster, and a night-time boat trip nobody wants to take. One investigator loses Sanity reading the folklorist's notes and spends the next session rationalising what she saw. The trail nearly dies on a failed roll until a backup lead, a blackmail letter the GM planted with a rival, puts it back on track.",
        },
        {
          term: "The clue-forward table",
          text: "The party plays Trail of Cthulhu in Purist mode. Every scene hands its core clue to whoever looks, so the evenings are spent arguing about what the sketch implies rather than hunting for the sketch itself. An Occult spend reveals the joint pattern matches a specific entity, and that knowledge costs Stability across the whole party. The session ends with the group knowing exactly what waits offshore and dreading the boat trip anyway.",
        },
        {
          term: "The collaborative table",
          text: "The party plays Brindlewood Bay. The GM prepares the town, the suspects and a pile of clues with no fixed answer. The sleuths gossip, snoop and collect contradictions, then the Theorize move lets them name the culprit and the motive their evidence best supports. The Dark Conspiracy thread suggests the folklorist found something older than a murderer, which becomes next session's hook.",
        },
        {
          term: "Why it works",
          text: "Each version puts the GM's preparation in a different place: backup leads for a fixed mystery, core clues for investigators to interpret, or flexible evidence for a theory the group creates. The right system depends on which kind of preparation and play the group wants.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you commit to a horror system",
      intro: "Work through these with the group before buying rulebooks:",
      items: [
        "Choose who the investigators are, from vulnerable amateurs to trained agents or community sleuths.",
        "Decide whether essential clues can be missed, or whether the rules should preserve access to them.",
        "Agree how much character danger the group wants and how it would handle losing an investigator.",
        "Choose whether the GM wants a fixed culprit and clue trail or a solution assembled during play.",
        "Read a quickstart or starter mystery and note the preparation it asks of the GM.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Call of Cthulhu",
      rationale:
        "Percentile Basic Roleplaying with a Sanity mechanic that measures the investigator's erosion on contact with the Mythos.",
      href: "https://www.chaosium.com",
    },
    {
      system: "Delta Green",
      rationale:
        "Bonds that regulate Sanity through Home scenes, paired with a Lethality rating that makes heavy combat brutally final.",
      href: "https://www.delta-green.com",
    },
    {
      system: "Trail of Cthulhu",
      rationale:
        "GUMSHOE core clues that reach the table without a roll, plus separate Stability and Sanity tracks for short-term and long-term harm.",
      href: "https://pelgranepress.com",
    },
    {
      system: "Brindlewood Bay",
      rationale:
        "The Theorize move resolves mysteries the GM never pre-solved, shifting play from guessing to collaborative construction.",
      href: "https://www.gauntlet-rpg.com/brindlewood-bay.html",
    },
  ],
  codexConnection: {
    heading: "Stock the mystery once the system is chosen",
    paragraphs: [
      "Codex Cryptica does not run investigations or automate rules for any of these systems. What it helps with is the material around the mystery: the rumours that point at the folklorist's house, the secret society that mailed the sketch, and the NPCs whose motives contradict each other.",
      "Generate those pieces as linked material, so a rumour, its source and the faction behind it reference each other from the first session, whatever system the group picks.",
    ],
    linkText: "Generate mystery rumours",
    href: "/generators/rumour",
  },
  relatedTools: [
    {
      title: "Rumour Generator",
      description:
        "Whispers and hearsay that point the party at people and places worth investigating.",
      href: "/generators/rumour",
    },
    {
      title: "Secret Society Generator",
      description:
        "Hidden organisations with motives, methods and ranks for conspiracy horror.",
      href: "/generators/secret-society",
    },
    {
      title: "Faction Generator",
      description:
        "Groups with goals and resources that can drive or obstruct an investigation.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Call of Cthulhu",
      description:
        "Notes and worldbuilding for groups running classic cosmic-horror investigation.",
      href: "/for/call-of-cthulhu",
    },
    {
      title: "Codex Cryptica for Delta Green",
      description:
        "Material for modern conspiracy horror and federal-agent campaigns.",
      href: "/for/delta-green",
    },
    {
      title: "Codex Cryptica for Cosmic Horror",
      description:
        "Broader support for dread, unnatural entities and slow-burn campaigns.",
      href: "/for/cosmic-horror",
    },
  ],
  relatedAnswers: [
    "what-rpg-should-i-use-for-tactical-combat",
    "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
    "what-rpg-system-should-we-try-instead-of-dnd",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-generate-useful-rpg-rumours",
    "how-do-you-create-a-secret-society-for-an-rpg-campaign",
    "what-rpg-works-for-political-intrigue-and-faction-play",
    "how-do-i-run-an-investigator-without-sidelining-the-party",
    "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
    "how-do-i-write-a-good-call-of-cthulhu-one-shot",
  ],
  discovery: {
    id: "answer-investigative-horror-system-selection",
    parentCluster: "rpg-system-selection",
    clusters: ["rpg-system-selection"],
    primaryIntent: "choose a tabletop rpg system for investigative horror",
    intentAliases: [
      "best rpg for investigative horror",
      "tabletop rpg for mystery and horror",
      "cosmic horror rpg system",
      "rpg for conspiracy investigation",
      "call of cthulhu alternatives for investigation",
      "horror rpg with good investigation mechanics",
    ],
    uniqueValue:
      "Compares five investigative horror systems by investigator role, clue flow, lethality, and how much of the mystery the GM prepares before play.",
    userJob: "evaluate",
    relatedIntents: [
      "answer-system-selection",
      "answer-tactical-combat-system-selection",
      "answer-run-mystery-without-railroading",
      "answer-conspiracy-campaign",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-tactical-combat-system-selection",
        reason:
          "Sibling vibe-to-system chooser for tactical combat; this page owns investigative-horror system choice and links across rather than repeating the pattern.",
      },
      {
        with: "answer-political-intrigue-system-selection",
        reason:
          "Sibling vibe-to-system chooser for political intrigue; this page owns investigative-horror system choice and links across rather than repeating the pattern.",
      },
      {
        with: "answer-run-mystery-without-railroading",
        reason:
          "That page teaches GMs to run mysteries inside a chosen system; this one helps groups choose a system for investigative horror.",
      },
      {
        with: "answer-run-investigator-without-sidelining-party",
        reason:
          "This page compares systems for investigative horror; the investigator answer gives system-agnostic scene guidance for sharing clues and decisions among player characters.",
      },
    ],
  },
  seo: {
    title: "What RPG should I play for investigative horror? | Codex Cryptica",
    description:
      "Compare five investigative horror RPGs by investigator roles, clue flow, danger, and how much of the mystery the GM prepares.",
    image:
      "https://assets.codexcryptica.com/og/what-rpg-should-i-play-for-investigative-horror-v2.jpg",
    imageAlt:
      "A candle-lit investigator's desk covered in case notes, with pinned photographs and a foggy harbour beyond the window",
  },
};

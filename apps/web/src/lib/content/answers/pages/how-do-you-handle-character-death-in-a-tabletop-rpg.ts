import type { AnswerConfigInput } from "../schema";

export const howDoYouHandleCharacterDeathInATabletopRpg: AnswerConfigInput = {
  slug: "how-do-you-handle-character-death-in-a-tabletop-rpg",
  category: "campaign-notes",
  publishedAt: "2026-09-04",
  question: "How do you handle character death in a tabletop RPG?",
  kind: "framework",
  shortAnswer:
    "Handle it in three steps: pause the table to confirm the result is final, give the dying character a last action or parting words, then take a short break before anyone touches a replacement sheet. Don't rush a dead character out of the room or slide a new one across the table in the same breath — honouring the moment keeps the death feeling like a real story beat, and agreeing the process in advance stops it from turning into resentment.",
  sections: [
    {
      kind: "prose",
      heading: "The shock of sudden lethality",
      paragraphs: [
        "Character death is one of the most volatile moments in tabletop gaming. When poorly handled, an abrupt death can leave a player feeling silenced, alienated, or resentful that months of invested personal backstory were extinguished by lucky critical hits. Alternatively, removing the threat of death entirely robs combat encounters of genuine danger and tension.",
        "The difference between traumatic frustration and a memorable campaign milestone is narrative dignity. Even when combat is brutally lethal, a meaningful final moment for the dying adventurer turns the death into a tragic climax instead of an arbitrary administrative removal.",
      ],
    },
    {
      kind: "list",
      heading: "The three-step death protocol",
      intro:
        "When lethal damage or a final failed saving throw occurs, follow these steps at the table:",
      items: [
        {
          term: "Call a pause and confirm the maths",
          text: "Stop the action immediately. Verify hit point calculations and rule interpretations calmly with the player away from combat chaos, until you both agree the outcome is legitimate and irreversible.",
        },
        {
          term: "Offer a final heroic stand or parting monologue",
          text: "Before removing the miniature from the battlemat, offer the player an uninterrupted final action. Whether it is shielding a fallen ally with their body, shattering a bridge support, or whispering a final secret, let them frame their exit.",
        },
        {
          term: "Take a five-minute table recess",
          text: "Step away from the table for tea or water. Give the player space to process the loss before asking them about a replacement character. This short interlude resets emotional adrenaline and prevents hasty, uninspired replacement builds.",
        },
      ],
      outro:
        "Giving the moment deliberate breathing room signals respect for the player time and creativity.",
    },
    {
      kind: "example",
      heading: "Worked example: The death of Sir Gareth at the Sunken Bridge",
      paragraphs: [
        "Compare how two contrasting approaches handle a fatal roll during a boss confrontation.",
      ],
      items: [
        {
          term: "The mechanical dismissal approach",
          text: "The dragon rolls maximum breath weapon damage. The GM announces: Gareth, you take 48 fire damage, that exceeds your maximum hit points, you are dead. Hand me your sheet. Alright, rogue, it is your turn, what are you doing? Gareth sits silently for the remaining two hours of the session checking his phone.",
        },
        {
          term: "The narrative dignity protocol",
          text: "The GM pauses combat: Gareth, the flames engulf your shield. The damage is lethal. But before the inferno takes you, your shield arm holds for one heartbeat. What is your final action? Gareth player describes using his dying breath to plunge his sun-blade into the flagstones, creating a permanent circle of protective warding light for the retreating cleric. The table takes a ten-minute break to celebrate Gareth sacrifice before continuing.",
        },
        {
          term: "Why it works",
          text: "The mechanical death is fully enforced without cheap resurrection tricks, but the player is given authorship over their departure, turning an unlucky roll into a legendary campaign memory.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Managing post-death campaign continuity",
      intro:
        "Once the session concludes, resolve these campaign narrative threads before introducing the new adventurer:",
      items: [
        "Inheritance: Decide which personal relics and journals pass to the party versus which are buried or claimed as loot.",
        "Faction repercussions: Note how the fallen hero patron, family, or rival faction reacts to news of the demise.",
        "Replacement integration: Give the new character an immediate personal bond or shared stake with at least one surviving party member.",
        "Level and gear parity: Introduce the new hero at party level with appropriate tier equipment to avoid punishing the player twice.",
      ],
    },
  ],
  codexConnection: {
    heading: "Memorialising fallen heroes in Codex Cryptica",
    paragraphs: [
      "In Codex Cryptica, a dead adventurer does not simply disappear into an archive folder. You can update the character entity status to deceased, link their tomb or monument location directly to the campaign world map, and preserve their relationship connections in the graph.",
      "Their unresolved quest threads, sworn vendettas, and family lineages remain clickable entities, allowing surviving companions to visit their grave or fulfil their unfinished oaths in future sessions.",
    ],
    linkText: "Manage your campaign knowledge in Codex Cryptica",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Draft compelling family members, patrons, and replacement adventuring contacts quickly.",
      href: "/generators/npc",
    },
    {
      title: "Quest generator",
      description:
        "Generate revenge arcs, memorial pilgrimages, and unfinished legacy contracts.",
      href: "/generators/quest",
    },
    {
      title: "Settlement generator",
      description:
        "Flesh out the home village or burial abbey where the fallen companion is laid to rest.",
      href: "/generators/settlement",
    },
  ],
  relatedAnswers: [
    "how-do-i-run-a-successful-session-0",
    "how-do-you-organise-npc-relationships",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "how-do-you-create-a-magic-system",
  ],
  discovery: {
    id: "answer-handle-character-death",
    parentCluster: "campaign-style-guides",
    primaryIntent: "how to handle character death in a tabletop rpg",
    intentAliases: [
      "how to handle pc death dnd",
      "what to do when a character dies in an rpg",
      "tabletop rpg character death rules",
      "how to introduce a new character after death",
      "managing player death in dnd 5e",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A humane, practical three-step death protocol that gives players narrative agency over their final moments while preserving dramatic stakes and campaign continuity.",
    relatedIntents: ["answer-session-zero", "answer-npc-relationships"],
  },
  seo: {
    title: "How to Handle Character Death in a Tabletop RPG | Codex Cryptica",
    description:
      "A compassionate, practical guide for Game Masters handling player character death. Transform lethal moments into legendary campaign milestones.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-handle-character-death-in-a-tabletop-rpg.jpg",
    imageAlt:
      "Atmospheric tabletop RPG illustration of a fallen knight sword driven into a mossy stone cairn under dramatic storm light",
  },
};

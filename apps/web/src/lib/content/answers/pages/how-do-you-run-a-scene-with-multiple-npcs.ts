import type { AnswerConfigInput } from "../schema";

export const howDoYouRunASceneWithMultipleNpcs: AnswerConfigInput = {
  slug: "how-do-you-run-a-scene-with-multiple-npcs",
  category: "session-prep",
  publishedAt: "2026-09-14",
  question:
    "How do you run a scene with multiple NPCs without talking to yourself?",
  kind: "framework",
  shortAnswer:
    "Do not perform a screenplay at the table: player characters must remain the camera and the catalyst for every scene. Keep dialogue between non-player characters to brief, purposeful friction beats of one or two sentences, such as an accusation, an interruption, or a sharp contradiction, then immediately pivot to the party with a direct question or prompt. Give each character one visible want in the room, break large gatherings into discrete conversational sub-scenes, and let the players choose who to approach so discovering relationships becomes active gameplay rather than a private monologue.",
  sections: [
    {
      kind: "prose",
      heading: "The players are the camera, not the audience",
      paragraphs: [
        "A common trap for Game Masters in courtrooms, war councils, and taverns is treating the scene like an ensemble film script. The GM speaks for the suspicious baron, switches voices to answer as the stubborn priest, and switches again for the merchant captain. Within two minutes, the players have stopped thinking about what to do and have settled into passively watching the GM hold a conversation with themself.",
        "The fundamental rule for running multiple non-player characters is that NPC dialogue exists only to frame a choice for the party. A GM should rarely speak more than two sentences as one character before an interruption, a disagreement, or a direct handoff to the players. The moment two characters clash, they should drag the party into the argument as judges, witnesses, or arbiters.",
      ],
    },
    {
      kind: "list",
      heading: "Techniques for managing crowded rooms",
      intro:
        "Five practical techniques keep scenes with multiple characters playable without demanding five distinct theatrical voices:",
      items: [
        {
          term: "One immediate want per character",
          text: "Do not try to establish full backstories in a crowded hall. Give each character one clear, urgent objective for this specific gathering: obtaining an endorsement, discrediting a rival, or securing passage out of town. That single motive dictates their posture, their patience, and how they react when the party speaks to them.",
        },
        {
          term: "Direct dialogue back to the party",
          text: "Whenever two characters clash, have one turn to the players to enlist their support, demand proof, or seek an ally. This instantly converts NPC-to-NPC friction into an active player decision rather than an ongoing monologue.",
        },
        {
          term: "Use sharp conflict beats",
          text: "Deliver interactions between characters as quick punctuations: a flat denial, a pointed correction, a dropped wine glass, or a loaded silence. A single interrupted sentence tells the players more about courtly hierarchy than three minutes of scripted debate.",
        },
        {
          term: "Reveal facts through contradiction",
          text: "Rather than giving a neutral briefing, let two characters state conflicting assertions about the same event. When the magistrate claims the eastern gate is secure and the guildmaster quietly mutters that three wagons went missing there yesterday, the players have an immediate mystery to investigate.",
        },
        {
          term: "Introduce secondary cast in stages",
          text: "Avoid dropping seven named figures into the same conversation. Present the primary contact first, let the players establish their footing, and introduce seconds, advisers, or rivals only when the initial discussion requires an escalation or a complication.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Break grand gatherings into playable sub-scenes",
      paragraphs: [
        "An entire banquet, council, or ball fails when treated as a single continuous dialogue block. Real gatherings naturally divide into distinct social spaces and stages: arrival at the courtyard, mingling by the refreshment tables, formal seating, side conversations on a balcony, and private audiences behind closed doors.",
        "By moving the party between these smaller sub-scenes, the GM only ever needs to run two or three characters at any given moment. Crucially, let the players choose who to approach first. Choosing whether to seek out the disgraced knight or the suspicious merchant makes social navigation a core tactical choice for the party.",
      ],
    },
    {
      kind: "example",
      heading: "Worked scenario: the winter council",
      paragraphs: [
        "The party arrives at Highcliff Castle where Duke Valen, Commander Ren, and Guildmistress Serra are debating whether to open the granaries during a siege.",
      ],
      items: [
        {
          term: "The weak approach: scripted monologue",
          text: "The GM spends five minutes performing Duke Valen pleading for order, Commander Ren bellowing about military rations, and Guildmistress Serra threatening a strike. The players sit quietly, waiting for the characters to finish arguing so they can find out what their quest is.",
        },
        {
          term: "The strong approach: catalyst framework",
          text: "The GM describes the tension in one sentence: Commander Ren stands by the shuttered windows in full armour while Guildmistress Serra refuses to sit. Ren barks: 'Three weeks of wheat remain, and half of that belongs to the garrison.' Serra snorts: 'Tell that to the rioters outside.' Ren turns squarely to the party: 'You rode through the outer wards an hour ago. Tell the council what you saw.'",
        },
        {
          term: "Why it works",
          text: "The scene establishes the conflict in twenty seconds without self-dialogue. The players are placed immediately in the witness seat, forced to take a public stand between two powerful figures whose motives are already obvious.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Prep checklist for multi-character encounters",
      intro:
        "Review these four checks before running a room with three or more active figures:",
      items: [
        "Every character present has exactly one concrete objective for this specific scene.",
        "You have identified which character will turn to the players first and what question or demand they will ask.",
        "The physical space includes at least two distinct sub-areas, such as a gallery, hearth, or side corridor, where private conversations can happen.",
        "You have prepared at least one factual contradiction between two characters for the party to catch or untangle.",
      ],
    },
  ],
  systemsThatSupportThis: [
    {
      system: "Apocalypse World",
      rationale:
        "The GM principle of asking what do you do after every dramatic move keeps player characters at the centre of multi-party disputes instead of resolving NPC conflicts in isolation.",
      href: "http://apocalypse-world.com/",
    },
    {
      system: "A Song of Ice and Fire Roleplaying",
      rationale:
        "The Intrigue system formalises multi-participant debates into structured rounds of influence and disposition shifts that require player engagement to sway neutral or opposed factions.",
      href: "https://greenroninstore.com/collections/a-song-of-ice-and-fire-roleplaying",
    },
    {
      system: "Vampire: The Masquerade",
      rationale:
        "Elysium protocol rules and Social Combat mechanics translate rival vampire factions into opposing status claims where player coteries must actively negotiate or exploit public insults.",
      href: "https://www.renegadegamestudios.com/vampire-the-masquerade",
    },
  ],
  codexConnection: {
    heading: "Connecting multi-NPC scenes to your campaign graph",
    paragraphs: [
      "Running crowded scenes without talking to yourself relies on having clear, asymmetric relationships prepared before the session begins. When you know who owes a debt to whom, which delegate is blackmailed, and which faction wants an outcome to fail, you do not need to improvise long conversations to convey social gravity.",
      "Codex Cryptica maps these relationships as directed links between entities and factions. You can pull up a council chamber or courtly roster on the spatial canvas, check each character's single immediate want at a glance, and run political encounters where every NPC action is a direct prompt for the players.",
    ],
    linkText: "Explore the campaign knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "Council vote generator",
      description:
        "Generate factions, delegate stances, swing votes, and political leverage for court or senate meetings.",
      href: "/generators/council-vote",
    },
    {
      title: "NPC generator",
      description:
        "Generate quick personalities, visible wants, and immediate social hooks for crowded rooms.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Establish conflicting goals, leverage, and assets between competing organisations before scenes begin.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for conspiracy campaigns",
      description:
        "Intrigue-heavy campaigns where competing factions, handlers, and courtly factions collide.",
      href: "/for/conspiracy",
    },
  ],
  relatedAnswers: [
    "how-do-you-organise-npc-relationships",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-improvise-npcs-on-the-spot",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "how-do-you-track-faction-turns-between-rpg-sessions",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-you-run-a-conspiracy-campaign",
    "how-do-you-create-a-fantasy-faction",
  ],
  discovery: {
    id: "answer-run-scene-multiple-npcs",
    parentCluster: "session-prep",
    primaryIntent:
      "how do you run a scene with multiple npcs without talking to yourself",
    intentAliases: [
      "how do i roleplay multiple npcs in one scene",
      "how do i run a council scene in an rpg",
      "how do i avoid talking to myself as the gm",
      "how do i introduce several npcs at once",
      "how do i run court politics without overwhelming players",
    ],
    uniqueValue:
      "Provides the camera-and-catalyst framework to run multi-NPC council and court scenes through short friction beats, factual contradiction, and sub-scenes without GM monologues.",
    relatedIntents: [
      "answer-npc-relationships",
      "solution-rpg-knowledge-graph",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-zero",
        reason:
          "Both sit in the session-prep cluster, but session zero addresses campaign alignment before play begins, while this answer provides mid-session GM techniques for running crowded multi-NPC encounters.",
      },
      {
        with: "answer-session-engagement",
        reason:
          "Both address table engagement during play, but this answer specifically tackles the logistical challenge of running multiple non-player characters in a single scene without GM monologues.",
      },
    ],
  },
  seo: {
    title: "How to Run Multiple NPCs in One Scene | Codex Cryptica",
    description:
      "How to run scenes with multiple NPCs without talking to yourself: the camera-and-catalyst framework, contradiction beats, sub-scenes, and table-ready prep.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-a-scene-with-multiple-npcs.jpg",
    imageAlt:
      "Tabletop RPG adventurers and faction delegates gathered around a map-strewn council table in tense debate",
  },
};

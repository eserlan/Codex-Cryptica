import type { AnswerConfigInput } from "../schema";

export const doesAnRpgPartyNeedBalancedRoles: AnswerConfigInput = {
  slug: "does-an-rpg-party-need-balanced-roles",
  category: "running-the-game",
  publishedAt: "2026-10-26",
  question: "Does an RPG party need balanced roles?",
  kind: "framework",
  shortAnswer:
    "No. A tabletop RPG party does not need a set list of roles such as a frontline fighter, a healer and a damage dealer. What matters is what the characters can actually do together, what your chosen system expects them to handle, and whether the campaign gives their strengths room to matter while their gaps create interesting problems rather than repeated frustration. An unbalanced RPG party, including one with no healer, no tank or all spellcasters, can work well when the Game Master (GM) prepares situations around the party that exists instead of punishing it for not matching a template.",
  sections: [
    {
      kind: "prose",
      heading: "Balanced means different things in different games",
      paragraphs: [
        "The tank, healer and damage dealer pattern comes largely from video games built around repeated combat encounters with fixed jobs. Some tabletop games use similar expectations, especially games with detailed combat, distinct classes and healing tied to particular abilities. Many others do not. A game centred on investigation, travel, diplomacy or horror may barely use those categories, and a character who looks like a gap on a class list may be well suited to the campaign you are actually running.",
        "Party composition is therefore a question about fit, not about filling slots. Four spellcasters are not automatically a broken party, and a group with one of everything is not automatically a good one. Ask what the system rewards, what the campaign will repeatedly ask the party to do, and what the players enjoy doing. If those three answers line up reasonably well, an unconventional party is usually playable without anyone changing character.",
      ],
    },
    {
      kind: "list",
      heading: "Assess what the party can do, not which classes it has",
      intro:
        "Read the character sheets for capabilities rather than labels. Note how the group as a whole handles each area, including through equipment, contacts and shared resources:",
      items: [
        {
          term: "Survive and get away",
          text: "Can the party endure harm, avoid it, break contact or retreat when a fight goes badly? A group with no frontline fighter may still cope well if it can control distance, use cover, negotiate or leave.",
        },
        {
          term: "Recover between scenes",
          text: "How do injuries, exhaustion, spent spells and other limited resources come back in your system? Note whether recovery needs a particular character, a safe place, time, money or supplies, because that decides how hard you can press the party between rests.",
        },
        {
          term: "Find and interpret information",
          text: "Can the group research, search, question people, read records and make sense of what it finds? Several characters with overlapping knowledge can still differ in sources, methods and blind spots.",
        },
        {
          term: "Deal with people",
          text: "Can someone talk, bargain, persuade, deceive, command or perform when the party needs access or agreement? Social strength matters in most campaigns, even when nobody has chosen a formal envoy or face role.",
        },
        {
          term: "Solve practical problems",
          text: "Can the party repair, build, operate, heal, identify or magically alter the things the campaign puts in front of it? Technical and magical problem solving often decides whether a missing specialist is a real obstacle or a minor delay.",
        },
        {
          term: "Move and confront",
          text: "Can the group travel, climb, sneak, chase, hold a position or force a confrontation when it chooses one? Mobility and confrontation cover how the party reaches problems and how it acts when talking or sneaking is no longer enough.",
        },
      ],
      outro:
        "A gap only matters relative to a demand. If the campaign will never ask the party to repair a starship, a missing engineer is background colour. If every session depends on it, that demand shapes what the campaign can fairly ask of this party. Write down the two or three capabilities your next few sessions will genuinely test, and check the party against those rather than against a universal checklist.",
    },
    {
      kind: "prose",
      heading: "Check what your system and campaign actually assume",
      paragraphs: [
        "Systems differ in how much they assume. In Dungeons and Dragons and Tales of the Valiant, combat, healing and limited resources such as spell slots shape how long a party can keep going, and a group with little healing or staying power will feel extended fights and short rests differently from a group built to absorb punishment. In Traveller, particular skills connect directly to running and maintaining a ship, treating injuries and trading, so a missing technical or medical specialist changes what a crew must buy, hire or attempt untrained. In Call of Cthulhu, investigation, language and social access usually carry the scenario, while combat can injure investigators quickly, so a party of academics may suit the game precisely because nobody expects to fight their way through it.",
        "Treat those differences as design information, not as a verdict. A gap that one system shrugs off can end a campaign in another, and the same gap matters more in a campaign about siege warfare than in one about court intrigue. If you are unsure, test the assumption in a low-stakes scene early on and watch where the party stalls, spends heavily or stops having choices. Adjust the campaign demands you control before you ask anyone to rebuild a character.",
      ],
    },
    {
      kind: "list",
      heading: "Prepare situations, not counters",
      intro:
        "Aim for challenges that respond to the party in front of you without cancelling what makes it distinctive:",
      items: [
        {
          term: "Let the shared strength solve real problems",
          text: "If the party is rich in magic, research or talk, build scenes where that strength wins access, time or safety. Players chose those characters to use those abilities, so the campaign should regularly show the choice paying off.",
        },
        {
          term: "Make gaps cost something specific",
          text: "Where a workable alternative fits the fiction, let a missing capability create a price, delay, risk or extra step rather than stopping the campaign: without a healer, treatment may need a clinic, a favour or a longer recovery, and without a scout, the party may arrive later or noisier. That only holds where help, equipment or another method is plausibly available. With no money, no contact and no usable route at a remote place, a particular task may be unattainable for now, and postponing, abandoning or replacing that objective is legitimate play. Avoid making continued campaign play hinge on the single unavailable capability.",
        },
        {
          term: "Vary the demand across sessions",
          text: "Rotate what a session tests so the same weakness is not the obstacle every week. A party that struggles in open combat can still face investigation, negotiation, travel and pursuit, with combat as one pressure among several rather than the only measure of success.",
        },
        {
          term: "Use ground, goals and timing",
          text: "Give encounters an objective beyond defeating everyone present: hold a doorway until a ritual finishes, reach a boat, protect a witness, or leave before reinforcements arrive. Terrain, cover, distance and deadlines let a fragile party win by positioning and choices instead of by absorbing damage.",
        },
        {
          term: "Show the danger before it lands",
          text: "Let players see that a corridor is watched, a hull is damaged or a creature is too dangerous to face directly. Fair warning turns a weakness into a planning problem the players can answer, rather than a surprise punishment for their character choices.",
        },
        {
          term: "Avoid the universal counter",
          text: "Do not answer an all spellcaster party with magic-resistant enemies in every room, or a diplomatic crew with opponents who can never be spoken to. A counter that appears once teaches the party to adapt. The same counter every session tells the players their characters were a mistake.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Fantasy example: four spellcasters and no frontline",
      paragraphs: [
        "Four players independently choose wizards and sorcerers for a fantasy campaign in Dungeons and Dragons or Tales of the Valiant. Nobody has chosen a dedicated healer or frontline fighter, and the group cannot absorb much punishment in a prolonged close fight. The GM keeps the characters and changes the situations instead.",
      ],
      items: [
        {
          term: "What the party is good at",
          text: "Arcane knowledge, ranged magic, detection and problem solving at a distance. The GM includes a sealed archive, a warded tomb and a rival mage early, so the players see their shared strength opening options another party would have to force.",
        },
        {
          term: "How a fight is framed",
          text: "Bandits try to seize a bridge toll chest while a cart blocks one end of the bridge. The spellcasters can hold distance, use the cart and railings as cover, target the bandits blocking the far ramp, or bargain from strength. If the bandits close the distance, the party can fall back across the bridge while the bandits turn to secure the chest they came for, which gives the spellcasters a chance to get clear rather than trade blows. Resolve any retreat with the movement and disengaging procedures of the game you are playing. Winning means keeping the chest or getting away intact, not standing in place until every bandit falls.",
        },
        {
          term: "Where the gap still matters",
          text: "Healing is limited and spell slots run out, so the GM watches pacing. Two demanding fights with no chance to rest will drain the party in a way the players can feel, so rests, potions, a temple that offers treatment for a price, and chances to prepare or withdraw become real decisions rather than bookkeeping. One enemy with strong resistance to magic appears as a signalled problem to avoid, outwit or escape, not as the standard opponent from then on.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Science fiction example: a Traveller crew without a specialist",
      paragraphs: [
        "A Traveller crew is strong in combat and diplomacy, with a former Marine and a skilled broker, but nobody has real depth in engineering or medicine. The party composition suits trading and trouble at the starport far better than it suits keeping an ageing ship running between worlds.",
      ],
      items: [
        {
          term: "The situation the players can see",
          text: "After a jump, the engineering panel reports a drive fault that a trained engineer could diagnose properly. The broker can read the starport tariff and knows treatment and berthing will cost money the crew had planned to spend on cargo. A crew member hurt during arrival needs care beyond first aid if they are to recover well.",
        },
        {
          term: "The choices on the table",
          text: "The crew can pay the starport engineering team and accept the delay, hire a temporary engineer for the next leg in return for passage and a share, ask a patron contact to recommend someone trustworthy, or attempt a careful repair untrained and accept the risk and lost time if it goes wrong. The broker can negotiate the price or trade a favour, and the Marine can keep the ship secure while work is done. Each route costs credits, time or obligation in a different way.",
        },
        {
          term: "Why it stays interesting",
          text: "At this starport, where paid help and contacts are available, the missing specialist becomes a recurring decision about money, trust and self-reliance that fits a trading campaign, and the crew strengths the players did choose keep shaping how they solve it.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Investigative horror example: academics in Call of Cthulhu",
      paragraphs: [
        "Three Call of Cthulhu investigators are a professor, a librarian and a journalist. None is a combat specialist, and none would last long in a fair fight. For an investigation built around records, interviews and a place the town would rather forget, that is a workable party rather than a failed one.",
      ],
      items: [
        {
          term: "Play to the investigation",
          text: "The professor reads the parish history and recognises a changed name. The librarian finds the missing newspaper issue through a colleague. The journalist persuades a retired ferryman to talk, on condition his name stays out of print. Each success comes from the expertise the players actually chose, and each one gives the group a decision about what to do with the information.",
        },
        {
          term: "Keep physical danger honest and escapable",
          text: "When something in the boathouse moves, the investigators can barricade the door, run for the lane, or drop the lantern and use the confusion to get away. The GM has shown the lane, the door and the unstable floorboards before the threat appears, so escape is a choice the players prepared rather than a rescue. If they choose to confront it directly, injury and worse remain possible, because the game treats that danger seriously.",
        },
        {
          term: "What the GM does not do",
          text: "The scenario does not suddenly require the group to win a gunfight to learn the truth, and nobody is handed a soldier character to fix the party. Vulnerability supports the horror here, provided the investigators can still investigate, choose their risks and leave a scene that has turned against them.",
        },
      ],
    },
    {
      kind: "list",
      heading: "When characters overlap, make the differences count",
      intro:
        "Two characters with similar abilities do not need identical scenes. Separate them by what they care about and how they work:",
      items: [
        {
          term: "Different priorities",
          text: "Two spellcasters may share a school of magic and still disagree about whether to spend it on safety, speed or spectacle. Give them choices where that difference decides the plan.",
        },
        {
          term: "Different methods and sources",
          text: "One investigator trusts archives, another trusts people. One engineer repairs properly, another keeps things running with borrowed parts. The same capability reached by a different route creates different costs and different follow-up scenes.",
        },
        {
          term: "Different relationships",
          text: "Contacts, obligations, reputations and old promises make similar characters useful in different places. The character the temple trusts and the character the dockworkers trust can both talk, and still open different doors.",
        },
        {
          term: "Shared spotlight by decision, not by roll",
          text: "Let overlapping characters combine their efforts, check each other's work, or take turns leading according to the stakes of the scene. Ask the players how they want to divide familiar ground. Some groups enjoy playing near identical specialists and comparing approaches, and that enjoyment is a reason to keep the overlap rather than correct it.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When to pause and talk about expectations",
      paragraphs: [
        "Most unconventional parties need situation design, not intervention. Pause for a conversation when the mismatch is between what the campaign promises and what the party can repeatedly do. A campaign sold as gruelling dungeon survival will frustrate a party with no recovery and no way to retreat. A ship campaign will stall if nobody can crew the ship and the group has no credits, contacts or interest in hiring help. Those are expectation problems, and they belong in a session zero discussion or a shorter talk between sessions, not in a surprise encounter designed to prove the point.",
        "Start from what the players want to keep. Ask which parts of their characters they are attached to, what kind of scenes they hoped those choices would produce, and which gap feels like a problem to them rather than only to you. In-world answers usually work better than character rewrites: a reliable contact who can treat injuries, equipment that covers a narrow task, a hireable engineer for one voyage, or a safer base between expeditions. Price those options in money, time, obligation or risk so they support play instead of replacing the party. Offer a new or retrained character only when a player wants one. A permanent GM-controlled healer who travels with the party and solves the missing role tends to take decisions away from the players, and quietly lowering the difficulty of every encounter teaches the group that its weaknesses will never matter. Use neither as the default fix.",
      ],
    },
    {
      kind: "checklist",
      heading: "A short check before the next session",
      items: [
        "Which two or three capabilities will the next few sessions actually test, and how does this party handle each one?",
        "Where will the party's shared strength visibly succeed, so the players feel the benefit of the characters they chose?",
        "If a gap matters, what does it cost in time, money, risk or obligation, if a workable alternative exists here?",
        "Have I signalled the dangers this party is poorly suited to face, and left a way to avoid, escape or reframe them?",
        "Am I varying what sessions demand, or testing the same weakness every week?",
        "For overlapping characters, what differs in priority, method or relationship, and have I asked the players how they want to share that ground?",
        "If the campaign promise and the party capabilities no longer match, have I planned a conversation about expectations instead of a punitive encounter?",
      ],
    },
  ],
  codexConnection: {
    heading: "Test an encounter against the party you have",
    paragraphs: [
      "When preparing for an unconventional party, use the encounter generator to draft a situation, then check its opponents, ground and objectives against the capabilities you identified above. Add relevant strengths and gaps in Additional Context. The generator does not validate party composition or guarantee encounter difficulty; review the result using your system’s rules.",
    ],
    linkText: "Try the encounter generator",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "RPG encounter generator",
      description:
        "Draft opponents, ground and an objective to adapt for a party with an unusual mix of strengths and gaps.",
      href: "/generators/encounter",
    },
  ],
  relatedAnswers: [
    "how-do-i-get-my-rpg-party-to-work-together",
    "how-do-i-give-specialist-characters-spotlight",
    "how-do-i-run-common-character-roles-in-a-fantasy-rpg",
    "how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
    "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
    "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    "how-do-i-run-a-successful-session-0",
  ],
  discovery: {
    id: "answer-balanced-party-roles",
    parentCluster: "specialist-roles",
    clusters: ["specialist-roles", "session-prep"],
    primaryIntent: "does an rpg party need balanced roles",
    intentAliases: [
      "does an rpg party need balanced roles",
      "unbalanced rpg party what to do",
      "rpg party with no healer",
      "rpg party with no tank",
      "all spellcasters party",
      "rpg party composition advice",
      "what if my rpg party has no fighter",
      "how to gm a party with missing roles",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A system-neutral capability audit for judging party composition without requiring tank, healer and damage roles, with situation design that keeps strengths and gaps meaningful and three worked examples in fantasy, science fiction and investigative horror.",
    relatedIntents: [
      "answer-party-cohesion",
      "answer-specialist-character-spotlight",
      "answer-fantasy-character-roles",
      "answer-sci-fi-character-roles",
      "answer-character-roles-investigative-horror",
      "answer-encounter-balance",
      "answer-session-zero",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-party-cohesion",
        reason:
          "The party cohesion answer covers shared stakes, cooperation and group decisions during play. This answer covers whether the party capabilities match the system and campaign, and how to design situations around missing or overlapping capabilities.",
      },
      {
        with: "answer-specialist-character-spotlight",
        reason:
          "The specialist spotlight answer covers sharing attention when one character dominates a scene. This answer covers the wider composition question, including parties where several characters share a strength or a common capability is absent.",
      },
      {
        with: "answer-fantasy-character-roles",
        reason:
          "The fantasy roles answer explains how to run nine fantasy archetypes in shared scenes. This answer asks whether any set of archetypes is required at all, and how to judge the mix across fantasy, science fiction and horror systems.",
      },
      {
        with: "answer-sci-fi-character-roles",
        reason:
          "The science fiction roles answer explains how to run crew functions in shared operations. This answer uses a science fiction example to show how a missing function becomes a hiring and cost decision rather than a requirement to change character.",
      },
      {
        with: "answer-character-roles-investigative-horror",
        reason:
          "The investigative horror roles answer explains how to run seven horror archetypes around clue flow and danger. This answer uses an academic horror party to show when a lack of combat strength suits the intended game instead of breaking it.",
      },
      {
        with: "answer-handle-divination-magic-without-solving-every-mystery",
        reason:
          "The divination answer covers one spellcaster ability that can bypass mystery play. This answer covers the wider party composition question across systems and genres. The audit overlap is the generic word with.",
      },
    ],
  },
  seo: {
    title: "Does an RPG party need balanced roles? | Codex Cryptica",
    description:
      "An unbalanced RPG party with no healer, no tank or all spellcasters can work. Assess capabilities, adjust situations fairly, and use three genre examples.",
    image:
      "https://assets.codexcryptica.com/og/does-an-rpg-party-need-balanced-roles.jpg",
    imageAlt:
      "Four spellcasters plan a route around a map on a stone table in a highland ruin at golden hour",
  },
};

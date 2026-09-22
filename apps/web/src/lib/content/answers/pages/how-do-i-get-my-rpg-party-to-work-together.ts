import type { AnswerConfigInput } from "../schema";

export const howDoIGetMyRpgPartyToWorkTogether: AnswerConfigInput = {
  slug: "how-do-i-get-my-rpg-party-to-work-together",
  category: "session-prep",
  publishedAt: "2026-09-22",
  question: "How do I get my RPG party to work together?",
  kind: "framework",
  shortAnswer:
    "Give the characters a reason to stay together, situations where combining their strengths helps, and decisions whose outcomes affect the whole group. First work out whether the trouble comes from the fiction, unclear player expectations, or one person dominating decisions; talk with the players when it is a table issue, and use shared objectives and consequences when the characters simply lack ties.",
  sections: [
    {
      kind: "prose",
      heading: "Find out what is pulling the group apart",
      paragraphs: [
        "A party that argues over a route may need a fair way to decide. Characters who have no reason to remain together need a shared stake. Players who want different kinds of campaign need a conversation about expectations. These can look alike during a session, but the response depends on the cause: conversation addresses table problems, while encounter design addresses a lack of shared stakes in the fiction.",
        "Notice the repeated pattern before changing the adventure. Are the characters strangers with separate goals? Do players know how to set one another up? Does one voice settle every choice? Is someone being ignored or disrespected? Disagreement is not itself a problem; it becomes one when the group cannot make a decision or a player no longer wants to take part.",
      ],
    },
    {
      kind: "list",
      heading: "Build reasons and opportunities to cooperate",
      intro: "Use the tool that matches what you observed:",
      items: [
        {
          term: "Give them a shared stake",
          text: "Connect the characters through a purpose, responsibility, common danger, patron, debt, promise, or person they all care about. Ask the players to help choose the connection so it gives them something to play with rather than a contrived bond they must accept.",
        },
        {
          term: "Let strengths combine",
          text: "Present situations where one character can create an opening another uses: a distraction that aids an infiltration, research that gives a negotiator influence, or a defended position that buys an ally time. Leave several valid plans open, and let the benefit of helping be visible.",
        },
        {
          term: "Put a shared choice in front of them",
          text: "Ask the group which ally to support, which route to risk, or what to do with a scarce resource. Give them enough information to decide and make the consequence matter to everyone. Avoid five unrelated leads that invite each character to leave alone.",
        },
        {
          term: "Give relationships room to form",
          text: "Ask what one character admires, distrusts, or owes another. Bring shared NPCs and past favours back into play, and leave space for characters to help each other in quiet scenes as well as combat.",
        },
        {
          term: "Notice helpful play",
          text: "Give attention to the player who shares information, protects an ally, follows through on a group plan, or makes space for someone else. Acknowledgement and a useful consequence can reward cooperation without adding a new rule.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When a conversation is the right tool",
      paragraphs: [
        "If the same player keeps overriding the group, someone is being disrespected, or players expected different kinds of game, pause the fiction and talk privately or together, as appropriate. You might say: “Your characters can disagree, but everyone at this table needs to help the group make decisions and leave room for each other.” Ask what each person wants from the campaign and agree on a workable way to decide when views differ.",
        "Do not use a harder fight to teach teamwork. Greater danger can make a tense argument worse, and character conflict does not prove that the players are in conflict. If you introduce a challenge, give the group options and let them choose how closely their characters cooperate.",
      ],
    },
    {
      kind: "list",
      heading: "A recipe for a cooperative scenario",
      intro:
        "Use these ingredients as a prompt, not a formula every session must follow:",
      items: [
        {
          term: "One shared objective",
          text: "Make clear what the group can accomplish together.",
        },
        {
          term: "Several useful strengths",
          text: "Include different ways to contribute, with no single character holding the only solution.",
        },
        {
          term: "A group consequence",
          text: "Let success or failure change something the whole party values.",
        },
        {
          term: "A joint decision",
          text: "Give the players a real choice about risk, trust, time, or a limited resource.",
        },
        {
          term: "More than one plan",
          text: "Prepare pressures and possible outcomes rather than a required sequence of actions.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Fixes that tend to make things worse",
      items: [
        {
          term: "Do not punish one character to teach the group",
          text: "Targeting a player with a loss or humiliation rarely gives the others a useful reason to cooperate.",
        },
        {
          term: "Do not force one correct plan",
          text: "Leave room for the players to choose an approach, including one you did not prepare.",
        },
        {
          term: "Do not rely on capture to make a party",
          text: "Being imprisoned together can start a scene, but it does not create trust or a lasting reason to stay together by itself.",
        },
        {
          term: "Do not treat character conflict as player conflict",
          text: "Ask what is happening at the table before deciding that the players themselves are not getting along.",
        },
        {
          term: "Do not require every character in every challenge",
          text: "Let some scenes suit a few characters while keeping the group's larger stakes in view.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Turn separate leads into a shared problem",
      paragraphs: [
        "The group has five capable characters, but they keep splitting up whenever a new rumour appears.",
      ],
      items: [
        {
          term: "The scattered version",
          text: "Each character receives a different rumour and pursues it alone. The players compare notes only after several scenes, by which point each thread has become a separate task and the group has little reason to plan together.",
        },
        {
          term: "The connected version",
          text: "The same rumours point to one threat due to hit the harbour at dawn: a missing pilot, strange cargo, a paid-off watch officer, and a light seen on the breakwater. No clue explains the whole scheme. The party can divide research briefly, then must share what they learn and choose whether to warn the harbourmaster or intercept the ship. If they delay, the first warehouse burns and the harbour closes.",
        },
        {
          term: "Why it works",
          text: "Each character can act on a lead, but information becomes more useful when brought back to the group. The deadline creates a shared consequence, while the players still choose their plan and which risk to accept.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before the next session",
      intro: "Check the source of the friction before you change the scenario:",
      items: [
        "Can the characters name a reason they choose to stay together?",
        "Can at least two different strengths contribute to the next shared problem?",
        "Is there a decision that affects the group, with enough information to discuss it?",
        "Have I left more than one workable plan open?",
        "Is one player being crowded out, or do the players need to agree on expectations?",
        "Am I rewarding useful help, or only making the opposition more dangerous?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep shared ties and stakes visible",
    paragraphs: [
      "A campaign graph can help you keep the shared patron, threatened ally, faction pressure, and character connections in view between sessions. Codex Cryptica's NPC and faction generators can help supply a common contact or source of pressure when the group needs one; the players still decide which ties matter to their characters.",
    ],
    linkText: "Create a shared contact with the NPC generator",
    href: "/generators/npc",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Create a patron, dependent, rival, or ally who gives the group a shared stake.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Build an outside pressure that gives the party a reason to coordinate.",
      href: "/generators/faction",
    },
  ],
  relatedAnswers: [
    "how-do-i-run-a-successful-session-0",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "how-do-you-handle-players-going-off-script-as-a-gm",
  ],
  discovery: {
    id: "answer-party-cohesion",
    parentCluster: "session-prep",
    primaryIntent: "how to get an rpg party to work together",
    intentAliases: [
      "how do i encourage teamwork in an rpg",
      "what to do when players will not cooperate",
      "how to bring an rpg party together",
      "how to make player characters care about each other",
      "why does my rpg party keep arguing",
      "how to stop an rpg party splitting up",
    ],
    uniqueValue:
      "Diagnoses whether party friction comes from character ties, player expectations, decision control, or scenario design, then matches each cause to a practical response. It combines a reusable cooperative-scenario recipe with a worked example while preserving player choice.",
    relatedIntents: [
      "answer-session-zero",
      "answer-player-engagement",
      "answer-players-going-off-script",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-large-group-dnd",
        reason:
          "Both mention group decisions, but the large-group answer addresses pacing and spotlight at a crowded table; this answer addresses cooperation and shared stakes for parties of any size. The audit overlap is the generic phrase 'players up'.",
      },
      {
        with: "answer-session-zero",
        reason:
          "Session 0 covers campaign setup and initial character connections; this answer addresses diagnosing and improving cooperation during an ongoing game.",
      },
      {
        with: "answer-player-engagement",
        reason:
          "Player engagement covers investment in the campaign world; this answer focuses on party cohesion, group decisions, and collaborative play between characters.",
      },
    ],
  },
  seo: {
    title: "How do I get my RPG party to work together? | Codex Cryptica",
    description:
      "Diagnose why an RPG party struggles to cooperate, then build shared stakes, useful teamwork, group decisions, and a scenario that leaves players in control.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-get-my-rpg-party-to-work-together.jpg",
    imageAlt:
      "Four adventurers share clues and plan together around a map in a candlelit room",
  },
};

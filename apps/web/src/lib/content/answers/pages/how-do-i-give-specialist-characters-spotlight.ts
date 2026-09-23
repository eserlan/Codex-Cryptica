import type { AnswerConfigInput } from "../schema";

export const howDoIGiveSpecialistCharactersSpotlight: AnswerConfigInput = {
  slug: "how-do-i-give-specialist-characters-spotlight",
  category: "session-prep",
  publishedAt: "2026-09-23",
  question:
    "How do I give specialist characters spotlight without sidelining the party?",
  kind: "framework",
  shortAnswer:
    "Spotlight means giving one character a distinctive contribution, not a separate game. Let the specialist use their expertise to change the situation, then give the whole party a meaningful response to that change. Build scenes with shared stakes, intersecting ways to contribute, and decisions that need more than one character's judgement. A brief solo moment can work when it has a clear purpose and returns useful information or a consequential choice to the group.",
  sections: [
    {
      kind: "prose",
      heading: "Spotlight is attention, not isolation",
      paragraphs: [
        "A specialist often has abilities that invite a scene built around one character: tracing a network intrusion, questioning a witness, presenting a case at court, or slipping past a guard. The imbalance starts when everyone else can only wait for the specialist to finish. This can happen even when the specialist player is trying to be considerate; the adventure has made their skill the only route forward.",
        "A useful scene gives the specialist a moment to do something distinctive, then makes the result matter to the group. Their skill might reveal a vulnerability, identify a suspect, or win an audience. The rest of the party can then choose how to use that opening, protect it, challenge its cost, or deal with the response. Keep the expert's competence real, while making sure the problem has more than one meaningful point of contact.",
        "Watch for repeated waiting, decisions that only one character can make, and discoveries that arrive too late for anyone else to act on. Those are signs to change the scene structure, not to make the specialist less capable.",
      ],
    },
    {
      kind: "list",
      heading: "Use a shared spotlight loop",
      intro:
        "Bring the result back to the table, then return to the specialist when it creates a new choice for them:",
      items: [
        {
          term: "The specialist acts",
          text: "Let them do something distinctive that shows why their niche matters.",
        },
        {
          term: "The situation changes",
          text: "Reveal access, information, leverage, danger, or an opportunity.",
        },
        {
          term: "Others respond",
          text: "Give another character room to act, protect, challenge, exploit, or redirect the opening.",
        },
        {
          term: "The party decides",
          text: "Let the group choose together which risk or consequence to accept.",
        },
        {
          term: "Return to the specialist",
          text: "When the changed situation gives them a new meaningful choice, put the focus back on their expertise.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Scene patterns that share the action",
      intro:
        "Choose a pattern that fits the situation. Equal spotlight does not mean every character acts or rolls in every scene, gets an equivalent version of the specialist's ability, or receives identical screen time. Keep the specialist's niche theirs, give others meaningful choices, and bring the result back to shared play.",
      items: [
        {
          term: "Open the door, then pass the choice",
          text: "The specialist creates access or reveals an opportunity, but the group decides what to do with it. A hacker finds a hidden account; the crew must decide whether to expose it, exploit it, or warn the person it implicates.",
        },
        {
          term: "Run parallel objectives",
          text: "While one character handles the specialist task, give others active work under the same pressure, then connect the results through a shared clock, consequence, information, access, or decision. An investigator interviews the archivist as an ally watches the exit and another checks whether a rival is removing evidence; what they learn or notice changes what the investigator can ask or risk. Parallel scenes work when one character's result changes another character's options, not when they become separate mini-games. Cut between actions rather than making the table wait for a long resolution.",
        },
        {
          term: "Make different strengths change the same problem",
          text: "Give the group a shared objective with distinct approaches. At a diplomatic reception, the courtier negotiates access, the spy spots who is listening, and the journalist decides what can safely be published. Each contribution changes what the others can risk.",
        },
        {
          term: "Share the cost and consequence",
          text: "Let the specialist's success affect relationships, resources, safety, or reputation that the whole party cares about. The expert still owns the moment of skill, while the group has reason to discuss what the result means.",
        },
        {
          term: "Keep necessary solo scenes short and porous",
          text: "Sometimes only one character can take an action. State what is at stake, resolve the uncertain part, and return to the table with information or a choice. If the scene will take longer, ask the other players what their characters do in the meantime and cut between them.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep competence meaningful without making it a bottleneck",
      paragraphs: [
        "Do not solve spotlight imbalance by making the specialist fail at the thing their character is built to do. Let expertise produce a real advantage: a cleaner route, better information, a safer approach, or a choice others would not have. The tension can come from what the party does with that advantage, what it costs, or who notices.",
        "A particular scene can genuinely require the specialist; preserving their niche does not mean every obstacle needs a substitute route. The campaign should not depend on one character always being present or succeeding at one roll, though. If they are absent or fail, prepare another route forward with a greater cost, delay, uncertainty, or risk.",
        "Support does not mean giving everyone a weaker copy of the specialist's task. The hacker owns the intrusion while the crew handles physical access and security; the investigator owns specialist analysis while others bring context, access, or action; the diplomat owns negotiation leverage while others create facts, pressure, guarantees, or consequences.",
        "Ask about the spotlight each player enjoys: how often they want it, whether private scenes suit them, how they feel about players knowing what their characters do not, and whether they like leading decisions or supporting others.",
      ],
    },
    {
      kind: "example",
      heading: "The breach that becomes a crew decision",
      paragraphs: [
        "The party needs proof that a corporate security chief is selling access codes. The hacker can trace the sale through a maintenance network, but the rest of the group has no reason to sit out the investigation.",
      ],
      items: [
        {
          term: "The bottleneck version",
          text: "The GM runs the hacker through a series of private checks and describes several screens of logs. The other players wait. When the hacker finally finds a name, the scene is over and the group is told what happened.",
        },
        {
          term: "The shared-stakes version",
          text: "The hacker identifies the account and finds a live transfer scheduled during the gala. At the same time, the security chief's aide approaches the party's journalist, and the group's infiltrator notices a guard heading for the server room. The hacker explains the choice: copy the evidence and risk detection, interrupt the transfer and alert the chief, or let it proceed to identify the buyer. The party chooses its approach and divides the work. If they hesitate, the transfer completes and the buyer learns someone is watching.",
        },
        {
          term: "Why it works",
          text: "The hacker's expertise reveals an opportunity the others could not find, but the information arrives while there is still time to act. Each character has a useful role, and the consequence belongs to the whole group rather than ending with a private success roll. In a fantasy court, a diplomat might instead win an audience, leaving the party to decide what promise or risk they can accept.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you prepare a specialist scene",
      items: [
        "What can the specialist do here that feels specific to their character?",
        "What changes in the situation when that action succeeds, partially succeeds, or goes wrong?",
        "Can another character help, protect the specialist, pursue a parallel objective, or act on the result?",
        "Will useful information reach the group while there is still a decision to make?",
        "If this needs a solo scene, what is its purpose and how will you return to the group?",
        "Can this scene depend on the specialist while the campaign still has another route forward if they are absent or fail, at a cost, delay, or added risk?",
        "Have you checked what kind of spotlight the players actually want?",
      ],
    },
    {
      kind: "prose",
      heading: "Apply the loop to each role",
      paragraphs: [
        "The structure stays the same while the specialist's contribution changes: hackers alter systems and security, investigators alter certainty, journalists alter who knows, spies alter access, and diplomats alter agreements and obligations. Each role-specific guide applies this shared framework to its own kind of expertise and the choices it creates for the party.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep character roles connected to campaign stakes",
    paragraphs: [
      "A campaign graph can help you connect a specialist's contacts, evidence, factions, and consequences to the rest of the party's goals. That makes it easier to bring an expert discovery back into shared play without deciding for the players what they should do with it.",
    ],
    linkText: "Explore the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "RPG knowledge graph",
      description:
        "Connect characters, contacts, clues, and factions so specialist discoveries can lead back into the campaign.",
      href: "/solutions/rpg-knowledge-graph",
    },
  ],
  relatedAnswers: [
    "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
    "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "how-do-i-get-my-rpg-party-to-work-together",
    "how-do-you-run-dnd-for-a-large-group-of-players",
    "how-do-i-run-spies-and-infiltrators-in-an-rpg",
    "how-do-i-run-an-investigator-without-sidelining-the-party",
    "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
    "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
  ],
  discovery: {
    id: "answer-specialist-character-spotlight",
    parentCluster: "session-prep",
    primaryIntent:
      "how to give specialist characters spotlight without sidelining the party",
    intentAliases: [
      "how to share spotlight with specialist characters in an rpg",
      "how to run specialist characters without splitting the party",
      "how to stop one rpg character dominating a scene with their special ability",
    ],
    uniqueValue:
      "Gives GMs practical scene structures for letting a specialist's expertise matter while other characters keep making consequential choices. It distinguishes a focused spotlight from isolated solo play and includes a cross-genre worked example and preparation checklist.",
    relatedIntents: [
      "answer-session-engagement",
      "answer-party-cohesion",
      "answer-run-hackers-netrunners",
      "answer-large-group-dnd",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-engagement",
        reason:
          "The session-engagement answer covers pacing and shared spotlight across a session; this answer focuses on the scene-design problem created when one character's specialist ability controls access, information, or action.",
      },
      {
        with: "answer-party-cohesion",
        reason:
          "The party-cohesion answer builds shared stakes and cooperation between characters; this answer addresses how to structure scenes around one specialist without leaving the rest of the party waiting.",
      },
      {
        with: "answer-large-group-dnd",
        reason:
          "The large-group answer handles attention and turn pacing for unusually big tables; this answer is for parties of any size where a specialist role creates a scene bottleneck.",
      },
      {
        with: "answer-run-scene-multiple-npcs",
        reason:
          "The multiple-NPCs answer structures scenes around several non-player characters; this answer structures scenes around a player character's specialist ability and the rest of the party's choices.",
      },
      {
        with: "answer-run-hackers-netrunners",
        reason:
          "This answer gives reusable scene patterns for any specialist; the hacker answer applies that goal to digital intrusions, visible security pressure, and ways the physical crew can affect the hack.",
      },
      {
        with: "answer-run-investigator-without-sidelining-party",
        reason:
          "This answer gives scene patterns for specialists generally; the investigator answer focuses specifically on distributing clues and interpretation while keeping detective expertise meaningful.",
      },
    ],
  },
  seo: {
    title: "How do I give specialist characters spotlight? | Codex Cryptica",
    description:
      "Give specialist RPG characters meaningful spotlight without making the party wait. Use shared stakes, parallel objectives, and focused solo scenes.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-give-specialist-characters-spotlight.jpg",
    imageAlt:
      "An RPG party shares a decision after a specialist uncovers a clue",
  },
};

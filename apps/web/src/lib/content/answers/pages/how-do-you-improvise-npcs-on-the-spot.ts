import type { AnswerConfigInput } from "../schema";

export const howDoYouImproviseNpcsOnTheSpot: AnswerConfigInput = {
  slug: "how-do-you-improvise-npcs-on-the-spot",
  category: "session-prep",
  publishedAt: "2026-09-07",
  question: "How do you improvise NPCs on the spot?",
  kind: "how-to",
  shortAnswer:
    "Improvise an NPC on the spot by fixing five things in the order the table will notice them: role, immediate want, attitude toward the party, one distinguishing behaviour you can repeat every time they speak, and one connection to something already in the campaign. Say the role out loud first so the scene has a name to react to, then let the rest surface through dialogue instead of description.",
  sections: [
    {
      kind: "prose",
      heading: "The problem is speed, not imagination",
      paragraphs: [
        "A party turns down an alley you never planned for and demands to know who runs the place. There is no time to sketch a backstory or roll a full character sheet; the table is waiting. Freezing here usually produces a flat, forgettable stand-in: a nameless guard, a shrug, a scene that goes nowhere.",
        "The fix is not more talent for improvisation. It is a fixed, short order of operations you run the same way every time, so five seconds of thought produces a usable person instead of a blank stare.",
      ],
    },
    {
      kind: "list",
      heading: "The five-beat order",
      intro:
        "Decide these in sequence, out loud if it helps, and stop as soon as the scene can move:",
      items: [
        {
          term: "Role",
          text: "State what this person does before anything else. Dockhand, magistrate's clerk, off-duty guard, rival's cousin. The role tells the players what to expect and gives you a default set of knowledge and limits without further thought.",
        },
        {
          term: "Immediate want",
          text: "What does this NPC want from the current exchange, right now? Not a life goal, a scene goal: to be paid, to be left alone, to pass along a warning before someone sees them talking to you. This is what makes them act instead of just answer questions.",
        },
        {
          term: "Attitude toward the party",
          text: "Pick one word: wary, bored, eager, hostile, amused. This single word sets the tone of voice and body language for the whole exchange and stops the NPC from drifting into a neutral information dispenser.",
        },
        {
          term: "One distinguishing behaviour",
          text: "A single repeatable tic: they count coins twice, they never make eye contact, they answer every question with another question. Use it every time this character speaks. It is what the players will remember and mimic back to you next session.",
        },
        {
          term: "One connection",
          text: "Tie the NPC to something that already exists in the campaign: a faction, a location, a named character, a rumour the party has heard. This is the cheapest way to make an invented character feel like part of the world rather than a prop generated for one scene.",
        },
      ],
    },
    {
      kind: "example",
      heading: "A guard at a checkpoint the party didn't expect",
      paragraphs: [
        "The party tries to bluff their way past a checkpoint that wasn't on the GM's notes. Compare a cold improvisation against the five-beat order.",
      ],
      items: [
        {
          term: "Cold improvisation",
          text: '"Uh, a guard stops you. He asks for your papers." The GM stalls, the guard has no opinion, and the scene resolves on a single skill roll with nothing for the players to push against.',
        },
        {
          term: "Five-beat order applied",
          text: "Role: conscript guard, newly posted. Want: to avoid trouble on his first solo shift. Attitude: nervous. Behaviour: keeps glancing back at the empty guardhouse instead of at the party. Connection: he was posted here after the checkpoint captain went missing last week, the rumour the party heard in town. In under ten seconds the GM has a guard who can be talked down, bribed, or pressed for details on the missing captain.",
        },
        {
          term: "Why it works",
          text: "Each beat answers a different question the players might ask (who are you, what do you want, how do you feel about us, what do you look like, how do you fit in), so the character survives improvised follow-up questions instead of collapsing after the first line.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When to stop and when to write it down",
      paragraphs: [
        "Most improvised NPCs only need the five beats and never come back. If the party latches onto one, decide their name on the spot (a short list kept on an index card saves the pause) and jot the five beats down after the session ends, not during it. Only characters the players choose to return to earn further development; let their engagement decide where your prep time goes rather than guessing in advance.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before you open your mouth",
      intro:
        "Run through this in the two or three seconds before the NPC speaks:",
      items: [
        "Role: what do they do here?",
        "Want: what do they need from this exchange right now?",
        "Attitude: one word describing how they feel about the party.",
        "Behaviour: one repeatable tic you can perform consistently.",
        "Connection: one link to a faction, place, or character already in play.",
      ],
    },
  ],
  codexConnection: {
    heading: "Turning a five-second NPC into a lasting one",
    paragraphs: [
      "An improvised NPC is disposable until the party decides otherwise. Once they do, Codex Cryptica lets you drop the five beats straight into your campaign graph and wire the connection you invented on the spot to a real faction, location, or character node instead of letting it stay a spoken aside.",
      "The NPC generator can also seed a roster of ready-made roles, wants, and mannerisms in advance, so you always have a name and a hook on hand before the party goes somewhere you didn't plan for.",
    ],
    linkText: "Try the NPC generator",
    href: "/generators/npc",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Generate characters with instant motives, distinct mannerisms, and regional hooks.",
      href: "/generators/npc",
    },
    {
      title: "D&D NPC generator",
      description:
        "Tailored NPCs for 5th edition campaigns with personality traits and equipment.",
      href: "/tools/dnd-npc-generator",
    },
    {
      title: "Faction generator",
      description:
        "Create the organisations, guilds, and syndicates your improvised NPCs can belong to.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "Connect NPCs, factions, and campaign notes in one dynamic knowledge graph.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-prep-a-weekly-rpg-session-quickly",
    "how-do-you-organise-npc-relationships",
  ],
  discovery: {
    id: "answer-npcs-improvise-on-the-spot",
    parentCluster: "npc-creation",
    primaryIntent: "how to improvise npcs on the spot",
    intentAliases: [
      "improvise npcs on the spot",
      "how to make up npcs during a session",
      "quick npc improvisation method",
    ],
    uniqueValue:
      "A fixed five-beat sequence (role, immediate want, attitude, one behaviour, one connection) run live during play, distinct from the memorable-NPC page's prep-time framework for characters written ahead of the session.",
    relatedIntents: ["generator-npc", "answer-npcs-memorable"],
    acknowledgedOverlap: [
      {
        with: "answer-npcs-memorable",
        reason:
          "Both cover fast NPC characterisation, but this page is a live, at-the-table improvisation sequence for unplanned characters, while the memorable-NPC page is a prep-time framework applied before the session.",
      },
    ],
  },
  seo: {
    title: "How do you improvise NPCs on the spot? | Codex Cryptica",
    description:
      "Improvise usable RPG NPCs in seconds with a 5-beat method: role, immediate want, attitude, one distinguishing behaviour, and one campaign connection.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-improvise-npcs-on-the-spot.jpg",
    imageAlt:
      "A Game Master gestures mid-sentence at a lamplit table while players lean in, a hand-drawn sketch of an improvised guard NPC propped beside the map",
  },
};

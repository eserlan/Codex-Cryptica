import type { AnswerConfigInput } from "../schema";

export const howDoYouHandlePlayersGoingOffScriptAsAGm: AnswerConfigInput = {
  slug: "how-do-you-handle-players-going-off-script-as-a-gm",
  category: "session-prep",
  publishedAt: "2026-09-09",
  question: "How do you handle players going off script as a GM?",
  kind: "how-to",
  shortAnswer:
    "Handle players going off script by treating your prep as a toolbox rather than a route. Identify what the nearest NPC, faction, or site actually wants, reuse that motivation to improvise the new direction, and let the fiction absorb the consequences instead of steering the party back by force. Reserve a hard pause, calling for a short break to think, for the rare moment a rule, a safety concern, or a genuine plot dead end requires it, not for every deviation from your notes.",
  sections: [
    {
      kind: "prose",
      heading: "Off script is not off the rails",
      paragraphs: [
        "A party ignores the noble's summons and instead follows the wagon driver home. They befriend the bandit captain you built as an obstacle. They decide the haunted mill is not worth the risk and turn back towards the coast instead. None of this breaks the campaign. It only breaks the specific sequence of events you had written down.",
        "The panic most GMs feel in this moment comes from treating prep as a script instead of a stock of parts. A script has one valid next scene. A stock of parts, NPC wants, faction moves, location details, unresolved threats, can be reassembled into whatever direction the table actually took, usually within a few seconds of thought.",
      ],
    },
    {
      kind: "list",
      heading: "Four moves for staying improvised without stalling the table",
      intro:
        "Work through these in order when the party's choice takes them somewhere your notes do not cover:",
      items: [
        {
          term: "Ask what the nearest thing wants",
          text: "Every NPC and faction near the party already has a want and an obstacle, even the ones you built for a different scene. Pull that want into the new situation. A bandit captain built to raid the noble's caravan still wants territory and supplies whether the party meets her at the caravan or in her own camp.",
        },
        {
          term: "Reuse before you invent",
          text: "Before creating anything new, check whether an existing site, item, or rumour can be repositioned to fit. The flooded crypt you prepped for a different lead can sit under the mill the party just decided to investigate instead. Players rarely notice reused material; they notice a GM who visibly stalls.",
        },
        {
          term: "Say yes to the direction, then complicate it",
          text: "Let the new choice work. If the party wants to negotiate with the bandit captain instead of fighting her, that conversation happens. Then attach a genuine complication drawn from her established want: she will only talk if the party helps her deal with a rival gang first.",
        },
        {
          term: "Track what you owe the world, not what you owe the plot",
          text: "Note which threads the party walked away from, the noble's summons ignored, the haunted mill left standing, and let them advance in the background on their own schedule. A dropped thread that resurfaces later reads as a living setting. A dropped thread that vanishes reads as prep the GM never intended to use.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the party skips the dungeon entirely",
      paragraphs: [
        "The GM prepped a ruined watchtower where the party was meant to find a captured informant and a lead on the smuggling ring running the coast road. Instead, the party spends the session drinking with the smugglers' dockside contact and decides to join the crew for a run instead of raiding the tower.",
      ],
      items: [
        {
          term: "The railroading response",
          text: 'The GM insists the dockside contact "isn\'t interested" in recruiting outsiders and has him mention the watchtower unprompted, trying to steer the party back towards the planned dungeon.',
        },
        {
          term: "The improvised response",
          text: "The GM lets the contact take the offer seriously. He needs extra hands because two of his crew went missing near the coast road last week, the same informant the GM had waiting in the tower. The party ends up walking into the watchtower anyway, but as smugglers investigating a disappearance rather than adventurers on a rescue job. The informant, the tower, and the smuggling ring all survive the change; only the reason for going there does.",
        },
        {
          term: "Why it works",
          text: "The prepped content was never wasted, only recontextualised. The party's actual choice, joining the crew, drove the scene instead of being quietly overridden, and the missing informant thread still pays off.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When a pause is actually the right call",
      paragraphs: [
        "Improvising on the fly covers most deviations, but not all of them. Call an honest pause, a five-minute break, a session-zero-style check-in, or simply a moment to think, when the party's direction runs into a rule you have not resolved, touches a safety or comfort line from your session zero agreements, or genuinely has nowhere left to go because the only prepared content sits behind a door the party has permanently closed.",
        "A pause used sparingly reads as a careful GM. A pause used every time the party turns left instead of right reads as a GM who was never actually running a world, only reading one aloud.",
      ],
    },
    {
      kind: "checklist",
      heading: "When the party goes somewhere you didn't prep",
      intro: "Work through this instead of stalling or forcing a reset:",
      items: [
        "What does the nearest NPC or faction already want, and does that want still apply here?",
        "Can an existing site, rumour, or item be repositioned instead of inventing something new?",
        "Have you said yes to the direction before adding a complication?",
        "What threads are you leaving behind, and when will they resurface on their own?",
        "Is this genuinely a moment for a rules check or a safety pause, or just an unfamiliar direction?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping prep reusable when players change direction",
    paragraphs: [
      "Improvising well depends on having your NPCs, factions, sites, and unresolved threads available as separate, reusable pieces rather than locked inside a single planned sequence of events. Codex Cryptica's campaign graph stores each of these as a connected node, so when the party takes an unplanned direction you can pull up the nearest faction's want or an unused site in seconds instead of flipping through linear session notes.",
      "The Quest and NPC generators can also seed extra motivations and complications on demand, giving you material to reuse the moment a scene needs somewhere to go that your notes never anticipated.",
    ],
    linkText: "Explore the Codex Cryptica campaign graph",
    href: "/for/sandbox-campaigns",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Generate NPCs with instant motives and mannerisms you can slot into any unplanned scene.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Create factions with concrete wants and obstacles that travel with them across any direction the party takes.",
      href: "/generators/faction",
    },
    {
      title: "Quest generator",
      description:
        "Generate adventure scenarios with built-in complications you can graft onto an improvised scene.",
      href: "/generators/quest",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Sandbox Campaigns",
      description:
        "Manage player-directed campaigns with reusable factions, sites, and rumours tracked as living connections.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-you-improvise-npcs-on-the-spot",
    "how-do-you-create-quest-hooks-without-railroading",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-much-rule-of-cool-should-a-dm-allow",
  ],
  discovery: {
    id: "answer-players-going-off-script",
    parentCluster: "gm-improvisation",
    primaryIntent: "how to handle players going off script as a gm",
    intentAliases: [
      "players go off script",
      "what to do when players go off the rails",
      "improvising when players ignore your plot",
      "gm improvisation when players deviate from prep",
    ],
    uniqueValue:
      "A live, at-the-table response method for unplanned player direction: reuse existing NPC and faction motivations, reposition prepped sites instead of inventing from scratch, say yes before complicating, and reserve a genuine pause for rules or safety moments rather than every deviation.",
    relatedIntents: [
      "answer-sandbox-campaign-prep",
      "answer-npcs-improvise-on-the-spot",
      "answer-quest-hooks-without-railroading",
      "for-sandbox-campaigns",
      "answer-how-much-rule-of-cool-should-a-dm-allow",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-quest-hooks-without-railroading",
        reason:
          "The quest hooks page covers designing open-ended hooks before the session; this page covers the live, in-the-moment response once the party has already gone somewhere unplanned.",
      },
      {
        with: "answer-how-much-rule-of-cool-should-a-dm-allow",
        reason:
          "This page covers broad narrative direction and repositioning prep when players ignore hooks; the Rule of Cool page focuses specifically on resolving tactical and mechanical stunts without breaking game balance.",
      },
    ],
  },
  seo: {
    title:
      "How do you handle players going off script as a GM? | Codex Cryptica",
    description:
      "Handle players going off script by reusing NPC and faction motivations, repositioning prepped sites, and saying yes before complicating, without railroading them back.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-handle-players-going-off-script-as-a-gm.jpg",
    imageAlt:
      "A Game Master mid-improvisation at a lamplit table, shuffling faction and NPC index cards while players point off the edge of the prepared map",
  },
};

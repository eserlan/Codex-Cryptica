import type { AnswerConfigInput } from "../schema";

export const shouldIDevelopMyCharactersOrMyWorldFirst: AnswerConfigInput = {
  slug: "should-i-develop-my-characters-or-my-world-first",
  category: "worldbuilding",
  publishedAt: "2026-10-31",
  question: "Should I develop my characters or my world first?",
  kind: "framework",
  shortAnswer:
    "Start with whichever is clearest in your mind: a character, a place, a conflict or a premise. Write down what you already know about it, then develop characters and world together, letting each side raise questions for the other. Ask how a place shapes what a person wants and can do, then ask what that person reveals about the place. You do not need a finished map, history or cast before you begin, and gaps can stay open while you work.",
  sections: [
    {
      kind: "prose",
      heading: "Get what you already know onto the page first",
      paragraphs: [
        "If you already have a setting and characters in your head, your first job is capture, not invention. Write a rough page headed things I know so far and list names, fragments, facts, images and half formed ideas exactly as they occur to you. Include the questions you cannot answer yet and any points where two ideas disagree. Do not polish sentences, settle a chronology or design a filing system during this pass. The aim is to make the ideas visible so you can see what connects to what.",
        "Many creators stall at this point because the notes feel too untidy to count as worldbuilding. They do count. A messy page you can search and link is more useful than a detailed world held only in memory, where each new idea quietly rewrites an earlier one. Capture first, then improve the material in small passes.",
      ],
    },
    {
      kind: "table",
      heading: "Three useful entry points, and when each one helps",
      headers: ["Entry point", "Fits when", "Watch out for"],
      rows: [
        [
          "Character first",
          "One person is vivid: their want, flaw, job or voice is clear, but their surroundings are vague.",
          "Inventing biography that never touches daily life. Ask early where they live, who can refuse them and what their work costs.",
        ],
        [
          "World first",
          "A place, rule or way of life is vivid: a flooded harbour, a city where debts are inherited, a desert crossed only at night.",
          "Building districts and histories nobody in the project will visit. Attach a resident, worker or visitor before you expand further.",
        ],
        [
          "Conflict or premise first",
          "A tension is vivid but neither side is settled: two towns share one well, a courier route closes each winter, a law everyone breaks.",
          "Treating the tension as background decoration. Name who wants opposed outcomes and what each side stands to lose.",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Develop both sides by asking questions in each direction",
      paragraphs: [
        "Once you have a starting fragment, work back and forth. From world to character, ask: how does this place or culture shape what a person wants, what work is open to them, what they assume is normal and what they have never thought to question? A harbour town that floods each spring produces people who store food upstairs, read the sky without thinking about it and distrust promises made for the dry season. From character to world, ask: what must exist for this person to live this way? A courier implies roads or boat routes worth paying for, someone who sends messages, a way to mark urgency and a consequence when a delivery is late.",
        "Follow cause and effect for two or three steps, then stop. If a place floods, boats and raised stores follow, and a market that moves with the water may follow from that. You do not need the fifth consequence today. Write the chain down, mark anything uncertain as a question, and move to the next fragment. The setting grows through these short chains rather than through one long document written in advance.",
      ],
    },
    {
      kind: "prose",
      heading: "Build one connected cluster before you widen the scope",
      paragraphs: [
        "Pick one person, one place and one tension, and link them on a single page. The person wants something specific this week. The place makes that want harder, more expensive or more dangerous. The tension involves at least one other person or group whose wishes cut across theirs. That small cluster is enough to draft a scene, plan an opening session, prototype a level or test whether the idea holds your interest.",
        "Expand only when a real question demands it. A neighbouring town matters when your character must travel there, trade with it or flee to it. A royal lineage matters when it changes a law your character can break. Until then, a name and a one line note will do. This keeps early work proportionate and leaves blank space for better ideas that arrive later.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a flooded town and the courier who crosses it",
      paragraphs: [
        "The same cluster developed in both directions, starting from a place and then from a person. Notice how little material each direction needs before the other becomes easier.",
      ],
      items: [
        {
          term: "Starting from the place",
          text: "Lowmarsh is a coastal town where spring tides flood the lower streets for a few days each month. Houses keep kitchens and stores on the upper floors, and market stalls move to the raised causeway when the water rises. From that one fact, a character takes shape: Sanna, a young courier, earns well during flood days because she knows which alleys stay passable by flat boat and which bridges clear a laden cart. She wants to save enough to buy her own boat before the winter storms, when work stops and debts do not.",
        },
        {
          term: "Starting from the character",
          text: "Begin again with Sanna alone: a courier who is paid by speed, who cannot swim and who hides that fact from the boat crews. Her job reveals the town around her. Someone must pay for urgent messages, so there is trade worth hurrying for, perhaps a fish market selling to inland buyers before the catch spoils. Routes need marking and maintaining, so the town employs tide wardens and fines anyone who moves a channel post. Her secret implies a near accident in her past and a reason the crews would drop her if they knew. Law, trade and infrastructure have appeared because one person's working day required them.",
        },
        {
          term: "Where the two directions meet",
          text: "The tension is now concrete without any extra lore. During the highest spring tide, a merchant offers Sanna double pay to carry a contract across town before the causeway floods, on a route she can only manage by boat with a crew she has been avoiding. The place complicates her goal, her goal exposes how the place works, and you have a scene, an opening session or a quest, depending on your medium. The wider kingdom, the cause of the tides and the town's founding history remain unwritten, and none of them is needed yet.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Keep settled facts separate from open questions",
      paragraphs: [
        "Early notes change. A character's age shifts, a town moves from a river to a coast, two minor figures merge into one. Treat those changes as ordinary drafting. Protect yourself from confusion by keeping two short lists for each note: what is settled, and what is still open. Settled means a scene, session or chapter already depends on it, so changing it would mean revising finished work. Open means you are free to decide later, and anyone reading the note, including future you, should not treat it as fixed.",
        "When two notes contradict each other, do not delete one in a panic and do not force a ruling on the spot. Write the contradiction down as a question, for example whether Lowmarsh floods monthly or only in spring, and decide it when a story or session reaches the point where the answer changes what someone can do. Some contradictions turn out to be useful: two districts may genuinely tell different stories about the same flood.",
      ],
    },
    {
      kind: "list",
      heading: "A light way to organise early notes",
      intro:
        "You need less structure than most guides suggest. This much is enough for months of early work:",
      items: [
        {
          term: "One note per person, place, group or event",
          text: "Keep each note short: a name, what matters about them now, and the settled and open lists described above. A note you can finish in five minutes is a note you will actually write.",
        },
        {
          term: "Link notes where they touch",
          text: "When Sanna works in Lowmarsh, link the two notes and say how they touch in a word or two: resident, employed by, in debt to, afraid of. Links handle this better than folders, because one person belongs to a family, a workplace and a town dispute at once.",
        },
        {
          term: "Keep one running questions page",
          text: "Collect every unanswered question in one place and review it when you feel stuck. Answering one question well is a satisfying work session and often unblocks a scene or session.",
        },
        {
          term: "Add maps and timelines only when you need them",
          text: "Draw a map when travel time or direction starts to matter. Start a timeline when two events must happen in a set order. Before that point, both can usually wait.",
        },
      ],
      outro:
        "Paper, a plain text file or a notes app all support this method. Choose the tool you already open without friction, and change it later if your needs grow.",
    },
    {
      kind: "checklist",
      heading: "A ten minute starter exercise",
      intro:
        "Use a timer if it helps you stay rough. Write short phrases rather than polished prose:",
      items: [
        "Write three facts about one character: what they want this week, what they are good at, and one thing they avoid or conceal.",
        "Write three facts about the place they live: how people earn a living there, one recurring inconvenience, and one custom outsiders find odd.",
        "Write one sentence describing how the place complicates the character's goal: a rule, a distance, a cost or a person the place puts in their way.",
        "Turn that complication around and write one thing the character's daily life reveals about the place: a job, a law, a trade or a habit that must exist.",
        "Finish with two unanswered questions you would enjoy exploring, and stop there. You have a cluster you can draft from, not homework.",
      ],
    },
  ],
  codexConnection: {
    heading: "Grow linked notes as the ideas connect in Codex Cryptica",
    paragraphs: [
      "The method above maps directly onto linked notes. In Codex Cryptica you can keep one entity for each character, place, faction and event, link them as relationships form, and view those links in the graph to spot clusters that are ready to draft from and questions that are still isolated. Add entities when a scene or session introduces them, so the chronicle grows alongside the project.",
      "Your vault stays on your own device, and you can revise names, links and notes at any point as early ideas change.",
    ],
    linkText: "Organise worldbuilding notes in Codex Cryptica",
    href: "/solutions/worldbuilding-tool",
  },
  relatedAnswers: [
    "how-do-you-start-worldbuilding-from-scratch",
    "how-do-i-start-worldbuilding-for-a-novel-or-short-story",
    "where-do-worldbuilding-ideas-come-from",
  ],
  discovery: {
    id: "answer-characters-or-world-first",
    parentCluster: "worldbuilding",
    primaryIntent: "should i develop my characters or my world first",
    intentAliases: [
      "should I start with characters or worldbuilding",
      "worldbuilding characters or setting first",
      "how to organise worldbuilding ideas",
      "how to start writing down my worldbuilding",
      "character first or world first worldbuilding",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A genre and medium agnostic workflow for creators who already hold ideas in their head: capture fragments first, then develop characters and setting iteratively through cause and effect in both directions, starting from one connected cluster.",
    acknowledgedOverlap: [
      {
        with: "answer-worldbuilding-from-scratch",
        reason:
          "Starting from scratch builds a playable local sandbox for a game table from a premise, whereas this answer covers the earlier choice between character first and world first development and how to record ideas already imagined.",
      },
      {
        with: "answer-worldbuilding-for-fiction-writers",
        reason:
          "The fiction writers answer builds the minimum setting for an opening scene for novelists, whereas this answer applies across fiction, roleplaying games and other projects and centres on iterative character and world development.",
      },
      {
        with: "answer-worldbuilding-ideas-inspiration",
        reason:
          "The ideas answer helps creators find and test a first spark, whereas this answer assumes ideas already exist and covers how to write them down, connect them and develop them without overwhelm.",
      },
    ],
    relatedIntents: [
      "answer-worldbuilding-from-scratch",
      "answer-worldbuilding-for-fiction-writers",
      "answer-worldbuilding-ideas-inspiration",
    ],
  },
  seo: {
    title: "Should I Develop My Characters or My World First? | Codex Cryptica",
    description:
      "Start with whichever idea is clearest, capture what you know, then build characters and world together. Includes a worked example and a ten minute starter exercise.",
    image:
      "https://assets.codexcryptica.com/og/should-i-develop-my-characters-or-my-world-first.jpg",
    imageAlt:
      "Coastal town at high tide with raised causeway market, flat boats in flooded streets and a young courier carrying a message case",
  },
};

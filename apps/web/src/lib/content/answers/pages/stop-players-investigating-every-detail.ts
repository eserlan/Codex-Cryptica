import type { AnswerConfigInput } from "../schema";

export const stopPlayersInvestigatingEveryDetail: AnswerConfigInput = {
  slug: "stop-players-investigating-every-detail",
  category: "running-the-game",
  publishedAt: "2026-10-27",
  question: "How do I stop players from investigating every detail?",
  kind: "framework",
  shortAnswer:
    "Keep the detail and change what your description asks players to do with it. Give atmosphere briefly and move on, make optional interactions easy to take or leave, and mark real leads with an anomaly, a stake, or someone who needs help. When players investigate background detail anyway, answer at the scale it earns: a sentence, a short summary, or a full scene if their interest and the consequences justify it.",
  sections: [
    {
      kind: "prose",
      heading: "Why players chase every detail",
      paragraphs: [
        "Players have one reliable source of information about the fictional world: what the Game Master (GM) chooses to mention. If a harbour description names the lighthouse, the keeper, and a brass key on a hook by the door, a reasonable player may treat all three as placed there for a reason. Newer players, and anyone used to mysteries or video games, have often been taught exactly that lesson: examine what the game highlights, because it may matter later.",
        "That inference is not disruptive behaviour, and it is rarely solved by describing less. A bare room with one named object makes that object look even more important. The work is to make the intended weight of a detail clear from how you present it, and to handle the investigation briefly when players read more into it than you meant.",
      ],
    },
    {
      kind: "list",
      heading: "Three levels of description",
      intro:
        "These are ways of presenting a detail in the moment, not fixed categories for locations and not permissions that tell players what they may touch. The same lighthouse, shopkeeper, or starport gate can move from one level to another as play changes it:",
      items: [
        {
          term: "Atmosphere",
          text: "Detail that establishes place, weather, mood, or ordinary life. Give it a clause or a sentence, attach no question or problem to it, and continue with what the characters came to do. A busy market, a smell of tar and fish, or gulls around a lighthouse tells players where they are without asking them to act.",
        },
        {
          term: "Optional interaction",
          text: "A person or feature that is visibly available if the party wants it, with no cost for walking past. A keeper who waves, a stallholder who will chat, or a noticeboard in the square belongs here. One human gesture or available action is usually enough to mark the opening.",
        },
        {
          term: "Clear lead or problem",
          text: "Something has changed, gone wrong, or needs a decision. Name the anomaly and its visible consequence: the lamp has been dark for three nights, the ferry is not running, or a crowd has gathered because a boat is overdue. Players should not have to guess that this detail differs from the background.",
        },
      ],
      outro:
        "Player interest can promote a detail. If the party returns to an atmospheric lighthouse twice, questions the keeper, or spends resources there, it has become an interaction that deserves a fuller answer, even if you originally prepared nothing for it.",
    },
    {
      kind: "prose",
      heading: "Signal relevance without railroading",
      paragraphs: [
        "Relevance is clearest when a lead connects to something the players already know or care about. Tie it to an established goal, a known stake, or a contrast with how the place normally behaves. A lighthouse is background on a clear morning. It becomes a lead when its lamp is dark in fog, when the relief keeper has not arrived, or when a ship the characters are waiting for is due before dawn. The anomaly does the signalling; you do not need to underline the sentence or repeat it three times.",
        'NPC behaviour helps as well. People attached to a real problem ask for help, hurry, argue, hide something, or try to stop the characters. People who are part of the setting get on with their work. If the distinction is still unclear, say so plainly at the table: "You can look closer if you want to. Nothing there is pressing, and the tide will not wait." That gives players a fair choice between curiosity and a known cost. It is more honest than expecting them to infer a hidden label, and it leaves the decision with them.',
        "The same presentation works outside fantasy. In a spaceport terminal, flickering departure boards and the smell of hot dust are atmosphere. A cleaner who will trade gossip for a meal token is an optional interaction. Every flight to one destination being quietly removed from the board, while security closes its exits, is a clear lead. Genre changes the props; it does not change how players read emphasis.",
      ],
    },
    {
      kind: "list",
      heading: "Scale the interaction to its value",
      intro:
        "An investigation does not have to become a scene. Choose the smallest treatment that gives a truthful answer, and let interest or consequences move it up a level:",
      items: [
        {
          term: "A one-line answer",
          text: 'For a routine fact, answer and continue: "The keeper says the lamp oil arrives by cart on Fridays." No roll, map, or family history is required.',
        },
        {
          term: "A short summary",
          text: "When the action would take time in the fiction but has little uncertainty, summarise it. Cover what the characters did, the ordinary thing they learned, and how much time passed, then return to the wider situation.",
        },
        {
          term: "A brief exchange",
          text: "Play two or three beats with an NPC when character, humour, trust, or a useful connection is the point. End when that point is made instead of padding the conversation until somebody invents a quest.",
        },
        {
          term: "A full scene",
          text: "Give a detail full attention when the players commit resources, take a risk, change a relationship, or uncover a consequence that alters their choices. Their commitment, not your original plan, is a good test.",
        },
      ],
      outro:
        'You can offer the scale openly: "I can summarise the search in a minute, or we can play through the climb and the talk with the keeper. It will use the morning." Players who choose the longer version have spent table time deliberately. Players who take the summary have still investigated; you have not refused them.',
    },
    {
      kind: "example",
      heading: "Worked example: the same lighthouse three ways",
      paragraphs: [
        "A harbour town should feel inhabited before it becomes an adventure site. The wording below keeps the lighthouse in all three versions, but changes what the description asks the party to notice.",
      ],
      items: [
        {
          term: "As atmosphere",
          text: '"An old lighthouse stands above the harbour, its lamp turning slowly through the morning mist." Mention it while describing the approach, then move to the dock, the ferry, or the person the party came to meet.',
        },
        {
          term: "As an optional interaction",
          text: '"The lighthouse keeper waves as you pass, then returns to polishing the brass fittings." The party can stop for local news or walk on without losing anything they need.',
        },
        {
          term: "As a clear hook",
          text: '"The lighthouse has been dark for three nights, and no one sent to investigate has returned." The abnormal fact and the missing investigators give the party a problem they can choose to pursue.',
        },
        {
          term: "When players investigate the ordinary lighthouse anyway",
          text: 'The party climbs up to ask about the lamp. Play a short exchange: the keeper answers the question directly, complains that gulls nest where the maintenance ladder should rest, and says the lamp will be lit at dusk as usual. Then summarise: "You spend twenty minutes looking round. It is clean, well kept, and reassuringly dull." Offer the next choice with its cost: stay to help clear the gulls and hear harbour gossip, or get back before the market closes. If they stay, the keeper remembers their help and can be a friendly contact later. That is a real return for curiosity, with no need to invent a cult in the cellar, and no block on a detour the table is enjoying.',
        },
      ],
    },
    {
      kind: "list",
      heading: "Where this goes wrong",
      intro:
        "Most runaway exploration sessions come from a few repeatable habits rather than from players being difficult:",
      items: [
        {
          term: "Giving every incidental NPC a performance",
          text: "A name, accent, secret sorrow, and personal request for every stallholder teaches the table that each conversation contains a quest. Keep routine people to a role, a manner, and one useful thing they know.",
        },
        {
          term: "Padding routine exchanges",
          text: "Playing out every purchase, booking, and direction in full makes ordinary competence take as long as a confrontation. Summarise once the outcome is clear.",
        },
        {
          term: "Making every surprise secretly central",
          text: "If each odd detail connects to the main plot, players learn to pull every thread. Let some discoveries stay local: a debt between neighbours, a shortcut, a good meal, or a name they can use later.",
        },
        {
          term: "Declaring a place irrelevant after players care",
          text: "Telling the table that a location does not matter, after they have spent effort on it, teaches them their choices were wasted. Give the investigation an ordinary result and a consequence proportionate to what they did.",
        },
        {
          term: "Moving consequences to restore the plan",
          text: "If the party befriends the keeper, spends the morning, or misses the ferry, keep that result. Adjust the next scene around it rather than quietly returning everyone to the planned sequence.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Protect the pacing together",
      paragraphs: [
        "Agree the shape of play before you need to defend it mid-scene. A one-shot with a hard finish can still contain free exploration, but the group should know that the evening has a destination and a finishing time. A sandbox campaign built around following local interests needs a different agreement: detours are part of the game, and the plot may be whatever the party keeps returning to. Many problems are a mismatch between those two expectations, described as though they were a discipline problem.",
        'During play, check interest instead of guessing. "We have about an hour left. Do you want to follow this up here, or head for the ferry and come back next time?" makes time a shared constraint rather than a GM veto. Transitions help too: end a finished exchange, state what has changed, and open the next moment somewhere the players have chosen to be. If the table clearly wants the lighthouse, give it the time and let something else go. Curiosity that reshapes preparation is not lost time unless the group itself feels it is.',
      ],
    },
    {
      kind: "checklist",
      heading: "Before you describe the next place",
      intro:
        "Run through these choices while preparing or improvising a location:",
      items: [
        "Which details are atmosphere, and can each one be given in a clause before you move on?",
        "Which people or places are open for an optional interaction, and what ordinary thing would a short stop there produce?",
        "What visible anomaly, stake, or request marks each real lead as different from the background?",
        "For a routine investigation, what is your one-line answer, and what would your short summary cover?",
        "What small return can curiosity earn here, such as information, goodwill, a contact, or a shortcut, without becoming a side quest?",
        "If the party spends serious time on background detail, what will you shorten or drop later, and what consequence of their detour will you keep?",
        "Does the group know whether this session is a one-shot with a destination or a sandbox where detours can become the game?",
      ],
    },
  ],
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Draft a town with its trade, landmarks, and everyday business, so background detail is ready without preparing a quest for every street.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Give an incidental keeper, stallholder, or clerk a name, manner, and want on the spot when players stop to talk.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    "how-do-you-create-quest-hooks-without-railroading",
    "how-do-you-run-a-mystery-without-railroading",
    "how-do-you-handle-players-going-off-script-as-a-gm",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-i-pace-an-rpg-one-shot",
    "how-many-npcs-does-an-rpg-town-need",
    "how-do-i-roleplay-npcs-if-im-not-good-at-acting",
  ],
  discovery: {
    id: "answer-stop-players-investigating-every-detail",
    parentCluster: "running-the-game",
    clusters: ["running-the-game", "session-prep"],
    primaryIntent: "how to stop players investigating every detail",
    intentAliases: [
      "players investigate everything rpg",
      "how much detail should a gm describe",
      "rpg session pacing exploration",
      "how to describe locations without railroading",
      "players investigate every npc",
      "players talk to every npc session too long",
      "how to signal what matters in an rpg description",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "Teaches GMs to distinguish atmosphere, optional interactions, and clear leads through presentation, then scale any investigation from a one-line answer to a full scene without refusing player curiosity or turning every detail into a plot hook.",
    acknowledgedOverlap: [
      {
        with: "answer-quest-hooks-without-railroading",
        reason:
          "The quest hooks answer covers how to build hooks players can decline; this answer covers how everyday description makes background detail look like a hook in the first place, and how to handle the investigation that follows.",
      },
      {
        with: "answer-pace-rpg-one-shot",
        reason:
          "The one-shot answer budgets table time across a whole session; this answer works at scene level, on description, signposting, and shortening routine interactions in any session shape.",
      },
      {
        with: "answer-players-going-off-script",
        reason:
          "The off-script answer covers major departures from prepared material; this answer covers small, repeated diversions into background detail and how to answer them proportionately.",
      },
    ],
    relatedIntents: [
      "answer-quest-hooks-without-railroading",
      "answer-run-mystery-without-railroading",
      "answer-players-going-off-script",
      "answer-sandbox-campaign-prep",
      "answer-pace-rpg-one-shot",
      "answer-npcs-per-town",
    ],
  },
  seo: {
    title:
      "How do I stop players from investigating every detail? | Codex Cryptica",
    description:
      "Describe places so atmosphere, invitations, and clear hooks read differently. Scale brief answers, summaries, and full scenes without shutting down curiosity.",
    image:
      "https://assets.codexcryptica.com/og/stop-players-investigating-every-detail.jpg",
    imageAlt:
      "A stone lighthouse above a harbour town at dawn, its lamp lit through morning mist while fishing boats and market stalls fill the quayside below",
  },
};

import type { AnswerConfigInput } from "../schema";

export const howDoIStartADndCampaign: AnswerConfigInput = {
  slug: "how-do-i-start-a-dnd-campaign",
  category: "getting-started",
  publishedAt: "2026-10-07",
  question: "How do I start a D&D campaign?",
  kind: "framework",
  shortAnswer:
    "Start a D&D campaign with a small playable situation the characters have a reason to care about, not a finished world. Choose a clear premise and tone, decide whether to run a published adventure, homebrew, or a mix of both, agree which rules and edition you are using, then run a compact Session 0 to connect the party and set expectations. Prepare only the starting area, the people and factions who can affect it, and a concrete first problem for session one, and let the campaign grow outward from what the players actually do.",
  sections: [
    {
      kind: "prose",
      heading: "Blank page to playable table",
      paragraphs: [
        "The hardest part of starting a D&D campaign is not learning the rules. It is deciding how much to build before the first die roll, and most new Dungeon Masters build far too much in the wrong direction. The impulse to write a continent, a timeline, and a pantheon feels responsible, but it produces a lot of material the table never touches and leaves the actual first session vague.",
        "A campaign becomes playable when the players have a situation to act on, a reason to act together, and enough surrounding detail that their choices matter. Everything beyond that can wait until play shows you what the group cares about. Your job before session one is to make the first three hours concrete, not to make the whole world complete.",
      ],
    },
    {
      kind: "list",
      heading: "Eight steps from blank page to first session",
      intro: "In this order, with only as much of each as the next step needs:",
      items: [
        {
          term: "Choose the premise and tone",
          text: 'Name what this campaign is about in one sentence and how it should feel at the table. A sentence like "level 1 to 5, frontier town under pressure from a failing mine, practical and a little gritty" tells players how to build characters that fit. Tone is a shared agreement, not a lore entry, so state it plainly in Session 0 rather than hoping the first session reveals it.',
        },
        {
          term: "Decide published, homebrew, or hybrid",
          text: "A published adventure saves you from inventing the initial situation; homebrew gives you more freedom over setting and pace but makes it easier to overbuild. A hybrid, running a published structure while replacing its town, NPCs, or faction with your own, often gives a new DM the best of both. See the comparison below before you commit.",
        },
        {
          term: "Agree the rules you are actually using",
          text: "Confirm edition, any optional rules you are keeping or dropping, how you handle character creation, and what sources are in or out. One short note agreed before Session 0 prevents half the table building for a different game. You do not need to master every rule, only the ones the first session will test.",
        },
        {
          term: "Run a compact Session 0",
          text: 'Use the session to align on expectations, boundaries, scheduling, and character connections, not to deliver a lore lecture. Build or cross-reference characters together so each one has at least one concrete tie to another member of the party. Finish with a clear answer to "where do we start, and why are we together?"',
        },
        {
          term: "Create only the starting area and its pressures",
          text: "Prepare one settlement or small region the party will actually stand in, two or three nearby places they can reach in a session, and the two or three factions or persons whose wants collide there. Give each a current aim and a move they will make if the party does nothing. That is enough map to play on.",
        },
        {
          term: "Give the characters a concrete first problem",
          text: "A missing shipment, a sealed barrow that has started leaking, a patron calling in a debt, a local authority about to make a bad decision. The problem should name people, a place, and a pressure that worsens on a short clock, so the party has to choose an approach rather than wait for a plot to arrive.",
        },
        {
          term: "Prepare the first session, not the whole campaign",
          text: "Write the opening scene, two or three likely locations, the NPCs who will definitely appear, and one or two complications you can drop in if things run short or go sideways. Leave the level 5 arc and the distant kingdoms as unanswered questions. Players will tell you what to develop by what they pursue.",
        },
        {
          term: "Record what becomes canon and expand from there",
          text: "After session one, note the names, places, and threads the players actually engaged with, and treat those as fixed. Everything untouched stays flexible. That habit turns play into worldbuilding and keeps your notes anchored to decisions at the table rather than to a plan written before you knew the party.",
        },
      ],
    },
    {
      kind: "table",
      heading: "Published adventure, homebrew, or hybrid",
      headers: ["Approach", "What it saves", "What it costs", "When it fits"],
      rows: [
        [
          "Published adventure",
          "Less initial content to invent, tested structure for the first sessions",
          "More reading and adaptation to your table, some material you will want to change",
          "You want to run soon with less upfront writing",
        ],
        [
          "Homebrew",
          "Full control over tone, setting, and pace from the start",
          "Greater temptation to overbuild, every encounter and map is on you",
          "You have a specific premise no published start supports",
        ],
        [
          "Hybrid",
          "Reuses a proven opening while your own settlement, NPCs, and factions make it yours",
          "You still need to adapt stat blocks and hooks to your changes",
          "You like a published start but want your own location or faction at the centre",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "The giant-world trap and what to skip",
      paragraphs: [
        "New DMs often assume a good campaign requires a complete world before the characters meet. In practice that assumption trades the material the first session actually needs for material the players may never see. The table does not feel the thousand-year timeline; it feels whether there is a clear choice in front of it, with people who want different outcomes.",
        "You do not need a continent map, a full pantheon with ten detailed gods, a calendar stretching back through ages, a plotted arc from level 1 to 20, dozens of named NPCs, or a finished wiki before anyone rolls initiative. One well-drawn starting settlement with a market, a place of rest, and a local authority, a handful of NPCs who have visible wants, and one active pressure between factions gives the party more to play with than a binder of distant lore. Let the wider world stay as a few open questions you answer after the players choose a direction.",
      ],
    },
    {
      kind: "prose",
      heading: "Give the party a reason to stay together",
      paragraphs: [
        "Four strangers with separate backstories will not hold together because a Session 0 note says they are a party. Hold is built from a shared stake agreed at the table: a common patron who pays them, a shared debt or oath, a place they are jointly responsible for, a danger that affects them all, or a promise they made to the same person. Ask the players to help choose the tie, and write it on the character sheets as an explicit connection, not a footnote. During play, keep that stake active: the first session's problem should threaten, reward, or test the shared reason, so choosing to act together is the obvious way to pursue individual goals.",
      ],
    },
    {
      kind: "example",
      heading: "Two starts for the same town",
      paragraphs: [
        "The same frontier settlement, prepared two ways, for a group about to start a D&D 5e campaign at level 1. Only one is ready to run.",
      ],
      items: [
        {
          term: "The overbuilt start",
          text: 'The DM writes a five-page history of the Grey Marches, names the twelve gods and their domains, maps three neighbouring kingdoms, and plots a level 1 to 12 arc where the party will eventually confront the returned lich-lord. For session one, the notes say "the party meets in Brindle Heath and hears rumours". The opening question is "what do you do?" with no person, pressure, or place named in the prompt. Players ask where the main quest is, the DM improvises a generic job board, and the first hour is spent fishing for a hook.',
        },
        {
          term: "The playable start",
          text: "The DM prepares Brindle Heath as a logging settlement with a failing silver mine. Two factions pull against the town: the mine factor who wants to cut deeper despite flooding, and a circle of marsh wardens who say the dig has broken an old seal. The party owe their start together to the same tie, a debt to the same caravan master who got them passage here. The first problem is concrete: a crew did not return from the lower adit, water is rising, and the factor offers coin while the wardens offer a warning. The DM has three places mapped: the market square, the mine headframe, and the flooded adit itself, each with one NPC who wants something now.",
        },
        {
          term: "Why it works",
          text: "The second start names people with incompatible wants, a place the party can walk to, and a consequence on a visible clock if nobody acts. Players have to choose who to talk to and whether to descend, and that choice immediately shows the DM what the group cares about. The blocked adit, the missing crew, and the two offers give the next session its direction without any kingdom map. If the party ignore the mine, the factor sends a less careful crew in two days and the seal breaks messily, a change the players will meet whether they investigated or not.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you sit down for session one",
      intro:
        "Run through this the night before the first game. If you can answer each line in a sentence, you are ready:",
      items: [
        "You can state the campaign premise and tone in one sentence everyone at Session 0 agreed to.",
        "You have chosen published, homebrew, or hybrid and know what that choice expects you to have ready.",
        "You have agreed edition, character creation method, and which optional rules are in or out.",
        "You have run a compact Session 0 and each character has at least one concrete tie to another party member.",
        "Your notes cover one starting settlement, two or three nearby places, and two or three persons or factions with current aims and a move they make if the party stalls.",
        "You have one concrete first problem that names people, a place, and what worsens if the party does nothing.",
        "Your prep serves the first session only, with one or two spare complications for when play runs short or goes off plan.",
        "You have a simple way to record which names, places, and threads became canon during play.",
      ],
    },
  ],
  codexConnection: {
    heading: "Build the first playable pieces of your campaign",
    paragraphs: [
      "Once the premise and Session 0 are settled, the parts that remain are small, linked details rather than a world bible. Codex Cryptica helps you make those first pieces playable: generate a starting settlement and the handful of NPCs and factions who can actually affect it, note the relationships between them, and keep Session 0 decisions and session-prep notes as linked entities in the Vault so they stay findable when play inevitably goes somewhere you did not plan.",
      "When the first session is over, the Graph makes the ties you created visible, so the consequences of who the party helped or ignored carry into session two without rebuilding your notes from scratch.",
    ],
    linkText: "Build your starting area",
    href: "/for/dungeons-and-dragons",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Draft the one starting town or village the party will actually stand in, with districts and local pressure built in.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Create the two or three NPCs your opening scene needs, each with a visible want the party can act on.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Give the settlement's two or three competing groups distinct aims and a move they make if the party does nothing.",
      href: "/generators/faction",
    },
    {
      title: "Tavern generator",
      description:
        "Add a ready-to-run social hub where Session 0 ties and first-session rumours can be heard.",
      href: "/generators/tavern",
    },
    {
      title: "Quest generator",
      description:
        "Turn the first problem into a quest hook with a patron, a cost, and a complication.",
      href: "/generators/quest",
    },
  ],
  relatedForPages: [
    {
      title: "Dungeons & Dragons",
      description:
        "Keep D&D NPCs, factions, locations, and quests connected between sessions.",
      href: "/for/dungeons-and-dragons",
    },
    {
      title: "Fantasy worldbuilding",
      description:
        "Build the starting region outward only as the party explores, with linked settlement and faction notes.",
      href: "/for/fantasy-worldbuilding",
    },
    {
      title: "Sandbox campaigns",
      description:
        "Prepare a small playable area with active pressures rather than a continent-spanning plan.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-i-start-gming-for-the-first-time",
    "how-do-i-run-a-successful-session-0",
    "how-do-i-get-my-rpg-party-to-work-together",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-organise-npc-relationships",
    "how-do-you-start-worldbuilding-from-scratch",
    "how-do-i-expand-a-simple-rpg-campaign-idea",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-do-i-prepare-a-dnd-session",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "how-do-you-handle-players-going-off-script-as-a-gm",
    "how-do-you-run-dnd-for-a-large-group-of-players",
  ],
  discovery: {
    id: "answer-start-dnd-campaign",
    parentCluster: "getting-started",
    clusters: ["getting-started", "dnd-campaign"],
    primaryIntent: "how do i start a dnd campaign",
    intentAliases: [
      "how to start a dnd campaign",
      "i want to dm dnd where do i start",
      "how much worldbuilding before session one",
      "do i need a whole campaign planned",
      "published adventure or homebrew",
      "what to prepare before session 0 dnd",
      "how to give the party a reason to stay together",
      "dnd campaign starter guide",
      "how to start being a dungeon master for dnd",
    ],
    uniqueValue:
      "D&D-specific start framed as a playable first situation rather than a finished world, with an eight-step flow, a published versus homebrew versus hybrid comparison, an explicit list of what not to build before session one, and a weak versus strong Brindle Heath worked example.",
    relatedIntents: [
      "answer-first-time-gm-hub",
      "answer-session-zero",
      "answer-session-prep",
      "answer-party-cohesion",
      "answer-sandbox-campaign-prep",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-first-time-gm-hub",
        reason:
          "That answer covers starting to GM in any system with a seven-step path and a minimal prep packet; this answer is D&D-specific and focuses on campaign framing, published versus homebrew versus hybrid choice, the giant-world trap, and giving the D&D party a reason to stay together.",
      },
      {
        with: "answer-sandbox-campaign-prep",
        reason:
          "The sandbox answer teaches a 1-3-3-6 prep method for open-world regional play; this campaign-start answer covers the earlier decision of premise, rules agreement, Session 0, and a concrete level-1 opening problem before any sandbox structure is needed.",
      },
    ],
  },
  seo: {
    title: "How do I start a D&D campaign? | Codex Cryptica",
    description:
      "Start your first D&D campaign with a playable first session: premise, published or homebrew, Session 0, starting area, and a concrete first problem.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-start-a-dnd-campaign.jpg",
    imageAlt:
      "Dungeon Master notes, dice, and a small settlement map laid out for the first D&D campaign session",
  },
};

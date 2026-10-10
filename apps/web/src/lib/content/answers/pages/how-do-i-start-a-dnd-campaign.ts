import type { AnswerConfigInput } from "../schema";

export const howDoIStartADndCampaign: AnswerConfigInput = {
  slug: "how-do-i-start-a-dnd-campaign",
  category: "getting-started",
  publishedAt: "2026-10-07",
  question: "How do I start a D&D campaign?",
  kind: "framework",
  shortAnswer:
    "Start a D&D campaign with a playable situation the characters have a reason to care about, not a finished world. Choose a clear premise and tone, decide whether to run a published adventure, homebrew, or a mix, and agree the D&D rules and character-creation choices that affect the start. Then run a compact Session 0 to set expectations and connect the party, prepare the first location and problem, and let the campaign grow from what the players actually do.",
  sections: [
    {
      kind: "prose",
      heading: "Blank page to playable table",
      paragraphs: [
        "The hardest part of starting a D&D campaign is not learning the rules. It is deciding how much to build before the first die roll, and most new Dungeon Masters build far too much in the wrong direction. The impulse to write a continent, a timeline, and a pantheon feels responsible, but it produces a lot of material the table never touches and leaves the actual first session vague.",
        "A campaign becomes playable when the players have a situation to act on, a reason to act together, and enough surrounding detail that their choices matter. Everything beyond that can wait until play shows you what the group cares about. Your job before session one is to make the first session concrete, not to make the whole world complete.",
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
          text: "A published adventure saves you from inventing the initial situation; homebrew gives you more freedom over setting and pace but makes it easier to overbuild. A hybrid, running a published structure while replacing its location, NPCs, or factions with your own, can give you the best of both. For a published adventure, read the overview to understand its premise, then prepare the opening and the material most likely to appear next; you do not need to memorise the whole book before session one. See the comparison below before you commit.",
        },
        {
          term: "Set the D&D rules and character-creation baseline",
          text: "Before characters are made, agree which D&D edition or rules baseline you are using, the starting level, and which character-creation sources are allowed. Decide how ability scores and starting equipment will be handled under those rules, whether advancement uses XP, milestones, or another agreed approach, and which house rules affect character creation or session one. Characters can be made together or brought ready-made; say which you expect. Decide the few D&D rules choices that affect character creation and session one, and leave the rest until it matters. You do not need to master every rule: know the basic play loop, know where to look things up, and pre-read only the monsters, abilities, or subsystems likely to come up. If a rule is unclear, make a ruling that suits your table and keep play moving; check it afterwards if needed.",
        },
        {
          term: "Run a compact Session 0",
          text: 'Use the session to align on expectations, boundaries, scheduling, and character connections, not to deliver a lore lecture. If the group wants a party connection before play, build or cross-reference characters together; characters can also begin as strangers and choose to cooperate during the opening. Finish with a clear answer to "where do we start, and why are we together?"',
        },
        {
          term: "Prepare the first playable location or local area",
          text: "Start where the characters can meaningfully interact: a dungeon, ship, caravan, festival, military camp, prison, isolated manor, stretch of road, planar location, settlement, or wilderness area. A small region with a few nearby places and people with competing aims is a strong sandbox opening; factions and clocks that show how things change when ignored can help when that style fits. They are not requirements for every campaign start.",
        },
        {
          term: "Give the characters a concrete first problem",
          text: "Give the party a concrete reason to act: an expedition, a published adventure's opening hook, an escort, a mystery, a siege, a job, an invitation, a bounty, an opportunity, or an unresolved local problem. Make the choices and likely consequences clear; show what changes if the party delays when delay matters. Not every opening needs a countdown.",
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
        "You do not need a continent map, a full pantheon with ten detailed gods, a calendar stretching back through ages, a plotted arc from level 1 to 20, dozens of named NPCs, or a finished wiki before anyone rolls initiative. Prepare the first playable location and the details that support the choices there. A settlement with a market, a place to rest, a local authority, a few NPCs with visible wants, and pressure between factions is one useful model; a dungeon, ship, journey, mystery, or published opening may need a different handful of details. Build only enough world to support the decisions players can make now, then answer the wider questions as they choose a direction.",
      ],
    },
    {
      kind: "prose",
      heading: "Give the party a reason to stay together",
      paragraphs: [
        "Do not rely on “you are a party now” as the only reason characters keep choosing one another. Some groups begin as strangers and build trust through play; a temporary common goal, a choice to cooperate after the opening incident, or a published adventure's first scenario can create that bond. A shared stake agreed at the table can help too: a common patron who pays them, a shared debt or oath, a place they are jointly responsible for, a danger that affects them all, or a promise they made to the same person. Ask the players to help choose the tie, and write it on the character sheets as an explicit connection, not a footnote. During play, let the first problem test or deepen that connection rather than requiring instant loyalty.",
      ],
    },
    {
      kind: "example",
      heading: "Two starts for the same town",
      paragraphs: [
        "The same frontier settlement, prepared two ways, for a group starting a D&D campaign at level 1. The players made characters together using the table's agreed rules baseline. Only one start is ready to run.",
      ],
      items: [
        {
          term: "The overbuilt start",
          text: 'The DM writes a five-page history of the Grey Marches, names the twelve gods and their domains, maps three neighbouring kingdoms, and plots a level 1 to 12 arc where the party will eventually confront the returned lich-lord. For session one, the notes say "the party meets in Brindle Heath and hears rumours". The opening question is "what do you do?" with no person, pressure, or place named in the prompt. Players ask where the main quest is, the DM improvises a generic job board, and the first hour is spent fishing for a hook.',
        },
        {
          term: "The playable start",
          text: "The DM prepares Brindle Heath as a logging settlement with a failing silver mine. Two factions pull against the town: the mine factor who wants to cut deeper despite flooding, and a circle of marsh wardens who say the dig has broken an old seal. The party share a debt to the same caravan master, giving them a reason to arrive together; the group could instead let that connection form through play. The first problem is concrete: a crew did not return from the lower adit, water is rising, and the factor offers coin while the wardens offer a warning. The DM has the market square, mine headframe, and flooded adit mapped, plus an NPC who wants something now in each place and the creature stat blocks expected in the mine.",
        },
        {
          term: "Why it works",
          text: "The second start gives the party a playable place, people with different aims, and a clear choice: who to talk to and whether to descend. That choice shows the DM what the group cares about. The blocked adit, missing crew, and two offers give the next session direction without a kingdom map. Here, delay matters: if the party ignore the mine, the factor sends a less careful crew in two days and the seal breaks messily. Another campaign opening might begin with an invitation or destination and no countdown at all.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Campaign launch packet: enough to begin",
      intro:
        "You are ready when you have these essentials. Build only enough world to support the decisions players can make now; start playing and capture the pieces that become relevant:",
      items: [
        "A one-sentence premise and tone.",
        "An agreed D&D rules and character-creation baseline: edition, starting level, allowed sources, ability scores and equipment, advancement, relevant house rules, and whether characters are made together or arrive ready-made.",
        "A reason for the characters to start together, or room for them to choose to cooperate during the opening.",
        "The first playable location or area.",
        "A first problem, opportunity, invitation, or destination with clear choices and consequences where they apply.",
        "Two to four NPCs or creatures likely to matter, with the relevant stat blocks to hand.",
        "Only the maps, rules references, and other material needed for session one; for a published adventure, the overview and opening section, not the whole campaign memorised.",
        "One place to record what became canon after play.",
      ],
    },
    {
      kind: "list",
      heading: "What next?",
      intro: "Follow the part of getting started you need next:",
      items: [
        {
          term: "First time DM?",
          text: "Start with [how to GM for the first time](/answers/how-do-i-start-gming-for-the-first-time).",
        },
        {
          term: "Need to align the group?",
          text: "Use [the Session 0 guide](/answers/how-do-i-run-a-successful-session-0).",
        },
        {
          term: "Ready to play?",
          text: "Follow [step-by-step first-session prep](/answers/how-do-i-prepare-an-rpg-session-step-by-step).",
        },
        {
          term: "Want an open campaign?",
          text: "See [how to prepare a sandbox campaign](/answers/how-do-you-prepare-a-sandbox-rpg-campaign).",
        },
        {
          term: "Need to organise what survives session one?",
          text: "Read [how to organise campaign notes](/answers/how-do-you-organise-rpg-campaign-notes).",
        },
      ],
    },
  ],
  codexConnection: {
    heading: "Build the first playable pieces of your campaign",
    paragraphs: [
      "Start with the D&D hub, then use Codex Cryptica to capture only the locations, NPCs, creatures, or factions the opening needs. Connect them to Session 0 decisions and session-prep notes so useful details stay findable as play expands; you do not need to populate a campaign database before the first session.",
      "After play, keep the details that became relevant and the relationships the characters changed. The Graph can make those connections visible as the campaign grows, without asking you to plan the whole world in advance.",
    ],
    linkText: "Explore D&D tools and guides",
    href: "/for/dungeons-and-dragons",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Draft a town or village if that is the kind of place your campaign starts; districts and local pressure are optional details.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Create only the NPCs your opening scene needs, with clear reasons for the party to engage.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Add competing groups when factions suit your campaign's opening situation.",
      href: "/generators/faction",
    },
    {
      title: "Tavern generator",
      description:
        "Add a tavern if it fits the first playable location or opening scene.",
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
    "how-do-i-organise-a-dnd-campaign",
    "what-should-a-new-dnd-player-know-before-their-first-game",
    "how-do-i-plan-story-arcs-for-an-rpg-campaign",
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
        with: "answer-new-dnd-player-first-game",
        reason:
          "This answer is for the GM choosing a D&D campaign premise, rules baseline, and opening situation; the new-player page is for someone learning how to participate at the table after joining that game.",
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
      "Start your D&D campaign with an agreed rules baseline, connected characters, and a playable first situation—not a finished world.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-start-a-dnd-campaign.jpg",
    imageAlt:
      "Dungeon Master notes, dice, and a small settlement map laid out for the first D&D campaign session",
  },
};

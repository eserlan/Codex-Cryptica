import type { AnswerConfigInput } from "../schema";

export const howDoYouCreateAFantasyCityThatFeelsAlive: AnswerConfigInput = {
  slug: "how-do-you-create-a-fantasy-city-that-feels-alive",
  category: "worldbuilding",
  publishedAt: "2026-09-10",
  question: "How do you create a fantasy city that feels alive?",
  kind: "framework",
  shortAnswer:
    "Make a fantasy city feel alive by showing what its people do repeatedly, what they are worried about today, and how yesterday's events have changed the streets. Give each district a daily rhythm, put competing groups in public view, let rumours travel through recognisable places, and change familiar details after the party acts. Players believe in a city when it carries on around them and remembers their presence.",
  sections: [
    {
      kind: "prose",
      heading: "Show a city in the middle of its day",
      paragraphs: [
        "A city feels empty when it exists only at the moment the party needs a shop, a quest giver, or a fight. Start each district with a routine that happens whether the party attends or not: fish auctions at dawn, court petitions before noon, a bridge closed for the evening toll, or apprentices carrying water to a glassworks. A routine gives people somewhere to be and a reason to react when something interrupts it.",
        "Choose public spaces where those routines overlap. A market square, shrine steps, ferry queue, bathhouse, gate, or food stall lets the party overhear arguments, see who has money, and notice what has changed without every detail becoming a formal briefing. One repeated place is more useful than a long list of landmarks because it gives later changes a familiar backdrop.",
      ],
    },
    {
      kind: "list",
      heading: "Give every district six moving parts",
      intro:
        "Prepare one or two concrete details for each part. They create enough motion for the city to answer player attention without requiring a census.",
      items: [
        {
          term: "A daily rhythm",
          text: "Name the time, place, and people involved. The river market opens at first bell; the watch changes at the south gate after dusk.",
        },
        {
          term: "Two competing groups",
          text: "Make their disagreement visible in public. A guild blocks a street with carts while temple volunteers hand out food to the workers it displaced.",
        },
        {
          term: "A local pressure",
          text: "Use something that makes ordinary decisions harder: a delayed grain barge, an approaching festival, a new tax, an illness, or a broken aqueduct.",
        },
        {
          term: "A shared public space",
          text: "Choose the place where status, gossip, and inconvenience collide. Let familiar NPCs cross paths there for reasons unrelated to the party.",
        },
        {
          term: "Rumours with owners",
          text: "Decide who repeats each rumour and what they gain by doing so. A report that changes a shopkeeper's behaviour is more convincing than an anonymous clue.",
        },
        {
          term: "A visible change",
          text: "After a session, alter one sign, schedule, price, queue, or relationship. The party should be able to see that time passed even if they ignored the district.",
        },
      ],
      outro:
        "Do not invent all six parts for every street. Give three or four districts this depth, then add detail only where the party returns.",
    },
    {
      kind: "example",
      heading: "Worked example: Lantern Market after a missing grain barge",
      paragraphs: [
        "Lantern Market is the riverfront district where barges unload grain before it reaches the inner-city bakeries. The party first visits on a normal morning, then returns after choosing not to investigate a disappearance on the river.",
      ],
      items: [
        {
          term: "First visit",
          text: "Porters race sacks from the quay at dawn, bakers argue over stall space, and the Candle Guild collects a fee from every barge captain. At the shrine steps, Sister Hale gives bread to dock children while quietly asking who saw the grain master leave after dark.",
        },
        {
          term: "The pressure",
          text: "A grain barge is three days late. The Candle Guild says river pirates are responsible; the porters say the guild diverted it to force prices up. Both claims contain enough truth to recruit allies and make enemies.",
        },
        {
          term: "The party returns",
          text: "Bread costs twice as much, the dawn auction is silent, and the shrine queue reaches across the square. Guild guards now stand at the quay, while a porter the party met has begun selling ration tokens from an alley. Sister Hale no longer asks for witnesses because she has been barred from the steps.",
        },
        {
          term: "Why it works",
          text: "The market did not produce a new plot when the party came back. Familiar people responded to the same pressure, and the changed prices, queue, and access to the shrine show the consequence before anyone explains it.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Advance the city between sessions",
      paragraphs: [
        "After every session, ask one small question for each district the party touched: what became harder, who gained leverage, and what would a passer-by notice first? Write the answer as a physical or social change, not as hidden plot notes. A tavern has stopped serving after midnight. A new banner hangs over the council hall. The watch searches carts at the gate. The baker's window is boarded up.",
        "This also gives player choices weight without making the city punish them for every delay. Choose changes that follow from established pressure, including helpful ones. If the party exposed a corrupt toll collector, the ferry line may move faster and the ferrymen may now greet them by name. If they backed the wrong guild, a familiar vendor may avoid their eyes. Continuity is what makes the city feel inhabited.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before the next city session",
      intro:
        "Use this quick pass to make a return visit feel different from the last one.",
      items: [
        "Can you name one routine the party can witness in each prepared district?",
        "Which two groups disagree in public, and what can a bystander see them doing about it?",
        "What current pressure is making normal city life more difficult?",
        "Where do people gather to trade news, wait, complain, or show status?",
        "Which named person is spreading a rumour, and what do they want from it?",
        "What has visibly changed since the party last passed through this place?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep a city's moving parts connected",
    paragraphs: [
      "A city becomes easier to run when its districts, people, factions, and events are separate notes with links between them. Record a market's routine, the guild that controls it, and the NPCs who depend on it once. When a barge vanishes or the party changes a local balance of power, those connections show what else should react.",
      "Codex Cryptica can hold those people, places, and consequences together in a campaign graph, so a familiar district can change over time without relying on memory or a single sprawling city document.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Create districts and cities with a reason to exist, local tensions, and places the party can visit.",
      href: "/generators/settlement",
    },
    {
      title: "NPC generator",
      description:
        "Build the recurring people whose routines, loyalties, and reactions make a district recognisable.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Create the guilds, faiths, crews, and civic groups competing to shape city life.",
      href: "/generators/faction",
    },
    {
      title: "Rumour generator",
      description:
        "Draft local reports tied to named sources, current tensions, and choices the party can pursue.",
      href: "/generators/rumour",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Keep settlements, factions, NPCs, and local consequences connected across a campaign.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-should-an-rpg-settlement-contain",
    "how-do-you-run-an-rpg-campaign-in-one-city",
    "how-to-create-rumours-for-a-fantasy-town",
    "how-many-npcs-does-an-rpg-town-need",
  ],
  labels: ["fantasy", "rumour"],
  discovery: {
    id: "answer-living-fantasy-city",
    parentCluster: "settlement-creation",
    clusters: ["rumour", "settlement-creation"],
    primaryIntent: "how to create a fantasy city that feels alive",
    intentAliases: [
      "how to make a fantasy city feel lived in",
      "fantasy city worldbuilding ideas",
      "how to make an rpg city feel alive",
    ],
    uniqueValue:
      "A table-facing method for making a city visibly active: daily rhythms, public spaces, competing groups, local pressure, owned rumours, and small changes that persist after player choices.",
    userJob: "create",
    relatedIntents: [
      "answer-settlement-contents",
      "answer-single-city-campaign",
      "answer-create-fantasy-town-rumours",
      "generator-settlement",
      "generator-npc",
      "generator-faction",
      "generator-rumour",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-settlement-contents",
        reason:
          "The settlement answer identifies the locations, people, economy, and problem needed to prepare a place. This answer shows how to make those prepared elements visibly active and changing during play.",
      },
      {
        with: "answer-single-city-campaign",
        reason:
          "The one-city campaign answer structures a whole campaign around recurring districts, cast, consequences, and layered secrets. This answer is a session-facing method for showing a city's ordinary activity and short-term changes.",
      },
      {
        with: "answer-create-fantasy-town-rumours",
        reason:
          "The rumour answer designs individual claims, sources, and consequences. This answer places rumours among the routines, public spaces, and competing groups that make a whole city feel active.",
      },
    ],
  },
  seo: {
    title: "How Do You Make a Fantasy City Feel Alive? | Codex Cryptica",
    description:
      "Make a fantasy city feel alive with daily routines, competing groups, local pressure, public spaces, rumours, and visible change after player choices.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-create-a-fantasy-city-that-feels-alive.jpg",
    imageAlt:
      "A busy fantasy river market where guild workers, pilgrims, and merchants gather beneath lanterns",
  },
};

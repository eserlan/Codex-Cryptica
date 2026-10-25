import type { AnswerConfigInput } from "../schema";

export const howManyRandomEncountersDuringRpgTravel: AnswerConfigInput = {
  slug: "how-many-random-encounters-during-rpg-travel",
  category: "adventure-design",
  publishedAt: "2026-10-25",
  question: "How many random encounters should you use during RPG travel?",
  kind: "framework",
  shortAnswer:
    "As a pacing heuristic, start with roughly one substantial encounter per week of travel, not a rule. Some weeks should pass without incident, and a dangerous or unfamiliar route can support two or three in a week when each one offers a real choice. Decide first how much table time the journey deserves, then spend that time on a small number of scenes. A sighting, rumour, or brief choice can stay brief, and many rolled prompts work best as colour or foreshadowing instead of a full encounter.",
  sections: [
    {
      kind: "prose",
      heading: "Count scenes and minutes before you count rolls",
      paragraphs: [
        "A common setup causes the worry behind this question. The Game Master (GM) has a good collection of non-combat travel events, perhaps a sphinx at a crossroads, a strange shrine, a robbery victim, a mysterious stranger, or a gambling tournament at a waystation. The GM rolls to see how many occur each week, allowing zero and capping the result at three. The players enjoy the events, yet the GM can feel the journey stalling, because each new prompt arrives as a full scene whether it earned one or not.",
        "Frequency alone does not describe the cost. Three events that each take two minutes of colour, a sighting on the ridge, a rumour from a passing carter, a choice of ford, can pass inside a single travel montage. One event that grows into a forty minute negotiation or rescue can take the centre of a session. Two journeys with the same number of rolls can therefore feel completely different at the table. The working constraint is table time: how much of your session the journey deserves, given everything else competing for that time.",
        "That budget changes with the shape of the campaign. In a three hour session where travel is one leg between two places the players care about, the journey might deserve fifteen minutes and one short scene. In a wilderness expedition that spans several sessions, where the route itself is the adventure, the same three hours might hold two substantial encounters and several brief ones. Elapsed in-world days matter less than session length and player interest, so set the budget in scenes and minutes first and let the in-world calendar follow.",
      ],
    },
    {
      kind: "table",
      heading: "Starting rates by journey type",
      headers: ["Journey", "Substantial encounters", "Handling"],
      rows: [
        [
          "Travel as background",
          "0-1 for the entire journey",
          "Montage the road. Play one scene only if it changes the destination, the party, or what waits on arrival.",
        ],
        [
          "Ordinary travel",
          "About 1 per in-world week",
          "Expect some weeks to pass quietly. Let shorter sightings and rumours fill the gaps between substantial scenes.",
        ],
        [
          "Exploration-focused or dangerous travel",
          "2-3 per week",
          "Use the higher rate only when each event adds a meaningful choice or consequence. Drop back when events start repeating the same decision.",
        ],
        [
          "Familiar safe route",
          "Often none",
          "A road the party has travelled before, in settled country, usually needs no roll at all. Save prompts for changed conditions, such as war, flood, or a new faction on the road.",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "What the starting rates assume",
      paragraphs: [
        "Read the table as a pacing heuristic, not a system rule. A substantial encounter means a scene the party plays out with a decision inside it, such as whether to aid the robbery victim, bargain with the stranger, or enter the tournament. Brief colour sits outside the count. A week with one substantial encounter, two rumours, and a change of weather has had plenty happen; only one part of it asked the players to commit time and risk. These sizes are starting choices: if players investigate a detail, expand the scene or agree together how to summarise or pause it.",
        "Several conditions move the rate up or down. Destination urgency lowers it: a party racing a closing pass or a rival messenger may choose to refuse detours. Honour that choice without inventing a punishment; any established toll, flood, injury, or deadline still has its ordinary effects. Route danger raises the rate, because danger the players chose when they picked the road deserves visible form. Repeated routes lower it sharply, since a second telling of the same shrine mystery rewards nobody. Current plot momentum matters too. A journey that interrupts a tense sequence at the destination can afford fewer diversions than a journey that is itself the current story. Player appetite overrides the arithmetic in both directions, and the section on reading the table below covers how to judge it. A scene budget controls narration only; it does not silently cancel agreed hazard checks, resource costs, or other travel procedures.",
      ],
    },
    {
      kind: "list",
      heading: "Budget the journey in five steps",
      intro:
        "This procedure keeps a table of prompts useful without letting the dice set the session length:",
      items: [
        {
          term: "Establish what the journey is for",
          text: "Name the job the travel does in the campaign. It might connect two adventures, reveal a region, test supplies and nerve, or give the party time together away from patrons and courts. A connecting journey and an expedition deserve different budgets, and naming the job makes that choice deliberate.",
        },
        {
          term: "Choose a scene budget",
          text: "Pick how many substantial scenes the journey may hold, and roughly how much table time they may take together. One substantial scene for a three week trip is a reasonable default when the destination matters more than the road. Write the budget down where you can see it during play.",
        },
        {
          term: "Roll or select prompts",
          text: "Roll on your table, draw from your prepared list, or mix the two. Generate more prompts than the budget allows, because selection needs material to select from. A simple method that suits the zero to three habit: roll once per week for whether the road offers anything, then choose the prompt that fits the terrain and the current state of the region.",
        },
        {
          term: "Play out only what earns a scene",
          text: "Start each prompt at a suitable size. If players investigate, expand it or agree how to summarise or pause it. Give it a full scene when it presents a choice with consequences the party cannot walk past unchanged: a cost, a commitment, or knowledge that alters the plan.",
        },
        {
          term: "Montage the remainder",
          text: "Agree with the table which remaining prompts to summarise in a sentence or two. Montage keeps the road populated without requiring full scenes.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Four sizes of travel event",
      intro:
        "A rolled prompt tells you something is there. It does not tell you how large to play it. Choose the size deliberately:",
      items: [
        {
          term: "Colour",
          text: "A detail first presented in passing: shrine smoke, fresh cart tracks, a new notice beneath the gibbet. Colour gives the region texture. Most prompts can start here; players may investigate as described above.",
        },
        {
          term: "Foreshadowing",
          text: "A detail that may matter later: the robbery victim describes a livery the party may see at the destination, or the stranger asks after a name they know. Present it briefly; the payoff can come later.",
        },
        {
          term: "A meaningful decision",
          text: "A short scene with a real fork: help the victim and lose half a day, or press on ahead of the weather; enter the tournament and risk coin for local goodwill, or sleep early and leave unknown. Play out the effects on time, resources, standing, or knowledge.",
        },
        {
          term: "A full side quest",
          text: "An event that opens its own thread: a sphinx trades passage for an honest answer it will remember, or a shrine keeper asks the party to carry a relic onward. Reserve this for prompts tied to the wider campaign, and budget for it knowingly. One per journey is plenty for most campaigns.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Quiet weeks do useful work",
      paragraphs: [
        "Nothing happens is a valuable result, and a table that cannot produce it will eventually crowd out everything else. A quiet week establishes that the road is sometimes simply a road, which makes the week with the sphinx feel like an event rather than a schedule. Quiet travel also returns time to the destination, lets supplies and injuries settle into bookkeeping the players chose, and gives recent consequences room to be discussed in camp before the next interruption arrives.",
        "Treat each prompt as material to judge, not an instruction to open a scene. If it repeats last week's decision, clashes with a deadline, or belongs to a region the party left behind, agree whether to summarise it or leave it out. Keep established consequences and locations intact; do not move unresolved situations just to protect the schedule.",
      ],
    },
    {
      kind: "example",
      heading: "Three weeks on the Salt Road",
      paragraphs: [
        "A party is travelling three weeks to reach a border town before a trade fair ends. The GM decides the journey is a connecting trip inside two three-hour sessions, and sets a budget of two substantial encounters, a handful of brief events, and quiet travel otherwise. The GM rolls once per week and gets prompts for all three weeks, then sizes each one against the budget. The two scenes take about fifty minutes of table time together. The rescue costs half a day in the fiction; competing can affect the party's standing at the fair.",
      ],
      items: [
        {
          term: "Week one: quiet, with one rumour planted",
          text: "The roll offers a strange shrine. The party is fresh, the fair deadline is distant, and the GM wants the road to feel long before it feels eventful, so the shrine is first presented as colour and foreshadowing. The travellers pass its smoke and a keeper ringing a handbell at dawn; a carter at the next camp says the keeper blesses caravans that leave salt, and warns that nobody has seen her for a month. The brief narration takes two minutes. The players can investigate if they wish; here, they accept the rumour and walk on.",
        },
        {
          term: "Week two: a rescue with a cost",
          text: "The roll offers a robbery victim. The GM starts this meaningful decision as a ten-minute scene. The victim is a salt merchant's guard, hurt and stranded beside the road. Helping him back to the last waystation costs half a day against the fair deadline; leaving him keeps the schedule. The players choose to help, lose the half day, and learn the merchant house's name from the guard. The journey resumes with their plan changed.",
        },
        {
          term: "Week three: a tournament and an introduction",
          text: "The roll offers a gambling tournament at the last waystation. The rescued guard introduces the party to his merchant house's representative, paying off their earlier choice. In the forty-minute scene, they can compete, wagering coin and a favour, or decline; either way, they learn that a rival house is buying up salt contracts before the fair. Competing may change their standing or leave them owing a debt. If they had left the guard behind, there would be no introduction, though they could still approach the tournament.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Reading the table and adjusting mid-journey",
      intro:
        "Player appetite is the signal that tells you whether the current rate fits. Check it before adding another scene:",
      items: [
        "Players lean in when a prompt appears, ask what their characters can see or try, and refer back to earlier road events. The rate is working; hold it.",
        "Players start asking how many days remain, summarise their own actions to move things along, or check supplies mainly to end the leg. Shrink the next prompt to colour or skip it.",
        "An unplanned detour is running long while the destination waits. Ask whether players want to continue, summarise or pause it; do not move an unresolved situation elsewhere just to meet the budget.",
        "The party refuses a detour because the destination matters more right now. Do not invent a penalty for refusing; let established costs and deadlines have their ordinary effects. The prompt can be left behind or revisited if the fiction supports it.",
        "Before adding another scene, ask whether players want to keep playing out the journey or move on to arrival.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping road events tied to the wider campaign",
    paragraphs: [
      "Travel prompts stay useful longer when each one attaches to a place, faction, or person that already exists in the campaign, so a rescued guard can reappear at the destination and a shrine rumour can point at a real keeper. The free encounter generator gives starting situations with an activity already in progress; the budget above decides how many of them earn a scene on a given journey.",
    ],
    linkText: "Try the encounter generator",
    href: "/generators/encounter",
  },
  relatedTools: [
    {
      title: "Encounter generator",
      description:
        "Free, no login. Travel situations with something already happening, ready to size as colour, a decision, or a full scene.",
      href: "/generators/encounter",
    },
  ],
  relatedAnswers: [
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "what-makes-a-good-random-encounter",
    "point-crawl-vs-hex-crawl",
    "what-is-a-point-crawl",
  ],
  discovery: {
    id: "answer-encounter-frequency-travel",
    parentCluster: "encounter-design",
    primaryIntent: "how many random encounters during rpg travel",
    intentAliases: [
      "how often should random encounters happen during travel",
      "random encounter frequency rpg travel",
      "how many encounters per week of travel rpg",
    ],
    uniqueValue:
      "Pacing heuristics for how often random encounters should occur during RPG travel, separating frequency from scene duration, budgeting substantial scenes by table time, and showing a worked three-week journey with quiet travel and two consequential scenes.",
    relatedIntents: [
      "answer-travel-interesting",
      "answer-random-encounter",
      "answer-point-crawl",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-random-encounter",
        reason:
          "Encounter design concerns what makes a single random encounter worth playing; this answer concerns how often encounters of any quality should occur during travel and how much table time each should receive.",
      },
      {
        with: "answer-travel-interesting",
        reason:
          "The travel framework concerns how to structure an engaging journey with routes, roles, and costs; this answer concerns the narrower pacing decision of encounter frequency and scene budgeting along the way.",
      },
    ],
  },
  seo: {
    title: "How many random encounters during RPG travel? | Codex Cryptica",
    description:
      "Roughly one substantial encounter per travel week, with quiet weeks included. Rates by journey type, a scene budget method, and a worked three-week example.",
    image:
      "https://assets.codexcryptica.com/og/how-many-random-encounters-during-rpg-travel.jpg",
    imageAlt:
      "Travelling party on a moorland road at golden hour pausing to decide whether to investigate smoke rising from a distant ruined shrine",
  },
};

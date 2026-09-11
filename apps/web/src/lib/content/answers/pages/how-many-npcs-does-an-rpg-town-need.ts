import type { AnswerConfigInput } from "../schema";

export const howManyNpcsDoesAnRpgTownNeed: AnswerConfigInput = {
  slug: "how-many-npcs-does-an-rpg-town-need",
  category: "session-prep",
  publishedAt: "2026-09-07",
  question: "How many NPCs does an RPG town need?",
  kind: "framework",
  shortAnswer:
    "A town needs roughly three to five named NPCs for a single visit, six to ten for a settlement the party returns to across a campaign, and no fixed number for the background population, which stays unnamed until a player addresses someone directly. Scale by how many roles the party will interact with, not by the town's population figure, and add named NPCs only when the story creates a reason for one.",
  sections: [
    {
      kind: "prose",
      heading: "The population figure is the wrong input",
      paragraphs: [
        "A town of 2,000 does not need 2,000 NPCs, or even a meaningful fraction of one. Population size describes the setting; it says nothing about how many people the party will actually speak to. A GM who tries to staff a town in proportion to its size ends up with a folder of unused names and a session that still runs on whichever three characters happened to be in the room when the dice mattered.",
        "The number that matters is roles, not residents: how many jobs does this scene need filled? A gate to get through needs a guard. A rumour needs a source. A grudge needs someone to hold it. Count the jobs the plot creates, then name a person for each one.",
      ],
    },
    {
      kind: "list",
      heading: "Sizing the cast to the visit",
      intro: "Scale the named roster to how long the party will stay:",
      items: [
        {
          term: "A single stopover: three to five names",
          text: "One person to sell or trade with, one with authority the party has to get past or win over, and one who is a problem, either for the party or for the town. That covers most single-session towns without leftover prep.",
        },
        {
          term: "A recurring base: six to ten names",
          text: "Once the party returns more than twice, add a rival to the person they already trust, a second authority figure whose interests conflict with the first, and someone low-status who knows things the officials do not. Ten named NPCs is a working ceiling; past that, most GMs cannot keep voices and motives straight without notes, and neither can most players.",
        },
        {
          term: "The unnamed population: as needed, never in advance",
          text: "Everyone else stays a role, not a name: the miller, the watch captain's second, the woman selling apples. If a player asks the miller a direct question, the miller becomes a name on the spot. Prepping names for people nobody addresses is prep that never gets spent.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Harrow's Ford: a two-session river town",
      paragraphs: [
        "The party is passing through for two sessions, not settling in. The prep should match that.",
      ],
      items: [
        {
          term: "Overprepped version",
          text: "The GM writes a census: the reeve, the reeve's clerk, three guild masters, a temple hierarchy of four, and a dozen shopkeepers with stock lists. Two sessions later, the party has spoken to the innkeeper and nobody else, and the other fourteen names sit unused on a page.",
        },
        {
          term: "Role-sized version",
          text: "The GM names three people: Reeve Cass, who wants the party gone before an inspector arrives; Odry the ferryman, who will trade passage for news; and a stranger paying labourers to sabotage the bridge, introduced only once the party starts asking who benefits from it staying broken. Everyone else, the innkeeper, the guards at the gate, stays a role until addressed.",
        },
        {
          term: "Why it works",
          text: "Three named NPCs cover every job the plot actually needs done: someone to push the party along, someone to trade with, someone to be the problem. When a player corners the ferryman with a direct question, he already has a want and a stake, because he was one of the three the GM chose to name rather than one of twelve filled in by default.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Reuse before you add",
      paragraphs: [
        "Before creating a new named NPC, check whether an existing one can hold the new job. The guard who let the party through the gate can also be the one who saw the smuggler's cart last week. The merchant with the grudge can also be the one who knows where the missing ledger went. Folding jobs onto existing NPCs makes the cast feel woven together instead of scattered, and it keeps the ten-name ceiling from being reached by session three.",
        "Expand only when the party's own actions demand it. If they hire a permanent contact in town, adopt a stray NPC, or make an enemy of someone who was a role five minutes earlier, that person earns a name and a want. Let player interest drive the roster instead of trying to anticipate every direction the story could go.",
      ],
    },
    {
      kind: "checklist",
      heading: "Before naming another NPC, confirm",
      intro: "Check each new name against this before adding it to the roster:",
      items: [
        "No existing named NPC can plausibly hold this job instead.",
        "The named cast for this settlement is still under ten.",
        "This person has a want tied to the party's current problem, not just a title.",
        "At least one existing named NPC has a stake in this new one's business.",
        "The background population stays unnamed until a player speaks to someone specific.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keeping a town's cast from sprawling past what gets used",
    paragraphs: [
      "A named cast that stays small only works if the GM can see, at a glance, who already covers which job and who is tied to whom. Codex Cryptica tracks NPCs as entities connected to the settlement and faction they belong to, so reusing an existing NPC for a new job is a lookup rather than a guess.",
      "Roll a settlement's starting cast with the free settlement and NPC generators, then add names only as the campaign actually calls for them.",
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
      title: "Settlement generator",
      description:
        "Free, no login. Towns and cities with a reason to exist, across any genre.",
      href: "/generators/settlement",
    },
    {
      title: "Faction generator",
      description:
        "Create the organisations, guilds, and syndicates a town's NPCs belong to.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for fantasy worldbuilding",
      description:
        "Regions, settlements and the factions that fight over them, connected.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "what-should-an-rpg-settlement-contain",
    "how-do-you-run-an-rpg-campaign-in-one-city",
    "how-do-you-make-npcs-memorable-without-lots-of-prep",
    "how-do-you-organise-npc-relationships",
    "how-do-you-improvise-npcs-on-the-spot",
    "how-do-you-create-a-fantasy-city-that-feels-alive",
  ],
  discovery: {
    id: "answer-npcs-per-town",
    parentCluster: "npc-creation",
    primaryIntent: "how many npcs does an rpg town need",
    intentAliases: [
      "how many named npcs per town",
      "npc count for rpg settlement",
      "how many characters does a town need dnd",
    ],
    uniqueValue:
      "Sizes the named cast to the length of the visit (three to five for a stopover, six to ten for a recurring base) rather than to population, and gives a reuse-before-adding rule to stop the roster from sprawling.",
    relatedIntents: ["answer-settlement-contents", "answer-npcs-memorable"],
    acknowledgedOverlap: [
      {
        with: "answer-settlement-contents",
        reason:
          "The settlement answer covers everything a settlement needs (locations, economy, problem); this answer isolates the single question of how many named NPCs specifically, at what scale, and when to add more.",
      },
    ],
  },

  seo: {
    title: "How many NPCs does an RPG town need? | Codex Cryptica",
    description:
      "Three to five named NPCs for a stopover, six to ten for a recurring base. How to scale a town's cast by role instead of population, with a worked example.",
    image:
      "https://assets.codexcryptica.com/og/how-many-npcs-does-an-rpg-town-need.jpg",
    imageAlt:
      "A hooded traveller crossing a lantern-lit fantasy town square at dusk, past a stone well and timber-framed market stalls",
  },
};

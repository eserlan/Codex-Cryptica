import type { AnswerConfigInput } from "../schema";

export const howDoIEncouragePartyBondingDuringDowntime: AnswerConfigInput = {
  slug: "how-do-i-encourage-party-bonding-during-downtime",
  category: "running-the-game",
  publishedAt: "2026-10-20",
  question:
    "How do I encourage party bonding during downtime without forcing roleplay?",
  kind: "how-to",
  shortAnswer:
    "Ask the players whether they want more character-to-character time, then offer short, optional ways to meet after a mission: a debrief, a shared meal, a montage, or a quick skip to the next job. Keep separate homes, use a shared place and a prompt tied to recent play, and let anyone pass, summarise in third person, or head home without a penalty.",
  sections: [
    {
      kind: "prose",
      heading: "Ask the players before you fix the fiction",
      paragraphs: [
        "Separate houses are not the problem to solve. If each character goes home after a mission, that may be the players choosing rest, errands, or a faster return to the adventure. It becomes a gap only if the table wants more time together and has no natural place or reason for it. Treat this as a preference question first and a setting question second.",
        'Ask out of character, before you redesign the town. Try: "After a mission, would you like a short scene together, a quick montage, time on your own downtime actions, or to cut straight to the next job? You can change your mind mission by mission, and passing will not cost you anything." Note the mix. One player wanting long conversations and another wanting a skip is useful information, not a disagreement to settle by majority vote.',
        "Actual-play shows are a poor measure here. Performers play to an audience and often have the time and practice to sustain long improvised scenes. A home table that prefers a two-minute summary has not failed at the same task. Offer opportunities to connect; do not require a performance of closeness.",
      ],
    },
    {
      kind: "list",
      heading: "Give them a shared reason to meet",
      intro:
        "People gather more easily when the gathering has a job. Borrow a reason that already exists in your town rather than inventing pressure to socialise:",
      items: [
        {
          term: "A mission debrief",
          text: "The city watch, guild, patron, or council asks what happened. The party must agree on what to report, which starts conversation without asking anyone to share feelings on command.",
        },
        {
          term: "Something to divide or study",
          text: "Loot, a map, a captured letter, or research that needs more than one pair of hands. Characters can argue about an object or a plan while their views of each other come out in passing.",
        },
        {
          term: "A person in common",
          text: "An injured ally to visit, a shared contact with news, a neighbour who cooks for anyone back from the road, or a memorial for someone lost. Care shows in who turns up and what they bring.",
        },
        {
          term: "A recurring town occasion",
          text: "A market evening, a feast after a delivery, a council meeting, or a neighbourhood gathering that happens whether or not the party attends. Recurrence matters: a place they can choose again reads as an invitation, a one-off summons reads as a plot requirement.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Use a shared place, not shared housing",
      paragraphs: [
        "The party needs a place they associate with each other, not a single address. A favourite cafe or tavern table, a guild room, a public bath, a rooftop garden, a workshop bench, or a corner of the central plaza all work. So does an optional clubhouse or shared storeroom, provided nobody has to live there and nobody loses their own home to gain it.",
        "Keep the place ordinary and repeatable. Give it a keeper who knows their usual orders, a noticeboard, a kettle, or a view of the walls. Return to the same spot and small habits accumulate: who sits where, who pays, who arrives late from the infirmary. That accumulation does more for a sense of companionship than a speech about friendship.",
        "Do not treat separate homes as a defect to correct. Homes hold family, privacy, projects, and a life outside the party. A character who goes home to a partner, a parent, or an empty room they love is showing you something about them. Let home stay in the background, or visit it in a short scene when the player wants that.",
      ],
    },
    {
      kind: "list",
      heading: "Offer prompts tied to the mission just played",
      intro:
        "Open questions about hopes and fears ask for a lot. A prompt anchored in the last few sessions gives the player something concrete to answer, briefly if they prefer:",
      items: [
        {
          term: "Who surprised you in the ruins?",
          text: "Names a moment another player created, so appreciation lands on play that actually happened.",
        },
        {
          term: "What do we tell the people back home?",
          text: "Turns the debrief into a joint decision about honesty, credit, and blame.",
        },
        {
          term: "What will you do differently next time?",
          text: "Looks forward. It suits practical characters who would rather plan than reflect.",
        },
        {
          term: "What did that place cost us?",
          text: "Invites a short reckoning with injuries, spent resources, or a promise made under pressure.",
        },
        {
          term: "Who are we glad was there?",
          text: "Lets a character credit a skill, a rescue, or a steady nerve without a long declaration.",
        },
      ],
      outro:
        "Ask one prompt, not five. Anyone may answer in a sentence, in third person, or not at all. Follow the answer that gets energy, and let the rest go.",
    },
    {
      kind: "list",
      heading: "Keep mechanical and social downtime separate",
      intro:
        "Downtime does two different jobs. They can support each other, but forcing every errand to become a scene exhausts the table:",
      items: [
        {
          term: "Mechanical downtime",
          text: "Crafting, training, shopping, research, healing, running a business, or advancing a project. Resolve most of this with rolls, costs, and a short report of the result.",
        },
        {
          term: "Social downtime",
          text: "Conversations, shared meals, rituals, visits, and checking on each other. Resolve this with an invitation and a prompt, in whatever register the player prefers.",
        },
        {
          term: "Where they help each other",
          text: "A mechanical result can start a social beat without scripting it: the research reveals a name someone recognises, the repaired armour carries a maker's mark, the business needs a delivery two characters could make together. Offer the opening and let the players decide whether to take it.",
        },
      ],
    },
    {
      kind: "list",
      heading: "A 10-minute return-to-town procedure",
      intro:
        "Run this when the party comes home, and skip it without comment when the table wants to move on:",
      items: [
        {
          term: "Offer the choice (1 minute)",
          text: "Say what is available tonight in the fiction: the debrief, the meal, their own errands. Ask who wants a short scene together, who has mechanical downtime to resolve, and who would rather cut ahead.",
        },
        {
          term: "Set one communal opportunity (2 minutes)",
          text: "Place whoever opted in at the shared place with the shared reason: the watch clerk waiting, the meal arriving, the injured friend awake. Nobody needs a reason to be absent beyond going home.",
        },
        {
          term: "Ask one prompt (4 minutes)",
          text: "Put a single question from the list above to the group. Take short answers round the table, or run a montage: one line each on what their character does, says, or quietly notices. Third-person summary counts in full.",
        },
        {
          term: "Land one small follow-through (2 minutes)",
          text: "Turn one answer into a minor, lasting mark: a name added to the memorial wall, a standing invitation, a repaired item returned with thanks, a rumour the keeper repeats next time. Small and specific beats a declaration of lifelong loyalty.",
        },
        {
          term: "Close and move on (1 minute)",
          text: "Resolve any quick mechanical downtime, note anything to remember, and start the next mission. Ending on time teaches the table that opting in is cheap, which makes them more likely to opt in again.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the last city, separate houses",
      paragraphs: [
        "The party defends the last city in a ruined world. Each character has a house in a different district, and they have just returned from checking why the defence ward on the eastern wall flickered during the night. The Game Master (GM) wants them to talk about what they found, so at the wash-up the GM offers a choice: report to the watch together over the midday meal, handle their own errands, or cut to the evening patrol. Three players choose the meal. One chooses home and rest, and that is settled in a sentence with no consequence attached.",
      ],
      items: [
        {
          term: "The setting",
          text: "They meet in the coppersmiths' canteen by the eastern gate, where the watch takes its meals. The clerk needs their report. Their houses, families, and workshops stay exactly where they were.",
        },
        {
          term: "The prompt",
          text: 'While the clerk writes, the GM asks: "What do we tell the people back home about the ward?" The scout wants the flicker kept quiet until they know the cause. The engineer disagrees: the ward crew cannot fix what they are not told about. The healer settles it by proposing they tell the ward crew everything and the street nothing yet, and the others accept. The argument is about the report, and it shows how each character weighs the city.',
        },
        {
          term: "Different levels of taking part",
          text: 'The scout\'s player speaks in character. The engineer prefers summary: "She lays out the cracked housing and says the ward will fail properly within the month if they cannot cast new parts." The healer adds one line and is done. Nobody is asked to extend the scene, and the player who went home gets the agreed report as shared information at the start of the next mission, so opting out cost them nothing they needed.',
        },
        {
          term: "The follow-through",
          text: "The clerk records the party's wording in the watch log and the canteen keeper starts keeping a pot warm on patrol days. Next return, the table can reuse both. The scene took about eight minutes, and the characters who wanted their own doors still have them.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Make room for quieter ways of playing",
      paragraphs: [
        'Lower intensity is not disengagement. A player may show attachment by turning up, remembering what another character said last week, spending a resource on them, or writing a short note between sessions. Some prefer third-person summary ("he thanks her and leaves early"), some prefer asynchronous downtime in a shared document or message thread, and some are mainly here for the missions. All three can care about the party.',
        "Design for the mix. Offer prompts that can be answered in one line, let montage replace dialogue, and put useful information in the communal scene without making it exclusive, so nobody must perform to stay informed. Watch what a player does when the choice is free. Repeatedly choosing the group scene is interest; repeatedly choosing home is information too, and it deserves the same respect.",
      ],
    },
    {
      kind: "list",
      heading: "Failure modes to avoid",
      items: [
        {
          term: "Copying an actual-play table",
          text: "Long, polished downtime scenes are a performance format. Importing the expectation without the cast, the edit, or the consent produces pressure, not intimacy.",
        },
        {
          term: "The mandatory tavern scene",
          text: "Requiring every character in the same room after every mission trains players to endure it. An invitation they can decline keeps the same scene welcome.",
        },
        {
          term: "Attacking or removing their homes",
          text: "Burning the houses so the party must cohabit solves a fiction problem the players may not have, by taking something they chose. It also teaches them that attachments get punished.",
        },
        {
          term: "Trapping characters together",
          text: "Locked rooms, forced lodging, and cursed proximity manufacture contact. Contact under compulsion rarely reads as bonding, in the fiction or at the table.",
        },
        {
          term: "Rewarding only performative acting",
          text: "If experience, inspiration, or praise flow only to voiced emotional scenes, quiet players learn their way of playing counts for less. Notice practical help and follow-through too.",
        },
        {
          term: "A crisis at every homecoming",
          text: "If each peaceful return brings an attack, a theft, or bad news about a loved one, players stop treating town as rest. Save some returns for recovery and choice.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before your next return to town",
      items: [
        "Have I asked the players which format they want, with a genuine skip option?",
        "Is there one shared reason to meet and one familiar place to meet in?",
        "Have I prepared a single prompt tied to the mission just played?",
        "Can a player join in one line, in third person, or asynchronously and still count?",
        "Does opting out cost nothing, including no missed information the character needs?",
        "Have I kept separate homes, families, and projects intact?",
        "Is there one small follow-through I can record and bring back next time?",
      ],
    },
  ],
  codexConnection: {
    heading: "Remember who met, and what they agreed",
    paragraphs: [
      "A short scene is easy to lose between sessions. Noting the date of a recurring gathering on your campaign calendar, and recording what the party agreed in the watch log, which Non-Player Characters (NPCs) were present, and any promise made, keeps the follow-through available next return. Linking the characters, the shared place, and that NPC in your vault means the canteen keeper and the standing invitation surface again without a search through old notes.",
    ],
    linkText: "See the knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedAnswers: [
    "how-do-i-get-my-rpg-party-to-work-together",
    "how-do-i-make-a-player-base-matter-in-an-rpg-campaign",
    "how-do-i-make-roleplay-more-engaging",
    "how-do-i-run-a-campaign-where-the-players-own-a-business",
  ],
  discovery: {
    id: "answer-encourage-party-bonding-downtime",
    parentCluster: "social-play",
    clusters: ["social-play", "running-the-game"],
    primaryIntent:
      "how to encourage party bonding during downtime without forcing roleplay",
    intentAliases: [
      "how to get rpg characters to bond during downtime",
      "party goes home after every mission how to encourage downtime scenes",
      "how to encourage character conversations between adventures",
      "optional downtime scenes without forced roleplay",
      "how to run post mission debrief scenes in an rpg",
    ],
    uniqueValue:
      "An opt-in return-to-town procedure for character bonding that preserves separate homes and player autonomy: check interest first, offer a shared reason and place, use one prompt tied to recent play, and allow montage, third-person summary, or a skip with no penalty.",
    userJob: "adopt-workflow",
    relatedIntents: [
      "answer-party-cohesion",
      "answer-make-player-base-matter",
      "answer-make-roleplay-more-engaging",
      "answer-run-player-owned-business",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-party-cohesion",
        reason:
          "Party cohesion covers shared stakes, group decisions, and cooperation during adventures. This answer covers optional social downtime after missions, including whether the players want such scenes at all.",
      },
      {
        with: "answer-make-player-base-matter",
        reason:
          "The player base answer covers a party-owned place and how it anchors a campaign. This answer uses ordinary shared places without shared housing and focuses on brief, voluntary meetings.",
      },
      {
        with: "answer-make-roleplay-more-engaging",
        reason:
          "The roleplay answer covers making social scenes engaging through choices and NPC situations. This answer covers whether and how to offer post-mission bonding scenes, including montage, summary, and skipping them.",
      },
    ],
  },
  seo: {
    title:
      "Encourage party bonding in downtime, without forcing it | Codex Cryptica",
    description:
      "Encourage RPG party bonding with an optional 10-minute return-to-town routine: shared reasons to meet, one prompt from recent play, and a real skip option.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-encourage-party-bonding-during-downtime.jpg",
    imageAlt:
      "Adventurers share a meal and talk at a canteen table near a city gate at dusk, armour set aside, a clerk writing nearby",
  },
};

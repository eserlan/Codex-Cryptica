import type { AnswerConfigInput } from "../schema";

export const howDoIStructureADndCampaign: AnswerConfigInput = {
  slug: "how-do-i-structure-a-dnd-campaign",
  category: "campaign-notes",
  publishedAt: "2026-11-15",
  question: "How do I structure a D&D campaign from levels 1 to 20?",
  kind: "framework",
  shortAnswer:
    "Structure a D&D campaign by tier rather than by individual level. Sketch a distinct conflict, cast and climax for levels 1 to 4, 5 to 10, 11 to 16 and 17 to 20, give each tier an ending that would satisfy on its own, and let what the player characters do decide whether and how the next tier begins. You do not need to reach level 20: a campaign that resolves its central conflict at level 5, 8 or 12 is complete, and higher levels widen the party's options and the consequences of their choices without requiring them to govern territory or face world-ending threats.",
  sections: [
    {
      kind: "prose",
      heading: "Plan by tier, not by level",
      paragraphs: [
        "A level-by-level outline for twenty levels asks you to predict a campaign that has not happened yet. It also hides the question that actually shapes long play: what kind of problems, decisions and consequences suit the party now, and what might change as their abilities and standing grow. Tiers answer that question at a scale you can revise. A tier is a planning lens, not a contract. Use it to name the current stretch of play, prepare that stretch properly, and hold the later stretches as possibilities that play can confirm, replace or discard.",
        "For each tier, note four things in a sentence or two: the central conflict, who is involved, what changes on success or failure, and the climax you are building towards. If you are starting from nothing, [how to start a D&D campaign](/answers/how-do-i-start-a-dnd-campaign) covers the first playable situation and Session 0. This page starts where that one leaves off: what changes as the characters advance, and how far ahead that change needs planning.",
      ],
    },
    {
      kind: "table",
      heading: "How play changes across the four tiers",
      headers: [
        "D&D levels",
        "Party's place",
        "Scope and stakes",
        "Typical play",
      ],
      rows: [
        [
          "1 to 4",
          "Local heroes",
          "Villages, nearby wilderness, local conspiracies",
          "Exploration, tactical encounters, first relationships",
        ],
        [
          "5 to 10",
          "Known across the region",
          "Conflicts among factions, danger to a wider area",
          "Wider travel, alliances, diplomatic and military choices",
        ],
        [
          "11 to 16",
          "Figures of national weight",
          "Kingdoms, supernatural powers, threats to a whole country",
          "Leadership questions, powerful magic, politics and strategy",
        ],
        [
          "17 to 20",
          "Figures of world weight",
          "Other planes, deities, threats with worldwide consequences",
          "World-shaping choices and cosmic stakes, if the table wants them",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Read the table as examples, not as a ladder",
      paragraphs: [
        "The four ranges come from fifth edition Dungeons & Dragons, where both the 2014 and 2024 Dungeon Master's Guide describe play in these broad bands. Other editions divide advancement differently, and earlier editions continued past level 20, so treat the ranges as a fifth edition planning aid rather than a structure every D&D game follows. Even inside fifth edition they describe tendencies, not permissions. As levels rise, characters gain wider travel, stronger divination and transport magic, and more ways to bypass a problem that would have stopped them earlier. That widening of options is the reliable change. Geography does not have to widen with it.",
        "A level 14 party can spend a whole tier on one city, one family feud or one haunted valley, played at high capability and with serious consequences for people they know well. Nothing in advancement requires the party to acquire property, govern a population, or ascend beyond mortal concerns. Some tables enjoy strongholds and councils; others find their best high-level play in personal debts, old enemies and places they have protected since level 2. Let the characters' interests and the campaign's established stakes decide which of those your later tiers contain.",
      ],
    },
    {
      kind: "list",
      heading: "Prepare for the capabilities each tier adds",
      intro:
        "The table describes scope. Preparation changes for a more concrete reason: the party gains ways to travel, gather information and confront problems that earlier levels did not allow. Check the abilities your actual party has, including spells known or prepared, spell slots, costly components and how well the characters know a destination. Not every party of a given level has the same options, and an option on paper may not be available on the day. Using fifth edition spell levels as an illustration:",
      items: [
        {
          term: "Levels 1 to 4: prepare the journey itself",
          text: "With at most second level spells, distance, weather, food and a blocked road are real constraints. Prepare route choices, travel time and what the party can learn locally, because getting to Keld Pass and getting back are part of the adventure.",
        },
        {
          term: "Levels 5 to 10: prepare the destination, not only the road",
          text: "Third to fifth level spells can add flight, long distance messages through Sending, scrying and, for some ninth level casters, Teleportation Circle. If the party can fly over an avalanche, let that work: they arrive early and rested, with time to prepare the settlement. The problem moves to the destination. Flight does not move a winter of food, persuade the giants or show who controls the pass, so prepare those people, supplies and decisions instead of adding a stronger roadblock.",
        },
        {
          term: "Levels 11 to 16: prepare access, information and reaction",
          text: "Sixth to eighth level spells can add Wind Walk, Transport via Plants, Teleport and Plane Shift, alongside stronger divination. Distance stops being a dependable lock. Prepare what instant arrival does not settle: whether the party may enter, what residents do when powerful strangers appear, which divination results are incomplete or contested, and what a destination's wards or customs permit. Arrival becomes the start of the problem rather than its solution.",
        },
        {
          term: "Levels 17 to 20: prepare the choice of outcome",
          text: "Ninth level spells such as Gate or Wish, where the party has them, make reach a poor source of difficulty on its own. Prepare the decision the new reach creates: which power to approach, what terms to offer, what a spell cannot compel, and who responds once the party acts. Keep the cost in the established fiction, such as a component, a debt or a public consequence, rather than inventing one to cancel the advantage.",
        },
      ],
      outro:
        "In each case, keep the earned advantage and change what you prepare around it. A bypassed journey should save time or risk that matters later; it should not be replaced by an identical obstacle wearing different clothes.",
    },
    {
      kind: "prose",
      heading: "Connect adventures through consequences",
      paragraphs: [
        "Escalation reads as earned when it grows out of something already in play. Four sources cover most campaigns. An antagonist proves to have wider reach than the party first saw. A faction the party ignored, offended or helped acts on its own interests while attention was elsewhere. A victory leaves fallout nobody predicted: refugees, a vacant office, a broken dam, a debt called in. Or a new revelation changes what an established fact means. Each source starts from the recorded state of the world, so the players can trace why the next problem exists.",
        "The habit to avoid is quietly arranging for every success to manufacture the next threat, so that winning and losing lead to the same escalation on schedule. If the party genuinely removes a cause, let the related threat go quiet and promote a different pressure, including one the players choose for themselves. [How to plan story arcs for a long-running RPG campaign](/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign) covers campaign, arc and session horizons in detail, so this page does not repeat that method.",
      ],
    },
    {
      kind: "list",
      heading: "Growth outside combat: downtime, reputation and influence",
      intro:
        "Levels measure adventuring capability. They say little about who the characters have become, which is most of what makes a long campaign feel long. Track that growth in downtime and in how the world treats the party:",
      items: [
        {
          term: "Relationships",
          text: "Note who now trusts, owes, fears or avoids each character, and let those people act on it: offering work, withholding information, asking for help that only this party would be asked for. A returning non-player character (NPC) who treats a level 9 party differently from the strangers they were at level 2 shows progression no stat block can.",
        },
        {
          term: "Study, craft and personal ambitions",
          text: "Give characters pursuits that advance between adventures: learning a language, researching a lineage, training a squire, building an instrument, paying off a family debt. Resolve most of this briefly, with a cost and a visible result, and bring it into play when it intersects an adventure rather than running a separate game for it.",
        },
        {
          term: "Reputation",
          text: "Decide what the party is known for in each place that matters, and let reputation open some doors while closing others. The settlement that celebrates them may be the one a rival faction now avoids, which changes who will deal with the party and on what terms.",
        },
        {
          term: "Organisations and, only if wanted, a base",
          text: "Membership, rank, patronage and obligations give higher-level characters influence and duties without requiring them to rule anything. A stronghold, business or temple can serve the same purpose for tables that enjoy it. Both are options the players opt into, not stages every campaign passes through.",
        },
        {
          term: "Time itself",
          text: "Downtime can cover weeks, months or years between tiers, and a gap of years lets settlements rebuild, children grow up and old enemies retire. Offer the gap and its length as a table decision. Some groups prefer continuous play, and skipping long downtime costs the campaign nothing.",
        },
      ],
      outro:
        "Keep downtime optional and responsive. Ask what each player wants their character to attempt, resolve it at a length the table enjoys, and let the results feed the next tier as contacts, obligations and changed places.",
    },
    {
      kind: "prose",
      heading: "Escalate stakes, not just numbers",
      paragraphs: [
        "Higher-level opponents need larger numbers, but numbers alone make later tiers feel like earlier tiers with longer combats. A costly dilemma is one optional way to widen the stakes, useful when established interests or scarce resources genuinely conflict: two settlements need the same food convoy, or a faction will help only on terms the party dislikes. Use it then, with the competing interests visible. Where preparation, an alliance or a clever plan has removed the conflict, let the result be a clear win rather than attaching a new price to restore the difficulty.",
        "Wider stakes do not require wider maps. Sending the party to another plane raises scale; asking them to decide the future of the valley they started in raises stakes while keeping scale personal. Mix the two as your campaign's material suggests, and keep ordinary adventure available at every tier: a dangerous road, a guarded ruin and a negotiation that could go wrong remain playable at level 15 when the people and consequences involved matter to the party.",
      ],
    },
    {
      kind: "prose",
      heading: "Let every tier end well",
      paragraphs: [
        "Hold a distinct stopping point in view for the current tier, such as a verdict, a treaty, a sealed gate, a coronation avoided or accepted, or a homecoming that shows how the starting place has changed. If play continues, it starts from the state that point created.",
        "Plant possibilities for a later tier without committing to them. A name in a captured ledger, an unexplained courtesy from a powerful stranger, a sealed door the party chose not to open: each can support a later escalation if play moves that way, and each can stay as texture if it does not. Foreshadow lightly and in more than one place, and retire a seed without regret when the party's choices have grown away from it.",
      ],
    },
    {
      kind: "prose",
      heading: "Do you need to plan to level 20?",
      paragraphs: [
        "No. Plan the distant horizon as a sketch, the current tier broadly, and the next sessions in concrete detail. A sketch might be three lines: a power that could matter one day, a question the campaign has not answered, a place the party has heard of and not visited. That is enough to foreshadow with and cheap to replace. Detail belongs where play is about to happen, because that is the material the table will test and change.",
        "Decide about continuation at tier boundaries, with the players, using energy, schedules and the state of the story as evidence. [How much of the plot should a DM prepare](/answers/how-much-of-the-plot-should-a-dm-prepare) covers preparing what the world is doing rather than what the party will do, which is the discipline that keeps a light long-range sketch usable.",
      ],
    },
    {
      kind: "example",
      heading: "Worked progression: the missing mountain settlement",
      paragraphs: [
        "One thread, followed through four tiers. Each tier has one conflict, a resolution, a discovery and a conditional continuation. None of the later tiers is owed to the campaign.",
        "The causes, which the Game Master (GM) knows from the start, are these. Iskvarn, a primordial frost titan bound beneath Keld Glacier, is waking and pushing the ice downhill. The advance has buried the frost giants' hunting grounds and winter stores, so the clan has moved down and displaced a yeti onto the pass. The ancient white dragon Skauthra, whose lair sits in the glacier, is extorting the displaced clan: food for herself, and giant labour hauling iron and stone to cracked anchors that hold Iskvarn's binding. She threatens to drive the clan off the lower slopes if deliveries stop. The giants therefore face two pressures, feeding themselves and meeting her demands. A later tier follows only while its cause remains.",
      ],
      items: [
        {
          term: "Levels 1 to 4: the silent pass",
          text: "Conflict: no word from Keld Pass for a month, and a starving yeti is attacking caravans. Resolution: the party deals with the yeti, brings in food and reopens the road. The settlement survives the winter and knows the party by name. Discovery: giant tracks and a buried hunting camp above the yeti's grounds show that displaced giants displaced the yeti. Continuation: if the party only makes the pass safe, the giants still lack food and still owe Skauthra, so in the next tier they come down to seek both. Prevention of the raids in tier 2: the party brokers one agreement covering both pressures, valley winter stores and a side valley for the clan, plus an agreed share sent uphill to meet Skauthra's food demand for that winter, in exchange for the clan guarding the road. That deal prevents the raids. It does not resolve Skauthra or the binding, which may matter later only if the table plays on.",
        },
        {
          term: "Levels 5 to 10: the giants' demand",
          text: "This tier forms only if the clan still lacks food or winter ground, or must still meet Skauthra's demand. If the road is open and Keld Pass is friendly, giant envoys arrive to negotiate first; raiding follows only if talks are refused or fail. Conflict: the clan needs food for itself and for Skauthra, and takes livestock when it cannot obtain it by agreement. Resolution: the valley fights the raiding off, agrees a tribute, or settles the clan under terms. Any of these secures the valley for now. Discovery: giant envoys, captured raiders or clan elders explain the uphill deliveries and the labour on the anchors. Continuation: allying with the clan against Skauthra makes tier 3 a joint campaign. Prevention of tier 3 as a conflict: through the giant envoys, the party agrees terms directly with Skauthra. The valley contracts food and paid crews for the anchor work, and the clan leaves her hunting territory, so she no longer has giants to extort and the valley no longer faces her demands through them.",
        },
        {
          term: "Levels 11 to 16: the dragon's account book",
          text: "This tier forms only if Skauthra still holds the clan or the valley to her demands. Conflict: her extortion is now the power behind the pressure on both. Resolution: the party breaks her hold by force, drives her off, or replaces extortion with an open bargain in which the valley supplies the anchor work and she stops taking livestock. Discovery, which does not depend on her cooperation: her tally stones, the giant crew leaders and the anchor sites themselves show that the iron and stone repair a cracked binding, and inscriptions at the oldest anchor name Iskvarn and record that its waking moved the glacier. If Skauthra is alive and bargaining she can confirm that history; if she is dead or gone, the stones, crews and sites still establish it. Continuation: if the party settles with her but leaves the anchor work unfinished, the binding is still cracking. Prevention of tier 4: the party completes the repairs, using giant labour if the clan is present and willing, valley crews if it is not, or both. Iskvarn sleeps, the glacier stops advancing, and no waking remains to escalate.",
        },
        {
          term: "Levels 17 to 20: Iskvarn wakes",
          text: "This tier forms only if the binding was left cracked and the repairs were never completed, whoever was responsible for them at the time. Iskvarn is now present: a frost titan the height of the ridge, wanting the binding broken and the range remade as permanent winter. If the giants are still in the region, it offers them their high grounds back under its rule, making their allegiance part of the conflict; if they have gone, that offer has no audience. First resolution, renew the binding: the party holds the anchor sites while whoever remains alive, present and willing does the repair work. That may be Skauthra, the giants, valley crews, or the party alone with hired help, and the binding can be renewed without Skauthra. Afterwards, each helper keeps only what its position allows: Skauthra, if she helped, keeps her lair and owes the valley for its supplies; the giants, if they helped and remain, can return to grounds the steadied ice no longer buries. Second resolution, bargain for its departure: the party offers Iskvarn an opened gate to a frozen plane or the empty polar wastes, where it gains freedom and a winter of its own without fighting a binding that has held it before. It departs on those terms, the glacier is no longer being pushed, and it returns to slow seasonal melt that the valley can prepare for. A third outcome, failure, leaves the party retreating with the valley's people while winter takes the pass.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "A worksheet you can copy for each tier",
      intro:
        "Answer these four questions for the current tier, and sketch the next tier only when the current one is under way:",
      items: [
        "What is the central conflict of this tier, stated as a situation the party can affect?",
        "Who is involved: which NPCs, factions and places carry the conflict, and what does each want?",
        "What changes if the party succeeds, and what changes if they fail, walk away or choose a side you did not expect?",
        "What new possibilities emerge from each of those outcomes, and which of them genuinely belong at a larger scale?",
        "Stop or continue: does this tier's climax satisfy as an ending, and does the table want to play what might follow it?",
      ],
    },
    {
      kind: "prose",
      heading: "What if the campaign ends at level 8?",
      paragraphs: [
        "Then it ends in the second tier, which is a complete place to stop. A level 8 campaign can cover the move from local heroes to figures known across a region, with a cast the players care about, a faction conflict resolved, and a climax that answers the question the opening sessions asked. Judge it by whether its central conflict paid off and its characters changed, not by the distance between its final level and 20. A shorter complete campaign serves a table better than a longer one stretched to reach an arbitrary level.",
        "Pacing decides how long that span feels. Under milestone advancement, agree what kinds of accomplishments move the party forward and tie the level 8 ending to the resolution of the regional conflict. Under experience point (XP) advancement, make sure the activities you reward include the exploration, negotiation and faction play your campaign is about, or the party will reach its levels mainly through combat whatever the story needed. [XP vs milestone levelling](/answers/xp-leveling-vs-milestone-leveling) compares the two in full. Edition matters here as well: fifth edition tables can use either method, while other editions tie advancement more tightly to their own reward structures, so follow the advancement rules of the edition you are running rather than importing a pacing method it does not support.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep tiers, factions and consequences in one place",
    paragraphs: [
      "A tier view stays useful only if the state it depends on is current: which factions are active, what the party is known for, which consequences are still open. In Codex Cryptica you can keep each tier's central conflict as linked notes alongside the NPC, faction and settlement pages it involves, then update those pages when a tier resolves so the next tier starts from what actually happened. The worksheet above works as a short page per tier, with the stop or continue decision recorded where the table made it.",
    ],
    linkText: "Explore the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTopics: [
    {
      title: "Running D&D: Help for Your Next Session",
      href: "/topics/dnd",
      description:
        "Guides and tools for starting, prepping and tracking a D&D campaign across its whole span.",
    },
  ],
  relatedTools: [
    {
      title: "Adventure Generator",
      description:
        "Turn a tier's central conflict into a playable adventure situation with pressure, locations and stakes.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create the groups whose competing aims carry a tier and whose reactions link one tier to the next.",
      href: "/generators/faction",
    },
    {
      title: "Settlement Generator",
      description:
        "Build the settlement a tier starts from, so later changes to it are visible when the party returns.",
      href: "/generators/settlement",
    },
    {
      title: "Rumour Generator",
      description:
        "Seed a possible later tier with rumours the party can pursue, ignore or disprove.",
      href: "/generators/rumour",
    },
  ],
  relatedForPages: [
    {
      title: "Dungeons & Dragons",
      description:
        "Keep D&D NPCs, factions, locations and quests linked as the campaign moves between tiers.",
      href: "/for/dungeons-and-dragons",
    },
    {
      title: "Sandbox Campaigns",
      description:
        "Run a player-directed campaign where consequences, not a fixed sequence, decide what escalates.",
      href: "/for/sandbox-campaigns",
    },
  ],
  relatedAnswers: [
    "how-do-i-plan-story-arcs-for-an-rpg-campaign",
    "how-much-of-the-plot-should-a-dm-prepare",
    "how-do-i-start-a-dnd-campaign",
    "how-do-i-organise-a-dnd-campaign",
    "xp-leveling-vs-milestone-leveling",
    "how-do-i-encourage-party-bonding-during-downtime",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-run-factions-in-a-sandbox-campaign",
    "how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
  ],
  discovery: {
    id: "answer-structure-dnd-campaign",
    parentCluster: "campaign-notes",
    primaryIntent: "how do i structure a dnd campaign from levels 1 to 20",
    userJob: "adopt-workflow",
    intentAliases: [
      "how to structure a dnd campaign from level 1 to 20",
      "dnd tiers of play explained",
      "how to plan a dnd campaign by level",
      "do i need to plan to level 20 in dnd",
      "what changes at higher levels in dnd",
      "dnd campaign planning by tier",
      "how long should a dnd campaign be in levels",
    ],
    uniqueValue:
      "Explains what changes across fifth edition D&D's four tiers of play in scope, decision-making, relationships and threats, with a branching four-tier mountain example where each tier resolves on its own and a player choice can redirect or prevent the next, plus a four-question tier worksheet and an explicit level 8 stopping point.",
    relatedIntents: [
      "answer-plan-story-arcs-rpg-campaign",
      "answer-how-much-plot-should-a-dm-prepare",
      "answer-start-dnd-campaign",
      "answer-dnd-campaign-organisation",
      "answer-xp-leveling-vs-milestone-leveling",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-plan-story-arcs-rpg-campaign",
        reason:
          "That page teaches how to structure a long campaign into flexible arcs using campaign, arc and session horizons; this page teaches what changes as D&D characters advance through the four tiers of play and how to give each tier its own conflict, climax and stopping point.",
      },
      {
        with: "answer-how-much-plot-should-a-dm-prepare",
        reason:
          "That page teaches how much plot to prepare using firm events, conditional triggers and open outcomes; this page uses tiers to decide the scale of conflict and consequence at each stage of a D&D campaign.",
      },
      {
        with: "answer-start-dnd-campaign",
        reason:
          "That page covers choosing a premise, agreeing rules and preparing the first playable situation; this page begins after the start and covers how scope, stakes and play change as the characters gain levels.",
      },
      {
        with: "answer-dnd-campaign-organisation",
        reason:
          "That page organises a D&D campaign by entities and relationships so facts stay retrievable; this page organises campaign time by tier so each level band has a distinct conflict and a satisfying ending.",
      },
    ],
  },
  seo: {
    title: "How do I structure a D&D campaign from levels 1 to 20?",
    description:
      "Plan a D&D campaign across four tiers of play, with evolving threats, meaningful downtime, growing influence and satisfying story arcs.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-structure-a-dnd-campaign.jpg",
    imageAlt:
      "Adventurers on a snowy ridge overlooking a mountain settlement at dawn, with a giant silhouette in the mist beyond",
  },
};

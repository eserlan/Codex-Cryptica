import type { AnswerConfigInput } from "../schema";

export const howDoIStartWorldbuildingForANovelOrShortStory: AnswerConfigInput =
  {
    slug: "how-do-i-start-worldbuilding-for-a-novel-or-short-story",
    category: "worldbuilding",
    publishedAt: "2026-10-09",
    question: "How do I start worldbuilding for a novel or short story?",
    kind: "framework",
    shortAnswer:
      "Start with the story, not an encyclopaedia. Write a one or two sentence premise, name your viewpoint character and their immediate obstacle, decide three concrete truths about the setting that create pressure on them, build only the single location and handful of people needed for your opening scene, then begin drafting and add new lore only when the next scene demands it.",
    sections: [
      {
        kind: "prose",
        heading: "Fiction needs a stage, not an encyclopaedia",
        paragraphs: [
          "Many new writers stall because they imagine a novel requires a finished world before the first sentence. They open a blank document, sketch a continent, name a pantheon, draft a thousand years of history, then feel more overwhelmed than when they started. That work feels like progress, but it does not tell you what happens on page one.",
          "A short story or novel needs far less. Your reader meets your world through one character, in one place, facing one problem. If you can make that single scene feel specific and consequential, you have enough world to begin. Everything else can be discovered as you write, which is how the world stays tightly tied to character and plot instead of sitting beside them as separate lore.",
          "This answer is written for fiction writers. If you are building a world for tabletop play, where several players may walk in any direction and need playable locations and factions from the first session, see the companion answer on starting worldbuilding from scratch, which uses a local sandbox framework built for the table. The method below solves a different problem: how much world you need before you can write your first scene.",
        ],
      },
      {
        kind: "list",
        heading: "A five-step story-first method",
        intro:
          "Use this sequence to go from idea to draft without overpreparing:",
        items: [
          {
            term: "Write the premise in one or two sentences",
            text: 'State whose story this is, what they want, and what is unusual about the situation. Keep it concrete enough to picture: not "a story about memory and loss" but "a junior archivist who can enter a street that only appears when it rains." If you cannot state it that plainly, you do not yet need more lore, you need a clearer story question.',
          },
          {
            term: "Name the viewpoint, goal and immediate obstacle",
            text: 'Choose one point-of-view character for your opening scene. Give them a near-term goal they could pursue or fail at today, and one specific force that stands in the way: a person, a rule, a deadline, a physical limit. A distant ambition such as "save the kingdom" does not help you write a scene; "retrieve the file before the senior archivist returns at noon" does.',
          },
          {
            term: "Decide three setting truths",
            text: "Write three facts that make this world different in ways your character will feel. One truth about what is different, one about what constrains ordinary life, and one about what generates conflict here. Each truth should limit or pressure your character's choices. If a truth does not affect what they can do, say, or risk in the next scene, it is not yet pulling its weight.",
          },
          {
            term: "Build the minimum viable setting for the opening",
            text: "Define one primary location with a sensory detail you can describe, three to five people your character will actually interact with, and only the rules that matter for this scene. Sketch a single room, street, or workplace rather than a city. Leave the rest of the map blank on purpose.",
          },
          {
            term: "Draft the scene, then note what it raised",
            text: "Write the scene to see which questions actually arise: a name you mentioned, a rule you implied, a past event a character referenced. Keep a running list of those questions and answer only the ones the next scene needs. Let drafting drive lore, not the other way round.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "What you can leave undefined",
        paragraphs: [
          "You do not need a complete map, timeline, pantheon, economy, or magic system before you begin. Those are continuity tools, not prerequisites for page one. Decide them only when a choice in the story would contradict them.",
          "Separate two kinds of decision. Continuity-critical choices change what remains possible later: whether the dead can speak, whether the city has a king, whether your magic has a cost that cannot be waived. Make those deliberately and note them down. Optional lore is everything you enjoy inventing but which no scene currently depends on: the names of distant continents, the full lineage of a dynasty, the calendar of festivals in a province your characters never visit. That lore can wait until a scene earns it.",
          "For a short story, you will often finish without ever defining the optional set. One or two locations, a small cast, and a single distinctive rule are usually enough to carry five thousand words. For a novel or serial, you will gradually define more, but still one scene at a time. The threshold for starting is always the same: can you write the next scene with specific choices and consequences? If yes, you are ready, even though ninety percent of the world remains blank.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: from one image to an opening scene",
        paragraphs: [
          "Follow a single idea through the five steps, and notice how little world is actually required before drafting.",
        ],
        items: [
          {
            term: "Starting idea",
            text: "A street that appears only when it rains, and is missing from every official map.",
          },
          {
            term: "Premise in one sentence",
            text: "Eline, a junior archivist on probation, discovers that a rain-only street holds the missing case files her institution claims never existed, and she must retrieve proof before the senior archivist returns at midday.",
          },
          {
            term: "Viewpoint, goal and obstacle",
            text: "Viewpoint: Eline, twenty two, careful but anxious, who has been warned that one more mistake will end her placement. Goal: photograph one file that proves the street exists. Obstacle: Master Hargrove returns at noon and will dismiss her if he finds her away from her desk, and the rain is forecast to stop by eleven.",
          },
          {
            term: "Three setting truths that create pressure",
            text: "First, the street, called Grey Row, exists only while rain wets its cobbles; in dry weather there is a blank brick wall where the alley mouth should be. Second, living memory is regulated: the Archive classifies which streets and events are officially remembered, and unauthorised records are destroyed, so most citizens accept the wall without question. Third, lingering on Grey Row after the rain weakens has a cost: people who are still there when the street fades lose a small, specific memory, which is why older clerks refuse to talk about it.",
          },
          {
            term: "Minimum viable setting for scene one",
            text: "One location: the Archive reading room and the narrow yard that leads to Grey Row, with the smell of wet paper, the clack of the wall clock, and a single high window showing the darkening sky. Five people: Eline, Master Hargrove, the porter Jonn who pretends not to see her leave, an older file clerk who once worked Grey Row and is now oddly forgetful, and a rival junior who would report her to keep her own place. One rule that matters now: she can only enter and leave while it rains, and she must keep track of time.",
          },
          {
            term: "Opening scene sketch",
            text: "The scene opens at 09:40 as Eline watches rain hammer the yard. She slips from her desk with a borrowed key and a small camera, steps through the alley mouth that was not there yesterday, and finds Grey Row lined with shuttered houses whose numbers do not fit the city's grid. She has perhaps an hour. She finds the right door, 14 Grey Row, and inside a single damp ledger that lists her own grandmother as a resident. A church bell counts the hour, the rain eases, and she must decide whether to take the ledger and risk being caught with contraband, or copy one page and leave before the street takes its price. The tension comes directly from the setting truths: the rain as a closing door, the Archive's prohibition, and the personal cost of lingering.",
          },
          {
            term: "Deliberately left blank",
            text: "No city-wide map, no history of why Grey Row was erased, no full magic system, no pantheon, no trade economy. Those questions exist, but they are not needed to write this scene. The story bible for now holds four lines: Grey Row appears only in rain, the Archive forbids unauthorised records, fading costs a memory, and Eline's probation ends today. If a later chapter needs the city's founding or the mechanism behind the street, that is the moment to decide it, not before.",
          },
          {
            term: "Why it works",
            text: "Each world detail earns its place by shaping Eline's decisions and the scene's consequences: the rain dictates timing and stakes, the Archive's control supplies the social risk, and the memory cost forces a choice with lasting personal weight. The reader learns the world because the character must act within it, not because the narrator pauses to explain it.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Writing a series without building an encyclopaedia first",
        paragraphs: [
          "A short story can hold almost everything in your head. A novel or serial needs a light system so you do not contradict a rule you set in chapter two by chapter twelve.",
          "Keep a story bible of one or two pages, not a world bible of fifty. After each writing session, add only what the draft has now made true: the spellings of names and places as you actually used them, the three setting truths and any rule you added, a one line note for each new location, and any promise you made to the reader that will need a later payoff. If a detail never appeared in a scene, it does not need a record yet.",
          "When you need to expand between stories or volumes, return to the five steps rather than inventing lore in isolation. Ask what the next story's viewpoint character wants, what stands in their way, and which single new location or rule that story requires. Series worldbuilding then grows as a chain of minimum viable settings, each linked to the last, rather than as a single upfront design that must account for everything you might one day write.",
        ],
      },
      {
        kind: "list",
        heading: "Four traps that keep writers preparing instead of drafting",
        intro:
          "Watch for these habits when progress feels slow but pages are not accumulating:",
        items: [
          {
            term: "Endless preparation",
            text: "Research and map-making feel productive because they produce artefacts. Set a hard limit: thirty minutes of world notes per writing session, then Draft. If you catch yourself colouring a regional map for the third evening without writing a paragraph, you have moved from preparation to avoidance.",
          },
          {
            term: "Disconnected encyclopaedia entries",
            text: "A long entry on the succession of kings that never influences a character's choice, dialogue, or risk is not yet story material. Convert it into a usable detail by asking how it would change one person's day: a tax, a curfew, a forbidden name, a song people will not sing.",
          },
          {
            term: "Exposition dumps",
            text: "Front-loading several paragraphs of history before the reader has a reason to care burdens the opening and signals that the world matters more than the character. Reveal world detail when the character needs it to make a decision, and let the reader infer the rest from behaviour and consequence.",
          },
          {
            term: "Solving every world question up front",
            text: "You do not need to settle whether gods are real, how the economy functions, or what lies beyond the mountains until a scene depends on it. Leaving those open is not a plot hole; it is room to let later story needs shape the answers more precisely than early guessing could.",
          },
        ],
      },
      {
        kind: "checklist",
        heading:
          "Fifteen-minute starter: are you ready to write the first scene?",
        intro:
          "Spend fifteen minutes on these prompts, then begin your opening scene without further preparation:",
        items: [
          "Write your premise in one or two sentences that name a specific character, their near-term goal, and one unusual fact about the situation.",
          "Name the viewpoint character, what they want in the next scene, and the single immediate obstacle that could make them fail today.",
          "List three setting truths: what is different here, what constrains ordinary life, and what generates conflict for this character.",
          "Define the minimum for scene one: one location you can describe with two sensory details, three to five people, and only the rule that governs this scene.",
          "Choose the scene's decision point: what must the character choose, risk, or reveal before the scene ends, and how does a setting truth raise the stakes?",
          "Set a timer and draft the scene for at least three hundred words without stopping to invent additional lore; keep a separate note of questions that arise and answer only those the next scene needs.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep a light story bible in Codex Cryptica",
      paragraphs: [
        "You do not need a campaign-scale wiki to keep fiction continuity straight. In Codex Cryptica, create one note for your premise, one note per location you have actually used, and one note for each settled rule or promise. Link them with simple wiki references as you draft so your story bible grows alongside the manuscript rather than ahead of it.",
        "Because Codex runs locally in your browser, your notes and drafts stay private and available offline. Add a new entity only when a scene introduces it, which keeps preparation proportionate to the story you are writing now.",
      ],
      linkText: "Organise fiction notes in Codex Cryptica",
      href: "/solutions/worldbuilding-tool",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Sketch a single starting location with livelihood, leadership, and a local pressure to give your opening scene texture.",
        href: "/generators/settlement",
      },
      {
        title: "Faction generator",
        description:
          "Quickly define two or three competing interests that can constrain your protagonist without building a full political history.",
        href: "/generators/faction",
      },
      {
        title: "NPC generator",
        description:
          "Draft a handful of distinctive supporting characters with wants and obstacles that complicate your viewpoint character's goal.",
        href: "/generators/npc",
      },
    ],
    relatedAnswers: [
      "how-do-you-start-worldbuilding-from-scratch",
      "how-do-you-create-a-magic-system",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "how-do-you-create-a-believable-fictional-religion",
      "how-do-you-create-a-fantasy-faction",
    ],
    discovery: {
      id: "answer-worldbuilding-for-fiction-writers",
      parentCluster: "worldbuilding",
      primaryIntent: "how to start worldbuilding for a novel or short story",
      intentAliases: [
        "how to start worldbuilding for a story",
        "worldbuilding for writers",
        "how much worldbuilding before writing",
        "starting fantasy world for short stories",
        "worldbuilding for fiction writers",
        "how to worldbuild for a novel",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A story-first framework for fiction writers that builds only the location, people and rules needed for the next scene, with a lightweight continuity method for series.",
      acknowledgedOverlap: [
        {
          with: "answer-worldbuilding-from-scratch",
          reason:
            "The existing answer provides a GM-focused local sandbox for tabletop play, whereas this answer provides a fiction-writer method that starts from premise and viewpoint and expands through drafting.",
        },
      ],
      relatedIntents: [
        "answer-worldbuilding-from-scratch",
        "answer-create-magic-system",
        "answer-create-believable-religion",
        "answer-create-fantasy-city",
      ],
    },
    seo: {
      title:
        "How Do I Start Worldbuilding for a Novel or Short Story? | Codex Cryptica",
      description:
        "A story-first framework for writers: build only the location, people and rules your opening scene needs, then expand as you draft. With worked example and starter exercise.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-start-worldbuilding-for-a-novel-or-short-story.jpg",
      imageAlt:
        "Writer at a desk with manuscript pages and a small hand drawn map of a single street and doorway, warm lamplight",
    },
  };

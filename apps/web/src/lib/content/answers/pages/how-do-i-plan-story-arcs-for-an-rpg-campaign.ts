import type { AnswerConfigInput } from "../schema";

export const howDoIPlanStoryArcsForAnRpgCampaign: AnswerConfigInput = {
  slug: "how-do-i-plan-story-arcs-for-an-rpg-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-10",
  question: "How do I plan story arcs for a long-running RPG campaign?",
  kind: "framework",
  shortAnswer:
    "Sketch the campaign's central tensions and possible direction, develop the current arc and a few future possibilities, but prepare only the next session in detail. Give each arc its own problem and resolution that changes the situation, and let player decisions decide what follows. A simple way to keep prep light is three horizons: a broad campaign horizon for threats and factions, an arc horizon for the current conflict and its stakes, and a session horizon for the locations, NPCs and choices you need next time you play.",
  sections: [
    {
      kind: "prose",
      heading: "Why long campaigns drift without arcs",
      paragraphs: [
        "Many new GMs start with a strong overarching idea, often a big bad, a faction, or a threat tied to a character backstory, and then face a choice: plan every chapter now, plan in fixed blocks of three to five sessions, or improvise week by week. Each can work at some tables, but each carries a risk. Planning every chapter can produce a script the party will not follow. Fixed blocks can turn a flexible grouping into a deadline that forces pacing. Pure improvisation can leave sessions feeling busy without building toward anything the players recognise. Arcs are one way to get shape without those risks.",
        "Story arcs help with that when you treat them as flexible groupings of play, not as prewritten episodes. An arc is a stretch of sessions organised around one meaningful problem. It has a clear conflict, active opposition and a resolution that changes the situation, whether the players succeed, fail or find a third way. Arcs give the campaign shape without deciding the players' actions in advance. The rest of this page shows how to separate what you plan far ahead from what you prepare for next week, and how to let player choices genuinely change what comes next.",
      ],
    },
    {
      kind: "list",
      heading: "Three horizons: campaign, arc and session",
      intro:
        "Keep three levels of prep at different levels of detail. Detail increases as play gets closer:",
      items: [
        {
          term: "Campaign horizon",
          text: "The broad direction of the campaign, not a plotted ending. Note the major threats, what the antagonist or faction wants, what happens if nobody intervenes, the long term stakes, and which character backstories could connect to those pressures later. Keep this as possibilities and pressures rather than a sequence of scenes. For example, note that Lady Varnholt secretly funds a cult to weaken merchants and gain control of the harbour council, not that the party will expose her in session 20.",
        },
        {
          term: "Arc horizon",
          text: "The current arc and one or two sketchy possibilities for what could follow. Define the immediate conflict, who is involved, what the players can affect now, and how the situation would look if the arc resolved in different ways. Outline the current arc in more detail and leave future arcs as a sentence or two each. An arc might be the missing shipments on the north road, or the trial that decides who governs the town.",
        },
        {
          term: "Session horizon",
          text: "Only the next session in runnable detail. Locations the party can reach, relevant or likely NPCs, information the players can discover, and a few meaningful choices for the night. Update this after each session, and let it pull from whichever arc the players are actually pursuing. If they ignore an arc, its session detail stays unwritten.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Start with the campaign's central conflict",
      paragraphs: [
        "Before you outline any arc, pin down the central tension that makes the campaign matter. For a fantasy campaign, a noble might secretly fund a harbour cult that publicly promises protection from a dormant power under the bay, while privately planning to break its seal and make that fear useful. The noble funds the cult to weaken independent merchants and gain control of the harbour council. For another genre the texture changes but the questions are the same.",
        "Write four things in plain language. What the central actor wants and why it matters to them. What happens if nobody intervenes, stated as changes the players can see: prices rise, roads close, people disappear, a trial is lost, a seal weakens. What the long term stakes are if those changes continue unchecked. And which character backstories brush against those stakes, noted as openings you may use, not as plot that must happen. A rogue whose family worked the harbour, a cleric whose order sealed the marsh power a generation ago, and a noble's estranged kin are all useful hooks precisely because you can invite them in or leave them quiet depending on what the table pursues.",
        "This is the material you keep broadest. Do not write the order in which the players will discover it, and do not decide the ending. Those belong to play.",
      ],
    },
    {
      kind: "list",
      heading: "Build one playable arc at a time",
      intro:
        "Each arc needs its own reason to play, with a resolution that leaves a mark. Use these prompts for the arc in front of you:",
      items: [
        {
          term: "A clear immediate problem",
          text: "Name what is wrong right now and who is already affected. Not the campaign threat in general, but the situation the party can touch: grain shipments seized on the north road, the harbourmaster's ledger gone missing, a magistrate delaying a trial while the cult recruits openly. If you cannot state the arc's problem in one sentence, it is still a theme rather than an arc.",
        },
        {
          term: "People and factions with competing aims",
          text: "Start with a few actors who want different things from the same pressure. Lady Varnholt wants control of the harbour council, the cult wants to break the seal and profit from the fear that follows, and the wardens want it inspected before the bay is dredged. Each should want something now, and have something to lose if the players act against them.",
        },
        {
          term: "Meaningful choices and visible stakes",
          text: "List a few ways the players could change the outcome. Deliver the ledger quietly, hand it to the magistrate, or trade it for a favour from the Varnholt house. Make the stakes visible before the decision: who gains, who suffers, and what changes on the map or in town if this arc goes one way rather than another.",
        },
        {
          term: "Possible outcomes and an exit point",
          text: "Sketch two or three plausible resolutions, including one where the players fail or walk away, and note what each leaves behind. A seized ledger might clear the wardens, implicate Varnholt's factor, or burn and force a different proof. Then name the point where this arc is done for now: a trial verdict, a road reopened, a pact signed, a warehouse secured. That exit point is what the next arc builds on, not a cliffhanger that requires a specific success.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Connect arcs through consequences, not a set order",
      paragraphs: [
        "Arcs feel connected when the outcome of one changes the starting conditions of the next, not when you publish a required episode list. Let recurring NPCs carry consequences in their behaviour, let escalating stakes appear in prices, patrols, rumours or the state of a location, and let revelations arrive because the players earned access to a place or a person, not because the calendar says it is time for a reveal.",
        "Distinguish planned pressures and consequences from predetermined actions and twists. You can plan that Varnholt's factor will try to buy the magistrate if the ledger surfaces, or that the cult may attempt the rites only if it still has the means and the seal can be breached. You should not plan that the players will confront Varnholt, find a particular clue in a particular room, or choose a side on schedule. Foreshadowing is still useful, but frame it as information that can arrive through several routes. If a load-bearing clue matters, give it at least two independent paths: a witness who saw the shipments diverted, a mark on the crates, and the harbourmaster's own account under pressure.",
        "Character backstories work the same way. Treat them as invitations you can place inside an arc, not as rails the campaign must follow. A PC tied to the harbour can be offered a personal choice, a debt to settle, or a contact who knows the cistern, but the arc should still resolve cleanly if that player is absent or the group takes a different approach. The campaign stays flexible because the backstory colours the arc, rather than carrying it.",
      ],
    },
    {
      kind: "prose",
      heading: "How many arcs, how many sessions, and how far ahead to plan",
      paragraphs: [
        "A common shorthand says an arc should last three to five sessions. That is a usable rough scale for many tables, not a rule the campaign must meet. Some arcs resolve in a single strong session when the players act decisively. Others stretch to eight or ten because the group chases side threads, negotiates at length, or splits the problem into smaller steps. Table pace varies with system, session length, group size and how much the party talks before they act. Use any number you see online as an example of scale, not a target to enforce.",
        "A lighter planning cadence keeps that flexibility without leaving you underprepared. Hold the campaign vision as broad pressures and possibilities you can revisit between arcs. Outline the current arc in more detail and keep one or two future arc possibilities as a sentence each. Prepare only the next session fully. Between sessions, note what changed, which pressures advanced while the party was busy elsewhere, and what the next choice point looks like. At an arc boundary, decide whether the next arc you sketched still fits, needs to be replaced, or should be left quiet while a player-driven thread takes the foreground.",
        "The practical test is whether forward planning is easy to change. Notes that say what an actor will try next, what happens if nobody stops them, and what information the players could find are easy to revise. Notes that say the party will go to a guarded archive, be betrayed, and then fight in the cistern are hard to revise, and they push you to steer play when the group does something else.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: three arcs around a harbour cult",
      paragraphs: [
        "Overarching threat: Lady Varnholt secretly funds a harbour cult to weaken independent merchants and gain control of the harbour council. The cult publicly promises protection from the dormant power under the bay, but intends to break the old seal and profit from the fear when it stirs. If nobody intervenes, trade suffers and the town becomes dependent on the cult's charity. The power is a long term pressure, not a boss fight the players must reach by a fixed date. The three arcs below are possibilities, not a sequence; a decision may remove one, and the thread can end without a replacement.",
      ],
      items: [
        {
          term: "Arc 1: The seized road",
          text: "Immediate conflict: grain shipments meant for the town are being seized on the north road, and the merchants blame bandits. In truth Varnholt's factor has arranged the seizures to raise prices and weaken the merchants' influence. Resolution: the party can trace the seizures, recover a ledger, protect a convoy, or negotiate with the merchants. One possible resolution is a public accounting that reopens the road. Backstory opening: a PC whose family ran caravans on that road recognises a forged seal, but the arc still works if no one makes that link. Consequence: if the road reopens, the cult loses its easiest recruits; if the seizures continue quietly, bread prices double and the cult's relief draws new members. Decision that changes the next arc: the party can sell the ledger to Varnholt's house for an agreed sum, with no further service promised. The house suppresses the evidence, leaving no clean paper trail for Arc 2.",
        },
        {
          term: "Arc 2: The magistrate's trial",
          text: "Immediate conflict: with the ledger or independent witness testimony from Arc 1, the magistrate can hear a case over who authorised the seizures and whether the factor or cult members should answer for them. Varnholt's allies want it delayed; the Divers' Guild wants the bay inspected before its divers are pressed into dredging. Resolution: the party can secure testimony, protect a witness, or expose the factor's payments, or settle the dispute without a trial. A verdict against the factor may expose Varnholt's funding and cut off the cult's money; a collapsed case leaves it funded and meeting in the warehouse. Neither outcome alone sends it to the cistern: that needs the Guild to press on with dredging, which exposes access to the weakened seal. Backstory opening: a PC with a legal or religious oath can be asked to stand surety for a witness. Decision that removes the next arc: the party and Guild can agree to halt dredging while the wardens reinforce the seal. If the cult has lost its funding and the seal is sound, the rites cannot proceed; after play, remove Arc 3 rather than relocating it.",
        },
        {
          term: "Arc 3: The rites under the bay",
          text: "Immediate conflict: only if the cult still has money, access to the site and a weakened seal does it attempt rites in the flooded cistern beneath the old sea wall. The seal holds back seawater; breaching it would flood the lower harbour and let the dormant power stir. The cult's public promise is protection, but its leaders intend to cause the danger themselves. Resolution: the party can help the wardens stabilise the seal, expose the cult's plan, or negotiate with members who no longer want to break it. Backstory opening: a PC whose order sealed the power before can interpret the wards, but the wardens or harbourmaster's charts can explain them too. Consequence: stabilising the seal makes the cult's protection claim untenable and prevents the flooding; if the cult retains its means and the seal remains weak, the lower harbour is at risk. This arc may never happen if its conditions do not.",
        },
        {
          term: "Why it works",
          text: "Each arc has its own problem and a satisfying resolution that changes the town even if the larger threat is not yet gone. The cult and Varnholt create pressure, but no arc requires the players to find a particular clue or make a particular choice to count as finished. The proposed arcs can contract, expand or end when their causes are gone.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When the players change the plan",
      paragraphs: [
        "The branching only pays off if you visibly adjust after play. Take three common divergences from the example and what the DM does next.",
        "If the party ally with the suspected enemy, honour the advantage and the agreed terms. If they sell the ledger to Varnholt's house for a fixed sum, with no service promised, it removes the clean paper trail Arc 2 expected. The magistrate can still hear independent testimony if the players choose to pursue the case; do not use it to restore a prosecution they have abandoned. After play, remove the expected ledger route and leave the trial as an option only if the party still wants it.",
        "If the party bypass a location you prepared, let it stand without moving a confrontation there. If they take evidence straight to the magistrate, cult members might decide to intimidate a witness they know will testify. The witness can warn the party or they might hear rumours of the plan; they can protect the witness, avoid the scene, or ignore it. If the cult has no reason or means to act, nothing happens. The cistern only needs preparation if the wardens have a reason to inspect a weakened seal, such as dredging still being planned.",
        "If the party settle Arc 2, be clear about what the agreement settles. An amnesty can resolve whether the cult's rank and file face charges for taking the grain; it does not establish who ordered the seizures, repay the merchants, or end a case against the factor. If the party and Guild also halt dredging while the wardens reinforce the seal, mark Arc 3 removed: the cult has neither the means nor a workable seal to breach. After play, leave the thread ended unless another problem follows from established circumstances or the players' interests. The campaign moves forward because each resolution changes the situation, not because the players reach a planned scene.",
      ],
    },
    {
      kind: "checklist",
      heading: "A compact arc planning template",
      intro:
        "Use this for the current arc and keep the next one or two as a single line each until they become current:",
      items: [
        "Campaign pressure in one line: who wants what, what happens if nobody intervenes, and what stakes grow if it continues.",
        "Arc problem in one sentence: what is wrong right now that the players can affect, stated as a situation rather than a plot.",
        "Actors and wants: start with a few NPCs or factions who want different things from this problem, and what may change for them if the party acts.",
        "Player choices: a few approaches the group could take next session, with visible consequences where they follow from the situation.",
        "Clue and consequence routes: at least two ways for each load-bearing fact to reach the players, and what changes if they do nothing, succeed, fail or walk away.",
        "Backstory openings, optional: one or two places a PC history could matter in this arc if the player wants it, with no arc that requires that link to resolve.",
        "Exit point: how you will recognise this arc is done for now, and what state the world is left in for whatever follows.",
        "How far ahead you prepared: campaign as possibilities, current arc outlined, next session in detail; note which pressures advance while the party are busy elsewhere.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep arcs, backstories and consequences connected",
    paragraphs: [
      "In Codex Cryptica you can keep the same three horizons in one place without building an arc-specific workflow around them. Give the overarching threat, its factions and key NPCs their own linked pages for the campaign horizon. Use separate linked pages for the current arc's conflict, its actors and its possible resolutions, and keep future arcs as short linked notes you can replace when play changes them. Mark character backstory links as optional relationships in your notes, not required plot; review them by hand and bring them into play only when they fit what the player pursues.",
      "For the session horizon, capture your next-session notes alongside the same entities and use the links between pages to see which faction or backstory thread each choice would pull on. After play, update the pages that changed, close the arc when its exit point is reached, and promote what mattered into the campaign pages. Before the next arc, read through the changed pages and note by hand which relationships, prices or attitudes now start from a different state. Codex Cryptica does not track arcs or their consequences for you; it keeps the pages and links in one place so that review is quick.",
    ],
    linkText: "Explore the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTopics: [
    {
      title: "Running D&D: Help for Your Next Session",
      href: "/topics/dnd",
      description:
        "Guides and tools for starting, prepping and tracking a D&D campaign, including plot preparation.",
    },
  ],
  relatedTools: [
    {
      title: "BBEG Generator",
      description:
        "Sketch the campaign's central antagonist with motives and a visible plan you can turn into arc pressures.",
      href: "/generators/bbeg-generator",
    },
    {
      title: "Faction Generator",
      description:
        "Create the groups whose competing aims give each arc its own conflict and consequences.",
      href: "/generators/faction",
    },
    {
      title: "NPC Generator",
      description:
        "Build the people who embody those aims and will change their behaviour when an arc resolves.",
      href: "/generators/npc",
    },
    {
      title: "Settlement Generator",
      description:
        "Give the arc a concrete location where changes in control, prices and rumours are visible.",
      href: "/generators/settlement",
    },
    {
      title: "Adventure Generator",
      description:
        "Turn the arc's problem and stakes into a playable situation for the next session.",
      href: "/generators/adventure-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Dungeons & Dragons",
      description:
        "Keep D&D NPCs, factions, locations and quests linked as arcs change the map and the town.",
      href: "/for/dungeons-and-dragons",
    },
    {
      title: "Sandbox Campaigns",
      description:
        "Manage multiple live arcs and faction pressures with a player-driven campaign structure.",
      href: "/for/sandbox-campaigns",
    },
    {
      title: "Fantasy Worldbuilding",
      description:
        "Use settlement and faction notes to carry arc consequences between threats and revelations.",
      href: "/for/fantasy-worldbuilding",
    },
  ],
  relatedAnswers: [
    "how-much-of-the-plot-should-a-dm-prepare",
    "how-do-i-start-a-dnd-campaign",
    "how-do-i-organise-a-dnd-campaign",
    "how-do-you-manage-a-campaign-timeline-in-an-rpg",
    "how-do-i-prepare-a-dnd-session",
    "how-do-i-turn-an-rpg-idea-into-an-adventure",
    "how-do-you-prepare-a-sandbox-rpg-campaign",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-do-you-generate-useful-rpg-rumours",
  ],
  discovery: {
    id: "answer-plan-story-arcs-rpg-campaign",
    parentCluster: "campaign-notes",
    primaryIntent: "how to plan story arcs for an rpg campaign",
    userJob: "adopt-workflow",
    intentAliases: [
      "how to structure a dnd campaign into arcs",
      "how many sessions should a campaign arc last",
      "should i plan my whole dnd campaign in advance",
      "how far ahead should i plan a campaign arc",
      "how to break a campaign into adventures",
      "dnd story arc planning",
    ],
    uniqueValue:
      "A three-horizon method that separates campaign pressures, arc conflicts and next-session prep, with a three-arc harbour-cult example where each arc resolves on its own and a player choice can change or remove the next arc.",
    relatedIntents: [
      "answer-how-much-plot-should-a-dm-prepare",
      "answer-start-dnd-campaign",
      "answer-dnd-campaign-organisation",
      "answer-manage-campaign-timeline",
      "answer-session-prep",
      "answer-turn-rpg-idea-into-adventure",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-how-much-plot-should-a-dm-prepare",
        reason:
          "That page teaches how much plot to prepare without scripting player actions using firm, conditional and open prep; this page teaches how to structure a long campaign into flexible arcs with their own conflicts and resolutions, and how far ahead each horizon should be prepared.",
      },
      {
        with: "answer-dnd-campaign-organisation",
        reason:
          "That page organises a D&D campaign by things and relationships; this page organises campaign time into arcs that connect through consequences rather than a fixed episode order.",
      },
    ],
  },
  seo: {
    title: "How do I plan story arcs for a long-running RPG campaign?",
    description:
      "Plan a campaign with three horizons: broad campaign pressures, a playable arc with its own conflict and resolution, and detailed prep for only the next session.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-plan-story-arcs-for-an-rpg-campaign.jpg",
    imageAlt:
      "A game master's desk with arc notes, linked faction cards and a harbour map marked with tide lines and sealed letters",
  },
};

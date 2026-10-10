import type { AnswerConfigInput } from "../schema";

export const howDoIPlanStoryArcsForAnRpgCampaign: AnswerConfigInput = {
  slug: "how-do-i-plan-story-arcs-for-an-rpg-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-10",
  question: "How do I plan story arcs for a long-running RPG campaign?",
  kind: "framework",
  shortAnswer:
    "Sketch the campaign's central tensions and possible direction, develop the current arc and a few future possibilities, but prepare only the next session in detail. Give each arc its own problem and resolution that changes the situation, and let player decisions decide what follows. Use three horizons to keep prep light: a broad campaign horizon for threats and factions, an arc horizon for the current conflict and its stakes, and a session horizon for the locations, NPCs and choices you need next time you play.",
  sections: [
    {
      kind: "prose",
      heading: "Why long campaigns drift without arcs",
      paragraphs: [
        "Many new GMs start with a strong overarching idea, often a big bad, a faction, or a threat tied to a character backstory, and then face the same choice: plan every chapter now, plan in rigid blocks of three to five sessions, or improvise week by week. The first produces a script the party will not follow. The second turns a flexible grouping into a deadline that forces pacing. The third leaves the campaign without a through line, so sessions feel busy but do not build toward anything the players can recognise.",
        "Story arcs solve that when you treat them as flexible groupings of play, not as prewritten episodes. An arc is a stretch of sessions organised around one meaningful problem. It has a clear conflict, active opposition and a resolution that changes the situation, whether the players succeed, fail or find a third way. Arcs give the campaign shape without deciding the players' actions in advance. The rest of this page shows how to separate what you plan far ahead from what you prepare for next week, and how to let player choices genuinely change what comes next.",
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
          text: "The broad direction of the campaign, not a plotted ending. Note the major threats, what the antagonist or faction wants, what happens if nobody intervenes, the long term stakes, and which character backstories could connect to those pressures later. Keep this as possibilities and pressures rather than a sequence of scenes. For example, note that Lady Varnholt is quietly funding a cult to destabilise the barony, not that the party will expose her in session 20.",
        },
        {
          term: "Arc horizon",
          text: "The current arc and one or two sketchy possibilities for what could follow. Define the immediate conflict, who is involved, what the players can affect now, and how the situation would look if the arc resolved in different ways. Outline the current arc in more detail and leave future arcs as a sentence or two each. An arc might be the missing shipments on the north road, or the trial that decides who governs the town.",
        },
        {
          term: "Session horizon",
          text: "Only the next session in runnable detail. Locations the party can reach, NPCs who will definitely appear, information the players can discover, and two or three meaningful choices for the night. Update this after each session, and let it pull from whichever arc the players are actually pursuing. If they ignore an arc, its session detail stays unwritten.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Start with the campaign's central conflict",
      paragraphs: [
        "Before you outline any arc, pin down the central tension that makes the campaign matter. For a fantasy campaign that might be a noble secretly financing a harbour cult that promises to wake something under the bay, or a dormant power stirring in the marshes while rival houses argue over who should pay to contain it. For another genre the texture changes but the questions are the same.",
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
          text: "Give two or three actors who want different things from the same pressure. Lady Varnholt wants order without scrutiny, the harbour cult wants desperation it can recruit from, the wardens want the old seal inspected before the bay is dredged. Each should want something now, and have something to lose if the players act against them.",
        },
        {
          term: "Meaningful choices and visible stakes",
          text: "List what the players could do that would change the outcome, and what each choice costs. Deliver the ledger quietly, hand it to the magistrate, or trade it for a favour from the Varnholt house. The stakes should be visible before the decision: who gains, who suffers, what changes on the map or in town if this arc goes one way rather than another.",
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
        "Distinguish planned pressures and consequences from predetermined actions and twists. You can plan that Varnholt's factor will try to buy the magistrate if the ledger surfaces, or that the cult will move its rites to the flooded cistern if the warehouse is closed. You should not plan that the players will confront Varnholt, find a particular clue in a particular room, or choose a side on schedule. Foreshadowing is still useful, but frame it as information that can arrive through several routes. If a load-bearing clue matters, give it at least two independent paths: a witness who saw the shipments diverted, a mark on the crates, and the harbourmaster's own account under pressure.",
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
        "Overarching threat: Lady Varnholt is quietly financing a harbour cult that promises protection from a dormant power under the bay. If nobody intervenes, the cult grows as trade suffers and the town becomes dependent on its charity. The dormant power is a long term pressure, not a boss fight the players must reach by a fixed date. Three proposed arcs show how the same threat can produce three smaller, playable problems, each with its own resolution and a decision that could change or remove the next arc. An ancient marsh power that stirs while factions argue would work just as well; the structure is the same.",
      ],
      items: [
        {
          term: "Arc 1: The seized road",
          text: "Immediate conflict: grain shipments meant for the town are being seized on the north road, and the merchants blame bandits. In truth Varnholt's factor has arranged the seizures to raise prices and push the town toward the cult's food handouts. Resolution: the party can trace the seizures, recover a ledger, protect a convoy, or negotiate with the merchants. One possible resolution is a public accounting that reopens the road. Backstory opening: a PC whose family ran caravans on that road recognises a forged seal, but the arc still works if no one makes that link. Consequence: if the road reopens, the cult loses its easiest recruits; if the seizures continue quietly, bread prices double and the cult's relief draws new members. Decision that changes the next arc: if the party quietly trades the ledger to Varnholt's house for coin or favour, the house can suppress the evidence and the cult's link stays hidden, which undercuts the legal pressure Arc 2 relies on.",
        },
        {
          term: "Arc 2: The magistrate's trial",
          text: "Immediate conflict: with the ledger or with witness testimony from Arc 1, the magistrate is willing to hear a case, but Varnholt's allies want it delayed until the fleet sails and the Divers' Guild wants it rushed before its divers are pressed into dredging the bay. Resolution: the party can secure testimony, protect a witness, or expose the factor's payments; equally, they could see the trial collapse and seek another route. Backstory opening: a PC with a legal or religious oath can be asked to stand surety for a witness, which raises the personal cost. Consequence: a completed trial names who authorised the seizures and forces Varnholt to distance herself from the cult, which drives the cult toward the cistern rites; a collapsed trial leaves Varnholt protected and the cult confident enough to stay in the warehouse. Decision that changes the next arc: if the party ally with the suspected factor to get a quick, harsh verdict against a scapegoat, the true link stays buried and the festival that would have triggered Arc 3 is cancelled, so the bay rites take a different form elsewhere.",
        },
        {
          term: "Arc 3: The rites under the bay",
          text: "Immediate conflict: pushed from the warehouse or emboldened by a protected harbour, the cult prepares rites in the flooded cistern beneath the old sea wall to show the dormant power to the town. Resolution: the party might close the cistern, negotiate terms for the divers and wardens to stabilise the seal, or contain the rites publicly so the cult's influence breaks without a fight. Backstory opening: a PC whose order sealed the power before can interpret the wards, but another character could reach the same information through the wardens or the harbourmaster's charts. Consequence: closing or stabilising the cistern removes the cult's claim to protection and leaves Varnholt exposed to the trial's fallout; failing to do so leaves the lower harbour prone to flooding and the cult able to bargain from a position of fear. Decision that reshapes the campaign: if the party contain the rites by agreement with the cult's rank and file rather than destroying it, former cult members can become allies or informants for whatever longer pressure you develop next.",
        },
        {
          term: "Why it works",
          text: "Each arc has its own problem and a satisfying resolution that changes the town even if the larger threat is not yet gone. The cult and Varnholt create pressure, but no arc requires the players to find a particular clue or make a particular choice to count as finished. The three arcs are proposed possibilities, not a required sequence, so the campaign can contract or expand without breaking.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When the players change the plan",
      paragraphs: [
        "The branching only pays off if you visibly adjust after play. Take three common divergences from the example and what the DM does next.",
        "If the party ally with the suspected enemy, honour the advantage and the cost. Trading the ledger to Varnholt's house in Arc 1 buys coin, patronage and safer passage on the road tonight, but it removes the clean paper trail Arc 2 expected. The DM keeps the trial idea but changes its engine: the case now rests on witness testimony and the harbourmaster's charts, Varnholt's house becomes a creditor the party owe, and the cult's recruitment shifts to the docks where witnesses are easier to intimidate. No new invention is needed, only a change in which consequence fires.",
        "If the party bypass a location you prepared, let it stand and change its meaning. Skipping the flooded cistern before the trial means the cult keeps a usable sanctuary. The DM leaves the cistern on the map, moves the portable encounter to the warehouse where the cult is still meeting, and lets the cistern return later as the place the wardens must inspect once the trial forces a survey of the sea wall. The prep transfers because the rites were a pressure with more than one possible venue.",
        "If the party resolve a conflict unexpectedly, close the arc there and follow the change. Ending the warehouse confrontation with a negotiated amnesty for the rank and file finishes Arc 2 without a courtroom. The DM marks the arc resolved, notes the amnesty as a faction relationship change, and lets Arc 3 start from that new fact: the cult's leadership flees to the cistern with fewer hands, while former members offer the party the tide charts that make the cistern navigable. The campaign moves forward because each resolution was written as a changed situation, not as a scene the players had to reach.",
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
        "Actors and wants: two or three NPCs or factions who want different things from this problem, and what each loses if the party acts against them.",
        "Player choices: two or three approaches the group could take next session, with visible costs for each.",
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
      "In Codex Cryptica you can keep the same three horizons in one place without building an arc-specific workflow around them. Give the overarching threat, its factions and key NPCs their own linked pages for the campaign horizon. Use separate linked pages for the current arc's conflict, its actors and its possible resolutions, and keep future arcs as short linked notes you can replace when play changes them. Mark character backstory links as optional relationships rather than required plot, so they surface when a player pursues them and stay quiet when they do not.",
      "For the session horizon, capture your next-session notes alongside the same entities and let the relationship graph show which faction or backstory thread each choice would pull on. After play, update the pages that changed, close the arc when its exit point is reached, and promote what mattered into the campaign pages. The graph then shows the next arc's starting conditions at a glance, without a separate episode manager.",
    ],
    linkText: "Explore the campaign manager",
    href: "/solutions/campaign-manager",
  },
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
    parentCluster: "campaign-notes",
    intentAliases: [
      "how to plan story arcs for an rpg campaign",
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

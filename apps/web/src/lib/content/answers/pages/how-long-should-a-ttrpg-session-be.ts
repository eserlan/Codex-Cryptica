import type { AnswerConfigInput } from "../schema";

export const howLongShouldATtrpgSessionBe: AnswerConfigInput = {
  slug: "how-long-should-a-ttrpg-session-be",
  category: "running-the-game",
  publishedAt: "2026-10-01",
  question: "How long should a TTRPG session be?",
  kind: "framework",
  shortAnswer:
    "There is no single ideal: most groups settle on two and a half to four hours of usable play, plus time for setup, breaks and packing up. Three hours is a dependable default for home and online games, four hours works well for a weekly evening with a break in the middle, and two hours can be plenty when the content is planned around the window. Pick a predictable slot you can sustain, tell players the expected finish time in advance, and shape the adventure to fit the time you have rather than squeezing a fixed amount of plot into every session.",
  sections: [
    {
      kind: "prose",
      heading: "Why there is no single ideal length",
      paragraphs: [
        "Players often ask for a number of hours that is correct for every table. In practice session length is a scheduling decision shaped by the group, the venue, the system, and how often you meet. A relaxed Saturday at someone's home, a slot booked in a shop with fixed closing hours, and a weeknight video call all place different constraints on attention, travel, and energy, and each favours a slightly different length.",
        "The most useful rule of thumb is sustainability over maximisation. A reliable shorter session you can run every week without strain does more for a campaign than an ambitious longer one that cancels often or leaves everyone tired. Start with a predictable time box you can keep, then adjust after a few sessions once you know how much of the booked time turns into play after arrivals, rules reminders, recaps, and breaks.",
      ],
    },
    {
      kind: "list",
      heading: "Typical session lengths at a glance",
      intro:
        "Use these ranges to choose a starting point, not as a grade. Each length works well for different goals:",
      items: [
        {
          term: "Around 2 hours",
          text: "Works for weeknight games, busy households, and groups with limited evening time. Plan for one meaningful scene with a decision and a consequence, rather than a full multi-scene arc. Keep setup and recap very short, and move levelling or shopping outside the slot when the group is happy to do so.",
        },
        {
          term: "Around 3 hours",
          text: "A dependable default for most home games and many online groups. Time for a recap, two or three scenes with variety, and a clear stopping point, with one short break if needed. Easier to sustain weekly than a longer booking.",
        },
        {
          term: "Around 4 hours",
          text: "A good target for a weekly evening when the group can protect the full slot and take a proper mid-session break. Room for two or three scenes plus one substantial combat or set piece, or a longer investigation with several locations. Budget realistically: four booked hours rarely means four hours of play once arrivals and breaks are counted.",
        },
        {
          term: "5 to 6 hours and longer",
          text: "Best kept for occasional longer games, weekend gatherings, or convention slots rather than every week. Useful when you want a full arc or a large dungeon to resolve in one go, but fatigue builds quickly. Schedule two breaks and keep water and food available, and expect less sharp decision making in the final hour.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Session length by play context",
      intro:
        "Match the length to where and how you play, rather than forcing one pattern onto every venue:",
      items: [
        {
          term: "Home games",
          text: "Evening sessions usually need 30 to 60 minutes of overhead in a three to four hour booking: catching up, recap, rules queries, a mid-session break, and packing up. Agree a firm end time so players with travel or early starts know what they are committing to. If evenings are tight, two to three focused hours often outlasts a four hour plan that regularly overruns.",
        },
        {
          term: "Local game store and open-table games",
          text: "Predictable start and finish times matter more than total length. Work within posted store hours, leave buffer before closing to pack up comfortably, and design for mixed groups where new players may arrive without knowing prior events. Three hours with a short break is a common and accessible slot; state the exact finish time in the listing so players can plan travel.",
        },
        {
          term: "Online play",
          text: "Fatigue and attention tend to favour shorter sessions. Video calls carry extra overhead from audio delays, screen sharing, and looking up rules, and sustained concentration on camera is tiring. Two to three hours with a brief pause often produces sharper play than a four hour call. If you run four hours online, build in a proper break away from screens.",
        },
        {
          term: "One-shots and convention play",
          text: "Design around the fixed slot, not the other way around. Budget backward from the hard stop: reserve the final third of usable play for the climax and wrap-up, keep scenes that can be trimmed without removing player decisions, and avoid starting a combat that cannot finish before the slot ends.",
        },
        {
          term: "Long-form campaigns",
          text: "Consistency matters more than hours per session. A regular two and a half or three hour slot that happens every week builds more momentum than a five hour session twice a month that keeps moving. Shorter, steady sessions also reduce preparation pressure on the Game Master.",
        },
        {
          term: "Groups with limited evening time",
          text: "Two to three hour sessions can work very well when you organise them tightly. Open with a one or two sentence recap, start at the interesting moment rather than narrating the approach, prepare a single scene that can resolve with a real change, and stop once that change has landed. The next session then starts cleanly from that new situation.",
        },
      ],
    },
    {
      kind: "list",
      heading: "How session length shapes pacing and encounter design",
      intro:
        "Shorter and longer sessions are not just scaled versions of each other. The length determines what you can fit without rushing:",
      items: [
        {
          term: "Number of scenes and combats",
          text: "Tactical combat in systems like D&D or Pathfinder often takes 40 to 60 minutes per encounter. A three hour slot therefore holds at most one substantial fight plus surrounding scenes, while a two hour slot is usually better with no full combat or with one compact encounter that has a clear objective beyond reducing every opponent to zero.",
        },
        {
          term: "Recap, setup, and breaks eat a larger share of short slots",
          text: "A fifteen minute recap and a ten minute break are minor in a four hour evening but consume a fifth of a two hour session. In short sessions keep the recap to one or two sentences and move shopping, levelling, and extended rules discussion outside play when the group is willing.",
        },
        {
          term: "Pacing within the session",
          text: "Plan content around the time you have. For an evening of three hours, a strong opening scene, one or two developments, and a closing beat that ends at a natural pause often reads better than five locations and a hurried finale. For a longer day, include a mid-point turn and a visible path to the climax so players can judge momentum.",
        },
        {
          term: "Stopping points and campaign continuity",
          text: "Longer sessions can absorb a cliffhanger because the next game is far away. Shorter or less frequent sessions benefit from stopping at a resolved beat: a door opened, a clue found, a promise made, or a safe place reached. That gives the next recap a clean hook and avoids reopening an unfinished tactical position cold.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Signs your sessions are too long or too short",
      intro:
        "Use these tells after two or three sessions at your current length to decide whether to adjust:",
      items: [
        {
          term: "Too long",
          text: "Players check the clock before the final act, decisions slow down markedly in the last hour, breaks get skipped to catch up, the group regularly overruns the stated finish time, or the Game Master finishes each session tired enough to delay the next one.",
        },
        {
          term: "Too short",
          text: "Every session ends mid-scene with no change to carry forward, players feel they had no meaningful choice before packing up, or the table spends most of the slot on recap and setup with only a few minutes of active play.",
        },
        {
          term: "About right",
          text: "Most sessions reach a clear pause or resolution, players know the expected finish time and can plan around it, at least one decision had a visible consequence, and the group leaves with a shared sense of what happens next, even when the plot moved only a short way.",
        },
      ],
    },
    {
      kind: "list",
      heading: "How to plan a session around a fixed time slot",
      intro:
        "A practical routine for turning a booked window into a playable plan:",
      items: [
        {
          term: "Lock a time box and protect the finish time",
          text: "State a start and a firm end time, including any buffer for packing up, and keep it. Players organise travel, childcare, and work around a predictable end; a session that ends when it says it will is easier to keep on the calendar.",
        },
        {
          term: "Subtract overhead before assigning content",
          text: "In a three or four hour booking, allow 30 to 60 minutes for arrivals, recap, a short break, and packing up. Assign scenes only to the usable time that remains. This single subtraction prevents the most common planning mistake: preparing four hours of plot for three hours of play.",
        },
        {
          term: "Prepare decisions, not duration",
          text: "Instead of planning for a fixed amount of plot, prepare two or three situations where players make a choice that changes what happens next, plus one optional scene you can drop if time is tight. Let an unneeded scene fall away rather than rushing the ending.",
        },
        {
          term: "Place the climax early enough to breathe",
          text: "For most sessions, begin the final push with enough time for it to resolve without being hurried. In a three hour slot that often means starting the closing beat 40 to 50 minutes before the end; in a four hour slot, 50 to 70 minutes. If the table is behind schedule, trim the optional middle rather than the ending.",
        },
        {
          term: "Leave buffer for a natural stopping point",
          text: "Reserve the last ten minutes for a short wrap: what was decided, what is now at stake, and where the next session will pick up. If you reach the end of a scene a little early, use the spare minutes to confirm the next objective out loud rather than opening a new complication you cannot close.",
        },
        {
          term: "Adjust after a few sessions",
          text: "After three sessions at the same length, ask whether the table regularly reaches a satisfying pause, whether anyone is consistently tired or rushed, and whether the amount you prepared matched the time you had. Change one thing at a time: a slightly earlier finish, a firmer break, or one fewer scene.",
        },
      ],
    },
    {
      kind: "example",
      heading: "The same adventure planned for three hours and four hours",
      paragraphs: [
        "A party is hired to find why a quarry has stopped delivering stone. The trail leads from the town office to the quarry itself, then into a flooded lower gallery where something has been breached.",
      ],
      items: [
        {
          term: "The short plan (3 hours booked, about 2.5 hours of play)",
          text: "Recap in two sentences, then start at the town office with the quarry foreman already present. Scene one: the office negotiation reveals a withheld payment ledger. Scene two: the quarry yard, with one compact problem (a blocked pump or a nervous crew chief) that points directly to the lower gallery. Final 50 minutes: the flooded gallery as a single decisive scene with one choice, seal the breach, rescue the trapped crew, or bargain with whatever was released. Skip the optional detour to the settlement archive; leave it as a rumour for next time if players ask about it.",
        },
        {
          term: "The longer plan (4 hours booked, about 3 to 3.5 hours of play)",
          text: "Same opening and same closing gallery, but add a brief mid-session break and an optional middle scene at the settlement archive or the merchants weighing office where players can recover the original contract. That extra scene is the one to trim if table discussion ran long earlier. Protect the final hour for the flooded gallery so the choice still lands without being rushed.",
        },
        {
          term: "Why it works",
          text: "Both plans share the same structure and the same final decision, but they assign content to the usable time each booking actually provides. The shorter plan protects a clear finish by removing an optional location up front rather than forcing a rushed ending. The longer plan keeps that location as a droppable middle, so the table gains texture when time allows and loses nothing when it does not.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Scheduling checklist before your next session",
      intro:
        "Run through these when you set the calendar invite or shop listing:",
      items: [
        "You have named a start time and a firm finish time that includes packing up.",
        "You subtracted time for arrivals, recap, a break, and packing up before deciding what to prepare.",
        "Players know the expected finish time before they commit, especially for store and open-table games.",
        "You planned two or three decision points the material can actually support, with one optional scene marked to drop.",
        "The closing beat is scheduled early enough to resolve without rushing.",
        "A ten minute buffer is kept at the end for a short wrap and a stated next objective.",
        "You will review after three sessions whether the chosen length regularly reaches a satisfying stopping point.",
      ],
    },
  ],
  codexConnection: {
    heading: "Plan sessions that fit the time you have",
    paragraphs: [
      "Deciding on a session length is a judgement call only the Game Master can make, but planning content that respects that length is easier with the right preparation support. Codex Cryptica helps you keep prep aligned with available time, with linked entities and notes that make recaps faster and session material easy to find again next time.",
      "Use the Session Prep Builder to shape a short run sheet around your actual time box, with core scenes separated from optional drop-in material you can remove without losing player decisions.",
    ],
    linkText: "Build a session run sheet",
    href: "/tools/session-prep-builder",
  },
  relatedTools: [
    {
      title: "Session prep builder",
      description:
        "Shape a run sheet around your available time, with core beats and optional encounters you can drop if the clock is tight.",
      href: "/tools/session-prep-builder",
    },
    {
      title: "Adventure generator",
      description:
        "Draft a situation with a clear hook and a decisive closing choice that fits inside the time you have booked.",
      href: "/generators/adventure-generator",
    },
    {
      title: "Dungeon generator",
      description:
        "Create a compact location you can resolve in one session, rather than a sprawling map that needs several visits.",
      href: "/generators/dungeon-generator",
    },
  ],
  relatedAnswers: [
    "how-do-i-pace-an-rpg-one-shot",
    "can-you-play-a-tabletop-rpg-in-30-minute-sessions",
    "how-much-prep-do-you-need-for-an-rpg-session",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "how-do-you-recap-a-ttrpg-session",
    "how-do-you-run-a-campaign-when-you-only-play-once-a-month",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
  ],
  discovery: {
    id: "answer-ttrpg-session-length",
    parentCluster: "running-the-game",
    clusters: ["running-the-game", "session-prep"],
    primaryIntent: "how long should a ttrpg session be",
    intentAliases: [
      "how long should a dnd session be",
      "typical rpg session length",
      "how many hours should a tabletop rpg session last",
      "how long should i run a game store rpg session",
      "how long should a dungeons and dragons session last",
      "ideal ttrpg session length",
      "how long do dnd sessions last",
      "rpg session length guide",
      "2 hour vs 4 hour rpg session",
    ],
    userJob: "understand",
    uniqueValue:
      "Gives GMs a practical session-length framework with trade-offs by duration and a context-by-context guide for home, store, online, one-shot and limited-time groups, plus pacing and fixed-slot planning so they can choose a sustainable length rather than a single ideal number.",
    relatedIntents: [
      "answer-pace-rpg-one-shot",
      "answer-short-session",
      "answer-monthly-campaign",
      "answer-prepare-session-step-by-step",
    ],
  },
  seo: {
    title: "How Long Should a TTRPG Session Be? | Codex Cryptica",
    description:
      "A practical guide to TTRPG session length: 2, 3, 4 and 5 hour trade-offs, advice for home, store and online play, and how to plan around a fixed slot.",
    image:
      "https://assets.codexcryptica.com/og/how-long-should-a-ttrpg-session-be.jpg",
    imageAlt:
      "A tabletop RPG group gathered around a table with character sheets and dice, a clock on the wall marking the session time",
  },
};

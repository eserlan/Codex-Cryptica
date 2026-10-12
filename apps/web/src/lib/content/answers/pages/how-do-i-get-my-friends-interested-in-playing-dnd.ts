import type { AnswerConfigInput } from "../schema";

export const howDoIGetMyFriendsInterestedInPlayingDnd: AnswerConfigInput = {
  slug: "how-do-i-get-my-friends-interested-in-playing-dnd",
  category: "getting-started",
  publishedAt: "2026-10-13",
  question:
    "How do I get my friends interested in playing D&D for the first time?",
  kind: "framework",
  shortAnswer:
    "Do not ask your friends to care about your campaign before they have had a chance to enjoy playing it. Invite them to try a short, low-pressure adventure with a clear ending, let them help choose the premise and tone, and make their choices matter at the table. Send no required homework, treat actual-play shows as optional inspiration, and explain the rules as you play. Curiosity is a good starting point: enthusiasm may grow after the first session, and it is normal for it to differ from yours.",
  sections: [
    {
      kind: "prose",
      heading: "The challenge is social, not creative",
      paragraphs: [
        "A first-time Dungeon Master often worries that friends are not interested enough, when the real gap is that nothing has happened at the table yet for them to be interested in. You may have spent weeks building a homebrew world, a calendar, a playlist of videos, and an actual-play series you love, while your friends know almost nothing about D&D. That difference in preparation is normal and does not mean they will not enjoy playing.",
        "This question is about initial buy-in, before anyone has rolled dice together. It is a different problem from keeping an existing group engaged with lore mid-campaign or making a session more engaging once play has started. Here the task is to offer a friendly invitation, make the first experience easy to say yes to, and find out whether your friends actually enjoy the game. Friendship should not depend on them agreeing to a year-long campaign.",
      ],
    },
    {
      kind: "list",
      heading: "Eight ways to make the first invitation work",
      intro:
        "Each of these lowers the cost of trying D&D without lowering what makes it interesting:",
      items: [
        {
          term: "Ask what sounds fun to them",
          text: "Offer a short menu before you pitch: mystery or humour, friendship or rivalry, exploration or combat, light or tense. Ask what kind of character sounds appealing and whether they prefer making one together or using a ready-made sheet. Be clear that playing is optional and that a no is respected.",
        },
        {
          term: "Pitch a try-out, not a saga",
          text: "Invite them to one or two sessions with a definite ending and an easy way to stop. A single objective for the evening is less daunting than signing up for an epic. Agree when you will play, how long the session lasts, and what happens if someone cannot make it.",
        },
        {
          term: "Remove required homework",
          text: "A long playlist and a favourite actual-play series can be shared as optional extras, not prerequisites. Explain the basic loop at the table: the DM describes the situation, the players say what they try, the DM asks for a roll when the outcome is uncertain, then the DM describes what happens. Provide pre-generated characters or a quick-start sheet, a one-page reference for common rolls, and let the rest be learned by doing.",
        },
        {
          term: "Treat actual-play as inspiration, not a standard",
          text: "A streamed cast has experience, editing, and a job to entertain an audience. Your friends do not need to act, do voices, or improvise clever dialogue to play well. Saying what your character does in third person, or taking a moment to decide, counts as roleplaying. Make that explicit so shy players are not put on the spot.",
        },
        {
          term: "Use props as invitations, not obligations",
          text: "A sealed letter, a simple hand-drawn map, or a small physical clue at the table can spark curiosity if you hand it over in play. Do not use props to pressure friends to attend, read lore between sessions, or prove enthusiasm before the game. Avoid spending days on presentation for a game you have not yet tested as fun.",
        },
        {
          term: "Keep homebrew small and playable",
          text: "A My Little Pony-inspired friendship fantasy, or any other setting you love to create, is fine if the group likes the premise. The skill to build is not abandoning homebrew but starting it in one small location with a playable problem. Loving to create a world and giving players things to do in it are related but not the same: the first belongs in your notes, the second belongs in the opening scene.",
        },
        {
          term: "Make the opening playable early in the session",
          text: "Begin with a concrete choice, a small mystery, or a request from an approachable non-player character. Give each person a chance to contribute through a decision rather than a performance test, and show a consequence quickly so choices feel real. Two to three leads, one conversation, and one meaningful decision is plenty for an evening.",
        },
        {
          term: "Ask what they enjoyed afterwards",
          text: "After the session, ask what was fun, what felt slow, and what they would change. Let the group choose whether to continue, adjust tone or frequency, or stop. Different levels of enthusiasm are normal. No reasonable method guarantees equal investment, and you should not judge less enthusiastic players for being honest about what they want.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Homework and comparison are the usual traps",
      paragraphs: [
        "Two patterns stall first games more than any lack of enthusiasm. The first is assigning study: pages of lore, a calendar to memorise, a series to watch to understand how D&D should sound. The table does not need that background to make a first decision, and requiring it tells friends that enjoyment depends on preparation they never agreed to. Offer material as a take-it-or-leave-it extra after they have played, not as an entry fee.",
        "The second is holding the table to a performance standard set by actual play. New players who think they must speak in character, be funny on cue, or act with the polish of a regular cast will hesitate rather than try. State the alternative plainly: describe intent in your own words, roll when asked, and let character come through choices. Third-person play, short answers, and passing when unsure are all legitimate.",
      ],
    },
    {
      kind: "prose",
      heading: "Props and homebrew: enthusiasm without pressure",
      paragraphs: [
        "Physical props work because they make a fictional item present in the room, not because they oblige anyone to engage outside the session. Hand a sealed letter across the table after the characters have already met the sender, not as a summons sent days before anyone has agreed to play. Keep preparation cheap: one letter, one simple map, or one clue the players can handle is enough to test whether the idea delights the group. If it does, you can do more next time. If not, nothing important is lost.",
        "Homebrew follows the same principle. Players do not need the full setting bible to enjoy the first session. Start with one village, one festival, or one roadside inn, people the characters can talk to, and a problem they can affect tonight. Let the world expand based on what they pursue, not on what you prepared in advance. That approach respects both your creative investment and their right to shape the story through play.",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: the missing keepsake",
      paragraphs: [
        "A one-session friendship-fantasy opening for three to five new players at level 1. No setting lore or rules homework is required. The characters use pre-generated sheets, the DM explains rolls as they come up, and a sealed letter is an optional table prop handed out during play, not sent beforehand.",
      ],
      items: [
        {
          term: "Setup in one village square",
          text: "The village of Bramble Hollow is preparing its harvest festival. A modest keepsake, a ribbon-bound lantern that the village lights together at dusk, has vanished from the hall where it was stored. The elder who tends it, Mara Finch, is worried but not grand: the ceremony can still happen another way if the lantern is not found. Two rumours circulate: a wind spirit seen near the orchard wall, and muddy prints leading toward the old mill. The map is a simple sketch of square, orchard, and mill.",
        },
        {
          term: "The invitation as a table prop",
          text: "As the session starts, Mara hands the party a short, sealed note across the table: three lines asking for help tonight, no lore attached. Tearing it open is the first small, physical choice. Players who enjoy props get a moment; players who do not simply read the text aloud and move on. The note does not require prior reading or a reply between sessions.",
        },
        {
          term: "Two to three leads, one conversation, one decision",
          text: "The party can examine the hall for clues, follow the prints to the mill, or ask the orchard keeper what the wind story really was. Each lead gives a short, playable detail: a loose shutter, a half-finished repair, a neighbour who borrowed the lantern to mend its frame and forgot to return it. The keeper is a friendly, low-stakes conversation that teaches new players how talking to a non-player character works: the DM describes what the keeper wants, the players say what they try, and a roll happens only if the outcome is uncertain. Give each player one decision by name, without spotlight pressure: who checks the hall, who talks, who decides what to do with the keepsake if it is simply misplaced rather than stolen.",
        },
        {
          term: "How choices shape what comes next",
          text: "If the party return the lantern quietly, the festival lights on time and Mara remembers their discretion. If they reveal the borrower, the village thanks them but the neighbour is embarrassed, which changes who offers help next session. If they leave the lantern where it is and help the neighbour finish the repair, the ceremony uses a substitute and the repaired lantern becomes a small gift later. The DM notes the choice, closes the evening with the lights going up or a kind alternative, and asks whether the group wants a second outing. The adventure ends cleanly tonight and can continue only if everyone wants it to.",
        },
        {
          term: "Why it works",
          text: "The opening can become playable early in the session, uses no lore beyond what the DM says in the square, and does not require voices or acting skill. The sealed letter creates curiosity without coercion, the leads keep the table moving, and the final decision has a visible, friendly consequence the players can recognise next time they meet Mara. The homebrew premise sets tone without adding required reading, and the clean ending respects consent: curiosity was enough to start, and continuation is a real choice.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Before you invite friends to a first game",
      intro:
        "Run through this once before you pitch and once before the table meets:",
      items: [
        "You have asked what themes and tone sound fun to them, and made clear that playing is optional.",
        "You are offering one or two sessions with a clear objective and ending, not an open-ended campaign.",
        "No video playlist, reading list, or lore document is required. Anything shared is marked optional.",
        "Pre-generated or quick-start characters, a one-page rules summary, and dice or a shared roller are ready.",
        "You have told the group that describing actions in third person is valid and that no one must do voices.",
        "Any prop is a single, low-effort item to reveal at the table, not a task sent between sessions.",
        "If you use homebrew, the first session is one small location with a playable problem, not the whole setting.",
        "The opening gives a concrete choice early in the session and a visible consequence before the session ends.",
        "You have a short, kind question ready for afterwards: what did you enjoy and do you want to continue, change, or stop?",
      ],
    },
  ],
  codexConnection: {
    heading: "Use only what makes the first session easier",
    paragraphs: [
      "This answer is about a social decision and a short playable opening, not about filling a campaign. Codex Cryptica is most useful after friends have chosen to play, when you need a single small location and a handful of people with clear wants for that evening.",
      "If you want a prompt for a starting problem or a quick name for an approachable non-player character, a quest or NPC generator can produce one to adapt, but you do not need a vault, a graph, or a library of tools to run a one-session try-out. Build only what the opening needs, then keep what the table actually used.",
    ],
    linkText: "See D&D tools and guides",
    href: "/for/dungeons-and-dragons",
  },
  relatedTools: [
    {
      title: "Quest generator",
      description:
        "Turn a one-session premise into a patron, objective, and complication you can run tonight.",
      href: "/generators/quest",
    },
    {
      title: "NPC generator",
      description:
        "Create a friendly first-session contact with a clear want, without writing a full cast.",
      href: "/generators/npc",
    },
  ],
  relatedForPages: [
    {
      title: "Dungeons & Dragons",
      description:
        "Keep D&D characters, locations, and session history connected as the campaign grows.",
      href: "/for/dungeons-and-dragons",
    },
  ],
  relatedAnswers: [
    "how-do-i-start-gming-for-the-first-time",
    "how-do-i-start-a-dnd-campaign",
    "how-do-i-run-a-successful-session-0",
    "how-do-i-get-players-to-engage-with-my-campaign-world",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
    "what-should-a-new-dnd-player-know-before-their-first-game",
    "what-should-a-new-dnd-player-learn-first",
    "how-do-i-read-a-dnd-character-sheet-as-a-beginner",
    "how-do-i-find-a-tabletop-rpg-group-to-play-with",
    "how-do-i-get-my-rpg-party-to-work-together",
    "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
  ],
  labels: ["fantasy"],
  discovery: {
    id: "answer-invite-friends-to-try-dnd",
    parentCluster: "getting-started",
    clusters: ["getting-started", "dnd-new-player"],
    primaryIntent:
      "how to get friends interested in playing dnd for the first time",
    intentAliases: [
      "how to convince friends to try dnd",
      "get friends into dnd",
      "first time dm friends not interested",
      "introduce beginners to dnd",
      "new dm low player enthusiasm",
      "how to invite friends to dnd",
      "friends curious about dnd not invested",
      "how to run dnd for reluctant friends",
    ],
    uniqueValue:
      "Solves the pre-game social challenge of inviting curious but uninvested friends, covering low-pressure framing, removing homework, props as invitations, and a friendship-fantasy one-session example with a meaningful choice, distinct from mid-campaign engagement or general session technique.",
    userJob: "understand",
    relatedIntents: [
      "answer-first-time-gm-hub",
      "answer-start-dnd-campaign",
      "answer-session-zero",
      "answer-player-engagement",
      "answer-session-engagement",
      "answer-new-dnd-player-first-game",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-first-time-gm-hub",
        reason:
          "That answer teaches any first-time GM how to run a first session; this answer solves the distinct pre-game invitation problem for a DM whose friends are only curious, covering buy-in, homework, and actual-play expectations before the table meets.",
      },
      {
        with: "answer-start-dnd-campaign",
        reason:
          "The D&D campaign start is about choosing premise, rules baseline, and a playable first situation for an intending group; this answer is about getting friends to agree to try that first session at all, including consent, scheduling, and homebrew framing for newcomers.",
      },
      {
        with: "answer-player-engagement",
        reason:
          "The player-engagement answer addresses ongoing disengagement with lore mid-campaign; this page addresses initial enthusiasm before play, where curiosity is a valid starting point and no DM can guarantee equal investment.",
      },
      {
        with: "answer-session-engagement",
        reason:
          "The session-engagement answer covers making play itself compelling once the group is at the table; this page is the earlier step of securing a low-pressure try-out and making the opening playable early in the session for beginners.",
      },
      {
        with: "answer-session-zero",
        reason:
          "Session 0 aligns an existing group on expectations and boundaries; this answer is the invitation that precedes it, about whether and how to propose a short first game to friends who have not yet committed.",
      },
      {
        with: "answer-new-dnd-player-first-game",
        reason:
          "That answer is for the new player learning what to do at their own first game; this answer is for the friend inviting them, covering how to frame the invitation, remove homework, and make a short try-out feel safe to accept.",
      },
      {
        with: "answer-pros-cons-becoming-dungeon-master",
        reason:
          "That answer weighs whether to take on the DM role at all; this answer assumes the reader has already chosen to try DMing and focuses on the specific social step of inviting curious friends to a first session.",
      },
    ],
  },
  seo: {
    title:
      "How do I get my friends interested in playing D&D? | Codex Cryptica",
    description:
      "Invite curious friends to a low-pressure D&D try-out: short adventure, no homework, optional props, and a playable opening early in the session.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-get-my-friends-interested-in-playing-dnd.jpg",
    imageAlt:
      "Friends gathered around a table with a hand-drawn village map, sealed letter, dice and cheerful character sheets in warm light",
  },
};

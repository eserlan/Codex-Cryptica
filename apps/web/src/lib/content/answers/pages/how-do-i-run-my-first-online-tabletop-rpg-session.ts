import type { AnswerConfigInput } from "../schema";

export const howDoIRunMyFirstOnlineTabletopRpgSession: AnswerConfigInput = {
  slug: "how-do-i-run-my-first-online-tabletop-rpg-session",
  category: "session-prep",
  publishedAt: "2026-10-19",
  question: "How do I run my first online tabletop RPG session?",
  kind: "how-to",
  shortAnswer:
    "Start with voice chat everyone can hear clearly, character sheets in whatever tool your players already use, and a shared map or virtual tabletop (VTT) only for scenes that need one. Two programs with separate jobs, such as one for voice and one for maps, is a normal setup, not too much. Run a short technical rehearsal before the first session, agree how people will signal, take turns and take breaks, and keep every other tool out until play shows you need it.",
  sections: [
    {
      kind: "prose",
      heading: "You already know the hard part",
      paragraphs: [
        "Running a session online does not ask you to learn a second way to game master. Pacing a scene, playing a non-player character (NPC), calling for a roll and knowing when to move on all transfer from the physical table. What changes is narrower: players cannot see your hands, read the room at a glance, or lean over to point at the map. Your first online setup only has to replace hearing each other, seeing anything that must be shared, and knowing whose turn it is to speak.",
        "That is why the smallest workable setup is smaller than most tool lists suggest. If voice works, sheets are reachable and any map you actually need is visible, you can run a full session. Video, dice bots, music, automation and a library of prepared maps can wait until a real gap appears in play.",
      ],
    },
    {
      kind: "table",
      heading: "The smallest workable setup, by job",
      headers: ["Job", "Smallest workable choice", "Needed for session one?"],
      rows: [
        [
          "Hearing and speaking",
          "One voice chat the whole group joins, with headphones to cut echo",
          "Yes",
        ],
        [
          "Character sheets and dice",
          "The sheet and dice method each player already uses, physical dice included",
          "Yes, in some reachable form",
        ],
        [
          "Shared visual space",
          "One shared map or virtual tabletop (VTT), opened only for scenes that need positions",
          "Only if your game needs a shared map",
        ],
        [
          "Handouts and images",
          "Images or PDFs posted in one agreed channel or folder",
          "Only the items this session uses",
        ],
        [
          "Your notes",
          "The notes app or notebook you already keep, private to you",
          "Yes, but the tool is your choice",
        ],
        [
          "Video",
          "Cameras on for anyone who wants them",
          "No, optional unless the group agrees otherwise",
        ],
      ],
    },
    {
      kind: "prose",
      heading: "Is using Discord plus Owlbear Rodeo cumbersome?",
      paragraphs: [
        "No. Two programs is not too many when each one does a job the other does not. The common version of this setup gives voice, text chat and file sharing to the voice program, and gives the shared map, tokens and measuring to the map program. Nobody has to keep both windows in front of them all session: the map matters during exploration and fights, and the voice channel carries everything else.",
        "What makes a setup feel cumbersome is rarely the count of programs. It is switching between several tools for the same job, hunting for a handout across three places, or learning a new feature while a scene is waiting. Keep one home per job, say out loud when you are moving attention to the map, and bring the group back to voice and description when the map stops helping.",
        "Treat any claim about how two named products connect as something to check in those products at the time you set up. You do not need a special connection between them for this setup to work: one carries the conversation, the other shows the shared picture, and you pass links or invites between them by hand.",
      ],
    },
    {
      kind: "list",
      heading: "Prepare the technology before you prepare extra content",
      intro:
        "Most first-session friction online is joining, hearing and permission trouble, not adventure design. Settle these once:",
      items: [
        {
          term: "Invites and permissions",
          text: "Send the voice invite and the map link early, and confirm each player can join, open the map and move their own token before session day. Check sharing settings on any folder or document while signed out or from a second account if you can, so a private link does not surprise you mid-scene.",
        },
        {
          term: "Audio first",
          text: "Ask everyone to use headphones or earbuds, which removes most echo and feedback. Do a two minute voice test where each person speaks, rolls a die out loud and says their character name. Quiet players need their input level raised now, not during the opening scene.",
        },
        {
          term: "A backup channel",
          text: "Agree where the group goes if voice fails: usually the text channel beside it, or a second call. Write the fallback in the same message as the invites so nobody has to search for it while disconnected.",
        },
        {
          term: "Browsers and phones",
          text: "Ask anyone joining from a phone or tablet to open the map link in advance and try moving a token. A small screen can work for following play and rolling, but map editing and reading long handouts are harder there, so plan to describe anything that player cannot comfortably open.",
        },
        {
          term: "Safety and boundaries, briefly restated",
          text: "If your group agreed lines, veils or a pause signal in Session 0, restate how that signal works online before play, for example a word in voice chat or a message anyone can send without explanation. A player who has gone quiet may be uncomfortable, muted or disconnected, and the agreed signal removes the guessing. The [Session 0 answer](/answers/how-do-i-run-a-successful-session-0) covers choosing that agreement.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Replace physical props with timing, not with more files",
      paragraphs: [
        "At a physical table you can slide a letter across, hold up a picture, or place a key in front of the player who found it. Online, the equivalent is control of when something appears. Post the image at the moment the character finds it, send one clue privately to the player whose character noticed it and let that player choose whether to share it, and reveal a map area only when the party can see it. The pause before the reveal does the work the physical hand-off used to do.",
        "Keep each handout to the smallest readable form: a single image or short PDF for a letter or item card, plain text pasted under the image for anyone on a small screen or using a screen reader, and one agreed place to find it again later. Name files for what the characters see, not for what they hide, so a filename does not give away a twist. For deciding what lore belongs in player hands at all, see [Should I share worldbuilding notes and lore with my players?](/answers/should-i-share-worldbuilding-notes-with-my-players)",
      ],
    },
    {
      kind: "list",
      heading: "Agree the online norms in the first ten minutes",
      intro:
        "Physical tables run on glances, raised hands and side remarks. Say the online replacements out loud once, rather than assuming everyone shares the same habits:",
      items: [
        {
          term: "Microphones",
          text: "Choose open microphones in a quiet room or push-to-talk where there is background noise, and agree that people mute while eating, typing loudly or away from the session. Either choice works; a mixed room with no agreement does not.",
        },
        {
          term: "Cameras stay optional",
          text: "Do not require video. Some players concentrate better visible, others play from shared rooms or low bandwidth connections. If nobody uses cameras, compensate with names: say who you are addressing, especially when two characters could answer.",
        },
        {
          term: "Turn taking and signals",
          text: "Replace body language with short verbal habits. Name the next speaker in busy scenes, say pass when you are done, and use an agreed phrase or chat message for I want to add something, I need a pause, or please repeat that. In combat, announcing who is next serves the same purpose; the [combat tracking answer](/answers/how-do-i-track-monsters-initiative-and-hit-points-in-dnd-combat) shows a tracker that supports it.",
        },
        {
          term: "Breaks and side talk",
          text: "Schedule a short break roughly each hour, because nobody can catch your eye to ask for one. Keep table chat and jokes in the voice channel where everyone shares them, and treat private messages during play as the online version of passing a note: fine in most groups, worth one sentence of agreement with a new group.",
        },
        {
          term: "Attendance and lateness",
          text: "Agree how long the group waits, who tells the group they are running late and in which channel, and what happens to a character whose player is absent. Online joining is easy to forget precisely because there is no travel involved.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Do online players get distracted more?",
      paragraphs: [
        "There is no good reason to assume so. At home a player has a phone, a second screen and a kitchen, and at a physical table a player has a phone, a rulebook and a conversation beside yours. What online play does remove is your ability to notice drifting attention early, because you cannot see someone stop following. Treat distraction as a pacing and clarity problem before treating it as a respect problem.",
        "Shorter descriptions help online, not because attention is shorter but because a listener cannot skim back over what you said. Describe in a few clear sentences, name what the characters can act on, then ask a specific player what they do. Check in at scene changes with a direct question rather than a general are you all still there. If someone has been quiet for a while, give their character a reason to be addressed and accept a short answer; some players follow closely while saying little, in person and online alike.",
      ],
    },
    {
      kind: "prose",
      heading: "Pace for voices in separate rooms",
      paragraphs: [
        "Mark scene changes more plainly than you would in person. A sentence such as we leave the inn and cut to the mill at dusk replaces the physical cues of clearing the map and changing your posture. Recap where everyone is standing before a complicated action, and confirm decisions out loud before acting on them, because a nod is invisible and a chat reaction is easy to miss.",
        "Resist adjusting the virtual tabletop while players are waiting on a scene. If a map, token or lighting setting fights you, describe the space, place tokens approximately and fix the detail at the break. Players remember a scene that kept moving; they rarely remember whether a wall line was exact. Prepare only the maps this session is likely to touch, in line with the wider prep in [How do I prepare an RPG session step by step?](/answers/how-do-i-prepare-an-rpg-session-step-by-step)",
      ],
    },
    {
      kind: "example",
      heading: "Worked example: a four player fantasy session, two tools",
      paragraphs: [
        "A game master who has run this group in person moves a four player fantasy campaign online for one evening. The group keeps its usual character sheets and physical dice. Only two programs are opened.",
      ],
      items: [
        {
          term: "Before anyone arrives",
          text: "The game master posts one message with the voice invite, the map link, and the fallback text channel. The map holds one tactical scene, a mill yard, with four player tokens placed at the gate. A handout image of a miller's notice is saved ready to post, with its text typed underneath for small screens.",
        },
        {
          term: "Opening, on voice only",
          text: "Everyone joins voice fifteen minutes early for the first night. Headphones on, each player introduces their character in one sentence so names attach to voices. The game master restates the norms: mute while away, cameras optional, say pass when finished, break at the hour. The map stays closed.",
        },
        {
          term: "Exploration, still on voice",
          text: "The party questions the miller and searches the yard, described entirely in words. When a player searches the office, the game master posts the notice image in the text channel at that moment and reads its key line aloud. That player decides whether her character shares the warning in it, which produces the same beat as handing her the physical note.",
        },
        {
          term: "The fight, map open",
          text: "When watchmen rush the yard, the game master says we are moving to the map and gives everyone a moment to open it. Players move their own tokens; the game master tracks initiative and hit points on a paper list beside the keyboard. Nobody opens a third program, and dice stay physical because the group trusts spoken results.",
        },
        {
          term: "Close, map closed again",
          text: "After the fight the map closes, the recap happens on voice, and the game master confirms the next date and where the notice image lives for anyone who wants to reread it. Total new habits learned by the players: join this call, open this link when asked, say pass.",
        },
        {
          term: "Why it works",
          text: "Each program kept one job, the map appeared only when positions decided something, and the handout landed as an event rather than a file in a folder. The game master ran the same session they would have run in person, with joining and signalling agreed in advance.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "The 10 to 15 minute preflight",
      intro:
        "Run this before the first online session, and repeat the first four items before each session after:",
      items: [
        "Send one message containing the voice invite, the map link if you use one, and the agreed backup channel.",
        "Open the voice call early, put headphones on, and speak a test sentence at normal game volume.",
        "Confirm every player can join, be heard, open the map and move their own token.",
        "Check that handouts and shared documents open with the permissions you intended.",
        "Place only this session's maps and tokens, and close every unrelated tab and program.",
        "Put your tracker, notes and any private clues where players cannot see them on a shared screen.",
        "Post the session's one handout or image where you can reach it in one click, with a plain text version ready.",
        "Write down the opening line, the break time and the fallback plan if voice fails.",
      ],
    },
    {
      kind: "prose",
      heading: "A short opening routine for session one",
      paragraphs: [
        "Open the call fifteen minutes early and treat arrivals as the rehearsal: greet people by name, fix the one audio problem that always appears, and let small talk do the settling that it does around a physical table. Then restate the session shape in under a minute: cameras optional, mute when away, say pass or raise the agreed signal, break at a stated time, and this is where we go if the call drops.",
        "Start play with a scene that needs voices only, such as a conversation, a journey decision or an arrival, so the first success of the night does not depend on the map. Bring the shared map in at the first scene where position changes a choice. End by confirming the next date, where handouts live, and one thing that worked technically, so the second session starts from a routine rather than another first time. If this online group is also a new group, [How do I find a tabletop RPG group to play with?](/answers/how-do-i-find-a-tabletop-rpg-group-to-play-with) covers the recruiting and trial session side.",
      ],
    },
    {
      kind: "prose",
      heading: "What not to overbuild",
      paragraphs: [
        "Skip the automation spree before session one. Dozens of macros, automated effects, music bots, dynamic lighting on every map and a wiki the players must read first are all ways of rebuilding the physical table feature by feature, and each one is another thing that can fail in front of an audience. Demanding cameras on, banning physical dice without a reason, or requiring every player to learn your notes system adds friction in the same way.",
        "Add one tool at a time, after a session shows you the gap it fills. If tracking conditions was genuinely hard, look at markers next week. If nobody could find old handouts, agree a folder then. A setup that survived a whole session unchanged is worth more than a larger one nobody has finished learning, and the [session engagement answer](/answers/how-do-you-make-a-tabletop-rpg-session-more-engaging) is a better next step than more software once the basics hold.",
      ],
    },
  ],
  codexConnection: {
    heading: "Where Codex Cryptica fits, and where it does not",
    paragraphs: [
      "Codex Cryptica does not replace your voice call or your shared map, and this setup does not need it to. What it can hold is the campaign material around the session: NPCs, places and factions as linked notes you can open while describing a scene, your session prep in one place, and a recap written afterwards so the next online session starts from what actually happened. Keep the call and the map doing their two jobs, and let the campaign notes live where you can find a name or a promise quickly.",
    ],
    linkText: "See the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedTools: [
    {
      title: "Campaign manager",
      description:
        "Organise NPCs, places and session notes in one campaign view you can keep open beside the call.",
      href: "/solutions/campaign-manager",
    },
    {
      title: "RPG knowledge graph",
      description:
        "See how the people and places in your session notes connect when you need a name mid-scene.",
      href: "/solutions/rpg-knowledge-graph",
    },
  ],
  relatedAnswers: [
    "how-do-i-run-a-successful-session-0",
    "how-do-i-prepare-an-rpg-session-step-by-step",
    "should-i-share-worldbuilding-notes-with-my-players",
    "how-do-i-track-monsters-initiative-and-hit-points-in-dnd-combat",
    "how-do-i-find-a-tabletop-rpg-group-to-play-with",
    "how-do-you-make-a-tabletop-rpg-session-more-engaging",
  ],
  discovery: {
    id: "answer-first-online-tabletop-rpg-session",
    parentCluster: "session-prep",
    clusters: ["session-prep"],
    primaryIntent: "how do i run my first online tabletop rpg session",
    intentAliases: [
      "how to run an rpg session online for the first time",
      "first online dnd session setup",
      "how to gm online with discord and a virtual tabletop",
      "online rpg session checklist for gms",
      "moving an in person rpg group online",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A transition guide for experienced in person game masters: the smallest workable online setup by job, a direct answer on using one voice program plus one map program, a short technical rehearsal, online speaking norms, pacing changes, and a timed preflight with a worked four player session.",
    relatedIntents: [
      "answer-session-zero",
      "answer-prepare-session-step-by-step",
      "answer-share-worldbuilding-notes",
      "answer-track-monsters-initiative-hit-points-dnd-combat",
      "answer-find-rpg-group",
      "answer-session-engagement",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-session-zero",
        reason:
          "Session Zero covers aligning a group on premise, boundaries and party connections before a campaign. This answer covers the technical setup, speaking norms and pacing for an experienced game master running online for the first time, and restates a Session Zero agreement online rather than replacing it.",
      },
      {
        with: "answer-prepare-session-step-by-step",
        reason:
          "That answer covers preparing adventure content for a session in any setting. This answer covers the online layer only: tools by job, joining and audio checks, handout timing, verbal signals and scene pacing for remote play.",
      },
      {
        with: "answer-session-engagement",
        reason:
          "That answer covers making session content engaging in general. This answer covers the narrower remote causes of drifting attention: invisible cues, description length, check-ins and tool switching during online play.",
      },
      {
        with: "answer-in-person-gm-notes",
        reason:
          "That answer covers organising notes and references for a physical table. This answer covers moving an experienced game master online: voice and map tools, joining checks, verbal signals and remote pacing.",
      },
      {
        with: "answer-track-monsters-initiative-hit-points-dnd-combat",
        reason:
          "That answer covers tracking initiative, hit points, Armour Class and conditions during a D&D fight, including in an online setup. This answer covers the whole first online session: choosing tools, rehearsal, norms, handouts and pacing beyond combat.",
      },
    ],
  },
  seo: {
    title:
      "How do I run my first online tabletop RPG session? | Codex Cryptica",
    description:
      "Run your first online RPG session with voice, sheets and one map tool only when needed. Two programs is fine. Preflight checklist and worked example included.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-run-my-first-online-tabletop-rpg-session.jpg",
    imageAlt:
      "A game master at a desk with headphones and a laptop showing four players on a call and a fantasy battlemap, with dice and a notebook beside the keyboard",
  },
};

import type { AnswerConfigInput } from "../schema";

export const howCanIPractiseBeingADungeonMasterWithoutAGroup: AnswerConfigInput =
  {
    slug: "how-can-i-practise-being-a-dungeon-master-without-a-group",
    category: "getting-started",
    publishedAt: "2026-10-21",
    question: "How can I practise being a Dungeon Master without a group?",
    kind: "how-to",
    shortAnswer:
      "Practise the Dungeon Master's side of the table in short solo drills built around one repeatable loop: describe a situation, ask what a player character does, call for a roll only when the outcome is uncertain and failure would change something, then narrate the consequence and hand the next decision back. Write two or three plausible player choices in advance, run one obstacle, one short non-player character conversation and one combat round against the clock, and finish by noting where you hesitated. That rehearses scene framing, rulings, rule lookups and bookkeeping. It cannot reproduce real players surprising you or the social work of a live table, so treat it as preparation for a tiny first session rather than a replacement for one.",
    sections: [
      {
        kind: "prose",
        heading: "Practise your side of the table",
        paragraphs: [
          "A Dungeon Master (DM) does a small set of jobs again and again: present a situation clearly, invite action, decide whether the rules need to settle anything, describe the result and move the scene on. Those jobs can be rehearsed alone because they belong to you. What a group adds is other people's choices, questions and reactions, which no solo drill fully supplies.",
          "Keep each drill small. One place, one obstacle, one non-player character (NPC) and one prewritten test character are enough. Speak the DM lines aloud if you can; reading silently hides the pauses where you would search for a word, a number or a rule at a real table. If you want the broader path into running a first game, including choosing material and preparing a session, read the first-time GM guide linked below and use this page for the practice routine itself.",
        ],
      },
      {
        kind: "table",
        heading: "What solo practice can and cannot teach",
        headers: ["DM move", "Rehearse it alone", "Only real players add"],
        rows: [
          [
            "Frame a scene",
            "Describe one place in three sentences: what is here, what is wrong and what needs a decision.",
            "Questions that reveal which details your description left unclear.",
          ],
          [
            "Decide whether to roll",
            "Take one attempted action and say aloud why it succeeds, fails or needs a check before touching dice.",
            "Attempts you did not anticipate, argued with better information than your notes held.",
          ],
          [
            "Find a rule quickly",
            "Time a lookup in your rulebook or notes. If it takes too long, make a temporary ruling, write down the exact question and look it up afterwards.",
            "Pressure from a table that wants the scene to keep moving while you decide.",
          ],
          [
            "Narrate failure without a dead end",
            "Resolve the attempt honestly, apply consequences supported by the fiction or rules, then return a meaningful decision. The objective can remain unmet; the character might try another approach or withdraw.",
            "A player's disappointment or excitement, and judging how much consequence feels fair.",
          ],
          [
            "Play an NPC from a motive",
            "Give the NPC one want and one boundary, then answer three questions from that want rather than from a script.",
            "Unscripted negotiation, humour and players testing the boundary in ways you did not plan.",
          ],
          [
            "Run a short combat round",
            "Roll initiative, take one turn for a test character and one for a monster, and track hit points (HP) on paper as you go.",
            "Several players asking questions at once and choosing tactics you did not expect.",
          ],
          [
            "End a scene decisively",
            "Close with a changed fact and a direct question, such as who arrives, what it costs or what happens next.",
            "Knowing when a real group is finished with a scene rather than bored by it.",
          ],
        ],
      },
      {
        kind: "example",
        heading: "Worked scene: the flooded sluice gate",
        paragraphs: [
          "Use a simple test character so the numbers stay fixed while you practise the words. Bryn is a level 1 fighter with Athletics +5 (the +3 Strength modifier and +2 proficiency bonus are already included in that +5, so add it once), a longsword attack at +5 for 1d8 + 3 damage, Armour Class (AC) 16 and 12 HP. The scene needs one sluice gate, one rising millpond and one miller who has not arrived yet.",
        ],
        items: [
          {
            term: "You say, as DM",
            text: '"Rain has pushed the millpond up to the top of the sluice gate. Brown water is spilling across the cart track, and the chained wheel that opens the gate is slick and swollen tight. Somewhere behind the mill, someone is shouting. What do you do?" The description gives a place, a problem and a decision, then stops.',
          },
          {
            term: "The simulated player chooses",
            text: 'Before you described the scene, you wrote three player cards. Draw the first: "I brace my shield against the wheel and heave." Read it aloud in your normal voice. You do not need a character voice for the drill to work.',
          },
          {
            term: "You decide whether a roll is needed",
            text: 'Forcing the wheel is possible, the outcome is uncertain and failure costs time while the water rises, so a roll earns its place. This is an ability check, because Bryn is attempting something: roll a d20 and add the Athletics modifier. It is not an attack roll, since the wheel has no AC to hit in this situation, and it is not a saving throw, because nothing is happening to Bryn that she must resist. Set the Difficulty Class (DC) before rolling and say it aloud: "That is a Strength (Athletics) check, DC 12." Naming the target in rehearsal builds the habit of setting it before you know the result.',
          },
          {
            term: "The roll",
            text: "The d20 shows 6. Bryn's total is 6 + 5 = 11, which misses DC 12. The attempt fails. One optional ruling is partial progress with a cost; the next line shows it. A failed check does not require progress or a new complication.",
          },
          {
            term: "You narrate the changed situation",
            text: 'For that optional ruling, say aloud: "The wheel turns a quarter circle before the chain slips off the wet wood and clangs against the post. The gate lifts a hand\'s width. Water starts to move, but slowly, and two empty grain crates bump against the far bank. The shouting behind the mill stops." If you ruled that the gate stays closed, say that time passed and the water rose instead. Then draw the next player card or ask whether Bryn tries another approach or withdraws. You can move to the NPC beat when Tam arrives with his stated concern.',
          },
          {
            term: "You end the beat with a decision",
            text: 'The miller, Tam, wants the track passable before the grain carts arrive and fears being blamed for a broken sluice. He rounds the corner with a lantern: "Step away from that wheel, unless you can get it fully open before the water takes the track." Then stop. A named want, an offer with pressure and a question waiting for the player is a complete place to end the rehearsal beat and review it.',
          },
        ],
      },
      {
        kind: "list",
        heading: "A 20-minute solo practice routine",
        intro:
          "Set a timer for each block and keep moving when it rings. You need dice, your rulebook or notes, a pencil, the test character above (or your starter adventure's first character) and three index cards. Write the three player cards before you start: one careful attempt at the obvious obstacle, one action you did not plan for, and one question for an NPC.",
        items: [
          {
            term: "Minutes 0 to 2: set up",
            text: "Write four short lines: the place, the obstacle, the NPC's want and boundary, and one thing that gets worse if nobody acts. For the sluice scene: millpond, chained wheel, Tam wants the track open but will not be blamed for a broken gate, and the water reaches the grain store in an hour.",
          },
          {
            term: "Minutes 2 to 6: frame the scene and rule on one check",
            text: 'Describe the situation aloud in three sentences and end with "What do you do?" Draw the first player card, decide aloud whether the action needs a roll, name the kind of roll and the target number, roll once, and narrate the consequence either way. If you reach for a rule, start a stopwatch; at 90 seconds, make a temporary ruling, note the question and keep going.',
          },
          {
            term: "Minutes 6 to 9: handle a surprise",
            text: 'Draw the second player card, for example: "I ignore the wheel, climb the mill wall and look through the loft window." Practise the three questions a DM asks before ruling: What are you trying to achieve? What could go wrong? Does the fiction allow it at all? Clarifying the goal often changes the roll: climbing the wet wall may need an Athletics check, while simply looking through the window once there may need no roll at all.',
          },
          {
            term: "Minutes 9 to 13: run one NPC conversation",
            text: 'Draw the third card as a question for the NPC, such as asking Tam who chained the wheel. Answer only from the want and boundary you wrote down, give one useful fact, and end by returning a decision to the player: an offer, a refusal with a price, or a warning with a deadline. If you stall, narrate in the third person ("Tam explains that...") and keep going.',
          },
          {
            term: "Minutes 13 to 17: run one combat round",
            text: "This drill uses 2014 D&D 5e rules: the [2014 goblin stat block](https://www.dndbeyond.com/monsters/16907-goblin) gives AC 15, 7 HP, Dexterity +2 and a scimitar at +4 to hit for 1d6 + 2 damage. Give Bryn an example initiative modifier of +2. Each rolls d20 plus initiative modifier; the higher total goes first. Take turns aloud in that order. If Bryn attacks, d20 + 5 hits AC 15 on a total of 15 or more; roll 1d8 + 3 damage and subtract it from the goblin's HP. For example, 12 + 5 = 17 hits, and 1 + 3 damage leaves the goblin with 3 HP. The goblin's scimitar hits Bryn's AC 16 on d20 + 4 = 16 or more; roll 1d6 + 2 damage and subtract it from her 12 HP. For example, 14 + 4 = 18 hits, and 4 + 2 damage leaves Bryn with 6 HP. See the [2014 combat rules](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/combat) for the procedure. If either combatant falls, stop; otherwise, finish one round and say what changed. With revised rules, use the character and monster references your table agreed on. This drills pacing and HP bookkeeping, not a whole fight.",
          },
          {
            term: "Minutes 17 to 20: review in three lines",
            text: "Write where you hesitated, whether you called for a roll that the fiction did not need, and whether you applied a fair consequence and returned a meaningful decision after a failed attempt, even if the objective stayed unmet. Add the one rule question you noted to a lookup list for after the session. Change one thing before the next run, such as a bookmark, a shorter opening description or a clearer NPC boundary, rather than rewriting the whole scene.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Ways to simulate a player",
        intro:
          "Each option supplies a different kind of resistance. Use more than one across a week of practice rather than looking for a single perfect substitute:",
        items: [
          {
            term: "Write the choices yourself",
            text: "Before describing a scene, write two or three plausible actions on cards, including one you would not choose as DM. Shuffle and draw. This is the most controllable option and the least surprising, because every option still came from your own expectations.",
          },
          {
            term: "Use a solo RPG oracle for unknown facts",
            text: "An oracle is a die roll or table that answers a yes-or-no question you have not decided, such as whether the miller heard the chain. It can supply facts and complications while you DM a test character through them. It does not supply a player's judgement, so keep using your written cards for the character's choices.",
          },
          {
            term: "Borrow a friend for ten minutes",
            text: "Give one person the test character, a one-sentence goal and permission to choose freely for a single scene. Tell them you are practising rulings, not performing. Ten minutes with a real person teaches more about unclear descriptions than an hour of cards, because their first question shows you what your framing missed.",
          },
          {
            term: "Ask an AI to roleplay one player",
            text: "Give it the character, the goal and a limit: choose one action at a time, ask about anything unclear and do not narrate results. This can produce choices outside your cards and is useful for extra repetitions. Say plainly what it cannot do: it will not reproduce a real group's social dynamics, divided attention, humour, negotiation between players or the unpredictability of people who know each other. Treat a good AI run as rehearsal, not evidence that a live table will go the same way.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "If rules and pacing are the worry",
        paragraphs: [
          "Confident storytellers often fear the opposite problem from the one they have: they can describe a scene all day and freeze when a modifier is needed. Separate the three d20 rolls in your notes. An ability check resolves something a character attempts, using a skill or ability modifier against a DC you set. An attack roll resolves an attempt to hit a creature, using the listed attack bonus against that creature's AC, with damage rolled only on a hit. A saving throw resolves a character resisting an effect, using the named saving throw modifier against a DC set by the effect. Many attempts need no roll at all: if nothing meaningful opposes the action or failure would change nothing, describe it happening and keep the scene moving.",
          "Practise lookup speed as its own drill. Pick five questions a first session is likely to raise, such as how grappling starts, what a specific condition stops a character doing, or how far a character can move and still attack. Find each answer with the book or index you will actually have at the table, note the page or heading on a small reference card, and stop. In play, the workable habit is a fair temporary ruling, a note of the exact question and a lookup afterwards, rather than a long pause while four people watch you read.",
        ],
      },
      {
        kind: "prose",
        heading: "Move from rehearsal to a tiny real session",
        paragraphs: [
          "After two or three solo runs where the loop feels steady, stop rehearsing and invite one or two people for 60 to 90 minutes. Run the first area of a starter adventure you have read, or the small scene you have been practising with a fresh obstacle. Tell the players you are new and practising; that framing is honest and lowers everyone's expectations to a fair level. Ask for two specific pieces of feedback afterwards: where they were unsure what their characters could do, and where the pace dragged. Those answers target clarity and flow, which are the skills solo practice was building.",
          "Separate the core from the optional. Clear situations, rulings you can explain, consequences that follow from the fiction, NPCs with a recognisable want and scenes that end with a decision are the core, and solo drills genuinely build them. Accents and character voices, instant recall of every rule, elaborate maps and props and a large prepared world are optional additions that experienced DMs layer on over time, if at all. A first session with plain narration and fair rulings is a complete session.",
        ],
      },
      {
        kind: "checklist",
        heading: "Your practice card for the next run",
        items: [
          "I have one place, one obstacle, one NPC want and boundary, and one consequence if nobody acts.",
          "I have written three player cards before describing the scene, including one action I did not plan for.",
          "I can say aloud, before rolling, whether an attempt needs an ability check, an attack roll, a saving throw or no roll.",
          "I have a 90-second rule for lookups: temporary ruling, note the question, look it up afterwards.",
          "I have practised a failed attempt with its objective unmet, then offered another approach or withdrawal.",
          "I have run one combat round aloud with initiative order and HP written down.",
          "I know who I will invite for a 60 to 90 minute first session once two or three solo runs feel steady.",
        ],
      },
    ],
    codexConnection: {
      heading: "See the loop from the player's chair",
      paragraphs: [
        "One optional way to study scene framing is to sit on the other side of it. Codex Cryptica's Solo Adventure Mode puts its Oracle in the GM role for a system-light adventure grounded in your vault, presenting situations and responding to your typed choices. Playing a few scenes that way shows you how a clear situation and a prompt to act feel as a player, and you can note the framings that made your next choice easy.",
        "It is not a DM training mode and it does not rehearse your rulings or bookkeeping. Use it, if at all, as one source of simulated play alongside the solo drills above, and keep the drills themselves on paper with your own rulebook.",
      ],
      linkText: "See Codex Cryptica for solo worldbuilding",
      href: "/for/solo-worldbuilding",
    },
    relatedTopics: [
      {
        title: "D&D for Beginners",
        href: "/topics/dnd-beginners",
        description:
          "The beginner learning path for new D&D players and the DMs preparing to run for them: the play loop, dice, character sheets and first combat turns.",
      },
    ],
    relatedAnswers: [
      "how-do-i-start-gming-for-the-first-time",
      "how-do-i-prepare-a-dnd-session",
      "how-do-i-roleplay-npcs-if-im-not-good-at-acting",
      "which-dice-do-i-roll-in-dnd-and-when",
      "how-do-i-track-monsters-initiative-and-hit-points-in-dnd-combat",
      "what-is-a-solo-rpg-oracle",
      "how-do-you-play-a-tabletop-rpg-by-yourself",
      "how-do-i-introduce-children-to-dnd-without-overwhelming-them",
    ],
    discovery: {
      id: "answer-practise-dm-without-a-group",
      parentCluster: "getting-started",
      clusters: ["first-time-gm"],
      primaryIntent:
        "how can i practise being a dungeon master without a group",
      intentAliases: [
        "how to practice being a dm without a group",
        "how to practise dming solo",
        "how can i practice dm skills without players",
        "solo dm practice routine",
        "how to rehearse running dnd alone",
        "how to build dm skills without a group",
      ],
      uniqueValue:
        "A solo rehearsal routine for an aspiring DM who has no group yet: the repeatable DM loop taught through a worked sluice-gate scene with a real check calculation, a timeboxed 20-minute practice routine, honest limits on simulated players including AI, and a bridge to a tiny first real session.",
      userJob: "adopt-workflow",
      relatedIntents: [
        "answer-first-time-gm-hub",
        "answer-prepare-dnd-session",
        "answer-roleplay-npcs-without-acting",
        "answer-which-dice-to-roll-in-dnd",
        "answer-what-is-a-solo-rpg-oracle",
        "topic-dnd-beginners",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-first-time-gm-hub",
          reason:
            "That answer is the broad beginner-GM path covering choosing material, Session 0 and preparing a first session for a group that exists; this answer is the narrower pre-group intent, rehearsing DM mechanics and session flow alone before any group is assembled, and it routes overlapping readers there.",
        },
        {
          with: "answer-what-is-a-solo-rpg-oracle",
          reason:
            "That answer defines the solo oracle and how to phrase questions for it; this answer uses an oracle as one optional simulated-player tool inside a DM rehearsal routine and teaches rulings, scene framing and combat bookkeeping.",
        },
        {
          with: "answer-how-do-you-play-a-tabletop-rpg-by-yourself",
          reason:
            "That answer teaches playing an RPG solo as the player for its own sake; this answer rehearses the DM role against simulated player choices so the reader can later run a game for other people.",
        },
      ],
    },
    seo: {
      title: "Practise being a Dungeon Master without a group | Codex Cryptica",
      description:
        "Practise DMing alone with a 20-minute solo routine: frame a scene, rule on one check, run an NPC and one combat round, then move to a tiny first session.",
      image:
        "https://assets.codexcryptica.com/og/how-can-i-practise-being-a-dungeon-master-without-a-group.jpg",
      imageAlt:
        "An aspiring Dungeon Master rehearsing aloud alone at a table with dice, a notebook, miniatures and a sketched dungeon map by firelight",
    },
  };

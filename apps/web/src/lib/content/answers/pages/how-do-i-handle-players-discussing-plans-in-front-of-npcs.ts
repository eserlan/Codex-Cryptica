import type { AnswerConfigInput } from "../schema";

export const howDoIHandlePlayersDiscussingPlansInFrontOfNpcs: AnswerConfigInput =
  {
    slug: "how-do-i-handle-players-discussing-plans-in-front-of-npcs",
    category: "running-the-game",
    publishedAt: "2026-11-13",
    question: "How do I handle players discussing plans in front of NPCs?",
    kind: "framework",
    shortAnswer:
      "Let players discuss options without assuming their characters speak aloud. Set clear boundaries for NPC awareness and reactions.",
    sections: [
      {
        kind: "prose",
        heading: "Separate player talk from character talk",
        paragraphs: [
          "Two kinds of talk happen in the same scene. Out-of-character (OOC) talk is the players thinking together: weighing options, remembering a name, or working out what to ask next. In-character (IC) speech is what a character actually says aloud in the fiction. The confusion starts when the second is assumed from the first.",
          'Use this default unless your table agrees otherwise: player discussion sits outside the fiction, or pauses fictional time, until a player declares that their character speaks. A player who says "Should we tell her about the cellar?" at the table has not yet had their character say it at the counter. That default protects new players in particular. Needing a minute to think is not careless roleplay, and it should not cost the party a negotiation before they have chosen their words.',
          "The reverse also holds. If the players decide that their characters step close and confer in the scene, that conference is part of the fiction and the NPC can respond to it as fiction. The distinction to keep is simple: players can talk freely; their characters cannot necessarily do so without being noticed.",
        ],
      },
      {
        kind: "list",
        heading: "Establish what the NPC can actually perceive",
        intro:
          "Once the characters do act in the fiction, judge the NPC's response by what is observable from where that NPC stands. An NPC knows only what they could reasonably see, hear, or infer from behaviour in the room:",
        items: [
          {
            term: "Spoken aloud at normal volume",
            text: "The NPC hears the words, or at least the clear sense of them, if they are close enough and the room is not drowning them out. They can answer, object, or act on what was said.",
          },
          {
            term: "Whispering and huddling",
            text: "The NPC can see that a private word is being had, and may catch tone, urgency, or the odd word if the party is careless, but they do not learn the content of a whisper they could not hear. A shopkeeper who notices a huddle learns that the party is conferring, not what the party decided.",
          },
          {
            term: "Glances, gestures, and expressions",
            text: "A look toward the door, a hand on a coin pouch, or sudden silence when the NPC turns round is visible and fair to react to. Reading a glance as proof of a specific plan is not. Keep the reaction to the cue itself: curiosity, caution, or offence at being talked around.",
          },
          {
            term: "Stepping away",
            text: "Characters who ask for a moment, move to a corner, or step outside gain real privacy, limited by the space. A quiet corner in a busy inn hides content well; a corner of a silent shop with the keeper watching does not hide that a conference is happening, only what was said in it.",
          },
          {
            term: "Magical or unusual communication",
            text: "Follow the method's own limits. A silent magical link, a familiar's report, or a note passed under the counter each has its own range, duration, and chance of being noticed. Describe what an observer could notice about the method itself, such as concentration or a passed note, rather than granting the NPC knowledge of the message.",
          },
        ],
        outro:
          "State the observable position plainly when it matters: who is close enough to hear, who can see the party, and what the room sounds like. Most disputes vanish once the table shares the same picture of distance and noise.",
      },
      {
        kind: "prose",
        heading: "Ask before you make an assumption",
        paragraphs: [
          'When the mode is unclear, clarify before you impose a consequence. One short question settles it without breaking the scene: "Are you discussing this as players, or are your characters saying it aloud?" Variants that work just as well are "Is that at the table or at the counter?" and "Do your characters say that where she can hear it?"',
          "Ask first, then apply the answer consistently from the last line spoken in character. If the players say their characters said it aloud, let the NPC respond to what was actually said. What erodes trust is the retrospective ruling: letting a long table discussion run, then announcing that the innkeeper heard the whole plan and has already acted on it. The party had no chance to choose discretion because nobody established that discretion was needed.",
          "You do not need to ask every time. Once a table has a settled convention, a brief check is enough for the ambiguous moments: a sudden strategy huddle in a tense audience, or a joke at the table that lands like an insult in the fiction. Ask, note the answer, and play on.",
        ],
      },
      {
        kind: "list",
        heading: "Use NPC reactions, not punishments",
        intro:
          "An NPC who notices a sidebar should behave like a person in that room, with a want and a degree of patience, not like a penalty for table talk. Pitch the reaction to what was observable and to who this NPC is:",
        items: [
          {
            term: "The patient keeper",
            text: "She carries on polishing a glass, gives the party a polite nod, and waits. A busy innkeeper has seen travellers confer before and has work to do meanwhile. Waiting is a complete and fair response when nothing alarming was visible.",
          },
          {
            term: "The helpful offer of privacy",
            text: '"Take your time. I will be by the till when you are ready." Offering space suits merchants and officials who want the party\'s custom or cooperation and have no reason to fear a private word.',
          },
          {
            term: "Growing impatience",
            text: "A clerk with a queue behind the party, or a guide losing daylight, can show the cost of delay in the fiction: tapping the ledger, glancing at the door, or naming the pressure openly. The consequence is time and goodwill, not a sudden change of terms invented to hurry the players.",
          },
          {
            term: "Reasonable wariness",
            text: "Whispering in front of a guard, a suspicious merchant, or a rival envoy can shift how that NPC deals with the party: shorter answers, a hand resting nearer a bell, or a request to speak plainly. Wariness should track what was seen. A whispered conference justifies caution about being manoeuvred around; it does not tell the NPC the plan, and it does not turn a neutral keeper hostile on its own.",
          },
        ],
        outro:
          "Avoid the contrived response: the keeper who was friendly a moment ago abruptly doubles the price, calls the watch, or reveals they understood a language the party had no reason to expect, purely because the players talked too long. If an NPC has a reason to be alert, a hidden listener, or an unusual sense, establish that in the fiction before it decides a scene, so the party can make an informed choice about where to confer.",
      },
      {
        kind: "prose",
        heading: "Make room for tactical discussion",
        paragraphs: [
          "Players often need more thinking time than their characters would. A new player may need a minute to weigh two replies that a seasoned negotiator would choose between at once, and the whole party may need to recall what an NPC said three sessions ago before anyone can answer well. That gap is normal. Competent characters can be assumed to handle routine social signals, timing, and courtesies better than their players can improvise them, in the same way a character's swordplay is not limited by a player's reflexes.",
          "Keep tension without forcing real-time play by keeping two modes distinct. An agreed out-of-character pause is bounded thinking time for the players: fictional time stops for its duration, even in a tense scene, and the NPC waits at the last spoken line. An in-character conference is fictional time: characters whisper, step away, or wait, and the scene can move around them. The table switches modes explicitly. Anyone can call \"as players\" to enter a pause, and play leaves the pause when a player declares a character's next words or action, or when the party chooses an in-character conference instead. Where a scene carries genuine time pressure, such as a guard returning shortly or a ritual nearing completion, agree a brief thinking break in advance rather than shortening it after it starts. When that break ends, ask the players to declare their next action; if they need longer, invite them to switch to an in-character conference, where the pressure can advance. Summarise longer deliberations when play resumes so the scene restarts from a shared position: restate the NPC's last line, the offer on the table, and the question the party was deciding.",
          "If sidebars repeatedly stall play, treat that as pacing information rather than misconduct. Long conferences often mean the decision is unclear, the stakes have not been stated, or one player is dominating the planning. A gentle cue helps more than a ban: name the open question, check whether the table is ready to answer it, and offer the clarifying question from the section above. Save a direct conversation about table habits for between sessions, and keep it about pacing and enjoyment rather than blame.",
        ],
      },
      {
        kind: "example",
        heading: "Same counter, three different conferences",
        paragraphs: [
          "The party stands at the counter of a small inn, asking the keeper, Sella, about a room and whether a rider passed through last night. Midway through, the players want to confer about whether to mention the rider's name. How that conference works depends entirely on which mode the table is in:",
        ],
        items: [
          {
            term: "OOC pause",
            text: 'The players talk it through at the table: whether naming the rider helps or harms, and who should ask. Nobody has declared any of it in character, so fictional time waits. Sella has heard only the party\'s last spoken question. Play resumes with a player declaring the line: "My character asks whether a rider named Corvin came through last night."',
          },
          {
            term: "IC sidebar at the counter",
            text: 'The players decide their characters lean together at the counter, lower their voices, and exchange quick glances toward the door while Sella stands two paces away. Sella can see the huddle and its urgency, and might catch a name if a voice rises, but she does not hear the reasoning. A fair response follows the observable cues: she folds her arms, waits, and says, "If you need a moment, say so. If you are deciding whether to trust me, that I can help with." She has reacted to being conferred in front of, not to a plan she could not hear.',
          },
          {
            term: "Stepping away",
            text: "The party asks Sella for a moment, thanks her, and steps out onto the porch to talk. Outside, with the door shut and the common room noise behind them, their conversation is private in content. Sella knows only that they wanted a word alone and how long they took. If the yard is overlooked by a stable hand, that changes who might observe their return, but it does not retroactively put the stable hand inside a conversation held out of earshot. On returning, the party states its decision as fresh dialogue.",
          },
          {
            term: "Why it works",
            text: "The same player need, a minute to decide, produces three different fictional situations, and Sella's knowledge tracks each one exactly. The party can choose privacy by spending a small fictional action, and the GM never has to guess whether table talk counted as speech.",
          },
        ],
      },
      {
        kind: "list",
        heading: "What to say at the table",
        intro:
          "Short lines cover most of the friction. Use them verbatim or adapt the wording to your table:",
        items: [
          {
            term: "To clarify the mode",
            text: '"Are you discussing this as players, or are your characters saying it aloud?"',
          },
          {
            term: "To open a pause",
            text: '"Take a moment as players. In the fiction, Sella is still waiting for your answer to her last question. Tell me when your characters speak."',
          },
          {
            term: "To show an observable reaction only",
            text: '"She can see you conferring and that it looks urgent, but she cannot hear the content from there. She waits, a little warier than before."',
          },
          {
            term: "To resume cleanly",
            text: '"Back at the counter: Sella\'s last line was that the room is two silver and riders pay on arrival. What do your characters say?"',
          },
          {
            term: "To name time pressure fairly",
            text: '"The watch changes soon, so take your brief pause as players now. When it ends, declare your next move, or switch to a conference in character and we will let the watch change play out. Which suits you?"',
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Try this next session",
        intro:
          "Agree this convention before play, write it where everyone can see it, and review it after a session or two:",
        items: [
          "Agree the default: player discussion is out of character and fictional time pauses, with the NPC waiting at the last spoken line, unless a player declares that their character speaks.",
          'Pick a clear pause signal anyone can use, such as a raised hand, a marker placed on the table, or simply saying "as players" before thinking aloud.',
          "Agree how play resumes: the GM restates the NPC's last line and the open question, then a player declares the character's next words.",
          "Agree how the characters gain real privacy when they need it: asking for a moment, stepping aside, or using a communication method, with the NPC reacting only to what that action makes observable.",
          "For tense scenes, agree a brief thinking break in advance; when it ends, declare the next action or switch to an in-character conference that uses fictional time.",
          "If sidebars grow long or interrupt tense scenes, raise pacing gently at the table or between sessions and adjust the convention together instead of banning discussion.",
        ],
      },
    ],
    relatedAnswers: [
      "how-do-i-make-roleplay-more-engaging",
      "how-do-i-make-interviewing-npcs-interesting-in-an-investigation",
      "how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
      "how-do-i-roleplay-npcs-if-im-not-good-at-acting",
    ],
    discovery: {
      id: "answer-players-discussing-plans-front-npcs",
      parentCluster: "running-the-game",
      clusters: ["running-the-game"],
      primaryIntent:
        "how do i handle players discussing plans in front of npcs",
      intentAliases: [
        "dnd players talk in front of npc",
        "in character vs out of character table talk",
        "pc sidebars",
        "can npcs hear players planning",
        "players discuss plans in front of npc rpg",
        "table talk during npc conversation",
        "ooc discussion during roleplay scene",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A system-neutral convention that separates player talk from character speech by default, ties NPC awareness strictly to observable cues, and gives GMs a clarifying question, proportionate NPC reactions, and an agreed pause signal instead of punishments for table discussion.",
      relatedIntents: [
        "answer-make-roleplay-more-engaging",
        "answer-interviewing-npcs-investigation",
        "answer-npc-tell-us-everything",
        "answer-roleplay-npcs-without-acting",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-make-roleplay-more-engaging",
          reason:
            "That answer designs social scenes around meaningful choices, NPC wants, and boundaries; this answer governs the narrower table convention for whether player discussion counts as character speech and what an NPC may perceive during it.",
        },
        {
          with: "answer-interviewing-npcs-investigation",
          reason:
            "That answer structures what a witness knows and how targeted questions draw it out; this answer settles whether the party's own conferences are audible in the fiction before any questioning continues.",
        },
        {
          with: "answer-roleplay-npcs-without-acting",
          reason:
            "That answer covers how a GM portrays and switches between NPCs without acting technique; this answer covers how much of the players' table discussion an NPC in the scene may fairly react to.",
        },
      ],
    },
    seo: {
      title:
        "How do I handle players discussing plans in front of NPCs? | Codex Cryptica",
      description:
        "Separate player talk from character speech. Let NPCs react only to what they can see or hear, clarify before ruling, and agree a pause convention.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-handle-players-discussing-plans-in-front-of-npcs.jpg",
      imageAlt:
        "Travellers conferring quietly at an inn counter while the keeper waits nearby, warm firelight across the common room",
    },
  };

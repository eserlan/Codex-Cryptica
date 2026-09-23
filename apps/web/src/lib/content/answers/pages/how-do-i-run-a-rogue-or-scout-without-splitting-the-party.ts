import type { AnswerConfigInput } from "../schema";

export const howDoIRunARogueOrScoutWithoutSplittingTheParty: AnswerConfigInput =
  {
    slug: "how-do-i-run-a-rogue-or-scout-without-splitting-the-party",
    category: "session-prep",
    publishedAt: "2026-09-23",
    question: "How do I run a rogue or scout without splitting the party?",
    kind: "framework",
    shortAnswer:
      "Give the scout a clear question, resolve only the uncertain part of their reconnaissance, then bring the result back while the party can still choose what to do. Let the rogue gain useful information, position, or access, while companions watch exits, prepare a diversion, or change the conditions outside. A failed stealth or scouting roll can raise suspicion, cost time, or close a route without automatically leaving the scout alone in a fight.",
    sections: [
      {
        kind: "prose",
        heading: "Scouting should create a choice for the party",
        paragraphs: [
          "A rogue slipping ahead can make a tense scene. It becomes a table problem when each door, corridor, and guard triggers another private check while the rest of the players wait. It can also leave the scout in danger with no way for anyone else to affect what happens. The useful distinction is between characters being physically apart and players being shut out of the situation.",
          "Before the scout moves, agree what they want to learn: where the guards change watch, whether the side entrance is trapped, or what lies beyond the courtyard. Keep the objective small enough to resolve before the information goes stale. The scout's expertise should earn a real edge, such as a safer route or a detail others would miss; the discovery should still leave the group with something to decide.",
        ],
      },
      {
        kind: "list",
        heading: "Use a short scouting loop",
        intro:
          "Cut back when the situation changes, not after the rogue has finished every possible check:",
        ordered: true,
        items: [
          {
            term: "Set the question",
            text: "Ask what the scout needs to find out, how far ahead they will go, what signal means they need help, and where they will fall back to. A clear objective and return plan keep reconnaissance from turning into a private tour of the whole location.",
          },
          {
            term: "Show the approach and its risk",
            text: "Describe the route, patrol, obstacle, or deadline that could affect the scout's plan. Let the player choose where to move and what risk to take before asking for a roll.",
          },
          {
            term: "Resolve the uncertain part",
            text: "Use the game's stealth, perception, trap, or lock rules for the meaningful uncertainty. Routine movement through a place the party has already made safe can be summarised rather than rolled out step by step.",
          },
          {
            term: "Return useful information in time",
            text: "Tell the group what the scout learns while there is still room to act on it. A patrol changing direction matters more before the party chooses its route than after the guard has already raised an alarm.",
          },
          {
            term: "Let the party change the next beat",
            text: "The others can create a distraction, cover an exit, hold a door, identify a symbol, or choose a different route. Their decisions should affect what the scout can safely attempt next.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep traps and locks from becoming solo gates",
        paragraphs: [
          "A trap can be a discovery, a hazard, or a choice about risk. Let the scout's expertise reveal a useful fact, such as where the trigger sits or what it protects. The party can then decide whether to disarm it, find another route, trigger it from a distance, or use it against a pursuer. Failure might spring the trap, cost time, or make the scout's presence known; it need not erase every other option.",
          "Locks work the same way. If opening one is routine for the character and nothing can change as a result, resolve it quickly. If the lock matters, show what makes it difficult and what the group can do while the rogue works: keep watch, search for another entrance, hold off a patrol, or decide whether there is time to force it. Do not make every obstacle a skill gate that only the rogue can touch, but do not take away the rogue's earned competence to manufacture teamwork either.",
          "Some players enjoy private scouting scenes and some prefer everyone to hear the same information. Check what this table likes. When a detail must remain secret from the characters, keep the private exchange short and bring play back to a shared pressure or decision.",
        ],
      },
      {
        kind: "list",
        heading: "Let a bad result change the situation",
        intro:
          "A failed roll should make the next choice different, not remove the scout from the adventure:",
        items: [
          {
            term: "Suspicion rises",
            text: "A guard hears movement and changes patrol, or a servant notices a door left ajar. The scout can hide, withdraw, bluff, or signal the party before the location is fully alerted.",
          },
          {
            term: "The trap springs",
            text: "The scout triggers a bell wire or pressure plate. It costs time or a useful tool and gives their position away, but also reveals what the hazard protects. The party can decide whether to draw the guards off, help the scout retreat, or switch routes.",
          },
          {
            term: "Danger reaches the scout",
            text: "A guard spots the rogue or a trap wakes something nearby. Do not run rounds of the scout alone against the garrison while everyone else waits. Give the scout a chance to break contact or fall back to the agreed point, and bring the alarm or pursuit to the group so the players can choose whether to hold a doorway, set an ambush, or abandon the route.",
          },
          {
            term: "The route closes",
            text: "A gate is barred or a stair is watched. The scout reports another way in, but it costs a favour, exposes the group, or leaves less time for the next step.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: the ruined keep",
        paragraphs: [
          "The party needs to enter a ruined keep and recover a banner before the local reeve's men arrive. The rogue scouts towards a side entrance while the others wait among the pines.",
        ],
        items: [
          {
            term: "The isolated version",
            text: "The GM and rogue play through each corridor with separate stealth, perception, and trap checks. The scout spots two guards and a wire across the side entrance, but returns after the reeve's men have arrived. The other players had no chance to decide whether to wait, make a diversion, or take another route.",
          },
          {
            term: "The shared scouting scene",
            text: "The rogue sees the two guards trade posts and finds a wire connected to a bell inside the entrance. One guard will soon check the courtyard, giving the scout a brief chance to approach or withdraw. The rogue uses the agreed lantern signal from the broken wall, then reports the patrol and trap at the pines. The party can distract the guards, follow the rogue through the entrance, wait for the next change, or try the broken wall instead. If the scout's approach goes wrong, a guard hears a stone shift and heads towards the side entrance. The rogue falls back to the pines, where the party can choose to draw the guard away, prepare an ambush, or abandon that route. Any fight now begins with the group able to act, and the players may still avoid it.",
          },
          {
            term: "Why it works",
            text: "The scout finds something their expertise makes possible, and the information reaches the others before the opportunity passes. A poor result raises the danger but leaves the scout choices and gives the rest of the party a way to respond.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before the scout moves ahead",
        intro: "Keep the objective narrow and the group involved:",
        items: [
          "What specific question is the scout trying to answer?",
          "What signal and fallback point has the party agreed before the scout leaves?",
          "What useful edge does the rogue's skill or equipment provide?",
          "What pressure could change while the scout acts, and how will the player notice it?",
          "When will the information return to the group, before it stops being useful?",
          "What can the other characters do that changes the scout's access, cover, or escape?",
          "If a roll goes badly, what changes besides simply starting a fight?",
          "Can routine movement or a familiar obstacle be resolved without another roll?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep places, routes, and consequences connected",
      paragraphs: [
        "A campaign knowledge graph can connect a keep's entrances and hazards to its occupants, nearby allies, and the consequences of an alarm. Recording those links helps you bring a scouting discovery back into later play without deciding the party's response in advance.",
      ],
      linkText: "Explore the RPG knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "RPG knowledge graph",
        description:
          "Connect locations, hazards, guards, and routes to the characters and factions involved.",
        href: "/solutions/rpg-knowledge-graph",
      },
    ],
    relatedAnswers: [
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-i-run-spies-and-infiltrators-in-an-rpg",
      "how-do-i-run-an-investigator-without-sidelining-the-party",
      "how-do-i-get-my-rpg-party-to-work-together",
      "how-do-you-run-a-heist-in-a-tabletop-rpg",
      "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
    ],
    discovery: {
      id: "answer-run-rogue-scout-without-splitting-party",
      parentCluster: "specialist-roles",
      clusters: ["specialist-roles", "adventure-mapping"],
      primaryIntent:
        "how to run a rogue or scout without splitting the party in a tabletop rpg",
      intentAliases: [
        "how to run a scout character without leaving the party waiting",
        "how to keep rogue scouting scenes focused in an rpg",
        "how to involve the party when one character scouts ahead",
        "how to run stealth reconnaissance without splitting the party",
        "should the rogue scout ahead alone",
        "how to handle a rogue sneaking ahead in dnd",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "Gives GMs a repeatable procedure for short reconnaissance scenes that lets rogues and scouts use their expertise while the rest of the party can still affect the situation. It focuses on timely information, group choices, and setbacks such as rising suspicion or a lost route, distinct from the specialist spotlight framework and the broader spy-operation procedures.",
      relatedIntents: [
        "answer-specialist-character-spotlight",
        "answer-run-spies-infiltrators-rpg",
        "answer-run-investigator-without-sidelining-party",
        "answer-party-cohesion",
        "answer-run-heist-in-tabletop-rpg",
        "answer-run-hackers-netrunners",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The specialist spotlight answer provides general scene structures for any expert; this page applies them specifically to scouting, stealth, traps, and locks while keeping the party involved.",
        },
        {
          with: "answer-run-spies-infiltrators-rpg",
          reason:
            "The spy answer handles sustained covert operations and the roles of an outside team; this page focuses on brief reconnaissance by a rogue or scout and the immediate choices their discoveries create.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "Both preserve a specialist's competence while returning useful information to the group; this page concerns physical scouting, stealth, and hazards, while the investigator page focuses on clues and interpretation.",
        },
        {
          with: "answer-party-cohesion",
          reason:
            "The party-cohesion answer builds shared stakes and cooperation generally; this page addresses a specific scene-design problem when one character scouts ahead.",
        },
        {
          with: "answer-run-heist-in-tabletop-rpg",
          reason:
            "The heist answer structures a full score and its planning; this page covers the narrower moment of scouting a location and involving the party in what the scout discovers.",
        },
        {
          with: "answer-run-hackers-netrunners",
          reason:
            "The hacker answer connects a digital intrusion to the crew's physical action; this page covers physical reconnaissance, stealth, traps, and hazards when a scout moves ahead of the group.",
        },
      ],
    },
    seo: {
      title:
        "How to Run a Rogue or Scout Without Splitting the Party | Codex Cryptica",
      description:
        "Keep rogue and scout reconnaissance focused, share useful information in time, and let the party shape what happens next without removing the scout's edge.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-a-rogue-or-scout-without-splitting-the-party.jpg",
      imageAlt:
        "A rogue signals to companions planning their route past guards at a trapped entrance to a ruined keep",
    },
  };

import type { AnswerConfigInput } from "../schema";

export const howMuchCampaignLoreShouldPlayersBeExpectedToRemember: AnswerConfigInput =
  {
    slug: "how-much-campaign-lore-should-players-be-expected-to-remember",
    category: "campaign-notes",
    publishedAt: "2026-09-12",
    question: "How much campaign lore should players be expected to remember?",
    kind: "framework",
    shortAnswer:
      "Players should reliably remember their current goal and whichever two or three NPCs and factions are active right now, but not a campaign encyclopedia of every name, title, or detail mentioned once. Separate player memory from character memory: if the character would obviously know something, restate it rather than testing whether the player recalls it. Reinforce important information through play — repetition, consistent hooks, recurring symbols — rather than hiding it behind a memory check, and lower your expectations further after a long gap between sessions. Most forgetting is normal and fixable with a quick reminder, not a sign players aren't paying attention.",
    sections: [
      {
        kind: "prose",
        heading: "Two different memories, one campaign",
        paragraphs: [
          "A lot of table friction over \"forgotten\" lore actually comes from conflating two separate things: what the player remembers, and what their character would know. A player who forgets a merchant's name after three sessions is completely normal — but that merchant's character has known the party for months, and would greet them by name without hesitation. When the GM treats the player's memory as the limit of what the character knows, ordinary forgetting turns into an awkward stall at the table.",
          "The practical fix is simple: if the character would obviously know it, just tell the player. \"The dockworker who owes you a favour\" is a character reminding the party who they're talking to, not a hint the player failed to earn. Reserve actual memory tests — rolls, deliberate withheld information — for moments where forgetting is the point, not as the default response to a name slipping a player's mind.",
        ],
      },
      {
        kind: "list",
        heading: "What's reasonable to expect, and what isn't",
        intro:
          "A rough calibration for a table meeting weekly. Long gaps between sessions lower all of this further.",
        items: [
          {
            term: "Reasonable: the current goal",
            text: "What the party is actively working toward right now. If nobody at the table can state this in a sentence, that's a session-start problem to fix, not a player-memory problem.",
          },
          {
            term: "Reasonable: whoever is active this arc",
            text: "The two or three NPCs and factions actually driving the current situation. Players will hold this if it's reinforced session to session.",
          },
          {
            term: "Reasonable: roughly what happened last time",
            text: "The broad shape of the last session, especially with a short recap. Exact dialogue and minor details are not reasonable to expect back.",
          },
          {
            term: "Unreasonable: names mentioned once, sessions ago",
            text: "A minor NPC or location named a single time ten sessions back and never reinforced since. If it matters again, reintroduce it — don't expect it recalled cold.",
          },
          {
            term: "Unreasonable: chronological order of unrelated events",
            text: "Players track cause and effect for things that mattered to them, not a timeline of everything that happened. Don't test the order of events that weren't consequential at the time.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Normal forgetting, overload, or disengagement",
        intro:
          "Not every forgotten detail means the same thing. Telling these apart changes what's actually worth fixing.",
        items: [
          {
            term: "Normal forgetting",
            text: "An isolated detail slips, a quick reminder fixes it, and the table moves on. This is the default and doesn't need a system-level response — it needs a one-sentence restatement.",
          },
          {
            term: "Information overload",
            text: "Forgetting happens immediately after the information was given, and it's widespread across the table. This usually means too much was introduced at once without a hook to attach it to — the fix is trimming what you introduce per scene, not testing recall harder.",
          },
          {
            term: "Genuine disengagement",
            text: "Forgetting is one symptom of a broader pattern: missed basic developments, no questions asked, no visible investment in the current goal. This is worth an honest table conversation, not a better recap framework — a memory system can't fix disengagement.",
          },
        ],
      },
      {
        kind: "example",
        heading: "The same missed detail, two ways to handle it",
        paragraphs: [
          "A player doesn't recognise the name of an NPC who gave the party a favour two sessions ago.",
        ],
        items: [
          {
            term: "The memory-test framing",
            text: '"Are you sure? You definitely met her." The table stalls while the player tries to reconstruct a memory under pressure, and the moment reads as a quiz they\'re failing.',
          },
          {
            term: "The restatement framing",
            text: "\"That's Kessa, the smuggler who owes you for staying quiet about the manifest.\" One sentence, delivered as the character's own recollection, and play continues without anyone feeling tested.",
          },
          {
            term: "Why it works",
            text: "The information reaches the table either way. The difference is whether getting there cost a stall and a moment of player embarrassment, or nothing at all.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Calibrating expectations to your table",
        items: [
          "You can name the two or three NPCs/factions actually active in the current arc, and so can most of the table.",
          "When a character would obviously know something, you restate it instead of waiting to see if the player remembers.",
          "Forgotten details get a quick, in-character reminder rather than being treated as a quiz.",
          "You've lowered expectations appropriately after any long gap since the last session.",
          "When forgetting is widespread right after you introduce something, you're trimming what's introduced, not repeating it louder.",
          "You can tell the difference between an isolated forgotten name and a wider pattern worth an honest conversation.",
        ],
      },
    ],
    codexConnection: {
      heading: "A reference reduces how much players need to hold in memory",
      paragraphs: [
        "A lightweight campaign reference — NPCs, factions, and locations connected to each other and searchable by name — means the GM (and players, if you let them look) can check a detail in seconds instead of relying purely on recall. That lowers the cost of forgetting something, which is usually a better lever than expecting players to remember more.",
        "It doesn't decide what's reasonable to expect at your specific table, or replace an honest conversation if disengagement is the real issue — those judgement calls stay with the people at the table.",
      ],
      linkText: "See the campaign manager",
      href: "/solutions/campaign-manager",
    },
    relatedTools: [
      {
        title: "RPG knowledge graph",
        description:
          "NPCs, factions, and locations as connected, searchable entities, so a forgotten detail is a lookup instead of a memory test.",
        href: "/solutions/rpg-knowledge-graph",
      },
    ],
    relatedAnswers: [
      "how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign",
      "how-do-you-recap-a-ttrpg-session",
      "how-do-you-keep-track-of-npcs-in-a-long-campaign",
      "how-do-you-organise-rpg-campaign-notes",
      "how-do-you-make-npcs-memorable-without-lots-of-prep",
      "how-do-you-run-a-campaign-when-you-only-play-once-a-month",
    ],
    discovery: {
      id: "answer-lore-memory-expectations",
      parentCluster: "campaign-notes",
      clusters: ["campaign-memory"],
      primaryIntent:
        "how much campaign lore should players be expected to remember",
      intentAliases: [
        "should players remember campaign lore",
        "players forget dnd lore",
        "how much should rpg players remember",
        "should gm remind players of npcs",
        "player memory vs character memory rpg",
      ],
      uniqueValue:
        "A player-memory-vs-character-memory framework with concrete calibration (what's reasonable to expect vs not), a three-way distinction between normal forgetting, information overload, and genuine disengagement, and a worked memory-test-vs-restatement comparison — a non-adversarial answer to a question that often gets framed as blaming players.",
      relatedIntents: [
        "answer-campaign-memory-hub",
        "answer-session-recap",
        "answer-track-npcs-long-campaign",
        "answer-campaign-notes",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-campaign-memory-hub",
          reason:
            "The hub page covers the GM-facing techniques for aiding memory; this answer covers the separate question of what's a fair expectation of players in the first place, and how to tell normal forgetting from a deeper problem.",
        },
      ],
    },
    seo: {
      title: "How much campaign lore should players remember? | Codex Cryptica",
      description:
        "Player memory vs character memory, what's reasonable to expect, and how to tell normal forgetting from overload or disengagement — without blaming players.",
      image:
        "https://assets.codexcryptica.com/og/how-much-campaign-lore-should-players-be-expected-to-remember.jpg",
      imageAlt:
        "Two players at a table, one leaning in as the GM quietly reminds them who an NPC is instead of quizzing them",
    },
  };

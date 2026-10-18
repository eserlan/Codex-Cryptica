import type { AnswerConfigInput } from "../schema";

export const howDoIOrganiseATalesOfTheValiantCampaign: AnswerConfigInput = {
  slug: "how-do-i-organise-a-tales-of-the-valiant-campaign",
  category: "campaign-notes",
  publishedAt: "2026-10-16",
  question: "How do I organise a Tales of the Valiant campaign?",
  kind: "framework",
  shortAnswer:
    "Build a campaign hub that links characters, locations, factions and quests; keep events in a session journal, then prepare a one-screen run sheet for the next game. Track ToV rules state alongside that structure: record each character's current Luck, and note whether you use the optional BFRD Doom rule or a house rule. Store conversion choices with the encounters where they apply.",
  sections: [
    {
      kind: "prose",
      heading: "Start with the campaign, not the session log",
      paragraphs: [
        "After a few sessions, NPCs, faction goals and unfinished quests are hard to find in chronological notes. Make a campaign hub with links to the people, places, factions and quests that matter. Keep the journal as a record of what happened, and keep unused preparation out of established campaign history. If useful, start with this guide to [organising a D&D campaign](/answers/how-do-i-organise-a-dnd-campaign); the same linked-note structure works for ToV.",
        "Tales of the Valiant also has rules worth tracking between sessions, particularly character Luck and the optional encounter-level Doom resource. Keep those records alongside the relevant character or encounter notes, rather than burying them in session summaries.",
      ],
    },
    {
      kind: "table",
      heading: "What to keep in each campaign layer",
      headers: ["Campaign layer", "What to record"],
      rows: [
        [
          "Campaign hub",
          "Current situation, important links, and a short list of open questions. Use it to find the right page, not to repeat every detail.",
        ],
        [
          "Characters, places, factions and quests",
          "Facts that remain true between sessions, plus relationships and consequences. Link an NPC to the faction they serve and the people or places affected by their choices.",
        ],
        [
          "Session journal",
          "What happened, what the players decided, and changes to promote to campaign pages. The journal is the archive; it is not the run sheet.",
        ],
        [
          "Next-session run sheet",
          "The party's current position, likely scenes, relevant NPCs, active threads, rulings and encounter references. Keep it to one screen or page.",
        ],
      ],
    },
    {
      kind: "list",
      heading: "Keep the rules notes that affect your next session",
      intro:
        "Record only state or rulings you will need again. Link details to their source instead of copying whole character sheets into GM notes.",
      items: [
        {
          term: "Luck",
          text: "The BFRD says a PC starts with 0 Luck and can have up to 5. Once per turn, a failed attack roll or failed save grants 1 Luck; the GM can also award Luck for play or story goals. If a PC with 5 Luck would gain more, they immediately roll a d4 and reset their total to that result. Luck can add 1 point per point spent to a check, or 3 Luck can reroll a d20 immediately after a check. Do not use Luck earned from a failed roll on that same triggering roll. Record current totals at the end of a session and update them as they change. The [BFRD Luck rules](https://bfrd.net/rules/playing-the-game) do not prescribe a Long Rest reset.",
        },
        {
          term: "Doom",
          text: "If you use the BFRD's optional Doom rule, the GM gains a Doom resource at the start of an encounter, based on encounter CR. The GM can spend it to give a creature advantage on an attack roll, give a PC disadvantage on a save, or, once per encounter, refresh, recharge or gain one more use of a limited-use feature, including Legendary Resistance. Doom can affect creatures in that encounter, so record the encounter's CR-based starting Doom and any spends on that encounter's run sheet, and allocate or mark the pool as needed to track which creature benefits. See the [BFRD Doom rule](https://blackflagsrd.opengamingnetwork.com/playing-the-game/monsters/). Codex Cryptica currently exposes a counter on a ToV monster stat sheet and its selected token controls; that per-creature UI is an implementation choice and does not change the encounter-level rule. A different pool, trigger or spend is a house rule, so write it down as one.",
        },
        {
          term: "Conversion decisions",
          text: "When adapting another game's material, document the choices you make for a particular creature or scene: the stat block used, any changed save or DC, and how you handled spells or limited-use abilities. BFRD does not require a universal conversion algorithm. Keep these notes with the encounter so you can apply the same decision if it returns.",
        },
        {
          term: "Downtime and contacts",
          text: "Track projects, promises and obligations as open threads linked to the people and places involved. A contact becomes useful when their position and the consequences of calling on them are clear.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Let character details create campaign links",
      paragraphs: [
        "For example, take a human with Cosmopolitan Heritage, a Soldier Background and a motivation to find the squadmate who vanished after their unit abandoned a river-port post. These are character details, not a prescribed ToV plot. Link the character to the missing squadmate, the unit's faction page and the port location. Add the smuggler who saw the squadmate, the guild that controls the docks and the open quest to find them. Each page now gives you a playable lead: the smuggler wants safe passage, the guild can grant it at a price, and the unit will learn who is asking questions. The character's Lineage, Heritage, Background and Adventuring Motivation give you four prompts for relationships and unfinished business, rather than four isolated labels.",
      ],
    },
    {
      kind: "prose",
      heading: "Keep tonight's run sheet narrow",
      paragraphs: [
        "The archive can hold every town, faction, ruling and old journal entry. Tonight's sheet needs only where the party is, the few scenes and contacts likely to matter, active threads, relevant stat blocks and current rules state. If the party bypasses a prepared ambush in the Sunken Watchtower, leave it as unused prep or adapt it later. It does not become established history until it happens in play.",
      ],
    },
    {
      kind: "example",
      heading: "Example: a river-port necromancer",
      paragraphs: [
        "Four level 5 ToV characters are midway through a published 5e dungeon adapted by their GM. The last session ended outside a necromancer's sanctum. Their journal says the party found a bone key and that the fighter has 2 Luck; the necromancer has not yet appeared in play.",
      ],
      items: [
        {
          term: "Before the session",
          text: "The GM's run sheet links the sanctum to the necromancer's stat block, notes the party's current Luck, and lists the decisions made when adapting this encounter. For illustration, the GM chooses to use the optional BFRD Doom rule for the encounter. If its CR puts the encounter in the 5-8 tier, the GM starts with 2 Doom. The Doom is an encounter resource that can help any creature in the encounter; Codex Cryptica's creature counter can be used to mark an allocation, while the run sheet records the encounter total. The necromancer's bone-splinter teleport and reaction hex are invented homebrew abilities, not published BFRD Doom spends. The GM records their triggers and costs as house rules, or removes them.",
        },
        {
          term: "At the table",
          text: "The fighter begins with 2 Luck. On their turn, they miss an attack and gain 1 Luck, bringing the total to 3; that new point cannot affect the missed attack. On a later check, immediately after making that check and before the GM declares whether it succeeds or fails, they may spend 3 Luck to reroll its d20, but the reroll can still fail. They cannot wait until later to revisit the roll, and they cannot spend the point just gained from the missed attack on that triggering miss. If the GM keeps the invented hex, its save and any Doom cost are written as house rules. The journal captures what actually happened, including whether the necromancer escaped.",
        },
        {
          term: "After the session",
          text: "If the party finds the necromancer's ledger, promote the names in it to linked river-port contacts. One merchant supplies grave goods and hides when the party returns; another gives the guild a reason to close the quay. The encounter note now points to consequences the players can follow, while unused rooms remain preparation rather than history.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Weekly campaign maintenance",
      intro: "After each session, take a few minutes to:",
      items: [
        "Write the session journal, then promote lasting changes to linked character, location, faction or quest pages.",
        "Record current Luck totals. Apply the BFRD's gaining and spending rules during play; do not invent a Long Rest reset unless your group adopts a labelled house rule.",
        "For an encounter using optional Doom, note its CR-based starting pool and how you will track allocations. Label altered triggers or spends as house rules.",
        "Write any conversion decisions beside the relevant encounter, including changes to stats, saves, DCs or abilities.",
        "Update open projects and NPC contacts with what changed and what consequence follows.",
        "Make a one-screen run sheet from the likely scenes, linked pages and rules state for next time.",
      ],
    },
  ],
  codexConnection: {
    heading: "Running a Tales of the Valiant campaign in Codex Cryptica",
    paragraphs: [
      "Codex Cryptica provides linked campaign pages, a relationship Graph, ToV character, Quick NPC and monster stat sheet templates, and Luck and Doom counters on supported sheets and selected tokens. The Doom counter belongs to the creature sheet in the current UI; you can also record the optional BFRD encounter pool in your run sheet. The Encounter Generator offers qualitative challenge guidance. Choose Tales of the Valiant in a generator's Game System option when available; vault-wide profile selection is not currently available.",
      "Campaign pages, journals and saved stat sheets use private, local OPFS storage and are available offline. ToV-specific generator mechanics require the AI Lore Co-Author; offline or with AI generation disabled, generators produce system-neutral lore and notes. Open game content is based on the [BFRD](https://bfrd.net/), published by Kobold Press under CC BY 4.0.",
    ],
    linkText: "Explore Codex Cryptica for Tales of the Valiant",
    href: "/for/tales-of-the-valiant",
  },
  relatedTools: [
    {
      title: "Tales of the Valiant campaign guide",
      description:
        "Connect campaign pages and prepare session notes alongside ToV character sheets and rules counters.",
      href: "/for/tales-of-the-valiant",
    },
    {
      title: "Encounter generator",
      description:
        "Draft encounters with qualitative challenge guidance for your party.",
      href: "/generators/encounter",
    },
    {
      title: "Session Prep Builder",
      description:
        "Turn tonight's situation into a run sheet with the NPCs, locations, threads and encounters you need.",
      href: "/tools/session-prep-builder",
    },
  ],
  relatedAnswers: [
    "how-do-i-organise-a-dnd-campaign",
    "how-do-you-organise-rpg-campaign-notes",
    "how-do-you-keep-track-of-npcs-in-a-long-campaign",
    "how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
  ],
  discovery: {
    id: "answer-organise-tales-of-the-valiant-campaign",
    parentCluster: "campaign-notes",
    clusters: ["campaign-notes", "system-guides"],
    primaryIntent: "how to organise a tales of the valiant campaign",
    intentAliases: [
      "how do i organise a tales of the valiant campaign",
      "organising a tov campaign",
      "running tales of the valiant tips",
      "tales of the valiant campaign prep",
      "black flag roleplaying campaign notes",
    ],
    uniqueValue:
      "A practical ToV campaign structure that connects character details and open threads with session journals, run sheets and accurately labelled rules tracking.",
    relatedIntents: [
      "for-tales-of-the-valiant",
      "answer-dnd-campaign-organisation",
    ],
  },
  seo: {
    title: "How to organise a Tales of the Valiant campaign | Codex Cryptica",
    description:
      "Organise a Tales of the Valiant campaign with linked character, location, faction and quest notes, a session journal, a focused run sheet and accurate Luck and Doom tracking.",
    image:
      "https://assets.codexcryptica.com/og/how-do-i-organise-a-tales-of-the-valiant-campaign.jpg",
    imageAlt:
      "A game master organising Tales of the Valiant campaign notes around linked characters, locations and quests",
  },
};

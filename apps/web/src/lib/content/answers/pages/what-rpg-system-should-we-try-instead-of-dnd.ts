import type { AnswerConfigInput } from "../schema";

export const whatRpgSystemShouldWeTryInsteadOfDnd: AnswerConfigInput = {
  slug: "what-rpg-system-should-we-try-instead-of-dnd",
  question: "What RPG system should we try instead of D&D?",
  kind: "framework",
  shortAnswer:
    "There's no single best alternative — the right system depends on the kind of play your group actually wants, not on which game is most popular. Start from genre and play style (how tactical, how rules-heavy, how much character-build optimisation, what kind of story structure) rather than a ranked list, and you'll land on something that fits rather than something that's merely well-known. Systems named on this page belong to their respective publishers; mentioning one here isn't an endorsement of Codex Cryptica by that publisher, or the reverse.",
  sections: [
    {
      kind: "list",
      heading: "A decision framework before any recommendation",
      intro:
        "Work through these with your group before picking a name off a list — they matter more than popularity.",
      items: [
        {
          term: "What genre do you actually want?",
          text: "Fantasy, horror, sci-fi, contemporary, something else entirely — this narrows the field before anything else does.",
        },
        {
          term: "How tactical or crunchy should combat be?",
          text: "Grid-and-ability tactical combat and a single quick roll to resolve a fight are both valid answers, and they point at very different systems.",
        },
        {
          term: "How much rules weight does the group actually enjoy?",
          text: "Some tables love a thick rulebook; others want the rules to disappear so the fiction can lead. Neither is the correct default.",
        },
        {
          term: "Character-build optimisation, or fast archetypes?",
          text: "A system built around build depth and a system built around picking a playbook and starting immediately serve different appetites.",
        },
        {
          term: "What structure does the group want to play in?",
          text: "GM-led adventure, player-driven narrative, investigation, survival, open sandbox — this shapes which system's default assumptions will feel natural rather than fought against.",
        },
        {
          term: "How much published support or VTT support matters?",
          text: "If your group leans on published adventures or a specific virtual tabletop, that's a real constraint worth weighing alongside genre and tone.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Representative systems, organised by what you're after",
      intro:
        "Not a ranking — a starting point for each job. Many good systems in each category aren't named here; these are simply well-known enough to be a useful reference point.",
      items: [
        {
          term: "Fantasy with deeper tactical combat",
          text: "Pathfinder 2e is built around tactical positioning and build depth for players who want combat to be a real puzzle, not a formality between roleplaying scenes.",
        },
        {
          term: "Lighter, faster fantasy",
          text: "Old-school-style fantasy systems strip the character sheet down and lean on GM judgement over rules lookups — good for groups who found D&D's rules overhead getting in the way of play.",
        },
        {
          term: "Horror and investigation",
          text: "Call of Cthulhu and Delta Green both centre investigation and sanity-eroding cosmic horror over combat as the default mode of play.",
        },
        {
          term: "Science fiction and space opera",
          text: "Traveller handles hard-edged, sandbox-driven science fiction — trade, exploration, and consequences that outlast any one mission.",
        },
        {
          term: "Cyberpunk",
          text: "Cyberpunk Red pairs a gritty near-future setting with character builds oriented around specialised roles rather than generalist adventurers.",
        },
        {
          term: "Narrative and fiction-first play",
          text: "Powered-by-the-Apocalypse games (a family of systems sharing a common structure) put the fiction first and resolve moments with a small set of broad moves rather than granular rules for every situation.",
        },
        {
          term: "Solo or co-op friendly",
          text: "Ironsworn was designed from the ground up for solo and co-op play, with oracle-style prompts standing in for a GM when there isn't one.",
        },
        {
          term: "Rules-light one-shots",
          text: "Ultra-light systems built around a single-page or single-mechanic ruleset get a group playing the same evening, with almost no prep required.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Working through the framework for one group",
      paragraphs: [
        "A group tired of D&D's combat length, walking through the questions above.",
      ],
      items: [
        {
          term: "Genre",
          text: "They want to stay in fantasy — the switch is about mechanics and pacing, not setting.",
        },
        {
          term: "Combat weight",
          text: "They want combat over in minutes, not an hour, and don't miss grid-based tactics.",
        },
        {
          term: "Rules weight",
          text: "They'd rather the GM make a fair call than look up a rule mid-scene.",
        },
        {
          term: "Build depth vs. archetypes",
          text: "Nobody at the table enjoys optimising a build; picking a character and playing appeals more.",
        },
        {
          term: "Structure",
          text: "They still want a GM running published or homebrew adventures, not a fully player-driven format.",
        },
        {
          term: "Result",
          text: "Those answers point toward a lighter, faster fantasy system over a tactical-combat one — not because it's more popular, but because it matches what this specific group already said they wanted.",
        },
      ],
    },
  ],
  codexConnection: {
    heading: "How Codex Cryptica fits, whichever system you land on",
    paragraphs: [
      "Codex Cryptica isn't a rules system and doesn't try to be one — it's campaign and worldbuilding infrastructure that stays useful regardless of which system a group picks, because entities, relationships and custom fields aren't tied to any single ruleset. If a group is currently running D&D and considering a switch, the same vault structure — NPCs, factions, locations, session history — carries over; only the character sheet and dice mechanics change underneath it.",
      "Where Codex has a dedicated guide for a system or genre already, that's a natural next stop once a group knows what they're after. It's also a reasonable fit for smaller or indie systems that don't ship their own campaign-management or VTT tooling, since the vault doesn't assume any particular rules engine to be useful.",
    ],
    linkText: "Browse Codex Cryptica system and genre guides",
    href: "/for",
  },
  relatedForPages: [
    {
      title: "Codex Cryptica for D&D",
      description:
        "Where a group already running D&D can see the same organisation applied to the system they know.",
      href: "/for/dungeons-and-dragons",
    },
    {
      title: "Codex Cryptica for Pathfinder 2e",
      description: "For groups leaning toward deeper tactical fantasy combat.",
      href: "/for/pathfinder-2e",
    },
    {
      title: "Codex Cryptica for Call of Cthulhu",
      description: "For groups leaning toward investigation and horror.",
      href: "/for/call-of-cthulhu",
    },
    {
      title: "Codex Cryptica for Cyberpunk Red",
      description: "For groups leaning toward near-future cyberpunk.",
      href: "/for/cyberpunk-red",
    },
  ],
  relatedAnswers: [
    "what-should-i-look-for-in-an-rpg-campaign-manager",
    "how-do-i-run-a-successful-session-0",
  ],
  seo: {
    title: "What RPG system should we try instead of D&D? | Codex Cryptica",
    description:
      "Choose by genre and play style, not popularity. A decision framework plus representative systems for tactical fantasy, horror, sci-fi, narrative play and more.",
  },
};

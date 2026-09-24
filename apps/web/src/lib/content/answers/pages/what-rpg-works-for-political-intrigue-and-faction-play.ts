import type { AnswerConfigInput } from "../schema";

export const whatRpgWorksForPoliticalIntrigueAndFactionPlay: AnswerConfigInput =
  {
    slug: "what-rpg-works-for-political-intrigue-and-faction-play",
    category: "getting-started",
    publishedAt: "2026-09-21",
    question: "What RPG works for political intrigue and faction play?",
    kind: "comparison",
    shortAnswer:
      "The right system for political intrigue depends on which politics your group wants. For criminal crews seizing turf, Blades in the Dark. For courtly alliances and social manoeuvring, Court of Blades. For character-belief-driven drama resolved through social conflict, Burning Wheel. For organisation-level strategy where players direct factions as well as characters, Reign. For supernatural social politics built on status and debt, Vampire: The Masquerade.",
    sections: [
      {
        kind: "prose",
        heading: "Political intrigue means several different games",
        paragraphs: [
          "Groups who ask for political intrigue are often describing different evenings. One table wants whispered conversations in a palace gallery, where a well-placed favour matters more than a sword. Another wants a map of gangs and guilds, where territory changes hands between sessions. A third wants characters whose convictions collide until someone pays a price. The rules decide which of those evenings the group actually gets.",
          "Three questions narrow the choice fast: does the campaign centre on a court, on competing organisations, or on the characters' own convictions? Do the players want to scheme as individuals or to command factions as well? And should a lost debate or a broken alliance leave a mark on the character sheet, or only in the GM's notes? The recommendations below use those differences.",
        ],
      },
      {
        kind: "list",
        heading: "If you want...",
        intro:
          "These games produce different kinds of political play. Find the description closest to your group's best scheming evenings.",
        items: [
          {
            term: "Criminal factions and territory → Blades in the Dark",
            text: "The crew sheet tracks turf, claims and standing with every faction in the haunted city of Doskvol, and faction clocks advance rival schemes between scores whether the crew interferes or not. Entanglements and wanted levels turn heat from the authorities into fresh trouble, while downtime activities let the crew recover, scheme and consolidate. Pick it when the politics are about crews, turf and debts rather than thrones.",
          },
          {
            term: "Court intrigue and patronage → Court of Blades",
            text: "A Forged in the Dark game from A Couple of Drakes set in a renaissance court where the characters serve great houses and scheme for influence, favour and reputation. Play moves between court scenes, missions for a house and downtime manoeuvres, so social positioning is the main arena rather than a pause between fights. Pick it when the group wants balls, duels of etiquette and shifting patronage.",
          },
          {
            term: "Politics driven by personal convictions → Burning Wheel",
            text: "Each character's Beliefs, Instincts and Traits are written on the sheet and rewarded with Artha when they drive play, so ideological conflict comes from the characters rather than the plot. The Duel of Wits gives social conflict its own structured resolution with stated stakes, while Circles, Resources, affiliations and reputations decide who a character can call on and what their word is worth. Pick it when the politics should hurt because the characters care, and expect a system that asks a lot of its players.",
          },
          {
            term: "Organisation-level strategy → Reign",
            text: "Greg Stolze's One Roll Engine game pairs ordinary character action with Company rules in which organisations have their own qualities and roll against rival groups, so a guild, temple or rebellion acts as a mechanical participant rather than set dressing. Players can direct a company's moves alongside their characters' scenes, which suits campaigns about wars, successions and trade leagues. The Company chapter was written to sit loosely on top of other systems too, so some groups borrow it alone. Pick it when the campaign is about what organisations do, not only what individuals say.",
          },
          {
            term: "Supernatural status and debt → Vampire: The Masquerade",
            text: "The characters are undead schemers in a society of clans and sects where status, boons and debts are the working currency and Hunger and Humanity pull every decision towards monstrosity. Elysium gatherings, prestation debts and sect rivalry give social scenes hard consequences without needing a battlefield. Pick it when the group wants personal horror braided into its politics, and check which edition the table will use since procedures differ across them.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "What makes a system good at intrigue",
        paragraphs: [
          "Look past social skills on the character sheet. Nearly every game lets a character lie or persuade; useful intrigue mechanics make some part of the political situation persistent and visible, so a snubbed guild remembers the snub. That can be faction clocks, written Beliefs with stated stakes, prestation debts, or a relationship map the table maintains together.",
          "Pressure matters as much as persistence. Scarcity of money, blood, soldiers or favours pushes characters to accept help with strings attached, and that is where alliances get interesting. Decide how much of that political state the group wants the rules to track, and pick the system that tracks that part.",
        ],
      },
      {
        kind: "prose",
        heading: "How much should the rules model politics",
        paragraphs: [
          "In games like Reign and Blades in the Dark, factions are explicit mechanical actors with sheets, clocks or qualities of their own. The advantage is that rival schemes advance on a visible procedure and the GM does not have to improvise the whole power struggle. The trade is scope: the campaign bends towards whatever the faction rules measure, whether that is turf, company might or crew standing.",
          "In games like Burning Wheel and Vampire, politics emerge more from character decisions pressed through social systems such as the Duel of Wits or the prestation economy. The advantage is flexibility: any alliance or betrayal the characters can imagine is playable. The trade is preparation and attention, since the GM must track who owes whom and keep the pressure on without a faction engine doing it automatically.",
          "Combat centrality matters too. None of the five games above treats a pitched battle as the default answer, which is part of why they suit intrigue. If the group still wants swords drawn regularly, say so early: a courtly game strains when one player solves every slight with a duel to the death, while a criminal crew game absorbs violence as one more way to make enemies.",
        ],
      },
      {
        kind: "example",
        heading: "One succession crisis, three tables",
        paragraphs: [
          "An ageing harbourmaster dies without naming an heir. Two merchant houses, the dockworkers' guild and a smuggling crew all claim the succession, and the party is owed money by one of them. Three groups run the same premise in different systems.",
        ],
        items: [
          {
            term: "The criminal table",
            text: "The party plays Blades in the Dark as a smuggling crew. They back the dockworkers' guild in exchange for a warehouse claim, run a score to intercept a rival house's ledger, and watch faction clocks tick as the other house hires street muscle. When Heat brings harbour inspectors to their door, the entanglement forces them to choose which ally to disappoint. The succession is decided by turf, scores and standing, all tracked where everyone can see them.",
          },
          {
            term: "The conviction table",
            text: "The party plays Burning Wheel. One character's Belief names the guild as the rightful heir; another's Belief says the houses keep the peace and the guild would starve the port. The disagreement goes to a Duel of Wits with the harbour charter as the stakes, and the loser concedes the point but gains a grudge that feeds next session's Artha. Circles rolls decide which councillors even take their meetings. The crisis hurts because the characters' written convictions collided.",
          },
          {
            term: "The strategy table",
            text: "The party plays Reign. Each player still schemes in character, but between scenes their allied guild makes Company rolls to seize the docks while the rival houses answer in kind. A lost roll means the guild's shallows fleet is impounded, and the next character scene opens with dockworkers demanding the party fix it. The campaign moves at two scales at once: personal scenes and organisation moves that change what those scenes are about.",
          },
          {
            term: "Why it works",
            text: "The premise never changed; the political layer did. Each table got intrigue in the form its rules record, whether that is standing and turf, stated beliefs with stakes, or organisations that roll against each other. Matching the system to the layer the group enjoys is the whole decision.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before you commit to an intrigue system",
        intro: "Work through these with the group before buying rulebooks:",
        items: [
          "Name which politics you want: court drama, faction strategy, criminal struggle, ideological conflict or supernatural society.",
          "Decide whether players scheme as individuals only, or also direct organisations with their own moves.",
          "Agree how social defeat should feel, from a lost debate with stated stakes to a burned contact or a debt owed.",
          "Decide how much political state the group wants the rules to track, whether that is faction clocks, Company stats, debts, reputations or Beliefs.",
          "Run a short scenario containing one negotiation and one political setback, and see whether failure creates complications the group wants to pursue.",
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "Blades in the Dark",
        rationale:
          "Crew sheets, faction status and faction clocks make turf, standing and rival schemes visible procedures rather than GM notes.",
        href: "https://bladesinthedark.com/",
      },
      {
        system: "Court of Blades",
        rationale:
          "Court phases, house service and influence mechanics make social positioning the main arena rather than a pause between fights.",
        href: "https://acoupleofdrakes.itch.io/court-of-blades",
      },
      {
        system: "Burning Wheel",
        rationale:
          "The Duel of Wits resolves social conflict with stated stakes while Beliefs and Artha reward characters for acting on conviction.",
        href: "https://www.burningwheel.com/",
      },
      {
        system: "Reign",
        rationale:
          "Company rules give organisations their own qualities and rolls, so factions act as mechanical participants alongside characters.",
        href: "https://atomicovermind.com/reign/",
      },
      {
        system: "Vampire: The Masquerade",
        rationale:
          "Hunger and Humanity press every decision while clans, sects and prestation debts give social scenes lasting currency.",
        href: "https://www.worldofdarkness.com/",
      },
    ],
    codexConnection: {
      heading: "Stock the power struggle once the system is chosen",
      paragraphs: [
        "Codex Cryptica does not run social conflict or automate rules for any of these systems. What it helps with is the material around the scheming: the factions with goals and resources, the secret society pulling strings, the council vote that decides the succession, and the rumours that carry each betrayal to the wrong ears.",
        "Generate those pieces as linked material, so a faction, its leaders and the rumours about them reference each other from the first session, whatever system the group picks.",
      ],
      linkText: "Generate the factions",
      href: "/generators/faction",
    },
    relatedTools: [
      {
        title: "Faction Generator",
        description:
          "Groups with goals, resources and rivalries that can scheme between sessions.",
        href: "/generators/faction",
      },
      {
        title: "Council Vote Generator",
        description:
          "Formal votes, factions and hidden agendas for succession and court scenes.",
        href: "/generators/council-vote",
      },
      {
        title: "Secret Society Generator",
        description:
          "Hidden organisations with motives, methods and ranks for conspiracies.",
        href: "/generators/secret-society",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Vampire: The Masquerade",
        description:
          "Notes and worldbuilding for groups running supernatural social politics.",
        href: "/for/vampire-the-masquerade",
      },
      {
        title: "Codex Cryptica for Conspiracy",
        description:
          "Material for hidden agendas, rival schemes and campaigns of secrets.",
        href: "/for/conspiracy",
      },
    ],
    relatedAnswers: [
      "what-rpg-system-should-we-try-instead-of-dnd",
      "how-do-i-run-political-intrigue-and-faction-play",
      "what-rpg-should-i-play-for-investigative-horror",
      "what-rpg-should-i-use-for-tactical-combat",
      "how-do-you-create-a-fantasy-faction",
      "how-do-you-run-factions-in-a-sandbox-campaign",
      "how-do-you-track-faction-turns-between-rpg-sessions",
      "how-do-you-run-a-conspiracy-campaign",
      "how-do-you-create-a-secret-society-for-an-rpg-campaign",
      "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
      "how-do-i-run-character-roles-in-a-political-intrigue-rpg",
      "how-do-i-build-a-believable-constitutional-crisis-or-coup",
    ],
    discovery: {
      id: "answer-political-intrigue-system-selection",
      parentCluster: "rpg-system-selection",
      clusters: ["rpg-system-selection", "faction-creation"],
      primaryIntent:
        "choose a tabletop rpg system for political intrigue and faction play",
      intentAliases: [
        "best rpg for political intrigue",
        "tabletop rpg for faction play",
        "rpg with political mechanics",
        "rpg for court intrigue",
        "rpg with faction system",
        "tabletop rpg for social politics",
      ],
      uniqueValue:
        "Compares five intrigue systems by the kind of politics they produce, from criminal turf to courts, belief-driven drama, organisation strategy and vampire society, instead of a ranked best list.",
      userJob: "evaluate",
      relatedIntents: [
        "answer-system-selection",
        "answer-tactical-combat-system-selection",
        "answer-investigative-horror-system-selection",
        "answer-fantasy-faction",
        "answer-run-factions-sandbox",
        "answer-track-faction-turns-between-sessions",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-tactical-combat-system-selection",
          reason:
            "Sibling vibe-to-system chooser for tactical combat; this page owns political-intrigue system choice and links across rather than repeating the pattern.",
        },
        {
          with: "answer-investigative-horror-system-selection",
          reason:
            "Sibling vibe-to-system chooser for investigative horror; this page owns political-intrigue system choice and links across rather than repeating the pattern.",
        },
        {
          with: "answer-track-faction-turns-between-sessions",
          reason:
            "That page teaches GMs to resolve faction turns inside a chosen campaign; this one helps groups choose a system whose rules support faction play.",
        },
        {
          with: "answer-run-character-roles-political-intrigue",
          reason:
            "This page compares systems for political play; the roles guide provides system-agnostic advice for running different PCs inside a political campaign.",
        },
      ],
    },
    seo: {
      title:
        "What RPG works for political intrigue and faction play? | Codex Cryptica",
      description:
        "Compare five RPGs for political play by faction rules, social conflict and scale, from criminal crews and courts to belief-driven drama and vampire society.",
      image:
        "https://assets.codexcryptica.com/og/what-rpg-works-for-political-intrigue-and-faction-play.jpg",
      imageAlt:
        "A candle-lit council chamber where masked nobles trade sealed letters around a long table beneath tall banners",
    },
  };

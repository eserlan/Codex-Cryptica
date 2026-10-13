import type { AnswerConfigInput } from "../schema";

export const whatAreTheBestClasslessFantasyRpgsWithSkillBasedProgression: AnswerConfigInput =
  {
    slug: "what-are-the-best-classless-fantasy-rpgs-with-skill-based-progression",
    category: "getting-started",
    publishedAt: "2026-10-13",
    question:
      "What are the best classless fantasy RPGs with skill-based progression?",
    kind: "comparison",
    shortAnswer:
      "For a group leaving Warhammer Fantasy Roleplay 4e, Mythras is the closest fit for classless skill growth with a resource that can both reroll and downgrade a major wound; GURPS offers point-buy growth if the GM wants to tune the rules package. Dragonbane is a lighter, profession-framed option whose push rerolls cost a condition but do not protect a character from death. Savage Worlds has no fixed classes, but its Rank-based Advances gate Edges. Against the Darkmaster is a vocation-and-level mismatch; check Symbaroum’s core rules before ranking its advancement for this brief.",
    sections: [
      {
        kind: "prose",
        heading: "Start with the constraints",
        paragraphs: [
          "For a group leaving WFRP 4e, “Shadowrun but fantasy” means player-directed skill growth, room to develop over a long campaign, dangerous combat without routine random maiming, and a clear answer to whether luck can reroll a test or mitigate a lethal consequence. Check the chosen edition’s injury and resurrection rules, and Foundry compatibility with your installed version, before ranking preferences.",
        ],
      },
      {
        kind: "table",
        heading: "Comparison at a glance",
        headers: [
          "System",
          "Advancement and campaign growth",
          "Harm and safety net",
          "Foundry VTT snapshot and content",
        ],
        rows: [
          [
            "Mythras",
            "Classless, with no character levels. Skill improvement uses experience rolls; cultures and careers shape starting skills. For a long campaign, check its award rate and improvement limits.",
            "The free [publisher Mythras Imperative rules](https://thedesignmechanism.com/mythras-imperative/) distinguish rerolls from mitigation: Luck can reroll and downgrade a Major Wound to a Serious Wound. This is not a general death save. Check the full rules for injury, healing, and Luck refresh timing.",
            "[Community implementation](https://foundryvtt.com/packages/mythras), v2.3.0, Foundry 11+ (verified 13). The listing does not enumerate sheet or automation coverage. [Mythras Imperative](https://thedesignmechanism.com/mythras-imperative/) is free; the full [Mythras rules](https://thedesignmechanism.com/mythras/) are a separate purchase.",
          ],
          [
            "GURPS 4e",
            "Classless point-buy; earned character points buy eligible traits and skills subject to prerequisites. Ordinary skill costs depend on difficulty and relative level, not a rising cost for every +1; above the relevant threshold, each additional level costs 4 points. See the [SJ Games conversion table](https://www.sjgames.com/gurps/resources/4eupdate.pdf) and [official FAQ](https://www.sjgames.com/gurps/faq/FAQ4-3.html). Award rate and available options control the pace and remaining choices.",
            "Injury severity, luck advantages, and resurrection depend on the selected rules and setting. Choose those rules explicitly; the basic game does not impose one universal fate pool or fantasy death policy.",
            "[Unofficial GURPS 4e Game Aid](https://foundryvtt.com/packages/gurps), v0.18.23, Foundry 13 to 14 (verified 14.367). Its [guide](https://docs.google.com/document/d/1NMBPt9KhA9aGG1_kZxyk8ncuOKhz9Z6o7vPS8JcjdWc/edit) documents character and combat aids, including hit locations and active defences. It contains no paid-book rules; use the GURPS books or PDFs you choose.",
          ],
          [
            "Savage Worlds Adventure Edition + Fantasy Companion",
            "There are no fixed classes, but this is not unrestricted point-buy: characters take Advances, and Rank gates Edges. Skills, Attributes, prerequisites, and Rank each affect what an Advance can buy. Long-campaign fit depends on the pace and which later Edges remain available.",
            "Bennies are a spendable resource. Check the current SWADE rules for permitted rerolls, Soak use, limits, and refresh. The Fantasy Companion is a separate paid supplement, not content supplied by the core Foundry system.",
            "[Official system](https://foundryvtt.com/packages/swade): v6.0.4, Foundry 14 (verified 14); v5.2.6 is listed for Foundry 13 (verified 13). Its package page identifies the official system but does not detail automation coverage. Buy the [Fantasy Companion](https://peginc.com/campaign/fantasy_swade/) separately for its fantasy rules; the [Foundry VTT edition](https://peginc.com/savage-settings/savage-worlds/) is a separate product.",
          ],
          [
            "Dragonbane",
            "No character classes or levels. Professions frame starting characters; marked skills and heroic abilities shape later choices. Check improvement frequency, skill limits, and later options before projecting a multi-year campaign.",
            "At 0 HP, a character falls and can only try to rally. On each later turn, they make a CON death roll: three successes restore d6 HP; three failures kill. Another character can rally them or use Healing, and magic can save them. If combat ends first, keep counting rounds until the rolls are complete. Further damage at 0 HP counts as a failed death roll; one attack that would reduce HP to its full starting value below zero kills outright. Optional pushing rerolls a failed skill or attribute roll but gives a condition; it is not death protection. See the [publisher Quickstart](https://freeleaguepublishing.com/shop/dragonbane/quickstart-guide/).",
            "[Official system](https://foundryvtt.com/packages/dragonbane): v4.1.1, Foundry 14 (verified 14); v3.2, Foundry 13 (verified 13). Listing documents character, NPC and monster sheets, rolls, combat damage, and push support. The [paid Core Rules module](https://foundryvtt.com/packages/dragonbane-coreset) includes rules journals, actors, items, roll tables, scenes, and macros.",
          ],
          [
            "Symbaroum",
            "I could not verify Symbaroum’s advancement rules from accessible primary rules here. Check the paid Core Rules module’s advancement chapter for its gates, costs, and later options before ranking it as a classless, long-campaign match.",
            "I could not verify edition-specific injury, corruption, or resurrection rules from accessible primary rules here, so check the chosen printing before ranking Symbaroum on those points.",
            "[Officially endorsed system](https://foundryvtt.com/packages/symbaroum), community-developed and maintained; v6.1.6, verified Foundry 13. It includes character/NPC sheets, item types, base compendiums, and enhanced combat. The [paid Core Rules module](https://freeleaguepublishing.com/shop/symbaroum/foundry-vtt-module-core-rulebook/) adds the full core rules and book content. Endorsement does not mean compatibility with Foundry 14.",
          ],
          [
            "Against the Darkmaster",
            "Not a qualifying classless match: characters gain levels, and vocations set development points per skill category per level, restrict where those points can be spent, and determine spell access. Ordinary skill ranks cost 1 development point each; high ranks do not cost more. This is a vocation-and-level mismatch, not unrestricted skill-point advancement. See the [publisher SRD](https://srd.vsdarkmaster.com/) and [Vocations](https://srd.vsdarkmaster.com/character-vocations.html).",
            "I could not verify edition-specific Drive, injury, and resurrection claims beyond those SRD pages, so check the core rules before comparing its survival mechanics.",
            "[Official system](https://foundryvtt.com/packages/vsd), v12.290, Foundry 9 to 12 (verified 12); it is not a community system. The separate [paid core content module](https://foundryvtt.com/packages/vsd-core) adds rules journals, actor templates, tables, and macros. The listing does not establish compatibility with Foundry 13 or 14.",
          ],
        ],
      },
      {
        kind: "example",
        heading: "A decision for the WFRP 4e group",
        paragraphs: [
          "Suppose the group uses Foundry 13 and requires classless skill growth, a resource that can mitigate a lethal wound, and no assumption of routine resurrection. It checks rules and package listings before ranking tone or speed.",
        ],
        items: [
          {
            term: "Choose Mythras, with one accepted compromise",
            text: "The group compares Mythras with GURPS. Both allow classless skill growth, but of these two only the Mythras rules it checked provide the required resource: Luck can reroll and downgrade a Major Wound to a Serious Wound. It checks its chosen low-magic rules for routine resurrection and Foundry 13 compatibility, then picks Mythras, accepting hit-location combat and a community Foundry system whose listing does not promise specific sheet or automation coverage. The listing is v2.3.0, verified for Foundry 13; the group tests the procedures it needs before committing.",
          },
          {
            term: "Why it works",
            text: "Mythras meets this group's stated priorities: classless skill growth, a Luck Point that can reroll and downgrade a Major Wound, and a ruleset the group can check for routine resurrection. They accept hit-location combat and test the community Foundry system's needed procedures because its listing does not promise specific sheet or automation coverage.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before you commit",
        intro:
          "Apply non-negotiables first, then rank candidates by preference.",
        items: [
          "Confirm that advancement matches your definition of classless: distinguish classes from levels or Ranks, prerequisites, and the currency or restrictions that govern purchases. Against the Darkmaster is vocation- and level-based; Savage Worlds has no classes but Rank gates Edges.",
          "Check the package’s verified Foundry version against your installation, then test the required sheets, rolls, and automation. An older verified generation is not made compatible by a newer Foundry release.",
          "Read the selected edition’s rules for lasting injury, corruption, resource timing and refresh, and resurrection. Record whether its resource rerolls a test, mitigates harm, or prevents death; those effects are not interchangeable.",
          "For campaign longevity, compare advancement awards, costs, ceilings, prerequisites, and the choices left at later stages. A trial fight shows immediate handling; one improvement cycle does not establish multi-year headroom.",
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "Mythras",
        rationale:
          "Classless skill improvement through experience rolls with Luck Points that can mitigate lethal results.",
        href: "https://thedesignmechanism.com/mythras",
      },
      {
        system: "Dragonbane",
        rationale:
          "Roll-under skill marks and heroic abilities that keep advancement skill-based rather than class-level gated.",
        href: "https://freeleaguepublishing.com/games/dragonbane/",
      },
      {
        system: "Savage Worlds",
        rationale:
          "Bennies that reroll tests and soak Wounds, providing the most explicit fate-style safety net in this comparison.",
        href: "https://peginc.com/savage-worlds/",
      },
      {
        system: "GURPS",
        rationale:
          "Point-buy character building where fantasy tone, injury detail, and resurrection are set by chosen campaign switches.",
        href: "https://www.sjgames.com/gurps/",
      },
    ],
    codexConnection: {
      heading: "Keep the world steady while the system changes",
      paragraphs: [
        "Switching system does not have to mean rebuilding the campaign. Codex Cryptica organises NPCs, factions, settlements, and session history as system-neutral entities, so the same vault carries over whether the table lands on Mythras, GURPS, Dragonbane, or Savage Worlds. Track who owes whom, where the cult is moving, and what the party has already tried, then let the chosen rulebook handle the dice.",
        "Build the dark fantasy material once and reuse it across candidates: a cursed barony, a faction pursuing a relic, or a settlement under pressure works the same while the group tests two finalists with one-shot probes.",
      ],
      linkText: "Generate a dark fantasy faction for your campaign",
      href: "/generators/dark-fantasy-faction",
    },
    relatedTools: [
      {
        title: "Dark Fantasy Faction Generator",
        description:
          "A gritty faction with motives, resources, and pressure points suited to dark fantasy.",
        href: "/generators/dark-fantasy-faction",
      },
      {
        title: "Settlement Generator",
        description:
          "Towns and holdfasts with problems that fit a low-magic, dangerous world.",
        href: "/generators/settlement",
      },
      {
        title: "NPC Generator",
        description:
          "Characters with drives and secrets that work across any fantasy rulebook.",
        href: "/generators/npc",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Fantasy Worldbuilding",
        description:
          "Build the gritty fantasy region, factions, and history the new system will inhabit.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "what-rpg-system-should-we-try-instead-of-dnd",
      "what-rpg-feels-like-dnd-but-is-simpler",
      "what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
      "what-rpg-should-i-use-for-tactical-combat",
      "how-do-you-handle-character-death-in-a-tabletop-rpg",
    ],
    discovery: {
      id: "answer-classless-fantasy-skill-progression",
      parentCluster: "rpg-system-selection",
      clusters: ["rpg-system-selection"],
      primaryIntent:
        "choose a classless fantasy tabletop rpg with skill based progression for a long gritty campaign with foundry vtt support",
      intentAliases: [
        "classless fantasy rpg with skill progression",
        "fantasy rpg like shadowrun",
        "dark fantasy tabletop rpg without classes",
        "long campaign skill-based rpg",
        "fantasy rpg with fate or luck points",
        "classless fantasy rpg with foundry vtt",
        "skill based fantasy rpg no levels",
      ],
      uniqueValue:
        "Compares six mechanically distinct fantasy systems against the same classless progression, lethality, safety-net, and Foundry criteria to produce a shortlist for post-WFRP groups.",
      userJob: "evaluate",
      relatedIntents: [
        "answer-system-selection",
        "answer-simpler-dnd-alternative",
        "answer-dungeon-crawl-system-selection",
        "answer-tactical-combat-system-selection",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-system-selection",
          reason:
            "That page offers a broad play-style chooser for groups leaving D&D; this page narrows to classless skill-driven advancement, gritty tone controls, and Foundry constraints.",
        },
        {
          with: "answer-simpler-dnd-alternative",
          reason:
            "That page ranks lighter fantasy systems that feel like D&D; this page evaluates systems sought for freedom from classes and sustained skill progression, largely the opposite appetite.",
        },
        {
          with: "answer-dungeon-crawl-system-selection",
          reason:
            "That page selects by dungeon procedure and lethality for crawl-focused play; this page selects by classless advancement and long-campaign headroom even outside dungeons.",
        },
        {
          with: "answer-tactical-combat-system-selection",
          reason:
            "That page selects by the kind of tactical combat a table enjoys; this page selects by classless growth and gritty fantasy controls and only treats combat risk as one filter.",
        },
        {
          with: "answer-space-opera-system-selection",
          reason:
            "That page selects systems for over-the-top space opera campaigns; this page selects gritty classless fantasy systems for long skill-based progression.",
        },
      ],
    },
    seo: {
      title:
        "What are the best classless fantasy RPGs with skill-based progression? | Codex Cryptica",
      description:
        "Compare Mythras, GURPS, Savage Worlds, Dragonbane, Symbaroum and more for classless skill growth, gritty combat, luck safety nets and Foundry VTT support.",
      image:
        "https://assets.codexcryptica.com/og/what-are-the-best-classless-fantasy-rpgs-with-skill-based-progression.jpg",
      imageAlt:
        "Adventurers gathered around a scarred wooden table studying scattered skill charts, maps, and dice in a dim, gritty fantasy hall",
    },
  };

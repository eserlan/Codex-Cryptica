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
      "For a group leaving Warhammer Fantasy Roleplay 4e who wants classless, skill-driven advancement with gritty fantasy and a luck safety net, the closest fits are Mythras for detailed simulationist growth and Dragonbane for lighter roll-under skill play, with GURPS as the point-buy toolkit if the table wants to build its own fantasy dial, and Savage Worlds with its Fantasy Companion as a rank-gated but flexible alternative; Symbaroum and Against the Darkmaster suit dark fantasy flavour but bring more structured advancement and specific deal-breakers around corruption and injuries that need checking against the group's tolerances.",
    sections: [
      {
        kind: "prose",
        heading: "What this group is actually asking for",
        paragraphs: [
          "A group finishing Warhammer Fantasy Roleplay 4e is not looking for a simpler D&D. The brief is tighter: no rigid classes or levels, free development of skills and talents across a long campaign, dangerous but not randomly maiming combat, a spendable luck or fate resource that prevents disaster rather than merely adding a bonus, and resurrection that is absent or exceptionally rare. Foundry VTT character sheet support is a practical constraint, not a nice extra.",
          "The shorthand in the original post was Shadowrun but for fantasy. That points to mechanics rather than setting: Shadowrun's appeal is point-based character building, improvement driven by spending earned points on individual skills and attributes, broad competence where a character can be defined by several specialties rather than one class role, and a system that expects dozens of sessions without characters maxing out. It does not mean the group wants Shadowrun's specific dice pool, initiative passes, or cyberware subsystems transplanted into a fantasy skin.",
        ],
      },
      {
        kind: "prose",
        heading: "What Shadowrun but fantasy means at the table",
        paragraphs: [
          "In practice the comparison signals five preferences. Characters improve where the player chooses, not where a class chart dictates. A starting character can be competent in several areas and then deepen or broaden through play. The setting supports grim, low-magic or dark fantasy without the game fighting that tone. Campaigns sustain meaningful advancement over a year or more of weekly play. A luck-style resource lets players intervene on a bad roll or a lethal result rather than watching a random injury chart end a character they have played for months.",
          "What it does not promise is rules weight. Shadowrun is famously crunchy, but a group quoting the phrase may want that freedom with far less bookkeeping. Ask the table directly whether they want detailed simulation or fast, cinematic growth before ranking the candidates below.",
        ],
      },
      {
        kind: "list",
        heading: "Six tests that narrow the field",
        intro:
          "Run every candidate through these in order. Each test removes or qualifies at least one well-known option.",
        items: [
          {
            term: "Is advancement genuinely classless",
            text: "Some games sell themselves as flexible but gate new abilities behind ranks, tiers, or professions that act like soft classes. Truly classless play lets a character raise any eligible skill, characteristic, or talent when the rules say improvement is available, with cost or practice as the limiter rather than a class list. Call out any rank or archetype gate honestly.",
          },
          {
            term: "Does progression hold up for a long campaign",
            text: "A system where a starting character can raise every favoured skill to 90 percent in ten sessions will stall in a year-long game. Look for increasing costs, diminishing returns, training checks, or talent trees that keep choices meaningful after dozens of sessions without forcing the GM to invent a new advancement track.",
          },
          {
            term: "How does dangerous combat handle lasting harm",
            text: "Gritty means a sword matters, not that every major wound randomly severs a limb by default. Check whether serious injuries, maiming, or corruption sit in the core combat loop or in an optional table. The brief explicitly rejects random maiming or mutation as the normal price of getting hit.",
          },
          {
            term: "What exactly does the safety net do",
            text: "Not all luck resources are equal. Some let a player reroll dice, some add a bonus after seeing the result, some mitigate a specific injury, and some prevent death outright but at a permanent cost. Read what the resource can and cannot touch. A mechanic that adds plus ten to a skill test is not the same as one that turns a fatal blow into a lesser wound.",
          },
          {
            term: "How do magic, corruption, and resurrection behave",
            text: "Dark fantasy often bundles dangerous magic with a corruption or mutation system and generous resurrection. Confirm whether healing magic brings characters back from death, how rare that is, and whether using power gradually mutates the caster even when the table wants gritty but not grimdark body horror.",
          },
          {
            term: "Is there current Foundry VTT support you can rely on",
            text: "A community module last updated two years ago and a maintained official system with a full character sheet and automation are different propositions. Check the Foundry package listing for verified compatibility with the current stable Foundry version, recent update date, and whether sheets, rolls, and reference material all work without hand patching. Links to official listings are included below and should be rechecked before purchase.",
          },
        ],
      },
      {
        kind: "table",
        heading: "Comparison at a glance",
        headers: [
          "System",
          "Classless and progression",
          "Long campaign headroom",
          "Combat and lasting harm",
          "Safety net and resurrection",
          "Foundry VTT status",
        ],
        rows: [
          [
            "Mythras",
            "Fully classless. Skills improve by experience rolls spent on skills used in play. Characteristics and passions matter but do not gate advancement. Specialisation is natural, ceiling sits well above starting scores.",
            "Strong. Experience rolls and training produce slow, steady growth. High skills cost the same roll for a smaller gain, so meaningful improvement continues for many arcs without maxing out.",
            "Dangerous by design. Combat special effects make fights tactical. Serious wounds and hit location effects are core, but limb loss sits on a specific major wound path, not every hit. Can be tuned to be less punishing without house ruling the core loop.",
            "Luck Points let a character reroll or mitigate a result and turn a lethal major wound into a lesser one. Resurrection is not standard and magic healing is limited compared with D&D style play.",
            "Community system on Foundry. Check the Foundry package page for current verified version and recent maintenance before committing. Sheet covers skills, hit locations, and combat effects.",
          ],
          [
            "GURPS 4e",
            "Fully point-buy and classless. Build any character from advantages, disadvantages, skills, and techniques. Advancement spends earned character points on anything affordable.",
            "Excellent when the GM sets point awards carefully. Costs rise with level, so raising a 16 to 17 costs more than raising a 12 to 13. Without discipline the table can either stall or bloat, so pacing is a GM skill.",
            "Lethality is a dial. With realistic fantasy settings a single solid hit wounds and cripples, with optional bleeding and lasting injury rules. With cinematic switches the same engine is forgiving. Random maiming is optional, not assumed.",
            "No built-in fate pool by default, but common optional rules add Luck advantages and Destiny Points. Resurrection depends entirely on setting; most gritty fantasy builds exclude it or price it steeply.",
            "Community GURPS Game Aid system on Foundry, widely used. Confirm Foundry version compatibility on its package page. Automation covers hit locations and active defences.",
          ],
          [
            "Savage Worlds Adventure Edition plus Fantasy Companion",
            "Not truly classless. Characters advance by spending advances on attribute steps, skill dice, and Edges, gated by Rank (Novice, Seasoned, Veteran, Heroic, Legendary). Within a Rank choices are free, but Rank acts as a tier.",
            "Good for long play, but power curve steps at each Rank. Skill dice cap at d12 and only Legendary Edges remain after a long run. Sustains a campaign, but in broader strokes than a pure skill-point system.",
            "Fast and dangerous, but the injury system uses Wounds and Incapacitation rather than random limb loss. Bennies soak damage directly, so lasting maiming is rare by default.",
            "Bennies are central: reroll any trait test, soak Wounds, and influence the story. Extra Bennies come from Hindrances. No resurrection by default; healing magic mends but does not routinely raise the dead.",
            "Official Savage Worlds system on Foundry with maintained Fantasy Companion support. Check the official Foundry package listing for current version. Strong automation for cards, Bennies, and combat.",
          ],
          [
            "Dragonbane",
            "Mostly classless with a light gate. Any skill can be marked through use and advanced, but profession and heroic abilities frame what a character can learn next. Much closer to skill-based than class-based.",
            "Moderate. Skill marks drive improvement, and values rise slowly on a d20 roll-under scale. Heroic abilities add variety, but the skill range is tighter than in Mythras or GURPS, so long campaigns rely on breadth over ever-higher numbers.",
            "Dangerous and quick. Hit points are low, criticals hurt, and a failed death roll kills. No default random mutilation table; injuries are handled through hit point loss and conditions rather than severed limbs.",
            "Heroic abilities and Willpower give limited second chances, but Dragonbane has no universal fate pool. Some monster abilities bypass luck entirely. Resurrection is not assumed; returning from death is a rare, costly narrative event.",
            "Official Dragonbane system on Foundry from Free League, maintained and versioned against current Foundry releases. Sheet handles skill marks, conditions, and heroic abilities.",
          ],
          [
            "Symbaroum",
            "Structured, not freely classless. Characters pick abilities and powers from a structured list with tiered mastery levels. Choices feel flexible at creation but advancement follows ability tracks rather than open skill-point freedom.",
            "Limited for a free-progression brief. Abilities improve through defined tiers, and the ceiling arrives sooner than in a point-buy engine. Suits a focused dark fantasy arc rather than a multi-year open campaign.",
            "Dark and lethal, with corruption and injuries tied to the setting. Permanent harm from corruption and monstrous traits is thematic and not easily toggled off without rewriting tone.",
            "Advantages and armour offer rerolls in narrow cases, but there is no broad fate-point safety net comparable to Luck or Bennies. Resurrection is vanishingly rare and antithetical to the setting.",
            "Community Symbaroum system on Foundry. Check its package page for Foundry version support and update recency; coverage varies by rulebook printing.",
          ],
          [
            "Against the Darkmaster",
            "Classless in practice: open skill list with broad freedoms, but illustrated by vocations that nudge starting packages rather than locking advancement. Close to the skill-based ideal.",
            "Strong. A Rolemaster-derived progression where skill ranks cost development points and high ranks cost more. Well suited to sustained campaigns without quick saturation.",
            "Gritty and hit-driven, but crit tables produce specific injuries and can include lasting effects. Random serious injury is more present than in Savage Worlds or Dragonbane; the table can cap the severity but the charts are core.",
            "Drive points and starting fate options give limited rerolls and survival chances. Resurrection exists in lore but is rare, costly, and often tied to dark bargains rather than routine healing.",
            "Community Against the Darkmaster system on Foundry. Verify version compatibility and coverage of crit and drive mechanics on its listing before adopting it as a requirement.",
          ],
        ],
      },
      {
        kind: "list",
        heading: "Candidate profiles with deal-breakers called out",
        intro:
          "Use this to match a table's appetite for crunch, tone, and automation.",
        items: [
          {
            term: "Mythras, when the group wants the most faithful Shadowrun-style freedom in fantasy",
            text: "Published by The Design Mechanism, Mythras is classless, uses Culture and Career only for starting skills, and then improves through experience rolls spent on skills actually used. Combat is the standout and the risk: special effects on successful attacks, hit locations, and action points make fights deadly and positional. Serious wounds are proper mechanics, but severed limbs and maiming belong to specific major-wound results rather than every successful hit. Luck Points are the clearest safety net in this list for the brief, because they can mitigate damage and reroll. Magic comes in several distinct systems (Folk Magic, Theism, Sorcery, Animism), so the table can pick a gritty low-magic feel without carrying a high-magic burden. Foundry support is a community system rather than an official publisher release; recheck its verified Foundry version and recent changelog before buying books.",
          },
          {
            term: "GURPS Fourth Edition, when the group wants a toolkit it can tune exactly",
            text: "Steve Jackson Games designs GURPS as a point-buy engine. Fantasy tone, injury detail, magic availability, and resurrection are all switches the GM sets by choosing which supplements and optional rules to include, notably GURPS Fantasy and GURPS Magic or the lighter Dungeon Fantasy line. That freedom is also the cost: the game ships with far more rules than any table will use, and campaign viability depends on point awards the GM calibrates. Foundry coverage is through the community GURPS Game Aid system, which is mature but still community-maintained. Groups without patience for session-zero dials will find GURPS heavy; groups who enjoy building exactly the fantasy they want will find it the most precise fit.",
          },
          {
            term: "Savage Worlds with Fantasy Companion, when the group wants fast, pulpy danger with a real fate economy",
            text: "Pinnacle's Savage Worlds is not truly classless, because Rank gates which Edges are available, and players advance along a track of advances rather than by spending points freely. Within that structure it plays fast and stays dangerous, with the Shaken and Wound track doing the work that hit locations do elsewhere. Bennies are the strongest safety net on this list by default: they reroll tests and soak Wounds, and the economy is replenished each session and through Hindrances. Foundry has an official, well-maintained system with Fantasy Companion integration, which makes it the safest VTT pick here if the table can live with Rank gating rather than pure skill-point freedom.",
          },
          {
            term: "Dragonbane, when the group wants lighter, roll-under skill play with immediate Foundry polish",
            text: "Free League's Dragonbane keeps skill-driven improvement through marks gained in play and a d20 roll-under core that will feel familiar to WFRP players who like testing against a skill value. Professions give starting packages and heroic abilities frame later growth, so it is not purely open point-buy, but it is closer to skill-based than any class-and-level game. Combat is dangerous on low hit points without default limb loss. The trade against the brief is the safety net: there is no universal fate pool, so a bad death roll stays bad unless the table house rules one. The official Foundry system is maintained by the publisher and covers skills, conditions, and heroic abilities with little patching.",
          },
          {
            term: "Symbaroum, for dark fantasy flavour with accepted limits",
            text: "Also from Free League, Symbaroum nails dark fantasy tone, flexible ability picks, and a setting where darkness has a mechanical cost. It partly fits the skill-based ask but not cleanly: advancement walks ability tiers rather than spending points freely across skills and attributes, and corruption and monstrous traits are central. If the brief rejects random mutation as a default consequence and wants open-ended progression, Symbaroum's corruption track is a material mismatch that cannot be hand-waved. Include it when tone matters more than pure classless advancement, and verify its community Foundry system's coverage of the current edition printing.",
          },
          {
            term: "Against the Darkmaster, the classic-inspired alternative worth checking",
            text: "From Open Ended Games, Against the Darkmaster is an open-skill fantasy built transparently on Rolemaster lineage but written for modern tables. Development points buy skill ranks with rising costs, which gives excellent long-campaign headroom without quick saturation. Vocations suggest a starting shape without locking advancement. Tone supports gritty, journey-heavy fantasy well. The cost is the critical tables: injuries are rolled on charts that can produce lasting effects, which is closer to the random maiming the brief wants to avoid than the other candidates. Drive gives some mitigation, but less than Luck or Bennies. Foundry has a community system that covers travel, skills, and crit tables, but check its version support before treating it as a requirement.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "How to choose between crunch and momentum",
        paragraphs: [
          "Two of the most common disagreements in a post-WFRP group hide inside the same sentence: we want skill-based freedom and we want Foundry support. Mythras and GURPS deliver the deepest classless freedom and the best long-campaign headroom, but they ask for more rules engagement and lean on community Foundry systems that need periodic checking. Dragonbane and Savage Worlds with Fantasy Companion push in the other direction: lighter sheets, faster turns, and official Foundry implementations that update alongside the Foundry stable branch, with the trade that advancement is more gated and heroic abilities or Edges do some of the work that pure skill points would do elsewhere.",
          "Name that trade before the pitch. If the table wants simulation where weapon reach, shield use, and called shots all matter and is willing to read, Mythras is the better call. If the table wants weekly momentum with minimal reference lookups, Dragonbane or Savage Worlds suit better. GURPS fits groups that specifically enjoy tuning their own fantasy dial and who will keep point awards disciplined.",
        ],
      },
      {
        kind: "example",
        heading: "A worked shortlist for the WFRP 4e group",
        paragraphs: [
          "A group finishing a long Enemy Within style campaign wants to keep gritty fantasy but escape WFRP 4e's career structure. They bring the six tests above to the table.",
        ],
        items: [
          {
            term: "Test one, class freedom",
            text: "Savage Worlds is flagged honestly: it has Ranks. The group decides it can live with staged Edges if the rest of the fit is strong, but notes it is not the purest skill-point answer. Symbaroum is flagged as ability-tiered rather than freely classless and slides down the shortlist for this specific brief, even though its tone is ideal.",
          },
          {
            term: "Test two, long campaign",
            text: "The group plans a year of weekly sessions. They notice Dragonbane's tighter d20 scale caps earlier than Mythras or GURPS and would lean on broadening into new skills and heroic abilities. That suits them if they want bounded growth, but not if they want steadily rising mastery in a single specialty across the whole year.",
          },
          {
            term: "Test three, maiming as a core cost",
            text: "Mythras serious wounds and Against the Darkmaster crit charts are examined closely. The group is comfortable with serious wounds that reduce capability and require recovery, but not with a chart that commonly severs a hand on a standard hit. Both games pass this test when the table plays the rules as written: major maiming belongs to a narrow result, not the normal outcome, though Against the Darkmaster's charts are more present and need a table agreement on when to cap them.",
          },
          {
            term: "Test four, what the safety net really covers",
            text: "Luck Points in Mythras can turn a major wound into a lesser one and reroll a failed test, which matches the group's wish to prevent a single bad swing from ending a beloved character. Bennies in Savage Worlds soak Wounds before they land, which is even more forgiving but costs a metacurrency every time. Dragonbane's lack of a universal fate pool becomes the clearest gap: the group would need to add a house rule death save or hero point if it picks Dragonbane.",
          },
          {
            term: "Test five, magic and coming back from the dead",
            text: "GURPS is set to a low-mana fantasy where resurrection is excluded outright, which fits. Symbaroum's corruption track would punish casters for casting at all, which the group reads as thematic but not what they asked for on this campaign. The WFRP instinct for rare, costly return from death maps well onto Mythras and Dragonbane as written.",
          },
          {
            term: "Test six, Foundry before commitment",
            text: "The group opens each Foundry package listing in a browser before buying: Savage Worlds plus Fantasy Companion and Dragonbane show official verified systems with current compatibility, Mythras and GURPS show maintained community systems with recent updates but without publisher backing, and Symbaroum and Against the Darkmaster show community systems whose update recency needs a closer look. No candidate is treated as supported just because a module name exists.",
          },
          {
            term: "Why it works",
            text: "The group never argued about favourite settings. They used the brief's own constraints to remove one candidate that only partly fits, to qualify two whose injury and safety-net design sit on opposite sides of the brief's deal-breakers, and to separate the two strongest general fits by how much simulation the table actually wants. The shortlist then writes itself: Mythras or GURPS for deep classless growth, Dragonbane or Savage Worlds for lighter growth with stronger VTT polish, and a concrete house rule identified before play starts rather than after a bad death roll.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Decision pathway for this brief",
        intro:
          "Use this in order at your table. Stop when one divergence makes the choice clear.",
        items: [
          "Write down which of these you rank highest: pure skill-point freedom, or weekly speed and VTT polish. If freedom wins, keep Mythras and GURPS at the top. If speed and polish win, keep Dragonbane and Savage Worlds with Fantasy Companion at the top.",
          "Open the Foundry package page for each finalist. Confirm verified compatibility with your Foundry version, last update date, and that the sheet rolls, tracks conditions, and shows reference material without hand patching. Drop any candidate whose listing is out of date until it catches up.",
          "Read the injury and corruption section in each finalist. Mark whether serious maiming or mutation follows from a common hit or only from a rare result. If the group rejects random maiming as a default, flag Against the Darkmaster's charts and Symbaroum's corruption as needs-explicit-agreement.",
          "Read exactly what the safety net spends on. Can it reroll, add a bonus, soak Wounds, or downgrade a fatal wound. If the candidate has no universal fate pool, agree a single house rule now, such as a once-per-session reroll or a costly wound downgrade, and cost it so it does not become a free extra life.",
          "Check resurrection in the candidate's core or setting chapter. If the group wants death to be final, confirm it is excluded or priced so steeply that it will not appear in normal play. Do not assume a dark setting excludes it.",
          "Run one combat and one advancement cycle from each finalist's quickstart before buying the full line. A single fight shows injury and safety-net behaviour more clearly than any review, and a single improvement step shows long-campaign headroom.",
          "Record the trade you accepted in one sentence for the campaign pitch, for example we picked Dragonbane for Foundry polish and speed and added a once-per-session wound-downgrade, or we picked Mythras for open skill growth and accepted hit-location bookkeeping. That sentence prevents later arguments about what was promised.",
        ],
      },
      {
        kind: "prose",
        heading: "One or two house rules that fix a near match",
        paragraphs: [
          "Sometimes the closest fit needs a small patch rather than a different system. Dragonbane plays well for this brief if the table adds a narrow safety net, such as allowing one Willpower-funded reroll per session or letting a character spend a permanent resource to downgrade a death result to unconsciousness with a lasting scar. Cap it at once per character per session so it stays a safety net rather than a routine soak.",
          "Mythras and Against the Darkmaster benefit from the opposite patch: agree in session zero which injury results the table will use. Keeping serious wounds but agreeing that limb loss only applies on an explicit optional chart or on a second failed resilience check preserves grit without making random maiming the normal outcome. GURPS needs no combat patch when the GM selects the right switches, but it does need a disciplined point-award plan so advancement stays meaningful without inflating. Savage Worlds needs no safety-net patch, but if the group wants freer skill-point growth the price is accepting Rank gating or choosing a different engine.",
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
      "what-rpg-system-is-good-for-solo-play",
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

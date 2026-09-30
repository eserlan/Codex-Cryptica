import type { AnswerConfigInput } from "../schema";

export const howDoIGiveDifferentCivilisationsDistinctStrengthsAndWeaknesses: AnswerConfigInput =
  {
    slug: "how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
    category: "worldbuilding",
    publishedAt: "2026-09-30",
    question:
      "How do I give different civilisations distinct strengths and weaknesses?",
    kind: "framework",
    shortAnswer:
      "Give each civilisation distinct strengths and weaknesses by tracing why it became good at something, what that strength depends on, what fails when the dependency is stressed, and what the players can see changing as a result. A maritime trading culture is strong at diplomacy and logistics because its merchant fleet must keep sea lanes open, so a blockade, storm season, or lost harbour hits it harder than a landlocked neighbour. When every strength creates a cost, a trade-off, or a failure mode, civilisations feel different without fixed ancestry bonuses.",
    sections: [
      {
        kind: "prose",
        heading: "Why fixed bonuses flatten civilisations",
        paragraphs: [
          "The usual shortcut is to assign each people a permanent bonus: one civilisation always builds the best roads, another always fields the finest soldiers, a third always excels at magic. The table learns that choice on day one and never needs to reconsider it, because nothing about the world explains why the bonus exists or when it stops working.",
          "That approach also slides easily into essentialism, where ability is treated as a trait of ancestry rather than circumstance. It replaces history, geography, and institutions with a label, and it leaves the GM with few handles when the story needs to stress a strength or show a weakness in play.",
          "A more durable alternative is to derive capabilities from what each society has built and must maintain. Strengths then carry an ongoing cost, a dependency, and a point of failure the party can discover, exploit, or defend. The civilisation is not better at everything; it is stronger in the conditions its history prepared it for, and more exposed when those conditions change.",
        ],
      },
      {
        kind: "list",
        heading:
          "The four-link model: cause, capability, vulnerability, visible consequence",
        intro:
          "Use this chain for each major strength so it remains explainable, situational, and playable. One sentence per link is enough to start:",
        items: [
          {
            term: "Cause",
            text: "The circumstance that explains why the capability developed: geography, resources, climate, a founding crisis, a lasting institution, or a strategic choice made generations ago. A river delta, a mountain barrier, a salt monopoly, a guild charter, or a past invasion each points to different consequences.",
          },
          {
            term: "Capability",
            text: "What the civilisation can reliably do because of that cause: move goods quickly, raise disciplined levies, administer a census, maintain roads, negotiate across languages, preserve technical or magical knowledge, or keep households intact through strain. Name the capability narrowly so its limits are obvious.",
          },
          {
            term: "Vulnerability",
            text: "What the capability depends on and what fails when that dependency is stressed. A strong fleet depends on open sea lanes and allied harbours; a centralised bureaucracy depends on records, roads, and literate clerks; a mercantile economy depends on credit and safe passage. Every strength should name at least one cost, trade-off, dependency, or failure mode.",
          },
          {
            term: "Visible consequence",
            text: "What the players can observe without being told the model: coastal cities with foreign quarters, toll stations on the only pass, terraced hillsides that feed the capital, a calendar of state festivals that keep scattered villages aligned, or a college that houses its archives against fire and theft. If the link has no sign at the table, it does not exist for the players.",
          },
        ],
        outro:
          "Write the whole link as a single sentence when you can: extensive maritime trade led to a strong merchant fleet and broad diplomatic reach, so the polity is vulnerable to blockades, which shows as coastal cities, imported luxuries, and naval politics when the sea lanes close. That sentence is the civilisation's strength and weakness together.",
      },
      {
        kind: "list",
        heading: "Seven habits that keep strengths honest",
        intro:
          "Apply these as checks after you draft a civilisation's strengths, so the differences remain situational rather than absolute:",
        items: [
          {
            term: "Derive from circumstances, not ancestry",
            text: "Explain who became good at what because of where they live, what they control, and what history forced them to learn. A highland confederation is strong at cohesion because dispersed villages survived by mutual aid during hard winters, not because its people are inherently steadfast.",
          },
          {
            term: "Distinguish capacity from reputation",
            text: "A civilisation may be famous for its legions while its actual advantage lies in logistics and roads that let those legions arrive fed. Let reputation lag behind reality, be contested, or be outright wrong; mistaken reputation is itself a source of diplomatic friction.",
          },
          {
            term: "Make strengths situational",
            text: "No strength should win everywhere. A river-borne supply system excels in the lowlands and stumbles in arid hill country; a council-based diplomacy works among peers but slows crisis decisions. Name the terrain, season, or political context where the strength applies and where it thins.",
          },
          {
            term: "Pair strong institutions with dependencies",
            text: "A capable administration needs archives, trained clerks, and regular communication; a renowned college needs patronage, safe travel for scholars, and copied texts. Remove one support and show how the institution compensates, strains, or fractures.",
          },
          {
            term: "Let geography and infrastructure shape options",
            text: "Military, economic, and diplomatic choices follow roads, rivers, passes, harbours, and the maintenance they require. A walled plain can field large levies but must feed them; a scattered archipelago can raid and trade but struggles to concentrate force.",
          },
          {
            term: "Use history to explain present shape",
            text: "A past siege, famine, migration, or reform explains why a current priority exists. A society that endured a century of seasonal flooding will invest in dykes, storehouses, and collective labour even when newcomers see little point, and it will resent proposals to dismantle them.",
          },
          {
            term: "Make weaknesses actionable",
            text: "A weakness worth noting is one the party can engage with: a grain dependency they can secure or disrupt, a succession rule they can invoke, a road they can cut or repair, or a knowledge monopoly they can steal or protect. If the weakness cannot reach play, replace it with one that can.",
          },
        ],
      },
      {
        kind: "table",
        heading:
          "Eight areas where civilisations differ, with typical causes and vulnerabilities",
        headers: [
          "Area",
          "Strength looks like",
          "Common cause",
          "Built-in vulnerability",
        ],
        rows: [
          [
            "Military",
            "Disciplined levies, veteran officers, or mass mobilisation",
            "Long frontier, past invasion, standing drill institutions",
            "Costly to feed and pay; exposed when cut off from muster or supply",
          ],
          [
            "Logistics",
            "Reliable supply over distance or difficult terrain",
            "River network, maintained roads, caravan houses",
            "Depends on intact routes, way stations, and seasonal passage",
          ],
          [
            "Economy",
            "Surplus production, credit, and market reach",
            "Controllable staple, craft specialisation, mint or guild charter",
            "Sensitive to blocked routes, lost harvests, or broken trust in coin",
          ],
          [
            "Infrastructure",
            "Roads, bridges, harbours, walls, and waterworks that endure",
            "Centralised labour, stone or timber surplus, engineering tradition",
            "Expensive to maintain; decay is visible when revenue or labour falls",
          ],
          [
            "Diplomacy",
            "Treaties, marriages, and mediation across neighbours",
            "Trading position, shared language or faith, neutral ground",
            "Relies on envoys, safe passage, and a reputation for keeping bargains",
          ],
          [
            "Administration",
            "Census, law, and coordinated response across provinces",
            "Literate clerks, archives, and regular courier circuits",
            "Vulnerable to lost records, corruption, or severed communication",
          ],
          [
            "Knowledge",
            "Preserved technique, libraries, workshops, or magical praxis",
            "Patronage, stable schools, copied texts or lineages",
            "Concentrated in few places or people; fragile to fire, flight, or schism",
          ],
          [
            "Cohesion",
            "Shared identity that holds through hardship or distance",
            "Common ritual, hardship survived together, inclusive assembly",
            "Frays under favoured treatment, broken promises, or prolonged strain",
          ],
        ],
      },
      {
        kind: "example",
        heading: "Worked example: the same coast, two different civilisations",
        paragraphs: [
          "Two neighbouring polities share a coastline, but their histories and institutions give them different strengths in the same environment. The contrast shows how cause shapes capability, and why each strength carries a matching exposure the party can encounter.",
        ],
        items: [
          {
            term: "The Harbour League, a maritime trading confederation",
            text: "Cause: a string of river mouths and island harbours with little arable land, so survival depended on moving goods for others. Capability: a large merchant fleet, practiced negotiators, and harbour law recognised along the coast. Vulnerability: everything depends on open sea lanes, allied ports, and credit among league houses. Visible consequence: coastal cities with foreign enclaves, imported timber and grain in the markets, naval politics over convoy rights, and a council that can be paralysed when two member harbours disagree.",
          },
          {
            term: "The Stone Court, a valley kingdom behind the coastal range",
            text: "Cause: a fertile basin ringed by mountains with a single fortified pass, settled after a long war that forced villages to store and share grain. Capability: strong administration, maintained roads and granaries, and levies that can be fed from stores. Vulnerability: centralised records and roads must be maintained, and the pass is a single point of failure for both food and orders. Visible consequence: terraced fields, walled store towns, way stations with archived tallies, and a capital where clerks can tell you how much grain each village holds, until the pass closes and the same system turns into queues, ration tokens, and delayed couriers.",
          },
          {
            term: "Why the comparison works",
            text: "Neither polity is simply better. The League can out-negotiate and out-ship the Court in a calm season, but a blockade or a storm season reverses the balance. The Court can feed and move troops across its basin longer than the League, but a cut road or a burned archive stalls it. Players can see the trade in markets, harbours, granaries, and council halls, and they can choose to protect a convoy, negotiate harbour access, guard a pass, or carry the census on horseback when couriers fail.",
          },
        ],
      },
      {
        kind: "example",
        heading:
          "Worked example: capacity versus reputation, and a college that looks stronger than it is",
        paragraphs: [
          "Reputation often claims more than capacity can deliver. This example shows how to separate the two and create a playable tension between what a civilisation is famed for and what it can currently do.",
        ],
        items: [
          {
            term: "The common error",
            text: "Notes describe the Sapphire Academy as the greatest centre of knowledge on the continent, with wizards and scribes who know every answer. In play the party is simply told the Academy is brilliant, so no challenge to that brilliance feels fair and no failure feels plausible.",
          },
          {
            term: "The revised version",
            text: "Cause: three generations of stable patronage from the river cities, plus a scriptorium that copied texts after a fire destroyed the old palace library. Capability: an extensive archive, trained copyists, and workshop lineages that can reproduce complex work reliably. Vulnerability: knowledge is concentrated in one hilltop complex, its income depends on a handful of patron houses, and its authority rests on the claim that its copies are complete. Half the catalogue was never recopied after the fire. Visible consequence: scholars who can answer precisely from the archive and hesitate badly off catalogue, patrons who expect answers their donations did not fund, and rival teachers in the port towns who kept the uncoppied traditions alive.",
          },
          {
            term: "Why it works",
            text: "The Academy is genuinely strong where its cause prepared it, and visibly thin elsewhere. The party can seek a text that was never copied, negotiate between the hilltop and the port teachers, or choose whether to expose the gap and risk patronage falling away. Reputation becomes a diplomatic fact to manage, not a passive superlative.",
          },
        ],
      },
      {
        kind: "list",
        heading:
          "Optional method: sketch with eight civilisation stats, then explain why",
        intro:
          "When you need a quick start or want civilisations that do not all lean the same way, use these eight stats as a generation aid. Treat them as prompts to explain, not as fixed bonuses handed to ancestry:",
        items: [
          {
            term: "Military, Logistics, Economy, Infrastructure",
            text: "The material and organisational base: how it fights, moves, produces, and builds things that last.",
          },
          {
            term: "Diplomacy, Administration, Knowledge, Cohesion",
            text: "The social and institutional base: how it negotiates, governs, remembers, and holds together under strain.",
          },
          {
            term: "How to use the numbers",
            text: "Roll 1d6 or draw from a small spread for each stat, assigning 1 to 2 as notably weak, 3 to 4 as ordinary, and 5 to 6 as notably strong. For a quicker pass, assign one strong area, one weak area, and leave the rest ordinary. Then, for each notable high or low, write one sentence of cause, one of vulnerability, and one visible consequence, as in the four-link model.",
          },
          {
            term: "Why this framing matters",
            text: "Randomisation only establishes the starting profile. The explanation that follows is the actual design: a high Diplomacy score might mean a dispersed trading diaspora, a shared faith that sanctions oaths, or a deliberate policy of marriage alliances after a costly war. A low Infrastructure score might mean a deliberate choice to remain mobile, a recent loss of quarries, or a habit of spending surplus on patronage rather than roads. Two civilisations with the same numbers should still feel different because their causes and vulnerabilities differ.",
          },
          {
            term: "Keep it situational",
            text: "If a stat suggests superiority, narrow it: strong Logistics along rivers, weak Administration in the high valleys where couriers rarely go; strong Knowledge in one preserved tradition, weak in another the Academy chose not to fund. Note one condition where the strength excels and one where it falters, so play can test both.",
          },
        ],
        outro:
          "This method is most useful for a future civilisation or economy generator: generate a profile, then generate the causes, dependencies, and visible signs that let a GM run the result without falling back on broad assertions about peoples.",
      },
      {
        kind: "checklist",
        heading: "Before these civilisations reach the table",
        intro:
          "For each major civilisation the party may deal with, confirm you can answer:",
        items: [
          "Which two or three strengths matter most in the next few sessions, and what circumstance explains each one?",
          "What does each strength depend on, and what single disruption would stress that dependency?",
          "Where does each strength apply well, and where is it ordinary or weak?",
          "Is any strength merely a reputation rather than a tested capacity, and who benefits from that confusion?",
          "What will the players see, hear, or pay differently when the dependency holds versus when it fails?",
          "Which roads, rivers, passes, harbours, archives, or granaries must be maintained for the strength to persist?",
          "What historical event made this priority feel necessary to the people living under it?",
          "Which weakness offers the party a clear, actionable choice: to secure, exploit, repair, or renegotiate?",
        ],
      },
    ],
    codexConnection: {
      heading: "Hold civilisations, places, and pressures in one view",
      paragraphs: [
        "A civilisation defined by its causes and dependencies touches several parts of your campaign at once: settlements that depend on the same route, factions that enforce or contest the arrangement, and NPCs whose livelihoods reflect the trade. Keeping those links in one place makes it easier to show a strength failing or holding without rewriting scattered notes.",
        "Codex Cryptica treats civilisations, settlements, factions, and characters as connected entities, so a blocked pass, a lost harbour, or a burned archive can propagate to the places and people the party already knows. Generators for kingdoms, nations, settlements, and factions give you starting material for the parts; the connections between them, and the vulnerabilities you choose, remain decisions for the GM.",
      ],
      linkText: "Try the kingdom generator",
      href: "/generators/kingdom",
    },
    relatedTools: [
      {
        title: "Kingdom generator",
        description:
          "Sketch a polity with a basis for its power, resources, and current tensions.",
        href: "/generators/kingdom",
      },
      {
        title: "Nation generator",
        description:
          "Draft a larger polity with institutions, dependencies, and points of strain.",
        href: "/generators/nation",
      },
      {
        title: "Settlement generator",
        description:
          "Create towns and cities where a civilisation's strengths and failures become visible in streets, markets, and storehouses.",
        href: "/generators/settlement",
      },
      {
        title: "Faction generator",
        description:
          "Build the guilds, houses, or administrations that maintain routes, records, and alliances.",
        href: "/generators/faction",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Keep civilisations, settlements, factions, and consequences connected across a campaign.",
        href: "/for/fantasy-worldbuilding",
      },
      {
        title: "TTRPG Economy & Trade",
        description:
          "Build believable trade, scarcity, and economic pressures that shape how civilisations rise, strain, and bargain.",
        href: "/for/economy-trade",
      },
    ],
    relatedAnswers: [
      "how-do-i-build-a-believable-economy-for-a-fantasy-world",
      "how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world",
      "how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world",
      "how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
      "how-do-you-create-a-fantasy-faction",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "how-do-i-build-a-believable-constitutional-crisis-or-coup",
      "what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
    ],
    labels: ["fantasy"],
    discovery: {
      id: "answer-civilisation-strengths-weaknesses",
      parentCluster: "worldbuilding",
      clusters: ["worldbuilding"],
      primaryIntent:
        "how to give civilisations distinct strengths and weaknesses",
      intentAliases: [
        "how to make civilisations feel different without stereotypes",
        "civilisation strengths and weaknesses worldbuilding",
        "how to design nations with trade-offs for rpg",
      ],
      uniqueValue:
        "A causal framework (cause, capability, vulnerability, visible consequence) that derives civilisation strengths from geography, institutions, and history with paired failure modes, plus an optional eight-stat generation method and settlement-scale examples.",
      userJob: "create",
      relatedIntents: [
        "answer-believable-fantasy-economy",
        "answer-trade-routes-shape-cities-kingdoms",
        "answer-scarcity-shortages-prices-conflict",
        "answer-economic-pressures-into-hooks",
        "answer-create-fantasy-faction",
        "answer-living-fantasy-city",
        "answer-settlement-produces-imports-exports",
        "generator-kingdom",
        "generator-nation",
        "generator-settlement",
        "generator-faction",
        "for-fantasy-worldbuilding",
        "for-economy-trade",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-believable-fantasy-economy",
          reason:
            "The economy answer builds a six-link model for regional production, exchange, control, and pressure; this answer builds a four-link model for civilisation-level strengths and vulnerabilities across military, logistics, economy, infrastructure, diplomacy, administration, knowledge, and cohesion.",
        },
        {
          with: "answer-trade-routes-shape-cities-kingdoms",
          reason:
            "The trade-routes answer focuses on where goods must pass, who collects there, and how rival paths reshape settlements; this answer treats trade as one of several civilisation capabilities, each paired with a dependency and a failure mode.",
        },
      ],
    },
    seo: {
      title: "How Do I Give Civilisations Distinct Strengths? | Codex Cryptica",
      description:
        "Give civilisations distinct strengths and weaknesses from geography, institutions, and history, with a cause to consequence model and paired vulnerabilities.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses.jpg",
      imageAlt:
        "A coastal harbour city and a mountain valley kingdom linked by a fortified pass, with ships, terraced fields, and storehouses",
    },
  };

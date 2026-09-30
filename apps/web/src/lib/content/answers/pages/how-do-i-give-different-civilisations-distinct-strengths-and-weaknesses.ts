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
      "Give each polity, region, institution, or network distinct capabilities by tracing why they developed, what they depend on, and what the players can see when conditions change. A maritime trading confederation may coordinate convoys and negotiate port access because its merchant houses need open sea lanes; a blockade or storm season strains those arrangements. Give each capability a scope, conditions, and dependencies so plausible failure modes emerge without requiring every strength to have an equal weakness. Describe what institutions and networks can do, not what ‘the people’ are inherently like.",
    sections: [
      {
        kind: "prose",
        heading: "Why fixed bonuses flatten civilisations",
        paragraphs: [
          "The usual shortcut is to assign each people a permanent bonus: one civilisation always builds the best roads, another always fields the finest soldiers, a third always excels at magic. The table learns that choice on day one and never needs to reconsider it, because nothing about the world explains why the bonus exists or when it stops working.",
          "That approach also slides easily into essentialism, where ability is treated as a trait of ancestry rather than circumstance. It replaces history, geography, and institutions with a label, and it leaves the GM with few handles when the story needs to stress a strength or show a weakness in play.",
          "A more durable alternative is to describe what a specific polity, institution, region, or network has built and can maintain. The framework can cover a state, federation, empire, cultural sphere, or diaspora, but a capability belongs to the organisation or historical system being modelled—not to every person associated with it. Describe what institutions and networks can do, not what ‘the people’ are inherently like.",
          "Treat each profile as a snapshot in time. Capabilities can be reformed, copied, displaced, restored, or made obsolete; the same institution may work well in one province and barely reach another. A strength can have dependencies and maintenance costs without needing a neatly matched weakness, and vulnerabilities can also come from separate historical choices.",
        ],
      },
      {
        kind: "list",
        heading:
          "The four-link model: cause, capability, vulnerability, visible consequence",
        intro:
          "Use this chain for each major capability so it remains explainable, situational, and playable. Name the organisation or system, its scope, and the conditions where it works. One sentence per link is enough to start:",
        items: [
          {
            term: "Cause",
            text: "The circumstance or deliberate choice that explains why the capability developed: geography, resources, climate, a founding crisis, a lasting institution, or adaptation. Rulers may copy a rival fleet, guilds import expertise, reforms follow defeat, migrants bring techniques, a religious movement reorganises welfare, or new technology makes an old institution viable. People choose, borrow, adapt, and contest as well as respond to their surroundings.",
          },
          {
            term: "Capability",
            text: "What the organisation or network can reliably do because of that cause: move goods quickly along a river, defend a pass, administer a census near the capital, negotiate trade treaties, or preserve a particular magical tradition. Never write ‘strong Military’, ‘strong Diplomacy’, or ‘strong Knowledge’ alone; say what kind of capability, where it works, and under what conditions.",
          },
          {
            term: "Vulnerability",
            text: "What the capability depends on and what may fail when that dependency is stressed. A strong fleet depends on open sea lanes and allied harbours; a centralised bureaucracy depends on records, roads, and literate clerks; a mercantile economy depends on credit and safe passage. Name conditions, maintenance costs, and dependencies; plausible failure modes follow when they are strained. Capabilities may reinforce one another, while vulnerabilities may arise from unrelated choices.",
          },
          {
            term: "Visible consequence",
            text: "What the players can observe without being told the model: coastal cities with foreign quarters, toll stations on the only pass, terraced hillsides that feed the capital, or a college that houses its archives against fire and theft. Show internal disagreement too: merchants demand convoy spending, frontier nobles resent road taxes, provinces resist census reforms, or reformers argue that an old strength has become a liability. If the link has no sign at the table, it does not exist for the players.",
          },
        ],
        outro:
          "Write the whole link as a single sentence when you can: trade houses copied a rival's convoy system and adapted it to the island ports, giving the Harbour League reliable river and coastal supply in fair seasons; it depends on maintained beacons and disputed harbour dues, so players see both the convoys and the council arguments over who pays when storms close the route.",
      },
      {
        kind: "list",
        heading: "Seven habits that keep strengths honest",
        intro:
          "Apply these as checks after you draft a civilisation's strengths, so the differences remain situational rather than absolute:",
        items: [
          {
            term: "Derive from circumstances, not ancestry",
            text: "Explain how an organisation developed a capability through its circumstances and choices. A highland confederation may coordinate grain stores because villages built mutual-aid agreements through hard winters; that is an institutional practice, not an inherent trait of its people.",
          },
          {
            term: "Distinguish capacity from reputation",
            text: "A civilisation may be famous for its legions while its actual advantage lies in logistics and roads that let those legions arrive fed. Let reputation lag behind reality, be contested, or be outright wrong; mistaken reputation is itself a source of diplomatic friction.",
          },
          {
            term: "Make strengths situational",
            text: "No strength should win everywhere. A river-borne supply system excels in the lowlands and stumbles in arid hill country; a council-based diplomacy works among peers but slows crisis decisions. Name the terrain, season, or political context where it applies and where it thins. Ask: where inside this polity is the strength strongest, weakest, or contested? Roads may be excellent near the capital and absent at the frontier; wealthy merchant houses may coexist with weak royal finances.",
          },
          {
            term: "Pair strong institutions with dependencies",
            text: "A capable administration needs archives, trained clerks, and regular communication; a renowned college needs patronage, safe travel for scholars, and copied texts. Administration is capacity: the ability to keep records and coordinate action. Legitimacy is whether people accept the authority giving those orders. Either may be strong without the other, and local institutions may remain trusted where central reach is weak.",
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
            term: "Make dependencies actionable",
            text: "A dependency is useful when the party can engage with it: negotiate around it, compensate for it, reform it, expose it, support it, exploit or defend it, reroute it, mediate over it, or replace it. They might secure a grain route, invoke a succession rule, repair a road, or help preserve knowledge outside a monopoly. The goal is playable consequence, not simply finding a weak point.",
          },
          {
            term: "Treat coordination as a question, not a verdict",
            text: "If you track social coordination or political cohesion, ask what lets different groups coordinate under strain and what makes that coordination fail. It may come from shared identity, local reciprocity, legitimacy, patronage, coercion, ritual, external threat, or federal compromise. Cultural homogeneity is not the measure of resilience; pluralism may be productive.",
          },
        ],
      },
      {
        kind: "table",
        heading:
          "Eight areas where civilisations differ, with typical causes and vulnerabilities",
        headers: [
          "Capability",
          "Strength looks like",
          "Common cause",
          "Built-in vulnerability",
        ],
        rows: [
          [
            "Military",
            "Fortress defence, cavalry warfare, naval power, mobilisation, siegecraft, or expeditionary warfare",
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
            "Trade treaties, marriage alliances, mediation, imperial coercion, or religious networks",
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
            "Medicine, astronomy, metallurgy, magic, navigation, or archival preservation",
            "Patronage, stable schools, copied texts or lineages",
            "Concentrated in few places or people; fragile to fire, flight, or schism",
          ],
          [
            "Social coordination / political cohesion",
            "Groups coordinate through legitimacy, reciprocity, patronage, ritual, coercion, or compromise",
            "Shared institutions, federal agreements, local networks, or a deliberate response to crisis",
            "Coordination falters when promises, resources, or accepted procedures fail; pluralism is not itself a weakness",
          ],
        ],
      },
      {
        kind: "example",
        heading: "Worked example: the same coast, two different civilisations",
        paragraphs: [
          "Two neighbouring polities share a coastline, but their histories and institutions give them different capabilities in the same environment. Their reach varies within their borders, and neither advantage needs an equal matching weakness.",
        ],
        items: [
          {
            term: "The Harbour League, a maritime trading confederation",
            text: "Cause: a string of river mouths and island harbours with little arable land, followed by guilds borrowing convoy practices from a rival and adapting them to local ports. Capability: a large merchant fleet and harbour law recognised along the coast, strongest on the river mouths and weaker on the outer islands. Dependencies: open sea lanes, allied ports, and credit among league houses. Visible consequence: foreign enclaves and imported grain, alongside arguments over convoy spending and a council that can stall when member harbours disagree.",
          },
          {
            term: "The Stone Court, a valley kingdom behind the coastal range",
            text: "Cause: a fertile basin ringed by mountains with a single fortified pass, where reforms after a long war organised village grain stores. Capability: maintained roads, granaries, and records support administration around the basin; royal officials have less reach in the highlands. Legitimacy varies too: local stores may be trusted even when the crown is not. Dependencies: records, roads, and the pass. Visible consequence: terraced fields and archived tallies, frontier nobles resisting road taxes, and queues and delayed couriers when the pass closes.",
          },
          {
            term: "Why the comparison works",
            text: "Neither polity is simply better. The League can out-negotiate and out-ship the Court in a calm season, while the Court can feed troops across its basin. Both capabilities have a scope and a current condition, and people inside each polity disagree about their costs. Players can protect a convoy, negotiate harbour access, guard a pass, or carry the census on horseback when couriers fail.",
          },
        ],
      },
      {
        kind: "example",
        heading:
          "Worked example: capacity versus reputation, and a college that looks stronger than it is",
        paragraphs: [
          "Reputation often claims more than capacity can deliver. This example shows how to separate the two and create a playable tension between what an institution is famed for and what it can currently do.",
        ],
        items: [
          {
            term: "The common error",
            text: "Notes describe the Sapphire Academy as the greatest centre of knowledge on the continent, with wizards and scribes who know every answer. In play the party is simply told the Academy is brilliant, so no challenge to that brilliance feels fair and no failure feels plausible.",
          },
          {
            term: "The revised version",
            text: "Cause: three generations of stable patronage from the river cities, plus a scriptorium that copied texts after a fire destroyed the old palace library. Capability: an extensive archive, trained copyists, and workshop lineages that can reproduce complex work reliably. Vulnerability: knowledge is concentrated in one hilltop complex, its income depends on a handful of patron houses, and its authority rests on the claim that its copies are complete. Half the archive's holdings were never recopied after the fire. Visible consequence: scholars who can answer precisely from the archive and hesitate when asked about knowledge beyond it, patrons who expect answers their donations did not fund, and rival teachers in the port towns who kept the uncopied traditions alive.",
          },
          {
            term: "Why it works",
            text: "The Academy is genuinely strong where its cause prepared it, and visibly thin elsewhere; its archive is currently strained by lost patronage. The party can seek a text that was never copied, negotiate between the hilltop and the port teachers, or support the uncopied traditions. Scholars and patrons disagree about whether preserving the old reputation or reforming the curriculum should come first. Reputation becomes a diplomatic fact to manage, not a passive superlative.",
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
            term: "Diplomacy, Administration, Knowledge, Social coordination",
            text: "The social and institutional base: how it negotiates, governs, remembers, and coordinates across groups under strain.",
          },
          {
            term: "How to use the numbers",
            text: "Treat each number as current relative capacity in your campaign context, not a global rating of a whole civilisation. Roll 1d6 or draw from a small spread for each stat, assigning 1 to 2 as notably weak, 3 to 4 as ordinary, and 5 to 6 as notably strong. For each notable result, add its scope and conditions, one place or institution where it is strongest, one where it weakens, and its trajectory if relevant: rising, stable, strained, or declining. Then note its cause, dependencies, and visible consequences.",
          },
          {
            term: "Why this framing matters",
            text: "Randomisation only establishes the starting profile. The explanation that follows is the actual design: a high Diplomacy score might mean a dispersed trading diaspora, a shared faith that sanctions oaths, or a deliberate policy of marriage alliances after a costly war. A low Infrastructure score might mean a deliberate choice to remain mobile, a recent loss of quarries, or a habit of spending surplus on patronage rather than roads. Two civilisations with the same numbers should still feel different because their causes and vulnerabilities differ.",
          },
          {
            term: "Keep it situational",
            text: "If a stat suggests superiority, narrow it: Logistics 5 might mean excellent river supply inside the basin, ordinary elsewhere, and currently strained because two bridges are out. Note its scope and conditions, where it is strongest and weakest, and whether it is rising, stable, strained, or declining. A single number never describes capacity everywhere.",
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
          "Where inside this polity or network is the capability strongest, weakest, or contested?",
          "Is the capability rising, stable, strained, or declining in the present campaign?",
          "Who inside it disagrees about the capability, its costs, or whether it should change?",
          "What can players negotiate around, compensate for, reform, expose, support, exploit, defend, reroute, mediate, or replace?",
        ],
      },
      {
        kind: "prose",
        heading: "A compact capability profile",
        paragraphs: [
          "Use this short template for a polity, region, institution, or network. Fill only the fields that help you run it:",
          "**Capability:**  \n**Scope / where it works:**  \n**Cause:**  \n**Institutions / people maintaining it:**  \n**Dependencies:**  \n**Current state:** rising / stable / strained / declining  \n**Failure modes:**  \n**Internal disagreement:**  \n**Visible signs:**  \n**What players can affect:**",
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
      "how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
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
        "answer-economic-pressures-adventure-hooks",
        "answer-fantasy-faction",
        "answer-living-fantasy-city",
        "answer-settlement-production-imports-exports",
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
            "The economy answer builds a six-link model for regional production, exchange, control, and pressure; this answer builds a four-link model for capabilities and dependencies across military, logistics, economy, infrastructure, diplomacy, administration, knowledge, and social coordination.",
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
        "Describe polity and institutional capabilities through their causes, scope, dependencies, current conditions, and visible consequences.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses.jpg",
      imageAlt:
        "A coastal harbour city and a mountain valley kingdom linked by a fortified pass, with ships, terraced fields, and storehouses",
    },
  };

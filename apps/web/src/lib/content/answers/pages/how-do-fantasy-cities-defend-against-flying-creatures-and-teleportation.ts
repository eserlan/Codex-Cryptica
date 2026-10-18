import type { AnswerConfigInput } from "../schema";

export const howDoFantasyCitiesDefendAgainstFlyingCreaturesAndTeleportation: AnswerConfigInput =
  {
    slug: "how-do-fantasy-cities-defend-against-flying-creatures-and-teleportation",
    category: "worldbuilding",
    labels: ["fantasy"],
    publishedAt: "2026-09-30",
    question:
      "How do fantasy cities defend against flying creatures and teleportation?",
    kind: "framework",
    shortAnswer:
      "Fantasy cities keep their walls because walls still control ordinary movement, trade, taxation, and conventional siege, then add layered defences for the new vectors. Define how common, fast, heavy, and vulnerable your fliers and teleporters are, harden critical infrastructure such as granaries, wells, armouries, and command posts rather than every roof, and treat teleportation as access control through wards, registered arrival points, and compartmented layouts that carry clear costs and trade-offs.",
    sections: [
      {
        kind: "prose",
        heading: "Walls still matter, but they are no longer sufficient",
        paragraphs: [
          "The easy answer to flying mounts and teleportation is to declare walls obsolete and rebuild every city as a sealed bunker. That wastes the parts of a wall that still work and skips the more useful design question. Walls, gates, ditches, and towers continue to control foot and wagon traffic, channel movement, delay conventional armies, defend against siege engines, regulate trade and taxation, and create defensible zones against threats that cannot fly or teleport. Most raids, monster incursions, and ordinary warfare still move on the ground.",
          "New capabilities rarely make every old defence obsolete. They change what needs to be layered on top. A useful rule for these cities is to ask, for every capability that bypasses an old defence, what new defence becomes economically worthwhile. Design for the threats that are common and costly, not for every magical possibility at maximum strength, and make each added layer visible at the table.",
        ],
      },
      {
        kind: "list",
        heading: "Define the threat before you redesign the city",
        intro:
          "Architecture should follow the actual constraints of flight and teleportation in your setting, not a vague idea that attackers can appear anywhere from any height. Answer these first:",
        items: [
          {
            term: "Flying attackers —",
            text: "How common are flying mounts, and who can afford them? How high and fast do they fly, and how much weight can they carry? Can they hover, and how long can they stay aloft? How vulnerable are they to missiles, weather, and fatigue? Can they land in a narrow street, or do they need a clear courtyard or rooftop?",
          },
          {
            term: "Teleportation —",
            text: "Does it need line of sight? Must the caster know the destination? Are there fixed circles or beacons? What are the range and group size limits? Can wards block it? Is it rare elite magic or common battlefield mobility? The rarer and more constrained it is, the fewer places need hardening.",
          },
          {
            term: "Prevalence and cost —",
            text: "How often do these capabilities appear in hostile hands, and what do they cost to field? A force that can carry a dozen troops into the city on griffins every night calls for different investment than a single archmage who can blink once before needing a week to recover.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Keep conventional defences where they still matter",
        intro:
          "Treat the old wall as one layer in a layered system, not as a failed idea to discard:",
        items: [
          {
            term: "Control ordinary movement",
            text: "Gates, roads, bridges, and harbour chains still decide where carts, herds, and foot patrols can go. They set taxation points, customs checks, and curfews that flying troops do not replace.",
          },
          {
            term: "Delay and channel",
            text: "A wall buys time. Even when a few attackers can fly over it, the bulk of an army, its supply train, and its engines cannot. Use the wall to force those elements through chokepoints where defenders can concentrate.",
          },
          {
            term: "Create defensible zones",
            text: "Walls divide a city into districts that can be held separately. If fliers seize a market square, a walled inner ward still gives defenders a place to rally, store reserves, and protect civilians.",
          },
          {
            term: "Protect against the frequent threat",
            text: "Most settlements face bandits, beasts, and rival levies far more often than dragons. Spending every coin to stop teleportation while leaving the granary gate unguarded misreads the actual risk.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Defend the third dimension",
        intro:
          "When attack can come from above, the city needs responses aimed upward as well as outward. Prioritise critical infrastructure; ordinary homes get cheaper passive measures:",
        items: [
          {
            term: "Limit landing zones",
            text: "Narrow streets, overhangs, covered or partially roofed courtyards, and irregular rooflines reduce where a mount can set down. Keep plazas small and broken by colonnades or market frames rather than leaving one vast open landing field.",
          },
          {
            term: "Reach upward",
            text: "Design towers for upward fire, add rooftop patrols and ballista or scorpion platforms, and site bow galleries to cover sky approaches. Nets, chains, cables, or light mesh across key courtyards can foul wings and dropped loads without sealing the whole city.",
          },
          {
            term: "Harden what burns and breaks",
            text: "Use fire-resistant roofing, protected skylights and roof hatches, and shutters that can be barred from inside. Store water near likely drop points so small fires can be handled before they spread.",
          },
          {
            term: "Field an aerial response",
            text: "A small interceptor unit, whether griffin riders, trained hippogriffs, or a mage flight, is more practical than trying to make every roof a fortress. Give it a launch point, a weather limit, and a standing order that players can see in play.",
          },
          {
            term: "Harden critical spaces underground",
            text: "Recessed or subterranean command rooms, wells, granaries, and armouries survive bombardment, but they create ventilation, flooding, and entrapment risks. Use them for a few critical nodes, not the entire city.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Treat teleportation as an access control problem",
        intro:
          "Teleportation changes who can enter a room without using a door. Counters work best when they govern arrival rather than pretending every wall is a teleport ward:",
        items: [
          {
            term: "Ward selectively",
            text: "Anti-teleport wards, sigils, or consecrated thresholds are likely expensive to create and maintain. Place them around inner citadels, vaults, council chambers, and armouries rather than across every house.",
          },
          {
            term: "Designate arrival points",
            text: "Require sanctioned teleport circles or arrival halls with guards, logs, and detection charms. Visitors arrive where they can be seen, questioned, and taxed, much as ships use a harbour rather than beaching anywhere.",
          },
          {
            term: "Compartment and obscure",
            text: "Use compartmented buildings, separate stair cores, locked inner courts, and false or decoy spaces so knowledge of a layout is itself a security asset. A teleporter who has never seen the vault gains less from a blind jump.",
          },
          {
            term: "Guard likely arrivals and add legal weight",
            text: "Post watch near warded thresholds, likely arrival points, and restricted rooms. Make unauthorised teleport into a dwelling or citadel a serious crime, with registration and licensing for mages who can carry passengers, so enforcement has a social handle as well as a magical one.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Protect critical infrastructure first",
        intro:
          "Magical defences cost coin, skilled warders, and upkeep. Spend where loss would be hardest to recover, and let the difference show in architecture:",
        items: [
          {
            term: "What to harden first",
            text: "Palace and council, command posts, armouries, granaries, wells and reservoirs, gates and gatehouses, temples or magical infrastructure, teleport hubs, barracks, ports, and communications. A dispersed set of smaller granaries survives a single hit better than one giant storehouse.",
          },
          {
            term: "What ordinary districts get",
            text: "Cheap passive measures: tiled rather than thatched roofs where affordable, shared cisterns, community shelters, and streets that double as firebreaks. The gap between warded wealthy quarters and exposed poorer quarters becomes a visible social fact the party can read at a glance.",
          },
          {
            term: "Show the trade",
            text: "Hardening centralises protection but complicates logistics. Dispersal improves resilience but needs more guards, warders, and coordination. Let the city live with the choice it made and the problems that choice creates.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Let defence reshape the city itself",
        intro:
          "Where aerial attacks are common, the city adapts its shape and routes to limit exposure and give defenders better cover:",
        items: [
          {
            term: "Use the terrain and shelter busy spaces",
            text: "Cliffside carving and terraced construction break up exposed approaches. Covered markets and arcaded courtyards keep daily life functioning under net or roof.",
          },
          {
            term: "Rethink circulation",
            text: "Fortified vertical circulation, protected rooftop routes, and multiple fallback defensive rings matter more than a single perfect outer wall. Restricted airspace, signal beacons, and upward-facing watch posts extend the old wall-walk into the sky.",
          },
          {
            term: "Avoid the fantasy bunker trap",
            text: "Derive each change from the threat you defined. A net over the armoury yard follows from griffin raids. Sealing every home with stone shutters follows from nothing in particular and makes the city feel arbitrary rather than adapted.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Let defence reshape culture and law",
        intro:
          "Defensive adaptation is social as well as architectural. Players meet the rules that grew around the walls:",
        items: [
          {
            term: "Airspace and mounts",
            text: "Flying mounts need licences, landing permits, and controlled fields. Festivals, markets, or holy days may temporarily close or regulate airspace, creating a calendar the party can plan around or chafe against.",
          },
          {
            term: "Rooftops and boundaries",
            text: "Roofs become semi-secure territory with their own watch, access rights, and disputes. Trespass from above carries distinct law, and architects, warders, and anti-air engineers become valued professions.",
          },
          {
            term: "Teleportation law",
            text: "Arrival without clearance into a home, workshop, or citadel is treated like breaking and entering. Wealthy districts buy stronger wards, and aerial or ward companies become prestigious military branches with their own rivalries and patrons.",
          },
        ],
      },
      {
        kind: "table",
        heading: "The arms race stays asymmetric",
        headers: [
          "Defence",
          "What it answers",
          "Limit or cost",
          "Table consequence",
        ],
        rows: [
          [
            "Wards on the inner citadel",
            "Blocks teleportation into command and vault areas",
            "Expensive, needs renewal, covers only a few rooms",
            "Infiltrators redirect to the unwarded archive or the arrival hall",
          ],
          [
            "Net and chain over the yard",
            "Fouls low passes and dropped incendiaries",
            "Snares defenders too if not cleared; wears in weather",
            "A night raid cuts the net, leaving a gap the watch must cover with patrols",
          ],
          [
            "Aerial interceptors",
            "Chase off scouts and harry bombers",
            "Few in number, grounded by storms, costly to keep",
            "The city has air cover for hours, not days, so timing matters",
          ],
          [
            "Dispersed granaries",
            "No single hit starves the city",
            "More guards, more coordination, slower distribution",
            "Supplies survive, but a false report can delay the ration convoy",
          ],
          [
            "Semi-sunken stores and wells",
            "Survives bombardment and fire",
            "Damp, ventilation, and flooding risks",
            "A heavy rain becomes a logistics problem players can help solve",
          ],
        ],
      },
      {
        kind: "example",
        heading: "Worked example: Karst Hold, a cliffside fortress-city",
        paragraphs: [
          "Karst Hold sits where a coastal cliff meets a fortified landward wall. Griffin-riding raiders harass it each storm season, and a college in the lower town teaches short-range teleportation to licensed couriers. The city does not try to seal every roof. It layers defences according to what is frequent, what is dangerous, and what it can afford to maintain.",
        ],
        items: [
          {
            term: "The weak approach",
            text: "The GM declares that walls are useless against flight and teleportation, so Karst Hold is described as a generic stone fortress with no special preparation. Players ask why raiders have not burned the open granary and why the archmage cannot simply appear in the treasury, and the answer is improvised each session. The city feels arbitrary, and every aerial or teleport encounter turns into an argument about what should have stopped it.",
          },
          {
            term: "The layered approach",
            text: "The wall still stands across the landward approach and controls the trade road, the gate levies, and the approach for engines. Three granaries are dispersed rather than one, and the central well and armoury are cut into the cliff with ventilated, drainable chambers. Chain and net cover the two muster yards, and four rooftop ballista platforms watch the sea wind. Teleportation is blocked inside the inner citadel but open through two registered arrival halls with warded thresholds and a logbook. The watch maintains both gate patrols and rooftop patrols, while wealthy merchants fund a private ward over a counting house that poorer streets cannot afford.",
          },
          {
            term: "Why it works",
            text: "Each layer follows from a defined threat. Griffin raiders can harass the exposed market but not land a troop on the netted yard without cutting through under fire, and a courier mage can arrive quickly yet only where the guard expects arrivals. Costs and gaps remain visible: the nets need repair after storms, the interceptor flight grounds in high wind, and the dispersed stores require convoys the party can escort, reroute, or use as cover. The city feels defended without feeling sealed.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Design checklist for your own city",
        intro:
          "Use this pass before you place a new wall, ward, or rooftop battery:",
        items: [
          "Write the limits for flight and teleportation in your setting, including frequency and who can afford each.",
          "Confirm what your existing walls, gates, and ditches still control even if some attackers bypass them.",
          "Name the five to seven critical sites you will harden first, and decide what ordinary districts get instead.",
          "Choose one or two third-dimension measures that follow from the threat, such as netted yards or upward-facing galleries, and place them where players will see them.",
          "Define how teleport access is governed, including arrival points, wards, detection, and the law that backs them.",
          "Note how the defences changed the plan of the city, including restricted airspace, covered routes, fallback rings, or cliff and underground stores.",
          "Add one cultural rule the party will meet in play, such as landing permits, rooftop jurisdiction, or registration of teleport mages.",
          "Give every defence a cost, limit, or upkeep need that can fail, create a choice, or become an adventure hook.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep a defended city playable at the table",
      paragraphs: [
        "A city that defends against flight and teleportation is easy to overdescribe and hard to run if every ward and rooftop lives only in notes. Keep defences as linked facts rather than a single long document: which sites are warded, which yards are netted, where interceptors launch, and which arrival halls are registered, with the cost and limit of each.",
        "Codex Cryptica holds those places, factions, and costs as connected entities, so when a storm tears a net or a ward lapses, you can see which district, patrol, or store is affected and what the party can do next.",
      ],
      linkText: "Try the settlement generator",
      href: "/generators/settlement",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Build fortress cities, cliffside holds, and walled towns with districts and defences.",
        href: "/generators/settlement",
      },
      {
        title: "Faction generator",
        description:
          "Create the watch, aerial companies, warder guilds, and mage circles that maintain the layered defences.",
        href: "/generators/faction",
      },
      {
        title: "Kingdom generator",
        description:
          "Sketch the wider polity that funds walls, warders, and interceptor units.",
        href: "/generators/kingdom",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for fantasy worldbuilding",
        description:
          "Connect settlements, factions, and costs while your world adapts to magic and flight.",
        href: "/for/fantasy-worldbuilding",
      },
    ],
    relatedAnswers: [
      "how-do-you-create-a-magic-system",
      "how-do-you-create-a-fantasy-city-that-feels-alive",
      "what-should-an-rpg-settlement-contain",
      "how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army",
      "how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
      "how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
      "how-do-you-create-a-fantasy-faction",
      "how-do-you-start-worldbuilding-from-scratch",
      "how-does-magic-affect-politics-and-government",
    ],
    discovery: {
      id: "answer-fantasy-city-defence-flight-teleportation",
      parentCluster: "worldbuilding",
      clusters: ["worldbuilding", "settlement-creation"],
      primaryIntent:
        "how do fantasy cities defend against flying creatures and teleportation",
      intentAliases: [
        "fantasy city defence against flying mounts",
        "how do fantasy walls work against teleportation",
        "defending a fantasy castle from dragons and teleport",
        "fantasy city aerial defence and anti teleport wards",
        "how to design fantasy fortifications for flying enemies",
      ],
      userJob: "understand",
      uniqueValue:
        "A layered framework for fantasy fortification when walls are bypassed from above or by magic, tying every defence to threat limits, infrastructure priorities, and trade-offs rather than sealed bunkers.",
      relatedIntents: [
        "answer-create-magic-system",
        "answer-living-fantasy-city",
        "answer-settlement-contents",
        "answer-large-battle-pcs-in-army",
        "answer-civilisation-strengths-weaknesses",
        "answer-cultures-without-stereotypes",
      ],
      acknowledgedOverlap: [
        {
          with: "resource-castle-floorplans",
          reason:
            "Both serve readers thinking about castles, but this answer explains how a city adapts to aerial and teleport threats while the resource page curates external floorplans and layout references.",
        },
      ],
    },
    seo: {
      title: "How Do Fantasy Cities Defend Against Flying and Teleportation?",
      description:
        "Walls still matter, but they are not enough. Define flight and teleport limits, layer aerial and ward defences, and prioritise critical infrastructure.",
      image:
        "https://assets.codexcryptica.com/og/how-do-fantasy-cities-defend-against-flying-creatures-and-teleportation.jpg",
      imageAlt:
        "Cliffside fortress city with walled lower town, netted courtyards, rooftop watch platforms, and terraced granaries cut into the rock",
    },
  };

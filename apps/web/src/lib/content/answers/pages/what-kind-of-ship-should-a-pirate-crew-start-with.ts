import type { AnswerConfigInput } from "../schema";

export const whatKindOfShipShouldAPirateCrewStartWith: AnswerConfigInput = {
  slug: "what-kind-of-ship-should-a-pirate-crew-start-with",
  category: "getting-started",
  publishedAt: "2026-09-10",
  question: "What kind of ship should a pirate crew start with?",
  kind: "framework",
  shortAnswer:
    "Start a pirate crew with a ship that can win a prize but cannot solve every problem: a fast sloop, modest schooner, or compromised brig gives the party a home, a reason to take jobs, and weaknesses that force choices. Give it one clear advantage, one serious flaw, a visible scar, and an owner or debt that can still make demands.",
  sections: [
    {
      kind: "prose",
      heading: "Choose the campaign before choosing the hull",
      paragraphs: [
        "There is no universally best starter ship for a pirate RPG. The right vessel is the one whose limits produce the sort of sessions you want. A sloop makes pursuit and escape matter. A merchant brig makes cargo, disguise, and prize-taking matter. A shallow-draft raider makes every reef, inlet, and tide line part of the plan.",
        "Give the party a ship that is good enough to pirate, but bad enough to generate stories. If it can outrun every patrol, carry every prize, defeat every rival, and ignore damage, the crew has little reason to bargain, repair, recruit, or risk a dangerous harbour. A starting vessel should make opportunities visible without making success automatic.",
      ],
    },
    {
      kind: "list",
      heading: "Six useful starter pirate ship archetypes",
      intro:
        "Pick the hull that puts the campaign's preferred kind of trouble on the water.",
      items: [
        {
          term: "Fast sloop",
          text: "Best for raids, pursuit, evasion, and a very small crew. It can choose its fights and slip through a blockade, but its light armament and limited hold make a defended target or a large prize a serious decision.",
        },
        {
          term: "Captured merchant brig",
          text: "Best for cargo, disguises, and awkward compromises. It has room for supplies and prisoners, and may pass as a trader at distance, but it sails like a merchant vessel and its former owners may recognise the hull or its papers.",
        },
        {
          term: "Battered privateer",
          text: "Best for a crew with a respectable past and an inconvenient present. Its old commission, officer's fittings, and naval contacts may open doors, while expired papers, worn guns, and political enemies keep the party from feeling safe.",
        },
        {
          term: "Shallow-draft raider",
          text: "Best for coastal ambushes, islands, marshes, and hidden coves. It can go where larger ships cannot, but open water, bad weather, and blue-water pursuits expose its limits quickly.",
        },
        {
          term: "Small schooner",
          text: "Best for a flexible, mobile party. It is quick, handles well, and needs fewer hands than a large square-rigger, but it cannot carry much cargo or stand in a prolonged broadside exchange.",
        },
        {
          term: "Stolen naval vessel",
          text: "Best for a campaign that starts under immediate pressure. It has better guns and discipline than most pirate craft, but every port authority, former shipmate, and naval patrol has a reason to identify, reclaim, or destroy it.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Build the specific ship with five details",
      intro:
        "Once you have an archetype, give the named vessel five facts that the table can use.",
      items: [
        {
          term: "One clear advantage",
          text: "State one thing the vessel does better than its rivals: speed before the wind, a deep hold, a dangerous shallow-water route, a convincing merchant profile, or unusually accurate guns. The crew should know what plans this strength supports.",
        },
        {
          term: "One major weakness",
          text: "Make one failure expensive enough to influence decisions: poor upwind sailing, rotten masts, too few guns, a leaking keel, or a hold too small for a valuable prize. A weakness is useful when it changes the route or job the crew accepts.",
        },
        {
          term: "One visible scar or quirk",
          text: "Give the ship a feature people notice: mismatched sails, a patched figurehead, a bell taken from a wreck, a deck that always smells of oranges, or a crew superstition about one sealed cabin. It gives strangers something to recognise and players something to claim.",
        },
        {
          term: "One claim on the ship",
          text: "Attach a former owner, unpaid lender, warrant, letter of marque, inheritance dispute, or crew member who has a better legal claim. This is a person or faction that can turn up with terms, leverage, or a bounty.",
        },
        {
          term: "One reason it cannot be replaced",
          text: "The crew may need its hidden route, unusual draft, family connection, surviving crew, or proof of ownership. Damage then becomes more than a bill, because abandoning the vessel costs the party a relationship or a future plan.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "How large should the ship and crew be?",
      paragraphs: [
        "For most RPG parties, a vessel that needs roughly eight to twenty NPC hands is enough. It feels like a working ship without creating a cast so large that the player characters become passengers in their own campaign. Give the crew named jobs, such as boatswain, cook, gunner, navigator, surgeon, or carpenter, then leave the remaining sailors as a background group until a scene needs them.",
        "A smaller ship makes every absence felt. If the carpenter is injured, the crew cannot simply repair battle damage. If half the hands go ashore, there may not be enough people left to sail away in a hurry. A much larger crew can work if the campaign is about command and divided loyalties, but it needs officers and rival groups to stop the ship becoming a crowd of interchangeable NPCs.",
        "Starting with a ship gives the first session a base, a crew, and a problem to manage. Making the party steal or win one first gives the campaign a clean opening objective. Choose the second approach when you want the crew's first shared achievement to be ownership; otherwise begin with a vessel that comes with a debt or claim rather than clean title.",
      ],
    },
    {
      kind: "prose",
      heading: "Let sailing limits shape the campaign",
      paragraphs: [
        "Speed decides whether the crew can catch a prize, flee a patrol, or choose the moment of contact. Draft decides which harbour, river mouth, reef passage, or island beach they can use. Cargo capacity decides whether a raid pays enough to matter. Armament decides whether a target is a prize, a threat, or a situation to avoid. Put those limits in front of the players before they choose a route.",
        "Repairs and upgrades make the ship a progression track. Replacing a mast, adding swivel guns, buying charts for a shoal route, repairing a leaky seam, or paying for a better surgeon can each follow a successful job. Let the party choose between an upgrade that improves the ship and an expense that protects a crew member or a port contact. Those choices make the vessel feel like their home and their reputation.",
      ],
    },
    {
      kind: "example",
      heading: "A starter sloop, before and after the five details",
      paragraphs: [
        "The party begins with a twelve-gun sloop called the Mercy's Wake. Compare a basic entry with a version that gives the vessel pressures the players can act on.",
      ],
      items: [
        {
          term: "Basic entry",
          text: "The Mercy's Wake is a fast pirate sloop with twelve guns and a crew of fifteen. It can raid merchant ships and escape patrols. This tells the table what the ship can do, but it provides no reason to remember it after the first fight.",
        },
        {
          term: "With the five details",
          text: "Its advantage is speed in narrow coastal water. Its weakness is a cracked foremast that may fail in a hard chase. Its scar is a patched white sail bearing the faint outline of a colonial crest. A former privateer captain holds the original letter of marque and claims the crew stole the ship. The party cannot replace it because only this shallow-draft sloop can reach the cove where their hidden stores and trusted harbour pilot wait.",
        },
        {
          term: "Why it works",
          text: "Every detail can produce a choice: risk the mast to take a rich prize, pay for timber instead of better guns, hide the sail in port, negotiate with the former captain, or defend the cove. The ship is now a source of scenes, not only transport between them.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "See a pirate crew under pressure",
      paragraphs: [
        "Letters of Marque, Expired shows a pirate crew with a ship, a legal problem, a rival vessel, a hidden anchorage, and a crew vote that can change the campaign's direction. It is a useful model for turning ownership trouble into a playable situation.",
      ],
      cta: {
        text: "Read the Letters of Marque, Expired example",
        href: "/examples/letters-of-marque-expired-pirate-adventure",
      },
    },
    {
      kind: "checklist",
      heading: "Before the first pirate session",
      items: [
        "Name the ship's one advantage and one weakness in plain language.",
        "Choose a crew size that leaves room for player characters to matter.",
        "Give the ship a visible scar, quirk, or feature that people in port can recognise.",
        "Write down who has a claim, debt, warrant, or grievance connected to the vessel.",
        "Decide whether the party begins with the ship, steals it, wins it, or takes it over from a missing captain.",
        "Prepare one repair and one upgrade the crew could pursue after their first profitable job.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the ship tied to the crew and coast",
    paragraphs: [
      "Use the Ship Generator to create the vessel, then save its captain, crew, debts, ports, rivals, and repair needs as connected campaign records. A relationship graph makes it easier to see what changes when the party takes a prize, loses a crew member, or angers a harbour authority, while the campaign timeline records repairs and upgrades across the voyage.",
    ],
    linkText: "Generate a pirate ship",
    href: "/generators/ship-generator",
  },
  relatedTools: [
    {
      title: "Pirate ship generator",
      description:
        "Create a pirate vessel with a captain, crew culture, shipboard tension, and secrets below deck.",
      href: "/generators/ship-generator",
    },
    {
      title: "Faction generator",
      description:
        "Create the former owner, port authority, rival crew, or lender with a claim on the ship.",
      href: "/generators/faction",
    },
    {
      title: "Settlement generator",
      description:
        "Build a free port, island harbour, or hidden cove that gives the crew somewhere to return to.",
      href: "/generators/settlement",
    },
  ],
  relatedForPages: [],
  relatedAnswers: ["what-kind-of-ship-should-a-sci-fi-rpg-party-start-with"],
  labels: ["pirate"],
  discovery: {
    id: "answer-starter-ship-pirate",
    parentCluster: "ship-creation",
    clusters: ["pirate"],
    primaryIntent: "what kind of ship should a pirate crew start with",
    intentAliases: [
      "best starter ship for a pirate rpg",
      "what type of ship is best for pirates",
      "should a pirate campaign start with a sloop or brig",
      "how big should a pirate crew ship be",
      "how many npc crew should a pirate rpg have",
      "should players start a pirate campaign with their own ship",
      "how do you make a pirate ship feel like a character",
    ],
    uniqueValue:
      "Six sailing-era pirate starter-ship archetypes tied to campaign play, plus a five-detail recipe that turns a vessel's speed, draft, crew, damage, ownership, and upgrades into recurring table decisions.",
    relatedIntents: [
      "answer-starter-ship-sci-fi",
      "generator-ship-generator",
      "generator-faction",
      "generator-settlement",
      "hub-pirate",
      "example-letters-of-marque-expired",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-starter-ship-sci-fi",
        reason:
          "Both pages help a party choose a starting vessel, but this page addresses sailing-era pirate hulls, crews, coastal sailing limits, and prize-taking, while the sci-fi page addresses starships and spacefaring campaign pressures.",
      },
    ],
  },
  seo: {
    title: "What Ship Should a Pirate Crew Start With? | Codex Cryptica",
    description:
      "Choose a starter pirate ship by campaign style, then give it weaknesses, crew pressures, a debt, and upgrades that create playable decisions.",
    image:
      "https://assets.codexcryptica.com/og/what-kind-of-ship-should-a-pirate-crew-start-with.jpg",
    imageAlt:
      "A weathered two-masted pirate schooner leaving a tropical cove at dawn while a naval cutter watches from the horizon",
  },
};

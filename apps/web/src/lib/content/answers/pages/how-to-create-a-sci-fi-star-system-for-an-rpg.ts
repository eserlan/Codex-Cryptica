import type { AnswerConfigInput } from "../schema";

export const howToCreateASciFiStarSystemForAnRpg: AnswerConfigInput = {
  slug: "how-to-create-a-sci-fi-star-system-for-an-rpg",
  category: "worldbuilding",
  publishedAt: "2026-09-08",
  question: "How do you create a sci-fi star system for an RPG?",
  kind: "framework",
  shortAnswer:
    "Create a sci-fi star system for an RPG by giving each major body a job in the local economy, then placing travel limits, competing factions, hazards, and a current dispute between those places. Start with three to five destinations the crew can reach, decide what moves between them, and make at least one route or resource worth fighting over. The system becomes playable when a journey changes who can act, what supplies cost, or which problem reaches the crew first.",
  sections: [
    {
      kind: "prose",
      heading: "Build a system around movement and pressure",
      paragraphs: [
        "A list of planets gives the crew names to visit, but it does not give them reasons to leave a dock. Start with traffic. Decide what people, fuel, food, data, labour, contraband, or military force travels through the system. Then decide who depends on that movement and who profits when it slows down. A mining moon matters because ore haulers must leave before their heat shielding fails, not because its terrain has three unusual colours.",
        "Keep the first version compact. Three to five destinations are enough for a campaign base: a settled world or station, a place that produces something valuable, a difficult frontier site, and perhaps a hidden or restricted location. Give each one a different answer to the question, 'Why would a crew go there this week?' This leaves room to add distant colonies once the players point their ship that way.",
      ],
    },
    {
      kind: "list",
      heading: "Use six system elements that create play",
      intro:
        "Sketch these elements on one page. Each should point towards a choice, a cost, or a person who needs something.",
      items: [
        {
          term: "Anchors",
          text: "Choose the bodies and installations that crews can name and reach: a trade station, refinery moon, garden world, gas giant skimming platform, wreck field, or listening post. Give every anchor a practical function before adding scenery.",
        },
        {
          term: "Routes and limits",
          text: "Mark the fast route, the cheap route, and the route that is currently unsafe. Transit time, fuel, heat, docking clearance, jump windows, and quarantine rules should make the crew choose rather than merely wait for a travel montage to end.",
        },
        {
          term: "Flow of value",
          text: "Name one resource or service moving between anchors. It can be ice, reactor parts, medical cultures, migrant labour, navigation data, or protection. When that flow is delayed, say who is paid, stranded, or exposed.",
        },
        {
          term: "Competing claimants",
          text: "Place at least two factions in the system with incompatible aims. A port authority wants inspection fees, independent haulers want an open lane, and a salvage union wants a wreck site left untouched until its own crews arrive.",
        },
        {
          term: "Hazard with consequences",
          text: "Use a hazard that changes plans: a radiation belt, debris field, solar flare season, sensor ghost, pirate ambush zone, or failing relay. Connect it to a route or resource so it creates decisions instead of background colour.",
        },
        {
          term: "Current flashpoint",
          text: "Set one problem in motion now. A convoy has vanished, a moon is about to lose life support, a tariff has doubled, or a restricted signal has appeared near a colony. Give each faction a different account of what happened.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: The Kestrel Reach",
      paragraphs: [
        "The Kestrel Reach uses the same number of locations in both versions. The second version gives the crew a reason to plot a course before the briefing is over.",
      ],
      items: [
        {
          term: "First pass",
          text: "Kestrel has a blue gas giant, a mining moon, an orbital station, and an abandoned research base. Pirates sometimes attack ships near the asteroid belt. The setting has places to describe, but no clear jobs, time pressure, or sides to choose between.",
        },
        {
          term: "Table-ready system",
          text: "Nacre Station refines coolant from the gas giant and sells it to the mining moon Dross, whose excavators expose a rare isotope used in jump coils. The only fast corridor crosses a debris belt controlled by the station's contracted security fleet. A solar flare has blinded the public relay for six hours, while a Dross ore tender disappears carrying enough isotope to keep the station operating through winter. The station director blames smugglers, the miners blame security, and a salvage cooperative says the tender answered a call from the abandoned research base. The crew can take a slow safe route, buy an illegal beacon code, investigate the base, or escort the next coolant run before Dross shuts down its extraction tunnels.",
        },
        {
          term: "Why it works",
          text: "The system's economy explains why the anchors need one another. The flare and debris belt make travel a decision. Each faction offers information and work, while the missing tender provides a problem that can lead the crew to every major location.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Prepare information the crew can act on",
      paragraphs: [
        "Give the players route knowledge in usable terms. They do not need orbital mechanics unless that is the game you are running. They need to know that the patrol lane is fast but requires a transponder, that the ice haulers leave at dawn, and that the old relay makes a rescue call look like a pirate trap. Let scouts, dockworkers, charts, and rival crews reveal different pieces of the system.",
        "Do not make every location equally dangerous or equally important. A reliable station gives the crew somewhere to return to, while a hazardous moon or restricted base gives them a reason to take risks. When the crew solves the flashpoint, change a route, price, faction relationship, or local rumour so the system records what they did.",
      ],
    },
    {
      kind: "checklist",
      heading: "Star system prep checklist",
      intro:
        "Before the first jump, make sure you can answer these questions at the table.",
      items: [
        "Can you name three to five destinations and explain what each contributes to the system?",
        "What valuable thing moves between two locations, and what happens if it stops moving?",
        "Which route is fastest, which is safest, and what does each choice cost the crew?",
        "Which two or three factions want incompatible outcomes from the current problem?",
        "What hazard can change a journey or force an unexpected stop?",
        "What event is happening now that gives the crew a job, a warning, or a rumour?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep a changing star system connected",
    paragraphs: [
      "Use the Star System Generator to draft the bodies, routes, hazards, and hooks, then keep the settled worlds, stations, factions, and active jobs as linked campaign entries. When a route closes or a crew backs one claimant, those links make it easier to find the next affected location and update the system after play.",
    ],
    linkText: "Try the Star System Generator",
    href: "/generators/star-system",
  },
  relatedTools: [
    {
      title: "Star system generator",
      description:
        "Generate stars, major bodies, transit routes, factions, hazards, and a system-level problem.",
      href: "/generators/star-system",
    },
    {
      title: "Sci-fi world generator",
      description:
        "Develop a planet, moon, colony, or orbital habitat once the system gives it a role.",
      href: "/generators/world",
    },
    {
      title: "Faction generator",
      description:
        "Create the authorities, crews, unions, corporations, and rivals competing across the system.",
      href: "/generators/faction",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Space Opera",
      description:
        "Organise starship crews, colonies, interstellar politics, and linked adventure locations.",
      href: "/for/space-opera",
    },
    {
      title: "Codex Cryptica for Traveller",
      description:
        "Track subsectors, trade, patrons, ships, and the consequences of travel between worlds.",
      href: "/for/traveller",
    },
  ],
  relatedAnswers: [
    "how-do-you-make-an-alien-species-feel-believable",
    "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    "how-do-you-start-worldbuilding-from-scratch",
  ],
  labels: ["sci-fi"],
  discovery: {
    id: "answer-create-sci-fi-star-system",
    parentCluster: "worldbuilding",
    primaryIntent: "how to create a sci-fi star system for an rpg",
    intentAliases: [
      "sci-fi star system worldbuilding",
      "how to design a space rpg star system",
      "rpg star system design",
    ],
    uniqueValue:
      "A tabletop-first star system framework that turns locations into an economic network, then adds travel constraints, competing claimants, hazards, and a live flashpoint that creates immediate crew decisions.",
    relatedIntents: [
      "generator-star-system",
      "generator-world",
      "for-space-opera",
      "for-traveller",
      "answer-make-alien-species-believable",
      "answer-travel-interesting",
      "answer-worldbuilding-from-scratch",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-make-alien-species-believable",
        reason:
          "The alien species answer develops one culture from biology and environment, while this answer organises destinations, travel, trade, and disputes across a whole playable system.",
      },
      {
        with: "answer-worldbuilding-from-scratch",
        reason:
          "The worldbuilding answer starts any campaign from a local sandbox, while this page gives science-fiction campaigns a system-scale route and faction framework.",
      },
    ],
  },
  seo: {
    title: "How to Create a Sci-Fi Star System for an RPG | Codex Cryptica",
    description:
      "Build a playable sci-fi RPG star system with useful locations, travel limits, competing factions, hazards, resources, and adventure hooks.",
    image:
      "https://assets.codexcryptica.com/og/how-to-create-a-sci-fi-star-system-for-an-rpg.jpg",
    imageAlt:
      "Exploration ship overlooking a gas giant, mining moon, orbital station, and busy routes through a star system",
  },
};

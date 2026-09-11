import type { AnswerConfigInput } from "../schema";

export const howToCreateACyberpunkCityDistrict: AnswerConfigInput = {
  slug: "how-to-create-a-cyberpunk-city-district",
  category: "worldbuilding",
  publishedAt: "2026-09-07",
  question: "How do you create a cyberpunk city district?",
  kind: "framework",
  shortAnswer:
    "Create a cyberpunk district by deciding what work it does for the city, who extracts value from that work, and what daily cost residents pay for staying there. Give it one stressed piece of infrastructure, a visible social divide, a local authority with limits, and a problem that forces people into difficult bargains. Then prepare a few places where that pressure can meet the crew.",
  sections: [
    {
      kind: "prose",
      heading: "Start with the job the district does",
      paragraphs: [
        "A district earns its place in a cyberpunk city by processing something the rest of the city needs: freight, waste, data, cheap labour, entertainment, food, security, medical work, or people who have nowhere else to go. Pick one job before naming streets. It tells you what arrives every day, what is scarce, and who can threaten to stop the flow.",
        "Make that job uneven. The tower may own the transit line while local mechanics keep it running. A clean clinic quarter may depend on an unlicensed market for rejected implants. The useful question is whose work keeps the district alive and who collects the payment.",
      ],
    },
    {
      kind: "list",
      heading: "Give the district seven things to do at the table",
      intro:
        "Write one or two sentences for each. This is enough to run the district without turning prep into a municipal report.",
      items: [
        {
          term: "Function and economy",
          text: "Name the service, product, or illegal trade that makes the district matter. Decide what a shift worker, a fixer, and a corporation each gain from it.",
        },
        {
          term: "Control",
          text: "Name the official authority and the practical authority. They can be a transit board and a protection crew, a property algorithm and its maintenance contractors, or a clinic chain and the debt collectors outside it.",
        },
        {
          term: "Exclusion",
          text: "State who is priced out, watched, denied entry, or forced into the dangerous work. This creates a human boundary the crew can cross, exploit, or defend.",
        },
        {
          term: "Infrastructure",
          text: "Choose one system that everybody relies on and that can fail: flood pumps, cargo lifts, air scrubbers, an elevated rail, a data relay, or rationed power. Let it shape routes and arguments.",
        },
        {
          term: "Local texture",
          text: "Use one repeated sensory detail tied to the economy, such as coolant mist around the freight lifts or food stalls powered from illegal taps. It should say how people live here, not merely add neon.",
        },
        {
          term: "Current tension",
          text: "Put the district under pressure now. A contract changes hands, a surveillance upgrade arrives, a water bill doubles, or a missing courier threatens a fragile truce.",
        },
        {
          term: "Street-level hooks",
          text: "Prepare three requests that come from different sides of the tension. One should pay well, one should be personal, and one should make the crew choose who bears the cost.",
        },
      ],
    },
    {
      kind: "example",
      heading: "Worked example: Switchyard Nine",
      paragraphs: [
        "Switchyard Nine is a freight district under an elevated magnetic rail. It takes ten minutes to sketch because each detail creates a person, place, or decision the crew can use.",
      ],
      items: [
        {
          term: "First pass",
          text: "A dangerous neon freight district ruled by gangs. This gives a mood, but no reason for anyone to hire the crew or fight over a specific place.",
        },
        {
          term: "Table-ready district",
          text: "The city routes medical cargo through Switchyard Nine because its refrigerated rail spur is the only line serving the outer wards. Meridian Logistics owns the spur, but tenants keep the illegal cooling loops working after the company cut maintenance. Workers without citizenship papers sleep in the compressor levels because checkpoint scanners do not reach them. The local clinic needs a stolen coolant regulator returned before a heatwave spoils its stock; Meridian wants the culprit identified; the tenants want the crew to help them bypass the new biometric gates being installed at midnight.",
        },
        {
          term: "Why it works",
          text: "The rail explains the economy, the cooling loops create the infrastructure problem, the checkpoints define exclusion, and each faction wants a different result. The crew can choose a side before a map is needed.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "Let the city press in from outside",
      paragraphs: [
        "A district feels like part of a larger city when a decision elsewhere changes life on its streets. Give it one dependency on a neighbouring district or city-wide institution: corporate security arrives from the financial centre, food comes through a port, a rival gang controls the only safe route home, or a municipal algorithm sets rents using data nobody can inspect.",
        "Keep the playable area small. Three or four enterable locations are usually enough: the place where business happens, the place where people recover, the place that controls access, and the place where the tension becomes dangerous. Add more only after the crew gives you a reason to return.",
      ],
    },
    {
      kind: "checklist",
      heading: "District prep checklist",
      intro:
        "Before play, make sure you can answer these without looking at a map.",
      items: [
        "What does this district provide that the rest of the city would miss?",
        "Who officially controls it, and who can actually make life difficult today?",
        "Who is excluded or made dependent by the current arrangement?",
        "Which piece of infrastructure can change routes, prices, or safety if it fails?",
        "What has changed this week that makes the district unstable?",
        "Which three people or factions can offer the crew incompatible jobs?",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep the district connected after the first session",
    paragraphs: [
      "Create the district as a settlement, then link its controlling factions, key locations, infrastructure, and active jobs. When the crew steals the regulator or backs the tenants, those connections show which clinic, corporation, route, and contact should change next rather than leaving the consequence in an old session note.",
    ],
    linkText: "Try the settlement generator",
    href: "/generators/settlement",
  },
  relatedTools: [
    {
      title: "Settlement generator",
      description:
        "Create districts, corporate sectors, night markets, and other locations with a reason to exist.",
      href: "/generators/settlement",
    },
    {
      title: "Faction generator",
      description:
        "Build the corporation, crew, union, gang, or neighbourhood group competing for control.",
      href: "/generators/faction",
    },
    {
      title: "Quest hook generator",
      description:
        "Turn a district tension into a job with a client, pressure, and difficult choice.",
      href: "/tools/quest-hook-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Cyberpunk RED",
      description:
        "Organise fixers, corporations, gangs, districts, and gigs for a connected cyberpunk campaign.",
      href: "/for/cyberpunk-red",
    },
  ],
  relatedAnswers: [
    "what-should-an-rpg-settlement-contain",
    "how-do-you-run-an-rpg-campaign-in-one-city",
  ],
  labels: ["cyberpunk"],
  discovery: {
    id: "answer-cyberpunk-city-district",
    parentCluster: "settlement-creation",
    primaryIntent: "how to create a cyberpunk city district",
    intentAliases: [
      "how to make a cyberpunk district",
      "cyberpunk district worldbuilding",
    ],
    uniqueValue:
      "A cyberpunk-specific district framework built around extraction, exclusion, stressed infrastructure, local control, and conflicting street-level jobs.",
    relatedIntents: [
      "answer-settlement-contents",
      "generator-settlement",
      "example-arc-hub",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-settlement-contents",
        reason:
          "The settlement answer gives general low-prep settlement design, while this answer applies that method to cyberpunk power, infrastructure, and social exclusion.",
      },
      {
        with: "example-arc-hub",
        reason:
          "Arc Hub shows a finished cyberpunk district; this page explains the reusable design process that can produce other districts.",
      },
      {
        with: "answer-create-fantasy-town-rumours",
        reason:
          "This answer builds a cyberpunk district through local power and infrastructure, while the fantasy-town rumours answer builds the information sources and consequences that expose a town's existing tensions.",
      },
    ],
  },
  seo: {
    title: "How do you create a cyberpunk city district? | Codex Cryptica",
    description:
      "Build a cyberpunk district through function, power, exclusion, infrastructure, tension, and street-level hooks. Includes a compact worked example.",
    image:
      "https://assets.codexcryptica.com/og/how-to-create-a-cyberpunk-city-district.jpg",
    imageAlt:
      "Rainy cyberpunk market district beneath elevated rail lines and corporate towers",
  },
};

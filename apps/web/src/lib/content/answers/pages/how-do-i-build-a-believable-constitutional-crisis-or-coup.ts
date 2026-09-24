import type { AnswerConfigInput } from "../schema";

export const howDoIBuildABelievableConstitutionalCrisisOrCoup: AnswerConfigInput =
  {
    slug: "how-do-i-build-a-believable-constitutional-crisis-or-coup",
    category: "worldbuilding",
    publishedAt: "2026-09-24",
    question:
      "How do I build a believable constitutional crisis or coup in a fictional government?",
    kind: "framework",
    shortAnswer:
      "Map legal authority, practical power and legitimacy, then make them point at different actors. Practical power comes from resources such as force, money, administration, logistics and information, and depends on the institutions and people willing to use them. Add a trigger and deadline that expose the mismatch, make every response costly, and leave several outcomes open.",
    sections: [
      {
        kind: "prose",
        heading: "Map law, power and legitimacy",
        paragraphs: [
          "Most fictional coups feel flat because the government is written as a single machine that either works or is seized. The gap between may and can is where a believable crisis lives: the constitution may let a chancellor dismiss a general, but whether the general goes, and whether his regiments notice, is a separate question.",
          "Use three questions throughout: who has legal authority, who has practical power, and who is considered legitimate by whom? A stable state has these lined up on the same people. A crisis becomes possible when they drift apart, often along a fault line that has existed for years. Practical power comes from resources such as force, money, administration, logistics and information; institutions and the people inside them determine whether those resources can be used.",
        ],
      },
      {
        kind: "table",
        heading: "Institution worksheet",
        headers: [
          "Institution",
          "Legal authority",
          "Practical power",
          "Legitimacy / constituency",
          "Dependency / fracture point",
        ],
        rows: [
          [
            "Executive",
            "Appointments, orders, emergency powers",
            "Administration, communications, ability to enforce decisions",
            "Election, succession, or a record of keeping order",
            "Budget, civil service, or whether commanders obey",
          ],
          [
            "Legislature",
            "Laws, budgets, confirmations, oversight",
            "Votes, control of funds, influence over appointments",
            "Voters, regions, parties, or a charter",
            "Coalition splits, patronage, or a disputed quorum",
          ],
          [
            "Army",
            "Defined chain of command and limits on deployment",
            "Troops, weapons, transport, supply and communications",
            "An oath, commander, cause, or public trust",
            "Pay, supplies, rival officers, or regional commands",
          ],
          [
            "Provinces",
            "Local powers and duties under the constitution",
            "Tax collection, local administration, ports or infrastructure",
            "Local communities, traditions, or regional charters",
            "Revenue sent to the capital, local security, or rival governors",
          ],
        ],
      },
      {
        kind: "list",
        heading: "Map institutions, dependencies and fractures",
        intro:
          "Do not write 'the government' or 'the army' as a single actor. For each body, ask:",
        items: [
          {
            term: "Who decides and who obeys",
            text: "Who gives orders, names or removes officials, calls a vote or emergency, and who can block or ignore each step?",
          },
          {
            term: "What makes power usable",
            text: "Who supplies the money, force, administration, logistics and information needed to carry out a decision? A legislature with budget authority but no way to enforce its vote has a different kind of power from one whose members command militias.",
          },
          {
            term: "Who depends on whom",
            text: "Who pays, feeds, supplies or protects the institution? Dependence can make a body hesitate, refuse, or switch support.",
          },
          {
            term: "Where loyalty can fracture",
            text: "Leadership, rank and file, city and provincial branches, or elite units may disagree. Map who controls force and what the people on the ground think of that chain of command; the legal right to command is not the same as being obeyed.",
          },
          {
            term: "What could change its position",
            text: "An unpaid wage, threat to a home province, religious ruling, insult to its honour, or a trusted offer may shift its support. Even a would-be dictator needs officers, paymasters, administrators, supply lines and someone willing to publish a proclamation.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Give rivals competing claims",
        paragraphs: [
          "Several credible claims create more political choices, but they do not need to be morally equivalent. A setting can have an obvious tyrant or bad-faith claimant while institutions and ordinary people still face difficult decisions. Ask why actors support each claim: election, hereditary right, legal succession, a revolutionary mandate, religious sanction, victory in war, protection from disorder, defence of a regional charter, or preservation of an older constitution can all matter.",
          "Decide what groups care about in this setting; class or profession should not determine loyalty automatically. Merchants might value honoured contracts, soldiers might follow the person who pays them, farmers might care about grain prices, and clergy might recognise an anointing. Those are possibilities to adapt, not default motives.",
        ],
      },
      {
        kind: "list",
        heading: "Add a trigger and a clock",
        intro:
          "A state can sit on a broken arrangement for decades. Something has to force the contradiction into public view, and something has to stop everyone from simply waiting. Pick one of each, and let the trigger expose weaknesses already in the system rather than inventing new ones:",
        items: [
          {
            term: "Triggers",
            text: "A disputed election, an unexpected death, an assassination, a failed war, a grain shortage, a corruption scandal, a mutiny, an attempted reform, an emergency declaration, a colonial or regional revolt.",
          },
          {
            term: "Clocks",
            text: "A vote in five days, an army three weeks from the capital, a debt payment due, a coronation or succession ceremony on a fixed date, a harvest that will not last the winter, an ambassador who expects an answer by morning.",
          },
          {
            term: "Why both matter",
            text: "The trigger says why the crisis starts now. The clock says why no faction can wait for the perfect move, which is where mistakes come from.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Make every response cost something",
        intro:
          "If a single obvious move fixes the crisis, it was never a crisis. Check each faction's likely options against costs like these:",
        items: [
          {
            term: "Emergency powers",
            text: "They may save the government while draining its legitimacy, and reformers may split over whether using them is itself a betrayal.",
          },
          {
            term: "Dismissing a popular commander",
            text: "It removes a threat and may provoke the mutiny it was meant to prevent.",
          },
          {
            term: "Prosecuting the wealthy",
            text: "It signals seriousness and may freeze credit, food imports or a loyal bank's willingness to lend.",
          },
          {
            term: "Calling an early election",
            text: "It may settle the question, or hand legitimacy to the movement the government was trying to contain.",
          },
          {
            term: "Using troops on rioters",
            text: "It restores order in the square and can harden the opposition in every province that hears about it.",
          },
          {
            term: "Negotiating with rebels",
            text: "It may end the fighting and teach every other region that rebellion pays.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Sketch branches and let play decide",
        paragraphs: [
          "Sketch at least three plausible paths: negotiated reform, coup, counter-coup, secession, or a constitutional convention, for example. For each major actor, note what they can do, what they lack, whom they need to keep loyal, and what would damage their standing. A policy that wins one constituency may drive another away; some states endure for generations because nobody's claim outweighs the cost of acting.",
          "You do not need to choose the realistic outcome in advance. Keep the pressures credible, then let play decide which branch lands. A crisis can have an obvious villain and still leave hard choices for everyone else.",
        ],
      },
      {
        kind: "example",
        heading: "A worked example: the Republic of Karrow",
        paragraphs: [
          "Karrow has an elected First Consul, a Senate, independent courts and provincial governors under a written constitution. The Consul's reform bill would move tax collection to the capital. A Senate vote in three weeks comes seven weeks before the election. This compact example tests two assumptions; a dedicated Karrow Council Vote treatment is planned separately.",
        ],
        items: [
          {
            term: "Baseline",
            text: "The Consul may command the army, propose budgets and declare a sixty-day emergency, but provincial governors collect taxes and hold the garrisons' pay chests. The Senate approves budgets and confirms judges and officers; grain merchants have bought two blocs through loans and appointments, drawing blame for bread prices in the cities. General Ostrelle commands two field armies and has support among soldiers and frontier communities, though his standing is mixed elsewhere. The Consul was elected on a reform promise that has mostly stalled.",
          },
          {
            term: "If the colonels obey the constitution",
            text: "Ostrelle has little leverage, and the crisis centres on the Consul and the merchants' Senate blocs. If the colonels obey Ostrelle personally, the Consul must court or dismiss him, either choice risking a mutiny.",
          },
          {
            term: "If the governors hold the pay chests",
            text: "Regiments cannot move without their consent, making the reform a direct challenge to the governors, who may back Ostrelle or secession. If the capital holds the chests, the governors weaken and the merchants become the main opposition.",
          },
          {
            term: "Three plausible paths",
            text: "The Consul could trade away the reform to keep the governors' support; Ostrelle could lead a coup he claims will save the constitution; or governors could withhold taxes until a slow secession takes hold. Each path follows from who controls force and money, and every response costs the Consul something.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Political crisis checklist",
        intro:
          "Fill these in before you write the crisis. Short notes are enough; revisit them whenever a new actor enters:",
        items: [
          "What legal authority does each institution and claimant hold?",
          "Who has practical power, and what resources make it usable?",
          "Who considers each claim legitimate, and why in this setting?",
          "Which dependencies, loyalties or internal fractures could make an institution refuse or switch?",
          "What existing contradiction does the trigger expose?",
          "What deadline prevents everyone from waiting?",
          "What costly choices follow, and what are at least three plausible branches?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep the institutions, claims and clocks in one place",
      paragraphs: [
        "A political crisis is a web of institutions, people, claims and deadlines, and it gets harder to hold in your head with every actor you add. Codex Cryptica lets you keep each institution as its own entry with its formal role, its real power and its loyalties, then link them to the claimants and the events that will pull them apart.",
        "Record the factions, councils, rumours and secrets around the crisis, then link them to the institutions and claims they affect. The graph helps keep those relationships visible as the setting changes.",
      ],
      linkText: "Build the factions",
      href: "/generators/faction",
    },
    relatedTools: [
      {
        title: "Faction Generator",
        description:
          "Groups with goals, resources and rivalries to serve as the crisis's actors.",
        href: "/generators/faction",
      },
      {
        title: "Faction Roster Generator",
        description:
          "A set of rival factions at once, useful for mapping who claims what.",
        href: "/generators/faction-roster",
      },
      {
        title: "Council Vote Generator",
        description:
          "Formal votes, blocs and hidden agendas for succession and legislative scenes.",
        href: "/generators/council-vote",
      },
      {
        title: "Rumour Generator",
        description:
          "True, half-true and planted rumours that spread through a divided state.",
        href: "/generators/rumour",
      },
      {
        title: "Secret Society Generator",
        description:
          "Hidden organisations with motives and methods working inside the crisis.",
        href: "/generators/secret-society",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Fantasy Worldbuilding",
        description:
          "Connect governments, factions, places and history in one setting bible.",
        href: "/for/fantasy-worldbuilding",
      },
      {
        title: "Codex Cryptica for Conspiracy",
        description:
          "Material for hidden agendas, rival schemes and campaigns of secrets.",
        href: "/for/conspiracy",
      },
    ],
    relatedAnswers: [
      "how-do-i-run-political-intrigue-and-faction-play",
      "what-rpg-works-for-political-intrigue-and-faction-play",
      "how-do-you-create-a-fantasy-faction",
      "how-do-you-track-faction-turns-between-rpg-sessions",
      "how-do-you-generate-useful-rpg-rumours",
      "how-do-you-create-a-secret-society-for-an-rpg-campaign",
      "how-do-you-start-worldbuilding-from-scratch",
    ],
    discovery: {
      id: "answer-constitutional-crisis-or-coup",
      parentCluster: "worldbuilding",
      clusters: ["worldbuilding", "faction-creation"],
      primaryIntent:
        "how to build a believable constitutional crisis or coup in a fictional government",
      intentAliases: [
        "how to write a coup in fantasy",
        "how to make a fictional coup believable",
        "how to write a constitutional crisis",
        "how to create political instability in a fictional country",
        "how to write a believable revolution",
        "how to design a government that can collapse",
        "worldbuilding coups and revolutions",
      ],
      uniqueValue:
        "A setting-facing framework for designing the institutional fault lines behind a political crisis: mapping legal authority, practical power and legitimacy, tracing institutional dependencies and fractures, then adding a trigger, a clock and costly responses.",
      userJob: "understand",
      relatedIntents: [
        "answer-run-political-intrigue",
        "answer-political-intrigue-system-selection",
        "answer-fantasy-faction",
        "answer-track-faction-turns-between-sessions",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-run-political-intrigue",
          reason:
            "That page is table-facing and covers running factions and scenes at the table; this one is setting-facing and covers designing the institutional fault lines that make a crisis believable in the first place.",
        },
        {
          with: "answer-make-alien-species-believable",
          reason:
            "That page designs the biology and culture of a species; this one designs the institutional fault lines of a government. They share the word believable but serve different worldbuilding jobs.",
        },
      ],
    },
    seo: {
      title:
        "Build a Believable Constitutional Crisis or Coup | Codex Cryptica",
      description:
        "Design a coup or constitutional crisis by mapping legal authority, practical power and legitimacy, tracing institutional loyalties, then adding a trigger and clock.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-build-a-believable-constitutional-crisis-or-coup.jpg",
      imageAlt:
        "A candlelit council chamber with a sealed constitution on the table, armed officers waiting in the doorway and a map of provinces behind a divided senate",
    },
  };

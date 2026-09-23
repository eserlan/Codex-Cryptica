import type { AnswerConfigInput } from "../schema";

export const howDoIRunAnInvestigatorWithoutSideliningTheParty: AnswerConfigInput =
  {
    slug: "how-do-i-run-an-investigator-without-sidelining-the-party",
    category: "session-prep",
    publishedAt: "2026-09-24",
    question:
      "How do I run an investigator or detective without making other PCs irrelevant?",
    kind: "framework",
    shortAnswer:
      "Let the investigator reduce uncertainty; let the party decide what to do with what they learn. The investigator can excel at finding evidence and noticing what it suggests without owning the group's interpretation or next move. Give the party multiple routes to necessary conclusions, and let failed rolls change the information's quality, cost, timing, or safety rather than stop the investigation.",
    sections: [
      {
        kind: "prose",
        heading: "Share the work without shrinking the investigator",
        paragraphs: [
          "A detective character can dominate an investigation when one skill check controls every useful fact, and the GM then asks that player to explain what it all means. The rest of the party has little to do if clues arrive one at a time, only through the investigator, or after the scene where they mattered. Even a capable investigator can become a bottleneck when the adventure treats expertise as exclusive permission to learn.",
        ],
      },
      {
        kind: "list",
        heading: "Three stages of an investigation",
        ordered: true,
        intro:
          "Let the investigator reduce uncertainty; let the party decide what to do with what they learn:",
        items: [
          {
            term: "Find evidence",
            text: "Make essential clues discoverable through more than one route. The investigator can be faster, safer, or more precise, while other characters contribute access, context, practical knowledge, or social skill.",
          },
          {
            term: "Interpret what it suggests",
            text: "Give the investigator stronger factual detail, contradictions, likely implications, and things they can rule out. The players decide what theory best fits the evidence.",
          },
          {
            term: "Decide what to do",
            text: "Once the group has enough to act, let the players choose which lead to pursue and what risks to accept. The investigator's informed view helps the decision without making it for them.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Give expertise an edge without exclusive access",
        intro:
          "Keep the clue, the benefit of expertise, and the players' theory distinct:",
        items: [
          {
            term: "Core clue",
            text: "Give enough information to keep the investigation moving when a character searches a relevant clue-bearing scene. A relevant ability should not be exclusive permission to find the essential fact.",
          },
          {
            term: "Specialist detail",
            text: "Expertise can add precision, context, speed, confidence, or reduce the cost. A specialist might identify the narrow blade that made a wound, recognise an unfamiliar toxin, or spot that a witness repeats a rehearsed phrase. These details sharpen the next question without settling the whole theory.",
          },
          {
            term: "Player interpretation",
            text: "Facts can be clear while their significance remains uncertain. State what was observed separately from what it may imply. A clue need not support several meanings by default, and the GM should not change an established fact when the players form a wrong theory.",
          },
          {
            term: "Different contributions",
            text: "Physical traces, witness accounts, records, local knowledge, and practical expertise can each add something. Aim for varied contributions across the investigation and meaningful group decisions after discoveries; no one needs to contribute a clue in every scene.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep the investigator from becoming a bottleneck",
        paragraphs: [
          "For each necessary conclusion, provide support from multiple independent clues or routes, ideally involving different kinds of expertise. A physical trace, a witness statement, a document, specialist knowledge, or an environmental clue can each give the group another way forward. Different PCs may find or enrich those clues, so one absent specialist or missed scene does not stall the case.",
          "This section focuses on sharing the investigator's role; for the wider scenario structure, see [how to run a mystery without railroading](/answers/how-do-you-run-a-mystery-without-railroading).",
        ],
      },
      {
        kind: "list",
        heading: "Use failure to change certainty, cost, or danger",
        intro:
          "Failure should change the quality, cost, timing, or safety of the information, not decide whether the investigation is allowed to continue. Preserve the next useful choice and change what it costs:",
        items: [
          {
            term: "Cost",
            text: "The clue is found, but examining the scene takes long enough for the suspect to leave or a rival to arrive. The party can still follow, but does so under worse conditions.",
          },
          {
            term: "Certainty",
            text: "The evidence suggests two plausible explanations, and the investigator cannot yet rule one out. The party can seek corroboration, question a source, or act while uncertain.",
          },
          {
            term: "Exposure",
            text: "The characters get the information, but someone notices their interest. A witness warns the suspect, a source is put at risk, or the investigator's reputation takes a hit.",
          },
          {
            term: "Incomplete result",
            text: "The investigator identifies what happened but not who ordered it, or locates the record but not the cipher key. The new lead creates a next step without handing over the whole answer.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: the missing bellfounder",
        paragraphs: [
          "A bellfounder disappears the night before the city council unveils a new alarm bell. The party needs to learn whether she fled, was taken, or uncovered sabotage. Their investigator searches the foundry, but the case also depends on what other characters can learn and do.",
        ],
        items: [
          {
            term: "The investigator-only version",
            text: "The GM puts a coded note beneath the forge and asks for an Investigation check. The detective fails, so the note is missed. The group has no lead until the GM has a witness approach them with the answer. If the detective succeeds, the player deciphers the entire plot and tells everyone what to do next.",
          },
          {
            term: "The shared investigation",
            text: "Anyone searching the foundry finds fresh clay on the floor and a work ledger with its last page torn out. The investigator recognises that the clay came from a riverbank mould used for the new bell, and spots that the ledger was cut rather than torn. The party's craftsperson knows the mould should have been locked away; the local character recalls that the riverbank has a night watch; and the face can ask the foundry apprentice why the ledger was kept. The clues point towards the riverbank storehouse but do not prove who took the bellfounder. The players decide whether to question the apprentice first or go to the storehouse before the watch changes. If the investigator's roll fails, they still get the observations, but the delayed search lets the suspect move the bell mould.",
          },
          {
            term: "Why it works",
            text: "The investigator's skill connects evidence and gives the party a stronger lead, while the other characters add context and access. The clues support a next move without dictating a culprit, and a poor roll changes the situation rather than stopping the case.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before you run an investigation scene",
        intro:
          "Check that the investigator has room to excel and the party has room to matter:",
        items: [
          "What can the investigator identify, connect, or rule out that shows their expertise?",
          "Can the essential clue still be found if the roll fails or the specialist is absent?",
          "Which other characters can add context, social access, practical knowledge, or protection?",
          "What is directly observed, and what remains an interpretation the players can debate?",
          "If a roll fails, will it change cost, certainty, danger, or exposure instead of halting progress?",
          "What choice can the group make as a result of the discovery?",
          "Does each necessary conclusion have clues from more than one source or scene?",
        ],
      },
    ],
    systemsThatSupportThis: [
      {
        system: "GUMSHOE",
        rationale:
          "These games illustrate different ways systems can support investigation; they are examples, not a universal recommendation. In GUMSHOE, investigative abilities provide core clues without a roll when a character uses the relevant ability, shifting uncertainty towards interpretation and what the group does with the evidence.",
        href: "https://pelgranepress.com/gumshoe/files/GUMSHOE%20SRD%20CC%20version.pdf",
      },
      {
        system: "Monster of the Week",
        rationale:
          "The Investigate a Mystery move gives hunters answers to targeted questions on a hit, with the Keeper's response shaped by the roll rather than making one investigator the only route to the case.",
        href: "https://evilhat.com/product/monster-of-the-week/",
      },
      {
        system: "Brindlewood Bay",
        rationale:
          "The Theorize move lets players assemble a solution from open-ended clues without a culprit fixed in advance, making interpretation a group-facing part of the mystery.",
        href: "https://www.gauntlet-rpg.com/brindlewood-bay.html",
      },
    ],
    codexConnection: {
      heading: "Keep the evidence connected to the people and places",
      paragraphs: [
        "A campaign knowledge graph can connect each clue to its source, the people who understand it, and the conclusions it supports. That gives you a record of what the party has found without deciding for the players which theory is correct.",
      ],
      linkText: "Explore the RPG knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "RPG knowledge graph",
        description:
          "Connect evidence, witnesses, suspects, and locations so clues remain part of the campaign record.",
        href: "/solutions/rpg-knowledge-graph",
      },
      {
        title: "NPC generator",
        description:
          "Create witnesses, suspects, and other people with reasons to share or withhold information.",
        href: "/generators/npc",
      },
    ],
    relatedAnswers: [
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-you-run-a-mystery-without-railroading",
      "what-rpg-should-i-play-for-investigative-horror",
      "how-do-i-run-spies-and-infiltrators-in-an-rpg",
      "how-do-you-run-a-conspiracy-campaign",
    ],
    discovery: {
      id: "answer-run-investigator-without-sidelining-party",
      parentCluster: "specialist-roles",
      clusters: ["specialist-roles", "adventure-mapping"],
      primaryIntent:
        "how to run an investigator character without sidelining the party in an rpg",
      intentAliases: [
        "how to make a detective character feel useful in an rpg",
        "how to run an investigator without making other players irrelevant",
        "how to stop one character solving every rpg mystery",
        "how to share clues across an rpg party",
        "how to run a clue specialist in a tabletop rpg",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "Shows how to preserve investigator competence while sharing clue access, interpretation, and decisions across the party. It focuses on the investigator's role and clue distribution, distinct from general mystery structure or broad specialist spotlight advice.",
      relatedIntents: [
        "answer-specialist-character-spotlight",
        "answer-run-mystery-without-railroading",
        "answer-investigative-horror-system-selection",
        "answer-run-spies-infiltrators-rpg",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-run-diplomats-nobles-courtiers",
          reason:
            "Both answers give system-agnostic guidance for a specialist PC, but the diplomat answer structures negotiation, status, and durable agreements while this answer structures clue discovery, interpretation, and shared decisions in investigations.",
        },
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The specialist spotlight answer covers scene structures for any expert role; this answer focuses on clue access, inference, and decision-making around an investigator character.",
        },
        {
          with: "answer-run-mystery-without-railroading",
          reason:
            "The mystery answer covers resilient scenario structure and clue redundancy; this answer focuses on sharing investigative work among PCs while keeping a detective character competent.",
        },
        {
          with: "answer-investigative-horror-system-selection",
          reason:
            "The system-selection page compares games for investigative horror; this answer provides system-agnostic advice for running an investigator as one member of a party.",
        },
        {
          with: "answer-run-spies-infiltrators-rpg",
          reason:
            "The infiltrator answer structures covert access and operations; this answer focuses on clue discovery and interpretation by investigator characters across mystery genres.",
        },
        {
          with: "answer-run-hackers-netrunners",
          reason:
            "The hacker answer connects digital intrusion to physical security pressure; this answer covers clue discovery and interpretation across investigative roles and genres.",
        },
      ],
    },
    seo: {
      title:
        "How to Run an Investigator Without Sidelining the Party | Codex Cryptica",
      description:
        "Keep detective characters brilliant without making other PCs irrelevant. Share clues, interpretation, and choices while failures change the case instead of stopping it.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-an-investigator-without-sidelining-the-party.jpg",
      imageAlt:
        "An investigator compares a clue with notes while companions question a witness and examine a foundry ledger",
    },
  };

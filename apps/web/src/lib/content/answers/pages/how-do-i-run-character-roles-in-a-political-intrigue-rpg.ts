import type { AnswerConfigInput } from "../schema";

export const howDoIRunCharacterRolesInAPoliticalIntrigueRpg: AnswerConfigInput =
  {
    slug: "how-do-i-run-character-roles-in-a-political-intrigue-rpg",
    category: "session-prep",
    publishedAt: "2026-09-24",
    question:
      "How do I run common character roles in a political intrigue RPG?",
    kind: "framework",
    shortAnswer:
      "Run political roles through the interests and people they can affect. Give each character a constituency, a source of leverage, a commitment that could cost them, and a way their actions change the choices facing the group. A diplomat can negotiate terms, a spy can expose a vulnerability, and a dissident can build support, but none should settle the conflict alone. Let every role create an opening or pressure the rest of the party can act on.",
    sections: [
      {
        kind: "prose",
        heading: "Political roles need people to answer to",
        paragraphs: [
          "In a political campaign, a character's title or contacts matter because someone depends on what they do. An envoy answers to a ruler, a guild officer to workers, a reporter to sources and readers, and a dissident to the coalition they hope to build. If roles provide access without obligations, intrigue can become a sequence of conversations where a high social skill or powerful contact settles each problem.",
          "Treat the roles below as flexible archetypes, not fixed classes. Games may use different names, combine several roles in one character, or give one character several constituencies. For each PC, ask who they can reach, what they can offer or risk, and who will react when they act. This page focuses on player-character roles inside a political campaign; for faction agendas and campaign pressure, see the political intrigue and faction-play guide.",
        ],
      },
      {
        kind: "list",
        heading: "Run the roles through political choices",
        intro:
          "Give each role a way to change the available choices, then leave the decision and its cost in the party's hands:",
        items: [
          {
            term: "Diplomat or envoy",
            text: "Contribution: Put terms on the table and learn what each side might accept. Technique: Give the envoy a clear mandate, a red line, and authority to make some commitments but not others. Other PCs can bring evidence, secure support, or make a different offer possible. Watch for: A single social roll deciding a layered negotiation. Use the system's rules to resolve uncertain moments, and let interests and commitments determine the stakes. See the diplomat, noble, and courtier guide for a detailed negotiation framework.",
          },
          {
            term: "Noble or courtier",
            text: "Contribution: Gain an audience, invoke a duty, or open a door others cannot reach. Technique: Decide what the character's status actually authorises, who can challenge it, and which obligations come with using it. Watch for: Treating rank as automatic obedience. A courtier may win the hearing and still need the party to find votes, provide proof, or answer a rival's demand.",
          },
          {
            term: "Spy or infiltrator",
            text: "Contribution: Learn what a faction conceals, create access, or expose a vulnerable part of its plan. Technique: Give the rest of the team concurrent work, such as protecting a source, arranging extraction, or steering attention away from the spy. Watch for: A long private mission that leaves the others waiting, or information that arrives after the party's choice. For covert operations and team-supported infiltration, see the spy and infiltrator guide.",
          },
          {
            term: "Journalist, chronicler, or propagandist",
            text: "Contribution: Change what the public, a council, or a faction believes it can get away with. Technique: Give the character a source, evidence to verify, an audience, and a choice about when or how to release the story. The rest of the party can protect sources, test claims, and prepare for the response. Watch for: Publication acting as an automatic victory or misinformation changing facts the table already established. See the journalist and Media character guide for reporting procedures.",
          },
          {
            term: "Faction leader or officer",
            text: "Contribution: Bring organised support, labour, votes, soldiers, or access to a negotiation. Technique: Name who the character represents and what those people will accept; give the PC room to persuade, consult, or bargain with their own constituency. Watch for: Treating a faction as a resource the character can spend without consent or consequence. If members bear the cost, show how their support may change afterwards.",
          },
          {
            term: "Fixer, broker, or adviser",
            text: "Contribution: Connect people who need one another, provide access, or identify a price the others have not considered. Technique: Make each favour or introduction specific, and keep track of who expects repayment. Watch for: A contact list that produces whatever the party needs without delay, cost, or competing loyalties. A useful contact opens a route and adds a choice about who now has a claim on the party.",
          },
          {
            term: "Revolutionary or dissident",
            text: "Contribution: Organise people who can challenge an institution's claim to rule. Technique: Give the movement a concrete demand, a source of legitimacy, and a disagreement about acceptable tactics. Allies can help gather support, protect organisers, or prevent retaliation. Watch for: Treating popular support as a single roll or assuming the movement speaks with one voice. A public victory may make the coalition responsible for what happens next.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep roles distinct without splitting the campaign",
        paragraphs: [
          "Several characters may be able to persuade a minister, but they need not be doing the same job. The envoy states the terms, the courtier gains an audience, the journalist decides what can be reported, and the fixer knows which delegate needs a favour. Let those actions change the same meeting or deadline rather than building a separate political subsystem for every character.",
          "Cut between actions when new information, a cost, or a decision changes what someone else can do. If one character meets a source alone, keep the scene as long as it holds a choice or discovery for that player, then bring the result back while the group can still respond. Check with the players about secrets and character conflict before using hidden agendas or competing loyalties against one another.",
        ],
      },
      {
        kind: "list",
        heading: "Make leverage create options, not obedience",
        intro:
          "Before a key political scene, identify what each side can change and what it will not give up:",
        items: [
          {
            term: "Interests",
            text: "What does each participant need beyond the position they state in public? A council member may demand a new patrol while privately needing the dockworkers to keep the grain route open.",
          },
          {
            term: "Leverage",
            text: "What can the PCs offer, prove, withhold, or put at risk? Evidence, public support, a vote, safe passage, a skilled crew, or a promise can alter the deal without forcing an NPC to accept it.",
          },
          {
            term: "Mandate",
            text: "Who does each character represent, and what can they commit to on that group's behalf? Define what needs approval and who may reject or contest the decision later.",
          },
          {
            term: "Exposure",
            text: "Who will notice the action, who might be harmed by it, and what becomes public? A secret can make a negotiation possible while putting a source, alliance, or constituency under pressure.",
          },
          {
            term: "Consequence",
            text: "What changes if the party succeeds, pays the price, delays, or walks away? Show the result through a vote, a closed route, an altered patrol, a public rumour, or a contact who no longer answers.",
          },
        ],
      },
      {
        kind: "example",
        heading: "Worked example: the bridge and the strike",
        paragraphs: [
          "A council plans to sell the only river bridge to a private company. The deal would fund the city's damaged flood defences, but the company intends to charge tolls that will shut small traders out. The vote is approaching, and the party has ties to the council, a traders' guild, and a local dissident group.",
        ],
        items: [
          {
            term: "The role-by-role version",
            text: "The envoy negotiates with the council, the spy slips into the company's office, the journalist interviews traders, and the guild officer prepares a speech. Each scene reveals useful facts, but they happen separately. By the time the group meets again, the company has secured two votes and the party must hurriedly work out how the discoveries fit together.",
          },
          {
            term: "The shared political scene",
            text: "The spy finds a draft toll schedule showing that the flood-defence funding depends on a higher rate than the company announced. The journalist can publish it before the council hearing, but doing so exposes the clerk who leaked it. The envoy can demand a public amendment, while the guild officer must decide whether traders will accept a temporary toll to fund the repairs. The fixer knows a councillor who will support the amendment in exchange for a promise to keep the bridge open during a coming festival. The dissident warns that publishing the leak without protecting the clerk could cost the movement local support. The party chooses to verify the schedule first and ask the fixer to secure the clerk's safe passage. The vote is delayed, but the company withdraws its offer to fund the flood defences unless the toll remains in the contract.",
          },
          {
            term: "Why it works",
            text: "Each role changes the options in the same political dispute. The spy finds evidence, the journalist weighs its release, the envoy negotiates, and the other characters bring support and obligations. Their actions create a decision for the whole group, and the delayed vote leaves a visible cost to address.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before you run a political role scene",
        intro:
          "Use this short prep pass for the character and the people affected by their actions:",
        items: [
          "Who does the character represent, depend on, or answer to?",
          "What can this role change that another character cannot change in the same way?",
          "What can the rest of the party do to support, challenge, or act on that contribution?",
          "What is the character authorised to promise, spend, publish, or reveal?",
          "What cost, exposure, or obligation could follow from using their leverage?",
          "What does the opposition want, and what will it refuse even under pressure?",
          "What visible decision or consequence will bring this scene back into shared play?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep political commitments attached to the people involved",
      paragraphs: [
        "A campaign graph can connect a PC to the group they represent, the officials they can reach, and the promises or debts created in play. Recording those links helps you bring a vote, source, or favour back into a later session without treating a changing political relationship as a forgotten note.",
      ],
      linkText: "Explore the RPG knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "Faction generator",
        description:
          "Create a group with goals, leverage, internal pressures, and reasons to negotiate.",
        href: "/generators/faction",
      },
      {
        title: "Council vote generator",
        description:
          "Prepare a vote with competing positions, obligations, and possible outcomes.",
        href: "/generators/council-vote",
      },
    ],
    relatedAnswers: [
      "how-do-i-run-political-intrigue-and-faction-play",
      "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
      "how-do-i-run-spies-and-infiltrators-in-an-rpg",
      "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-you-run-factions-in-a-sandbox-campaign",
      "what-rpg-works-for-political-intrigue-and-faction-play",
    ],
    discovery: {
      id: "answer-run-character-roles-political-intrigue",
      parentCluster: "specialist-roles",
      clusters: ["specialist-roles", "faction-creation"],
      primaryIntent:
        "how to run common character roles in a political intrigue rpg",
      intentAliases: [
        "political intrigue rpg roles",
        "how to gm political character archetypes",
        "court intrigue character roles",
        "faction campaign character roles",
        "how to run diplomats and spies in an rpg",
        "how to run character roles in a political campaign",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A genre-facing guide to the roles PCs can play in political campaigns, with practical ways to make envoys, courtiers, spies, reporters, faction officers, fixers, and dissidents affect shared scenes. It differs from campaign-level intrigue advice by focusing on player-character contributions, obligations, and role-specific failure modes.",
      relatedIntents: [
        "answer-run-political-intrigue",
        "answer-run-diplomats-nobles-courtiers",
        "answer-run-spies-infiltrators-rpg",
        "answer-journalist-media-character-rpg",
        "answer-specialist-character-spotlight",
        "answer-run-factions-sandbox",
        "answer-political-intrigue-system-selection",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-run-political-intrigue",
          reason:
            "The existing answer builds and runs the campaign's faction conflicts; this page explains how PC role archetypes participate in those conflicts through distinct contributions and obligations.",
        },
        {
          with: "answer-run-diplomats-nobles-courtiers",
          reason:
            "The diplomat answer is a deep dive into negotiation, status, and commitments; this page gives concise genre-level guidance for several roles and links to that detailed procedure.",
        },
        {
          with: "answer-run-spies-infiltrators-rpg",
          reason:
            "The spy answer covers covert access and team-supported infiltration in detail; this page situates that role among other political archetypes and focuses on its campaign contribution.",
        },
        {
          with: "answer-journalist-media-character-rpg",
          reason:
            "The journalist answer provides a detailed reporting loop; this page summarises the role's effect on political knowledge and public response within a wider cast of archetypes.",
        },
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The specialist answer gives a system-neutral approach to sharing attention around an expert; this page covers the specific roles and pressures that arise in political campaigns.",
        },
        {
          with: "answer-run-factions-sandbox",
          reason:
            "The sandbox answer runs factions as ongoing campaign actors; this page focuses on how player characters with different roles influence political scenes and decisions.",
        },
        {
          with: "answer-political-intrigue-system-selection",
          reason:
            "The system comparison helps groups choose rules for political play; this page gives GM guidance for the character roles in that style of campaign.",
        },
        {
          with: "answer-run-hackers-netrunners",
          reason:
            "The hacker answer gives a detailed procedure for running digital intrusions; this page covers a cross-system cast of roles in political campaigns, with no deep dive into hacking scenes.",
        },
      ],
    },
    seo: {
      title:
        "How to Run Character Roles in a Political Intrigue RPG | Codex Cryptica",
      description:
        "Run political RPG roles through shared decisions. Give diplomats, spies, journalists, faction leaders, and dissidents meaningful leverage and obligations.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-character-roles-in-a-political-intrigue-rpg.jpg",
      imageAlt:
        "Political envoys, a reporter, and a guild officer bargain over a bridge contract at a council table",
    },
  };

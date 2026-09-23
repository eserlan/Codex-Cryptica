import type { AnswerConfigInput } from "../schema";

export const howDoIRunHackersOrNetrunnersWithoutSplittingTheParty: AnswerConfigInput =
  {
    slug: "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
    category: "session-prep",
    labels: ["cyberpunk"],
    publishedAt: "2026-09-23",
    question: "How do I run hackers or netrunners without splitting the party?",
    kind: "framework",
    shortAnswer:
      "Run hacking as one thread of the same scene. Give the intrusion a physical objective, a visible source of pressure, and a consequence the crew can see; let the hacker make specialist choices while the others change access, security, or time. Cut between them when the situation changes, then return a solo hack to the group as a decision rather than a private result.",
    sections: [
      {
        kind: "prose",
        heading: "Put shared stakes in the digital scene",
        paragraphs: [
          "A hacker can work alone in the fiction without leaving the other players with nothing to do. The table stalls when only the hacker can see progress, every result changes an invisible status, and the rest of the crew has no decision until the intrusion ends. Let the specialist control the digital approach, then make its effects change a place, person, or choice the whole group cares about.",
          "Start from what the crew needs in the physical scene. A locked door, a camera grid, a transfer of evidence, or a hostile system keeping a lift sealed gives the intrusion a visible job. Map only the network elements that can change play, then put those choices in front of the crew.",
        ],
      },
      {
        kind: "list",
        heading: "Give the intrusion a shared objective and pressure",
        intro:
          "Before play, decide four things. Keep them small enough to explain in a sentence:",
        items: [
          {
            term: "The target",
            text: "Name the physical result the crew wants: open the archive door, copy a record, blind a camera, or stop a remote transfer. Avoid giving the hacker an unbounded goal such as taking control of the whole network.",
          },
          {
            term: "The obstacle",
            text: "Choose the part that makes the approach uncertain: missing credentials, a segmented system, an exposed access point, or a security process that notices unusual activity. Let the hacker decide how to tackle it using the rules of the game.",
          },
          {
            term: "The response",
            text: "Put something in motion that the crew can recognise, such as a guard checking the access panel, a security operator reviewing an alert, or evidence beginning to move off-site. A clock or alarm track can help if the game already uses one; otherwise, describe what changes when pressure rises.",
          },
          {
            term: "The result",
            text: "Decide what success changes in the room and what failure or partial success puts at risk. A denied door, a camera feed switching off, a trace appearing on the terminal, or an alert reaching a patrol gives everyone something to react to.",
          },
        ],
      },
      {
        kind: "prose",
        heading:
          "Cut between the hacker and the crew when the situation changes",
        paragraphs: [
          "Let the hacker make a meaningful choice, resolve it with the system's rules, and say what has changed. Then turn to the other characters while that change is still live. A guard responding to an alert gives the scout a problem; a door unlocked by the hack gives the infiltrator a route; a physical cable or access badge gives the technician a way to help. When one of their actions changes access or pressure, return to the hacker with that new information.",
          "You do not need to switch speakers after every die roll. Cut when the result creates a new risk, reveals a choice, or changes what another character can do. If the game has a structured hacking procedure or initiative order, use it. The scene framing should connect those mechanics to the rest of the table, not replace them with a second set of rules.",
        ],
      },
      {
        kind: "list",
        heading: "Give the physical crew ways to affect the hack",
        intro:
          "Other characters can affect the intrusion without making the specialist's choices for them:",
        items: [
          {
            term: "Create access",
            text: "An infiltrator can reach a terminal, steal a credential, or keep a service hatch open. That changes the hacker's options; it does not mean the infiltrator solves the digital obstacle with a second roll.",
          },
          {
            term: "Manage the physical response",
            text: "A face can misdirect the security operator, a scout can track the patrol, and another character can keep an alarmed door from sealing. Their actions change the crew's options while the hacker still resolves the digital obstacle using the game's rules.",
          },
          {
            term: "Protect the connection",
            text: "A technician might keep power running, move the terminal out of sight, or decide whether to disconnect an exposed device. Each option should carry a consequence the group can weigh.",
          },
          {
            term: "Act on what the hack reveals",
            text: "Once the specialist uncovers a route, name, or vulnerability, ask what the crew wants to do with it. The hacker supplies an opportunity; the party still chooses whether to use it, preserve it, or leave before security closes in.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep both competence and consequence in play",
        paragraphs: [
          "A successful hack should matter. If it opens the route or exposes useful information, do not add another identical barrier just to keep the hacker busy. Leave the next problem to the crew: getting through the door, deciding which evidence to take, or dealing with the person who noticed the intrusion.",
          "A failed attempt should change the situation rather than vanish into a private resource cost. An alert can bring a guard closer, a partial copy can identify the missing file, or an access point can be burned. Use a consequence that follows from the fiction and the system's rules. The hacker remains capable, but the choice about what to risk belongs to the player and the crew.",
        ],
      },
      {
        kind: "prose",
        heading: "Use a solo hack when the result matters to the group",
        paragraphs: [
          "A short solo scene can fit when the hacker is the only character with access or when the rest of the crew has a separate task under pressure. Tell the player what the intrusion can change and what may happen if it goes wrong, then resolve the meaningful choice with the game's procedure. Return to the group with a changed situation or a decision they can act on. If the solo operation needs more than one exchange, give the other characters concurrent work and cut between them at the points where their actions can affect access or security.",
          "Ask how much hidden information the players want before running private details. The hacker can keep a discovery from their characters without making the other players sit through a long sequence of unseen results.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: The clinic archive",
        paragraphs: [
          "The crew needs a copy of a clinic's eviction records before the corporation transfers them from its local archive. The hacker is at a maintenance terminal in the service corridor. The rest of the crew is inside the building, where a security guard is checking the doors after an earlier access alert.",
        ],
        items: [
          {
            term: "The isolated version",
            text: "The GM runs the hacker through several private intrusion checks and tracks unseen progress. The other players wait in the corridor. A failure costs the hacker a resource, but nobody in the building reacts, so the rest of the group still has no decision to make.",
          },
          {
            term: "The shared-scene version",
            text: "The hacker uses a stolen service credential to reach the archive, but the access notice sends the guard towards the corridor. The scout submits a false badge-reader fault, redirecting the guard to the wrong wing; the request leaves a name for security to check later. The technician can hold the service panel open so the hacker can copy the records, or close it before the operator traces the connection. The hacker must choose whether to stop and erase the access trail or keep copying and risk being traced. The crew choose to copy, so they get the records, but security now has the scout's name.",
          },
          {
            term: "Why it works",
            text: "The hacker controls the digital approach, while the other characters affect access and security. Each result appears in the same corridor, and the crew must decide what to protect before the transfer proceeds.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Before you run a hacking scene",
        items: [
          "What physical goal can the network change, and what will the players see when it changes?",
          "What is the one obstacle that makes the hacker's approach uncertain?",
          "Who or what responds to intrusion, and how will that pressure become visible?",
          "What can the other characters do to change access, security, or the consequences?",
          "What does success make possible, and what does a failed or partial result put at risk?",
          "If the hacker acts alone for a beat, what decision or new information will bring the scene back to the group?",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep digital access tied to campaign locations and people",
      paragraphs: [
        "A campaign knowledge graph can connect the terminal, network segment, physical location, security operator, and people who hold access. Recording those links makes it easier to bring a burned credential or changed security response back into a later session.",
      ],
      linkText: "Explore the RPG knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "RPG knowledge graph",
        description:
          "Connect a network access point to its location, owner, security team, and the consequences of a breach.",
        href: "/solutions/rpg-knowledge-graph",
      },
    ],
    relatedAnswers: [
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
      "how-do-i-run-spies-and-infiltrators-in-an-rpg",
    ],
    discovery: {
      id: "answer-run-hackers-netrunners",
      parentCluster: "specialist-roles",
      primaryIntent:
        "how to run hackers or netrunners without splitting the party",
      intentAliases: [
        "how to gm a netrunner",
        "how to run an rpg hacker",
        "how to keep hacking scenes from sidelining the party",
        "how do other player characters help during a hack",
        "how to run hacking scenes in shadowrun",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "Gives GMs a practical procedure for tying a hacker's digital choices to physical access, visible security pressure, and the rest of the crew's actions. It applies across cyberpunk and other genres without prescribing one game's hacking rules.",
      relatedIntents: [
        "answer-specialist-character-spotlight",
        "answer-cyberpunk-party-roles",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The spotlight answer gives cross-role scene patterns; this one focuses on the hacker's digital objective, security response, and concrete ways the physical crew can affect an intrusion.",
        },
        {
          with: "answer-cyberpunk-party-roles",
          reason:
            "The cyberpunk roles answer gives brief guidance for several archetypes; this answer develops the hacker's scene procedure in depth and keeps it useful beyond cyberpunk games.",
        },
      ],
    },
    seo: {
      title:
        "How to run an RPG hacker without splitting the party | Codex Cryptica",
      description:
        "Keep RPG hacking scenes tied to the physical action with shared pressure, useful non-hacker roles, and a clear endpoint for solo intrusions.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-hackers-or-netrunners-without-splitting-the-party.jpg",
      imageAlt:
        "A hacker works at a service terminal as their crew faces a security patrol in a cyberpunk clinic",
    },
  };

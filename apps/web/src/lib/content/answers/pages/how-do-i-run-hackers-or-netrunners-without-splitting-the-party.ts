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
        heading: "Keep the hack inside the shared scene",
        paragraphs: [
          "A hacker can work alone in the fiction without leaving the other players waiting. Avoid: several private hacking checks → invisible progress → private resource loss → everyone else waits. Prefer: specialist choice → visible consequence → crew decision → changed options for the hacker.",
          "Keep the game's hacking procedure intact. Change how you frame the scene and cut between characters, not the specialist mechanics that make the hacker distinct. Shared play means the other characters get decisions and consequential actions; they do not all need hacking rolls. The hacker keeps ownership of the specialist problem.",
          "Start with what the crew needs in the physical scene: a door opened, a camera blinded, evidence copied, or a lift released. Map only the network elements that can change play, then make those changes visible to the crew.",
        ],
      },
      {
        kind: "list",
        heading: "Use this scene loop",
        items: [
          {
            term: "Choose",
            text: "The hacker makes a meaningful specialist choice.",
          },
          {
            term: "Resolve",
            text: "Use the game's own hacking rules.",
          },
          {
            term: "Show",
            text: "Make the change visible in the physical or shared situation.",
          },
          {
            term: "Respond",
            text: "Let another character react or change access, security, or time.",
          },
          {
            term: "Return",
            text: "Go back to the hacker when that response changes their options.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Give the intrusion a shared objective and pressure",
        intro: "Before play, set four things the table can grasp quickly:",
        items: [
          {
            term: "The target",
            text: "Name the physical result the crew wants: open the archive door, copy a record, blind a camera, or stop a remote transfer. Avoid giving the hacker an unbounded goal such as taking control of the whole network.",
          },
          {
            term: "The obstacle",
            text: "Choose what makes the approach uncertain: missing credentials, a segmented system, an exposed access point, or security that notices unusual activity. The hacker decides how to tackle it using the game's rules.",
          },
          {
            term: "The response",
            text: "Put a visible response in motion: a guard checks the access panel, an operator reviews an alert, or evidence starts moving off-site. Use a clock or alarm track if the game has one; otherwise describe what changes as pressure rises.",
          },
          {
            term: "The result",
            text: "Decide what success changes and what failure or partial success risks. A denied door, a dead camera feed, a trace on the terminal, or an alert reaching a patrol gives the crew something to react to.",
          },
        ],
      },
      {
        kind: "prose",
        heading:
          "Cut between the hacker and the crew when the situation changes",
        paragraphs: [
          "After a hacking result changes the situation, turn to the crew while that change is live. An alert gives the scout a patrol to track; an unlocked door gives the infiltrator a route; a physical cable gives the technician a choice. Return to the hacker when the crew's response changes access or pressure.",
          "Cut when a result creates a risk, reveals a choice, or changes what someone can do, not after every roll. Keep any structured hacking procedure or initiative order the game uses.",
        ],
      },
      {
        kind: "list",
        heading: "Give the physical crew ways to affect the hack",
        intro:
          "Give the crew consequential actions around the intrusion, while the hacker makes the digital choices:",
        items: [
          {
            term: "Create access",
            text: "An infiltrator can reach a terminal, steal a credential, or keep a service hatch open. That changes the hacker's options; it does not mean the infiltrator solves the digital obstacle with a second roll.",
          },
          {
            term: "Manage the physical response",
            text: "A face can misdirect the operator, a scout can track the patrol, or another character can hold an alarmed door. These actions change access, security, or time; they do not require another hacking roll.",
          },
          {
            term: "Protect the connection",
            text: "A technician can keep power on, hide the terminal, or choose whether to disconnect an exposed device. Give each option a consequence the group can weigh.",
          },
          {
            term: "Act on what the hack reveals",
            text: "When the hacker finds a route, name, or vulnerability, ask what the crew will do with it: use it, preserve it, or leave before security closes in.",
          },
        ],
      },
      {
        kind: "prose",
        heading: "Keep both competence and consequence in play",
        paragraphs: [
          "Let success matter: if the hack opens a route or exposes information, do not add the same barrier again to keep the hacker busy. Give the crew the next decision, such as which evidence to take or how to handle the person who noticed.",
          "Let failure change the situation, not disappear into a private resource cost. An alert can bring a guard closer, a partial copy can reveal the missing file, or an access point can be burned. Follow the fiction and the system's rules; keep the hacker capable and let the player choose what to risk.",
        ],
      },
      {
        kind: "prose",
        heading: "Use a solo hack when the result matters to the group",
        paragraphs: [
          "A solo hack is fine when it returns quickly to the group as a changed situation, actionable discovery, or shared decision. It can fit when only the hacker has access or the crew has another task under pressure. State what the intrusion can change and what is at risk, then use the game's procedure. If it takes more than one exchange, give the others concurrent work and cut in when their actions can change access or security.",
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
            text: "The hacker uses a stolen service credential to reach the archive, but the access notice sends the guard towards the corridor. The scout poses as a lost courier and talks the guard into escorting them towards reception, giving the hacker time. The technician can hold the service panel open so the hacker can copy the records, or close it before the operator traces the connection. The hacker keeps copying and accepts the trace risk; the crew gets the records, while security can identify the scout and investigate the access trail.",
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
          "What physical goal does the crew want, and what meaningful specialist choice can the hacker make?",
          "What obstacle makes the approach uncertain, and which game rules resolve it?",
          "What will visibly change in the shared situation after the result?",
          "How can another character change access, security, or time in response?",
          "What new options or risks should that response give the hacker?",
          "If the hacker acts alone, what actionable result will quickly return the scene to the group?",
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
      "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
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
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "The investigator answer focuses on sharing clue discovery and interpretation; this answer focuses on connecting a hacker's digital intrusion to physical access and security pressure.",
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

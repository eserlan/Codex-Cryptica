import type { AnswerConfigInput } from "../schema";

export const howDoIRunCommonCharacterRolesInASciFiOrSpaceOperaRpg: AnswerConfigInput =
  {
    slug: "how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
    category: "running-the-game",
    labels: ["sci-fi"],
    publishedAt: "2026-09-28",
    question:
      "How do I run common character roles in a sci-fi or space-opera RPG?",
    kind: "framework",
    shortAnswer:
      "Run each sci-fi specialist by giving their expertise a clear way to change the shared situation, a practical technique that keeps the rest of the crew involved, and a pressure that follows the result. Let the pilot shape how the group moves, the engineer decide what stays working under stress, the scientist reduce uncertainty without removing the decision, and the captain choose between competing priorities. Tie digital, social and technical actions to what is happening in the room so the table plays one scene together rather than a set of isolated mini-games.",
    sections: [
      {
        kind: "prose",
        heading: "Why starship crews pull the table apart",
        paragraphs: [
          "A sci-fi or space-opera crew often looks like a list of jobs: pilot at the helm, engineer in the drive bay, medic in sickbay, scientist at the sensor console, captain on the bridge, diplomat handling first contact, hacker in the systems, scout reading the survey. That is a useful shorthand for who does what, but it can become a set of separate mini-games where one player rolls while everyone else waits for the ship to finish its turn.",
          "These are genre archetypes rather than required classes, and your game may give them different names or combine several into one character. The guidance below works whether you run Traveller, Mothership, Scum and Villainy, Stars Without Number, Coriolis, Lancer, or another game that supports a mixed crew. Avoid treating the list as a class roster to fill. Instead, ask for each role what it changes about scene design, how you keep the whole table in the conversation, and what happens when the specialist cannot act or fails.",
          "A consistent pattern from the specialist spotlight framework helps: specialist acts, situation changes, others respond, party decides, return to specialist. Keep the specialist's competence real, make the result change something the whole crew can see and act on, and cut back to the shared scene whenever time, access, or risk changes for someone else.",
        ],
      },
      {
        kind: "list",
        heading: "What each role changes and how to run it",
        intro:
          "Treat each entry as a flexible function rather than a fixed assignment. For each role, note what it changes, a technique that keeps play shared, a pressure that keeps the decision interesting, a common failure mode, and where to read more:",
        items: [
          {
            term: "Pilot or Helmsman",
            text: "Changes: how, where and when the group can move, and what arriving there costs. Technique: frame travel or manoeuvring as a shared choice rather than a private check. Put terrain, traffic, pursuit, a closing window, or a damaged system in front of the helm so the pilot's decision changes what the engineer must hold together and what the scout can survey next. Pressure: a route that is fast but exposed, a manoeuvre that saves fuel but risks a hard burn, a landing that requires someone to talk to port control while the pilot handles the approach. Failure mode: a long sequence of pilot-only checks resolves travel while the rest of the table has nothing to do until the destination loads. For Traveller or Starfinder tables, resist turning every voyage into a full ship-combat subsystem.",
          },
          {
            term: "Engineer or Tech",
            text: "Changes: what remains possible under stress, which systems stay available, and what will need attention later. Technique: let technical expertise change live situations, not only repairs between scenes. The engineer can stabilise a drive during a burn, reroute power to give the pilot an option that did not exist, or declare a fix as temporary so the group must plan around its limit. Pressure: limited spares, a workaround that creates a new risk such as heat, noise or a traceable signature, or a choice between keeping life support quiet and keeping weapons armed. Failure mode: engineering becomes an off-screen maintenance roll with no effect on the current scene. Keep the consequence visible: a system that will fail after one more use, or a jury-rig that draws attention.",
          },
          {
            term: "Scientist or Analyst",
            text: "Changes: how much uncertainty the group must carry into its next decision. Technique: let knowledge reduce uncertainty without erasing decisions. Give the scientist better questions, comparisons to known phenomena, and what remains unknown, rather than a single answer that settles the plot. A sensor reading might confirm a structure is artificial but not who built it, or a sample might identify a pathogen's vector but not whether the carrier survived. Pressure: time to verify, a sample that degrades, a reading that conflicts with a witness, or needing to explain the finding to someone who will act on it. Failure mode: lore becomes a lecture that answers everything, or the expert learns too much too safely. Keep interpretation separate from observation so the party can still debate what to do.",
          },
          {
            term: "Diplomat or Envoy",
            text: "Changes: which doors, terms and commitments are available to the group. Technique: build negotiation around interests and commitments rather than a single persuasion roll. Note what each side actually needs, what they can offer, what they cannot concede, and what a promise will cost later. Let the diplomat lead the exchange while other characters bring evidence the scientist verified, security the scout arranged, or leverage the hacker uncovered. Pressure: a counterpart who answers to someone else, a cultural protocol that makes a direct demand costly, or a deal that requires the captain to stake the crew's reputation. Failure mode: one roll settles the whole exchange while the rest of the party watches. Keep success as improved position or a new choice, not an automatic agreement. Deep dive: how to run a diplomat, noble or courtier.",
          },
          {
            term: "Hacker or Systems specialist",
            text: "Changes: access, information and control over security, communications and automation in the scene. Technique: tie every digital action to the physical situation. Resolve the intrusion in short beats and cut back whenever a door opens, a camera blinds, or an alert changes what the crew must do right now. Give the rest of the party ways to affect the hack by handling physical access, time, or attention, and let their outcomes change the hacker's options. Pressure: a trace that grows with time, a system that requires someone at a terminal on site, or a countermeasure that locks out the hacker unless the engineer keeps power steady. Failure mode: a private run of checks with only invisible resource costs while the table waits for a result. Keep the hack inside the shared scene. Deep dive: how to run hackers or netrunners without splitting the party.",
          },
          {
            term: "Captain or Commander",
            text: "Changes: which priorities the group commits to and who carries responsibility for the choice. Technique: give authority responsibility and trade-offs rather than control over other player characters. Let the captain choose between competing goods such as crew safety, mission completion, a treaty obligation or a rescue window, then record what was promised and who will judge it. The captain's skill opens the decision and sets its terms; the group still decides together. Pressure: an order that protects one need while exposing another, a superior who expects a report, or a crew member whose trust depends on what is risked. Failure mode: the captain becomes a player who directs other player characters, which replaces collaboration with instruction. Frame the captain as accountable to the table, not as the person who tells others what to do.",
          },
          {
            term: "Scout or Explorer",
            text: "Changes: what the group knows about the route, the site and the risks before it commits. Technique: make navigation, survey and risk assessment shape choices rather than just revealing map. Let the scout compare routes or landing sites by time, exposure, resources and what remains unseen, then bring that assessment back as an option the group must select. Pressure: a safe path that misses a narrow window, a rich site that requires splitting the crew, or a reading that suggests danger without confirming it. Failure mode: scouting becomes a separate solo expedition that reports back only after it is finished, leaving the rest of the crew idle. Keep the survey short and return with a decision the party must make now.",
          },
          {
            term: "Medic",
            text: "Changes: how long the group can keep going, who remains able to act, and what care costs in time and resources. Technique: make triage and limited resources consequential without forcing one player into permanent support duty. The medic can stabilise, choose who recovers first, or declare a treatment as stabilising rather than curing so the patient can act at a cost. Give other characters ways to help such as securing supplies, protecting the casualty, or handling the situation the injury interrupted. Pressure: limited meds, a procedure that needs a stable platform the pilot must provide, or a patient who cannot be moved without engineering help. Failure mode: the medic only matters between fights and has no meaningful choice during play, or becomes trapped as the table's required healer. Keep medical decisions tied to what the crew must do next.",
          },
        ],
      },
      {
        kind: "prose",
        heading:
          "Keep specialist expertise distinct without splitting the crew",
        paragraphs: [
          "Several characters may be able to learn the same fact or open the same door, but they do not need to do the same job. The scientist might confirm a signal is artificial while the engineer recognises it as a bearing failure in the array, and the diplomat knows which faction would claim it. Let those contributions change the same meeting, burn, or landing rather than building a separate scene for each role.",
          "Cut between actions when new information, a cost, or a choice changes what someone else can do. If one character negotiates alone, keep the scene as long as it holds a decision or discovery, then return with information the group can act on. Brief private actions work when they end with a shared choice. Check with players about how they want authority, secrets between characters, and spotlight handled before using hidden knowledge or command conflicts.",
        ],
      },
      {
        kind: "example",
        heading: "Worked example: a late arrival at Wayfinder Station",
        paragraphs: [
          "A small crew carries medical supplies to Wayfinder Station, a transfer hub orbiting a disputed moon. Their charter requires arrival before a quarantine inspection closes the high dock, but the approach corridor is crowded with a convoy, a customs drone sweep, and a failing coolant loop in the drive.",
        ],
        items: [
          {
            term: "The mini-game version",
            text: "The pilot runs a long sequence of helm checks alone while the rest of the table watches travel resolve. The engineer then rolls separately to fix the coolant between scenes, with no effect on the approach. The scientist reads the moon's survey in a private exchange that does not change the landing choice. The diplomat waits for arrival before any negotiation begins, the hacker sits out because the station network is handled as a future scene, and the medic has nothing to do until someone is hurt. Each specialist is competent, but their actions happen in sequence and do not change what anyone else is doing.",
          },
          {
            term: "The shared-crew version",
            text: "The scout compares two approach lanes: the chartered corridor is fast but puts the ship under the customs sweep, while a maintenance lane avoids the sweep but adds a burn the coolant loop may not tolerate. The pilot can fly either, and the engineer's assessment changes the choice: a temporary reroute keeps thrust available but leaves life support running hot, with a visible cost if the burn is extended. The scientist clarifies that the moon's recent flare makes the second lane's radiation a composed risk rather than an unknown. The hacker offers to spoof the transponder for the maintenance lane, but needs the pilot to hold steady long enough for a physical relay the rest of the crew must place. The diplomat prepares a commitment the captain will need to make at the high dock: accept a quarantine inspection that delays the medical delivery, or stake the charter on a promise to submit to a full hold inspection after offload. The medic notes that the delay affects a patient already waiting for the supplies. The captain weighs crew strain, charter obligation, and delivery need, then chooses. The choice leaves a record the station will refer back to.",
          },
          {
            term: "Why it works",
            text: "No role settles the arrival alone. The scout frames the options, the engineer and scientist change what each option costs and how well the group understands it, the hacker and diplomat create access at a price, the medic makes the delay matter, the pilot executes the shared plan, and the captain carries the commitment. Each specialist changes the same approach and docking decision the whole table faces.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Prep checklist for a sci-fi crew session",
        intro:
          "Before play, check that each specialist has a reason to be in the same scene as the rest of the crew:",
        items: [
          "Every role that is present has one concrete way its success changes what the other players can do next.",
          "Travel, manoeuvring or survey includes a terrain, window or trade-off the pilot and scout must decide together, not only a distance to cross.",
          "At least one technical or medical outcome leaves a visible limit the group must plan around, such as a system that will fail after one more use or a patient who cannot be moved yet.",
          "Knowledge and sensor results reduce uncertainty but still leave an interpretation the party can debate.",
          "Negotiation or authority creates a commitment, record, or observer who will return to judge what was promised.",
          "Digital actions require proximity, time, or attention the physical crew can affect, and produce a change the crew can see.",
          "You know what a failure or absence changes: cost, timing, exposure, certainty, or who now owes whom, rather than only whether a specialist succeeds.",
          "If a specialist must act alone, you have a clear purpose for the solo beat and a way to return with a decision the group can use while there is still time to act.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep crew roles, ships and promises connected",
      paragraphs: [
        "A starship crew produces a web of ships, systems, contacts, routes and commitments that outlasts any single arrival or negotiation. That makes it useful to record who promised what at Wayfinder Station, which system is running hot after the engineer's reroute, and which lane the scout's survey still leaves uncertain, so you can see at a glance which roles contributed and what remains at risk next session.",
        "Codex Cryptica lets you keep those links in one place, from the ship's drive state to the charter obligation the captain staked, then bring them back to the table when the consequence arrives rather than relying on memory alone.",
      ],
      linkText: "Explore the RPG knowledge graph",
      href: "/solutions/rpg-knowledge-graph",
    },
    relatedTools: [
      {
        title: "Settlement generator",
        description:
          "Build a station, port, or colony with trade, authority, and pressure already sketched in.",
        href: "/generators/settlement",
      },
      {
        title: "Faction generator",
        description:
          "Create the consortium, house, or fleet whose charter terms, patrols, or inspections shape a captain's decisions.",
        href: "/generators/faction",
      },
      {
        title: "NPC generator",
        description:
          "Roll a port authority, envoy, or rival captain with a want and a relationship hook the diplomat or captain can act on.",
        href: "/generators/npc",
      },
    ],
    relatedForPages: [
      {
        title: "Codex Cryptica for Space Opera",
        description:
          "Organise starships, stations, surveys and crew commitments in one connected workspace.",
        href: "/for/space-opera",
      },
      {
        title: "Codex Cryptica for Starship Campaigns",
        description:
          "Track ships, crews, and voyages across a connected sector.",
        href: "/for/starship-campaigns",
      },
    ],
    relatedAnswers: [
      "how-do-i-give-specialist-characters-spotlight",
      "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
      "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
      "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
      "how-do-i-run-character-roles-in-an-investigative-horror-rpg",
      "how-do-i-run-character-roles-in-a-political-intrigue-rpg",
      "what-kind-of-ship-should-a-sci-fi-rpg-party-start-with",
      "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
      "how-to-create-a-sci-fi-star-system-for-an-rpg",
      "how-do-you-make-an-alien-species-feel-believable",
    "how-do-i-run-common-character-roles-in-a-fantasy-rpg",
  ],
    discovery: {
      id: "answer-sci-fi-character-roles",
      parentCluster: "specialist-roles",
      clusters: ["specialist-roles", "sci-fi-space-opera"],
      primaryIntent:
        "how to run character roles in a sci-fi or space opera rpg",
      intentAliases: [
        "sci-fi rpg roles",
        "space opera character roles",
        "how to gm a pilot rpg",
        "how to run a starship crew",
        "sci-fi character archetypes gm tips",
        "how to run specialist roles in a sci-fi rpg",
        "space opera crew roles guide for gms",
        "how to run a captain or engineer in an rpg",
      ],
      userJob: "adopt-workflow",
      uniqueValue:
        "A genre-entry framework for eight sci-fi and space-opera specialist roles that gives each one a scene-design change, a shared-play technique, a pressure, a failure mode, and deep-dive links, with a worked arrival and a crew prep checklist.",
      relatedIntents: [
        "answer-specialist-character-spotlight",
        "answer-run-hackers-netrunners",
        "answer-run-diplomats-nobles-courtiers",
        "answer-cyberpunk-party-roles",
        "answer-travel-interesting",
        "answer-create-sci-fi-star-system",
        "answer-starter-ship-sci-fi",
        "answer-make-alien-species-believable",
      ],
      acknowledgedOverlap: [
        {
          with: "answer-specialist-character-spotlight",
          reason:
            "The spotlight answer gives reusable scene structures for any specialist across genres; this answer applies those structures to eight sci-fi and space-opera archetypes with genre-specific pressures and a crew-level arrival.",
        },
        {
          with: "answer-run-hackers-netrunners",
          reason:
            "This crew answer summarises what a systems specialist contributes inside a shared starship scene; the hacker answer is the focused procedure for running digital intrusions without leaving the physical crew idle.",
        },
        {
          with: "answer-run-diplomats-nobles-courtiers",
          reason:
            "This crew answer summarises what a diplomat or envoy contributes to starship-scale commitments; the diplomat answer is the focused procedure for building negotiations around interests and trade-offs.",
        },
        {
          with: "answer-cyberpunk-party-roles",
          reason:
            "The cyberpunk roles page situates specialists inside a shared physical job in a street-level crew; this answer situates specialists inside starship operations, travel, and station-scale commitments.",
        },
        {
          with: "answer-run-character-roles-political-intrigue",
          reason:
            "The political roles page covers overlapping archetypes such as diplomat and captain inside faction play; this page covers the same roles as they function inside sci-fi travel, engineering, and survey operations.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "The investigator answer focuses on clue access, interpretation, and shared decisions around a detective character; this page applies shared-scene techniques across a starship crew's pilot, engineer, scientist, diplomat, hacker, captain, scout, and medic roles.",
        },
        {
          with: "answer-character-roles-investigative-horror",
          reason:
            "The investigative horror roles page covers overlapping archetypes such as scientist, diplomat, and hacker inside a shared investigation; this page covers the same functions inside starship and space-opera operations with distinct travel and system pressures.",
        },
      ],
    },
    seo: {
      title:
        "How do I run sci-fi crew roles? Space-opera guide | Codex Cryptica",
      description:
        "GM guidance for sci-fi and space-opera crews: pilot, engineer, scientist, diplomat, hacker, captain, scout and medic, with shared-scene techniques and a worked arrival.",
      image:
        "https://assets.codexcryptica.com/og/how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg.jpg",
      imageAlt:
        "A diverse starship bridge crew of pilot, engineer, scientist, captain and medic gathered around a holo display of an orbital station approach",
    },
  };

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
      "Run each sci-fi specialist by giving their expertise a clear way to change the shared situation, a practical technique that keeps the rest of the team involved, and a pressure that follows the result. Let the pilot shape how the group moves, the engineer decide what stays working under stress, the scientist reduce uncertainty without removing the decision, and the commander choose between competing priorities. Tie physical, digital, social and technical actions to what is happening in the scene so the table plays together rather than through isolated mini-games.",
    sections: [
      {
        kind: "prose",
        heading: "Why specialist teams can pull the table apart",
        paragraphs: [
          "A sci-fi or space-opera team often looks like a list of jobs: pilot at the helm, engineer in the drive bay, medic in sickbay, scientist at the sensor console, commander on the bridge, security specialist holding a breach, diplomat handling first contact, systems specialist at a terminal, scout reading the survey. That shorthand helps show who does what, but the jobs can become separate mini-games where one player acts while everyone else waits for the ship, mission or negotiation to finish.",
          "These are genre archetypes rather than required classes, and your game may give them different names or combine several into one character. They are functions, not necessarily bridge jobs: use them for a mixed crew or expedition team in Traveller, Mothership, Scum and Villainy, Stars Without Number, Coriolis, or another game with shared missions and specialist roles. Avoid treating the list as a class roster to fill. Instead, ask what each role changes about the scene, how you keep the whole table involved, and what happens when a specialist cannot act or fails.",
          "A consistent pattern from the specialist spotlight framework helps: specialist acts, situation changes, others respond, party decides, return to specialist. Keep the specialist's competence real, make the result change something the whole team can see and act on, and cut back to the shared scene whenever time, access or risk changes for someone else.",
          "On a planetary survey, the scout compares two routes, the scientist assesses an atmospheric hazard, the engineer determines which rover can manage it, and a security specialist plans protection. The diplomat handles access to a local settlement while the medic sets an exposure limit. Their findings change one shared choice about where and how the team proceeds, without a bridge or docking bay.",
        ],
      },
      {
        kind: "list",
        heading: "What each role changes and how to run it",
        intro:
          "Treat each entry as a flexible function rather than a fixed assignment. The labelled prompts make each role easy to scan: what it changes, how to keep play shared, what pressure follows, a common failure mode, and an optional deep dive.",
        items: [
          {
            term: "Pilot, Driver or Vehicle Operator",
            text: "Changes: how the group moves and what reaching a destination costs. Technique: make travel or manoeuvring a shared choice. Put terrain, traffic, pursuit, a closing window or damaged equipment in the specialist's path so their decision changes what the engineer must keep working and what the scout can survey next. Pressure: a fast but exposed route, a fuel-saving manoeuvre that risks a hard burn, or a landing that needs someone to talk to port control. Failure mode: a run of solo checks leaves the table waiting for the destination. Use the game's detailed travel rules or vehicle- and ship-combat procedures when choices and risks justify them, rather than for every routine journey.",
          },
          {
            term: "Engineer or Technician",
            text: "Changes: what remains possible under stress, which systems stay available, and what needs attention later. Technique: let technical expertise change the live situation, not only repairs between scenes. A repair result can offer a temporary fix, limited use or trade-off when the chosen system's outcome supports it. That limit can give the pilot a new option while making the engineer plan around heat, noise or a traceable signature. Pressure: limited spares or a choice between quiet life support and armed weapons. Failure mode: engineering becomes an off-screen maintenance roll with no effect on the current scene. Keep consequences visible, such as a system at risk after one more use or a jury-rig that draws attention.",
          },
          {
            term: "Scientist or Analyst",
            text: "Changes: how much uncertainty the group must carry into its next decision. Technique: let knowledge reduce uncertainty without erasing decisions. Give the scientist better questions, comparisons to known phenomena, and what remains unknown, rather than a single answer that settles the plot. A sensor reading might confirm a structure is artificial but not who built it, or a sample might identify a pathogen's vector but not whether the carrier survived. Pressure: time to verify, a sample that degrades, a reading that conflicts with a witness, or needing to explain the finding to someone who will act on it. Failure mode: lore becomes a lecture that answers everything, or the expert learns too much too safely. Keep interpretation separate from observation so the party can still debate what to do.",
          },
          {
            term: "Diplomat or Envoy",
            text: "Changes: which doors, terms and commitments are available to the group. Technique: build negotiation around interests and commitments rather than a single persuasion roll. Note what each side needs, can offer and cannot concede, and what a promise will cost later. Let the diplomat lead while others bring evidence the scientist verified, protection the security specialist arranged, or leverage the systems specialist uncovered. Pressure: a counterpart who answers to someone else, a costly cultural protocol, or a deal that puts the crew's reputation at stake. Failure mode: one roll settles the exchange while everyone else watches. Keep success as improved position or a new choice, not an automatic agreement. Deep dive: how to run a diplomat, noble or courtier.",
          },
          {
            term: "Hacker, Systems or Communications Specialist",
            text: "Changes: access, information and control over security, communications and automation in the scene. Technique: tie every digital action to the physical situation. Resolve the intrusion in short beats and cut back whenever a door opens, a camera blinds, or an alert changes what the crew must do right now. Give the rest of the party ways to affect the hack by handling physical access, time, or attention, and let their outcomes change the hacker's options. Pressure: a trace that grows with time, a system that requires someone at a terminal on site, or a countermeasure that locks out the hacker unless the engineer keeps power steady. Failure mode: a private run of checks with only invisible resource costs while the table waits for a result. Keep the hack inside the shared scene. Deep dive: how to run hackers or netrunners without splitting the party.",
          },
          {
            term: "Captain, Commander or Team Leader",
            text: "Changes: which priorities the group commits to and who carries responsibility. Technique: agree out of character how command authority works, then honour that fiction without letting one player take away another's agency. A commander can issue orders and choose between crew safety, mission completion, a treaty obligation or a rescue window; the table may agree that disobedience has consequences. The commander never decides what another character thinks, feels or ultimately does. Pressure: an order that protects one need while exposing another, a superior expecting a report, or a crew member whose trust is at stake. Failure mode: the captain's player uses authority beyond the agreed fiction to direct another player's character.",
          },
          {
            term: "Scout, Surveyor or Recon Specialist",
            text: "Changes: what the group knows about a route, site and its risks before committing. Technique: make navigation, survey and risk assessment shape choices rather than just reveal a map. Compare routes or landing sites by time, exposure, resources and what remains unseen, then bring the assessment back as an option the group must select. Pressure: a safe path that misses a narrow window, a rich site that requires splitting the team, or a reading that suggests danger without confirming it. Failure mode: a separate solo expedition reports back only after it ends, leaving everyone else idle. Keep the survey short and return with a decision the party must make now.",
          },
          {
            term: "Security, Marine, Gunner or Combat Specialist",
            text: "Changes: who can be protected, which threats can be contained, and how long the team can hold a dangerous position. Technique: make force create choices for everyone: hold the airlock or pursue an intruder, protect the scientist or secure the objective, fire on a pursuing craft or preserve power and stealth. Pressure: ammunition or heat limits, collateral harm to civilians, legal consequences, decompression or fragile infrastructure. Failure mode: every obstacle becomes a fight and the combat specialist monopolises danger while technical and social specialists wait. Make clear what force cannot solve.",
          },
          {
            term: "Medic",
            text: "Changes: how long the group can keep going, who remains able to act, and what care costs in time and resources. Technique: make triage consequential without forcing one player into permanent support duty. A treatment result can offer stabilisation, limited recovery or a trade-off when the chosen system's outcome supports it. Other characters can secure supplies, protect the casualty or handle the situation the injury interrupted. Pressure: limited medicine, a procedure that needs a stable platform, or a patient who cannot be moved without technical help. Failure mode: the medic only matters between fights or becomes the table's required healer. Keep medical decisions tied to what the team must do next.",
          },
        ],
      },
      {
        kind: "prose",
        heading:
          "Keep specialist expertise distinct without splitting the crew",
        paragraphs: [
          "Several characters may be able to learn the same fact or open the same door, but they do not need to do the same job. The scientist might confirm a signal is artificial while the engineer recognises it as a bearing failure in the array, and the diplomat knows which faction would claim it. Let those contributions change the same meeting, operation or landing rather than building a separate scene for each role.",
          "Cut between actions when new information, a cost, or a choice changes what someone else can do. If one character negotiates alone, keep the scene as long as it holds a decision or discovery, then return with information the group can act on. Brief private actions work when they end with a shared choice. Check with players how they want authority, secrets between characters and spotlight handled before using hidden knowledge or command conflicts.",
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
            text: "The scout compares two approach lanes: the chartered corridor is fast but puts the ship under the customs sweep, while a maintenance lane avoids the sweep but adds a burn the coolant loop may not tolerate. If the system's resolution supports it, the engineer's result makes a temporary reroute available: thrust stays online, but life support runs hot if the burn is extended. The scientist clarifies that the moon's recent flare makes the second lane's radiation a known risk rather than an unknown. The hacker offers to spoof the transponder for the maintenance lane, but needs the pilot to hold steady long enough for a physical relay the rest of the crew must place. The diplomat prepares a commitment the commander will need to make at the high dock: accept a quarantine inspection that delays the medical delivery, or stake the charter on a promise to submit to a full hold inspection after offload. The medic notes that the delay affects a patient already waiting for the supplies. The commander weighs crew strain, charter obligation and delivery need, then chooses. The choice leaves a record the station will refer back to.",
          },
          {
            term: "Why it works",
            text: "No role settles the arrival alone. The scout frames the options, the engineer and scientist change what each option costs and how well the group understands it, the hacker and diplomat create access at a price, the medic makes the delay matter, the pilot executes the shared plan, and the commander carries the commitment. Each specialist changes the same approach and docking decision the whole table faces.",
          },
        ],
      },
      {
        kind: "checklist",
        heading: "Prep checklist for a sci-fi team session",
        intro:
          "Before play, check that each specialist has a reason to be in the same scene as the rest of the team:",
        items: [
          "Every role that is present has one concrete way its success changes what the other players can do next.",
          "Travel, manoeuvring or survey includes a terrain, window or trade-off the pilot and scout must decide together, not only a distance to cross.",
          "At least one technical or medical outcome leaves a visible limit the group must plan around, such as a system that will fail after one more use or a patient who cannot be moved yet.",
          "Knowledge and sensor results reduce uncertainty but still leave an interpretation the party can debate.",
          "Negotiation or authority creates a commitment, record, or observer who will return to judge what was promised.",
          "Digital actions require proximity, time or attention the physical team can affect, and produce a change everyone can see.",
          "You know what a failure or absence changes: cost, timing, exposure, certainty, or who now owes whom, rather than only whether a specialist succeeds.",
          "If a specialist must act alone, you have a clear purpose for the solo beat and a way to return with a decision the group can use while there is still time to act.",
        ],
      },
    ],
    codexConnection: {
      heading: "Keep team roles, vehicles and promises connected",
      paragraphs: [
        "A sci-fi team produces a web of vehicles, systems, contacts, routes and commitments that outlasts any single mission or negotiation. That makes it useful to record who promised what at Wayfinder Station, which system is running hot after the engineer's reroute, and which lane the scout's survey still leaves uncertain, so you can see at a glance which roles contributed and what remains at risk next session.",
        "Codex Cryptica lets you keep those links in one place, from a vehicle's condition to the obligation the commander accepted, then bring them back to the table when the consequence arrives rather than relying on memory alone.",
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
        "A genre-entry framework for sci-fi and space-opera specialist functions across crews and expedition teams, with a shared-play technique, pressure and failure mode for each, plus a worked arrival and team prep checklist.",
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
            "The spotlight answer gives reusable scene structures for any specialist across genres; this answer applies those structures to nine sci-fi and space-opera functions across crews and expedition teams, with genre-specific pressures and both planetary-survey and crew-arrival examples.",
        },
        {
          with: "answer-run-hackers-netrunners",
          reason:
            "This team answer summarises what a systems specialist contributes to a shared sci-fi operation; the hacker answer is the focused procedure for running digital intrusions without leaving the rest of the team idle.",
        },
        {
          with: "answer-run-diplomats-nobles-courtiers",
          reason:
            "This team answer summarises what a diplomat or envoy contributes to shared sci-fi operations; the diplomat answer is the focused procedure for building negotiations around interests and trade-offs.",
        },
        {
          with: "answer-cyberpunk-party-roles",
          reason:
            "The cyberpunk roles page situates specialists inside a shared physical job in a street-level crew; this answer situates specialists across ship operations and planetary expedition teams, with travel and station-scale commitments.",
        },
        {
          with: "answer-run-character-roles-political-intrigue",
          reason:
            "The political roles page covers overlapping archetypes such as diplomat and captain inside faction play; this page covers the same roles as they function inside sci-fi travel, engineering, and survey operations.",
        },
        {
          with: "answer-run-investigator-without-sidelining-party",
          reason:
            "The investigator answer focuses on clue access, interpretation, and shared decisions around a detective character; this page applies shared-scene techniques across sci-fi team roles, including a security specialist, with both starship and planetary-survey examples.",
        },
        {
          with: "answer-character-roles-investigative-horror",
          reason:
            "The investigative horror roles page covers overlapping archetypes such as scientist, diplomat, and hacker inside a shared investigation; this page covers the same functions across sci-fi crew and expedition operations with distinct travel and system pressures.",
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

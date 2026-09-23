import type { AnswerConfigInput } from "../schema";

export const howDoYouRunCharacterRolesInACyberpunkRpg: AnswerConfigInput = {
  slug: "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
  category: "session-prep",
  labels: ["cyberpunk"],
  publishedAt: "2026-09-23",
  question: "How do you run character roles in a cyberpunk RPG?",
  kind: "framework",
  shortAnswer:
    "Run each cyberpunk specialist role by tying its objective to something the whole crew can see happening in the room, rather than to a private side scene that leaves the table waiting. A netrunner's slice can open a door the crew is standing at, a fixer's favour can carry a cost that surfaces later, and a solo's combat skill can support the crew's plan rather than replace it. Give each role a concrete way to change a scene and a realistic way it can go wrong, then let those roles collide inside a shared job.",
  sections: [
    {
      kind: "prose",
      heading: "Why cyberpunk rosters split the table",
      paragraphs: [
        "A cyberpunk crew can mix very different kinds of expertise: one player runs code, one runs contacts, one runs a gun, one runs a van. These are genre archetypes rather than required classes: your game may give them different names or combine several into one character. That variety is part of the genre's appeal, but it can leave each specialist in a separate scene while the rest of the group waits for their turn to matter. A netrunner fighting intrusion countermeasures alone may fit the fiction, but at the table it can leave everyone else watching one player roll dice.",
        "Keep each role distinct, but make its specialist action land somewhere the whole crew can react to: a door the netrunner opens, a guard the solo pulls off a chokepoint, a contact the fixer burns. Treat the specialist's private skill as input and the shared physical scene as output, so the group can see what changed and decide what to do next.",
      ],
    },
    {
      kind: "list",
      heading: "Running each specialist role at the table",
      intro:
        "For each archetype, identify what it changes, how the rest of the crew can affect the scene, and a failure mode that creates play rather than ending it.",
      items: [
        {
          term: "Hacker or netrunner",
          text: "Contribution: Open a door, blind a camera, or scramble a guard's radio. Technique: Resolve the hack in short beats and cut back whenever the room changes, giving the crew something they can see and act on. Watch for: A private run of checks with only invisible resource costs; make a setback affect access, time, or security instead.",
        },
        {
          term: "Media or journalist",
          text: "Contribution: Turn evidence into public pressure, while putting a source, deadline, or reputation at stake. Technique: Involve the crew in finding proof, protecting sources, and handling fallout; let publication create a new choice rather than settle the conflict. Watch for: Treating credibility as a universal points system or changing established facts to manufacture doubt. For more, see the journalist and Media guide.",
        },
        {
          term: "Fixer or broker",
          text: "Contribution: Bring access, contacts, or favours the crew cannot get elsewhere. Technique: Make a favour change what the crew can do now, and record any debt or reputation cost. Watch for: A common failure mode is a contact who solves problems without a price, bypassing the scene instead of creating a choice.",
        },
        {
          term: "Corporate insider",
          text: "Contribution: Use a badge, login, or scheduled meeting to get the crew through a corporate door. Technique: Put expectations alongside the access, such as a superior checking in or a colleague noticing an absence. Watch for: A free pass with no scrutiny, which makes the insider an unlimited keycard instead of a person under pressure.",
        },
        {
          term: "Tech, medic, or support specialist",
          text: "Contribution: Keep the plan physically possible, from stabilising an injury to keeping a rig running or jury-rigging a door. Technique: Make rushed or risky work leave a visible cost, such as a patient who cannot run or gear that will fail after one more use. Watch for: Expertise that only matters in downtime or never changes what the crew must plan around.",
        },
        {
          term: "Solo or enforcer",
          text: "Contribution: Remove a threat or buy the crew time, such as holding a corridor while a specialist finishes. Technique: Give the solo brief chances to show competence without making every obstacle a full combat encounter. Watch for: Violence becoming the default answer, leaving the other roles with less to do.",
        },
        {
          term: "Nomad, driver, or operator",
          text: "Contribution: Make movement and logistics matter through an extraction route, supply run, or time-sensitive drive. Technique: Put a checkpoint, convoy schedule, or attention-drawing vehicle in the crew's path. Watch for: The driver becoming a taxi between scenes; give the route a complication when it can change the job.",
        },
        {
          term: "Face, negotiator, or social infiltrator",
          text: "Contribution: Get the crew access, time, or cooperation through conversation rather than a fixer contact. Technique: Give the negotiation an immediate stake, such as a guard's suspicion, a witness's safety, or a deadline the speaker can alter. Watch for: One roll settling the whole exchange; let success improve the crew's position while preserving meaningful decisions for everyone.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "See a fixer's favour in play",
      paragraphs: [
        "Nkiru Okafor, a street fixer built from a single Table Card roll, shows the debt-and-favour pattern in five lines: she needs the crew to move a case before her clinic gets raided, and the price for her help is already visible in her relationship hook. A GM can lift her directly into a session as the crew's fixer contact.",
      ],
      cta: {
        text: "Read the Nkiru Okafor NPC example",
        href: "/examples/nkiru-okafor-cyberpunk-npc-table-card",
      },
    },
    {
      kind: "example",
      heading: "Worked example: The Meridian Pickup",
      paragraphs: [
        "A crew is hired to pull a Helix Meridian lab tech and her research drive out of a corporate residential block before a scheduled shift-change headcount.",
      ],
      items: [
        {
          term: "The parallel-game version",
          text: "The netrunner sits alone fighting the building's intrusion countermeasures while the rest of the table has nothing to do but wait for a result. The solo separately clears the loading dock in a combat encounter nobody else contributes to. The driver waits in the van the entire session. When the crew finally regroups, none of their separate successes changed what the others were doing, so the extraction reads like three short solo scenes stitched together rather than one job.",
        },
        {
          term: "The shared-mission version",
          text: "The netrunner's first success kills the corridor cameras, which is what lets the solo walk the tech past the loading dock guard without a fight. The fixer's earlier favour to the building's night manager buys the crew a maintenance override, but the manager now expects a return favour the group has not agreed to yet. The journalist embedded with the crew starts filming for a story about corporate labour conditions, and the tech recognises the camera and refuses to leave until the journalist promises to protect her identity. The driver has to reroute around a checkpoint that only exists because an earlier complication, a tripped alarm from a failed hack, put security on the street the original route used.",
        },
        {
          term: "Why it works",
          text: "The specialists' successes and setbacks change conditions the others are working inside: cleared cameras, a pending favour, a reluctant tech, and a blocked route. The crew experiences one mission with shared stakes instead of separate scenes that happen to share a location.",
        },
      ],
    },
    {
      kind: "checklist",
      heading: "Cyberpunk crew prep checklist",
      intro:
        "Before the session, check that each specialist has a reason to be in the same room as the rest of the crew:",
      items: [
        "Every role has one concrete way its success changes what the other players can do next.",
        "Decide what cost may follow a role's speciality: a debt, an audit, a burned source, or damaged gear.",
        "Keep specialist-only sequences brief, and cut back to the shared scene when the situation changes.",
        "Give the mission's central problem at least two viable role-based approaches.",
        "You know what happens if a specialist's roll fails, and it changes the scene rather than only costing that player a resource.",
        "At least one consequence from the mission will follow the crew, or one specific member, into the next session.",
      ],
    },
  ],
  codexConnection: {
    heading: "Keep each role's debts and access on record",
    paragraphs: [
      "A fixer's favour, a corporate badge, and a burned source are worth tracking the same way a settlement or a faction is: as entities with relationships that persist. Codex Cryptica lets you record who owes the fixer, which department the insider still answers to, and which editor is waiting on the journalist's story, then pull those connections up before the next session instead of relying on memory.",
    ],
    linkText: "Explore the RPG knowledge graph",
    href: "/solutions/rpg-knowledge-graph",
  },
  relatedTools: [
    {
      title: "NPC generator",
      description:
        "Roll a fixer, corporate handler, or informant with an immediate want and a relationship hook already attached.",
      href: "/generators/npc",
    },
    {
      title: "Faction generator",
      description:
        "Build the corporation, gang, or syndicate applying pressure to the crew's insider or fixer.",
      href: "/generators/faction",
    },
    {
      title: "Heist generator",
      description:
        "Turn a shared mission into a full score with security rings, an alarm track, and a getaway every role can contribute to.",
      href: "/generators/heist",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Cyberpunk RED",
      description:
        "Organise fixers, edgerunner crews, megacorps, and gig-based campaigns in one connected workspace.",
      href: "/for/cyberpunk-red",
    },
  ],
  relatedAnswers: [
    "how-do-i-give-specialist-characters-spotlight",
    "how-do-i-run-a-journalist-or-media-character-in-an-rpg",
    "how-do-i-run-hackers-or-netrunners-without-splitting-the-party",
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-i-get-my-rpg-party-to-work-together",
    "how-to-create-a-cyberpunk-city-district",
    "how-do-you-run-a-scene-with-multiple-npcs",
    "how-to-write-an-in-world-newspaper-for-an-rpg",
    "how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg",
  ],
  discovery: {
    id: "answer-cyberpunk-party-roles",
    parentCluster: "cyberpunk-party-roles",
    primaryIntent: "how do you run character roles in a cyberpunk rpg",
    intentAliases: [
      "how do i run the different specialist roles in a cyberpunk rpg",
      "how to run cyberpunk character roles",
      "cyberpunk party roles guide for gms",
      "how to run a fixer at the table",
    ],
    userJob: "adopt-workflow",
    uniqueValue:
      "A cross-system framework that ties each cyberpunk specialist's action to the shared physical scene, gives every role one GM technique and one realistic failure mode, and shows the roles colliding inside a single worked mission with consequences that follow the whole crew.",
    relatedIntents: [
      "for-cyberpunk-red",
      "answer-cyberpunk-city-district",
      "answer-run-heist-in-tabletop-rpg",
      "answer-party-cohesion",
      "answer-run-hackers-netrunners",
      "answer-specialist-character-spotlight",
      "answer-run-scene-multiple-npcs",
      "example-nkiru-okafor",
    ],
    acknowledgedOverlap: [
      {
        with: "answer-specialist-character-spotlight",
        reason:
          "The spotlight answer offers scene structures for any specialist role across genres; this answer gives cyberpunk-specific techniques and failure modes for a broader crew of distinct archetypes.",
      },
      {
        with: "answer-run-hackers-netrunners",
        reason:
          "This cyberpunk roles answer summarises what each crew archetype contributes; the hacker answer is a focused procedure for running digital scenes across genres without leaving the physical crew idle.",
      },
      {
        with: "for-cyberpunk-red",
        reason:
          "The /for page shows how Codex organises a Cyberpunk RED campaign's fixers, gigs, and factions as a workflow; this answer teaches the table technique for running each crew role's turn in a scene, independent of any tool or system.",
      },
      {
        with: "answer-cyberpunk-city-district",
        reason:
          "The district answer builds the location and pressures a cyberpunk scene happens inside; this answer covers how the crew's specialist roles behave once they are standing in it.",
      },
      {
        with: "answer-run-heist-in-tabletop-rpg",
        reason:
          "The heist answer structures a single score into four phases; this answer covers what each specialist role contributes inside any cyberpunk scene, heist or otherwise.",
      },
    ],
  },
  seo: {
    title:
      "How do you run character roles in a cyberpunk RPG? | Codex Cryptica",
    description:
      "A cross-system guide to running the netrunner, fixer, journalist, corporate insider, support specialist, solo, driver, and face at the table, with a worked mission and prep checklist.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-character-roles-in-a-cyberpunk-rpg.jpg",
    imageAlt:
      "Cyberpunk crew of a netrunner, fixer, and solo converging on a rain-lit corporate loading dock at night",
  },
};

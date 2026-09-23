import type { AnswerConfigInput } from "../schema";

export const howDoYouRunCharacterRolesInACyberpunkRpg: AnswerConfigInput = {
  slug: "how-do-you-run-character-roles-in-a-cyberpunk-rpg",
  category: "session-prep",
  labels: ["cyberpunk"],
  publishedAt: "2026-09-23",
  question: "How do you run character roles in a cyberpunk RPG?",
  kind: "framework",
  shortAnswer:
    "Run each cyberpunk specialist role by tying its objective to something the whole crew can see happening in the room, not to a private mini-game the table waits out. A netrunner's slice should open a door the crew is standing at, a fixer's favour should carry a cost that surfaces later, and a solo's combat skill should still depend on the crew's plan rather than replace it. Give every role one concrete way to change a scene and one realistic way it can go wrong, then let those roles collide inside a single shared job instead of each running in its own lane.",
  sections: [
    {
      kind: "prose",
      heading: "Why cyberpunk rosters split the table",
      paragraphs: [
        "A cyberpunk crew usually mixes skills a fantasy party does not: one player runs code, one runs contacts, one runs a gun, one runs a van. That variety is the genre's appeal, but it also creates a specific table failure, where each specialist retreats into a scene only they can play while the rest of the group waits for their turn to matter again. A netrunner fighting intrusion countermeasures alone while the rest of the crew has nothing to react to is not a cyberpunk scene; it is the table watching one player roll dice.",
        "The fix is not to flatten every role down to the same shared skill list. It is to make every specialist action land somewhere the whole crew can react to: a door the netrunner opens, a guard the solo pulls off a chokepoint, a contact the fixer burns. Treat the specialist's private skill as the input and the physical scene as the output, and the table stays in one place.",
      ],
    },
    {
      kind: "list",
      heading: "Running each specialist role at the table",
      intro:
        "Use the same pattern for every archetype: name how the role changes the scene, use a technique that keeps the rest of the table involved, and know the failure that turns the role into a liability instead of a solution.",
      items: [
        {
          term: "Hacker or netrunner",
          text: "A netrunner's action changes the room whenever it opens a locked door, blinds a camera, or scrambles a guard's radio, so keep the digital slice interleaved with what the crew standing there can see and hear. Narrate each exchange in short beats and give a failed check an immediate physical cost, such as a door that stays sealed or an alarm light shifting to amber, rather than letting the failure only cost the netrunner a resource nobody else at the table can see. Watch for the moment the hack turns into a private side scene while the rest of the table waits; when that happens, cut back to the physical room and force a decision from the whole crew.",
        },
        {
          term: "Media or journalist",
          text: "A journalist changes a scene by turning information into something the crew can trade on: a recording that could run tonight, a source who can be burned, a story already sitting in an editor's queue. Keep a running note of what has been published, who the sources were, and what it cost the journalist's standing, then bring in a named editor or outlet who pushes back when the story gets dangerous or inconvenient. The role fails when it only explains the plot to the table; if the character never creates a public consequence the crew has to react to, the journalist is doing exposition instead of playing a role.",
        },
        {
          term: "Fixer or broker",
          text: "A fixer changes a scene by producing the one contact, favour, or door nobody else at the table can open, and each use should cost something visible: a debt owed, a reputation spent, a rival who now knows the crew's business. Track favours openly rather than letting the fixer draw on an unlimited supply. The failure mode is a fixer who can solve any problem with a single phone call; once a contact stops having a price, the player skips the scene instead of playing it.",
        },
        {
          term: "Corporate insider",
          text: "An insider changes a scene through access: a badge, a login, a standing meeting that gets the crew somewhere they otherwise could not walk into. Attach real expectations to that access, a superior who checks in, an audit, a colleague who notices an absence, so using it means weighing two loyalties rather than spending a free pass. Without any scrutiny attached, the role turns into an unlimited keycard instead of a person under pressure.",
        },
        {
          term: "Tech specialist or medic",
          text: "This role changes a scene by making the crew's plan physically possible: stabilising an injury mid-job, keeping a rig running past its limits, or jury-rigging a door the netrunner cannot open from outside. Give their expertise a visible cost when pushed hard, such as a patient who is stable but unable to run, or gear that works once and then fails. If a fix never carries a consequence, the crew stops planning around the specialist's limits and the role becomes background flavour.",
        },
        {
          term: "Solo or enforcer",
          text: "A solo changes a scene by removing an obstacle the rest of the crew cannot survive removing themselves: a guard, a locked door, thirty seconds of cover bought with violence. Give them a moment to show competence that is not a full combat encounter, holding a corridor alone, disarming one threat, buying time while a specialist finishes their part. If every scene becomes a fight because the solo is at the table, the other roles stop having anything to do.",
        },
        {
          term: "Nomad, driver, or operator",
          text: "This role changes a scene through movement: an extraction route, a supply run, a vehicle that has to reach a specific place on time. Keep the contribution visible with a real logistics problem, a checkpoint, a convoy schedule, a distinctive vehicle that draws attention, rather than narrating travel as a skip. If the driver only appears as a taxi between scenes, give the drive itself a complication now and then so the role earns time at the table outside the getaway.",
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
          text: "Every specialist's success or failure changes a condition the others are working inside, the cleared cameras, the pending favour, the reluctant tech, the blocked route, so the crew experiences one mission with shared stakes instead of four separate scenes that happen to share a location.",
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
        "Every role has a cost attached to using its speciality: a debt, an audit, a burned source, damaged gear.",
        "No specialist action is scripted to run on its own without cutting back to the physical scene.",
        "The mission's central problem needs at least two different roles to solve, not one specialist working alone.",
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
    "how-do-you-run-a-heist-in-a-tabletop-rpg",
    "how-do-i-get-my-rpg-party-to-work-together",
    "how-to-create-a-cyberpunk-city-district",
    "how-do-you-run-a-scene-with-multiple-npcs",
    "how-to-write-an-in-world-newspaper-for-an-rpg",
  ],
  discovery: {
    id: "answer-cyberpunk-party-roles",
    parentCluster: "cyberpunk-party-roles",
    primaryIntent: "how do you run character roles in a cyberpunk rpg",
    intentAliases: [
      "how do i run the different specialist roles in a cyberpunk rpg",
      "how to run cyberpunk character roles",
      "cyberpunk party roles guide for gms",
      "how to run a netrunner at the table",
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
      "A cross-system guide to running the netrunner, fixer, journalist, insider, medic, solo, and driver at the table, plus a worked mission and prep checklist.",
    image:
      "https://assets.codexcryptica.com/og/how-do-you-run-character-roles-in-a-cyberpunk-rpg.jpg",
    imageAlt:
      "Cyberpunk crew of a netrunner, fixer, and solo converging on a rain-lit corporate loading dock at night",
  },
};

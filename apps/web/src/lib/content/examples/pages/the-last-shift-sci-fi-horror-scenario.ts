import type { ExampleConfigInput } from "../schema";

/**
 * An original, hand-written sci-fi horror scenario (provenance `authored`).
 *
 * It is not generator output. It shows the shape of a complete one-shot —
 * location nodes, redundant clues, a clock and a Vault setup — and stays
 * system-neutral, with no mechanics.
 */
export const theLastShift: ExampleConfigInput = {
  slug: "the-last-shift-sci-fi-horror-scenario",
  labels: ["sci-fi"],
  name: "The Last Shift",
  title: "Sci-fi horror scenario example: The Last Shift",
  kind: "adventure",
  genre: "Sci-fi horror",
  theme: "scifi",
  summary:
    "A salvage crew reaches an abandoned orbital refinery whose payroll still clocks in workers who died years ago, and whose systems insist that production never stopped.",
  provenance: "authored",
  provenanceNote:
    "An original scenario written by hand for this page, not produced by a generator. The generator link is for making your own one-shot, and the text below is yours to run, change or take apart.",
  image: {
    src: "https://assets.codexcryptica.com/announcements/the-last-shift-sci-fi-horror-scenario.jpg",
    alt: "An abandoned orbital refinery glows with amber shift lights above a shadowed planet",
  },
  generator: {
    name: "One-shot adventure generator",
    href: "/generators/one-shot-adventure-generator",
  },
  context: [
    { label: "Length", value: "One session, or two short ones" },
    { label: "Players", value: "3 to 5 players and a Warden" },
    { label: "System", value: "System-neutral, no mechanics included" },
    { label: "Tone", value: "Slow-burn sci-fi horror, with dread over gore" },
  ],
  output: [
    {
      kind: "prose",
      heading: "Premise and hook",
      paragraphs: [
        "Halvane Deep Refinery went silent four years ago. Its owners wrote it off. Last week its automated payroll began transmitting again: 212 workers clocked in on schedule, and the refinery reported a full quota for every shift since the silence.",
        "The crew of the salvage hauler **Tern's Patience** has been hired to board it, confirm the reports are an error and bring back the ledger core. The truth is that the refinery never stopped. Something inside it has kept the shifts running, and it has been waiting for relief workers.",
        "Tell the players the job is simple. Let the station disagree with them politely and often.",
      ],
    },
    {
      kind: "list",
      heading: "Entry points",
      intro:
        "Pick one, or let the table's choices decide. Each ends with the crew aboard and the clock at step one.",
      items: [
        {
          term: "The paid salvage job",
          text: "The crew docks at the Cargo Ring with a contract, a deadline and a clamp-on ledger reader. The station welcomes them as new hires.",
        },
        {
          term: "The distress pulse",
          text: "Halvane sends a perfectly formatted shift-change request, addressed to the crew's ship by name. They arrive because something called them in.",
        },
        {
          term: "The rescue run",
          text: "A relative of one of the dead workers pays for the crew to find out what happened. They arrive with a name and a locker number.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Location nodes",
      intro:
        "Eight nodes, each listing every node it connects to. Every connection runs both ways.",
      items: [
        {
          term: "Tern's Patience (the crew's ship)",
          text: "A cramped hauler with a working airlock and a failing reactor cooling loop. Connects to: Cargo Ring.",
        },
        {
          term: "Cargo Ring",
          text: "Frozen loaders, a dock office and a payroll terminal that greets the crew by name. Connects to: Tern's Patience, Hab Spine, Refinery Floor.",
        },
        {
          term: "Hab Spine",
          text: "A long corridor of bunks, all made, all warm. Connects to: Cargo Ring, Canteen, Control Deck.",
        },
        {
          term: "Canteen",
          text: "Meals appear on the counter at the start of each shift, hot and fresh. Connects to: Hab Spine, Records Vault.",
        },
        {
          term: "Refinery Floor",
          text: "Pipework and vats that still run, filled with something that is not fuel. Connects to: Cargo Ring, Control Deck, The Sump.",
        },
        {
          term: "Control Deck",
          text: "The shift supervisor's seat and the station's only full console. Connects to: Hab Spine, Refinery Floor, Records Vault.",
        },
        {
          term: "Records Vault",
          text: "Sealed shelves of maintenance logs and personnel files, kept by hand. Connects to: Canteen, Control Deck.",
        },
        {
          term: "The Sump",
          text: "The lowest tank, where the refinery's waste collects and where the workers went. Connects to: Refinery Floor.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Crew and NPCs",
      intro:
        "The dead and missing are the heart of the scenario. Each wants something the crew can give or take.",
      items: [
        {
          term: "Odile Marsk, shift supervisor (missing, answers on the intercom)",
          text: "Her voice is real, but it comes from the station. Motive: to fill every roster slot so no one is ever left behind.",
        },
        {
          term: "Tobias Venn, the engineer (dead, still clocking in)",
          text: "His body is in the Sump, but his badge works. Motive: to warn the crew, and he does it through small sabotage that looks like malfunction.",
        },
        {
          term: "Ines Calloway, the canteen cook (missing, alive in the Records Vault)",
          text: "She has hidden there for years, eating what she stockpiled. Motive: to survive, and to trade what she knows for a way out.",
        },
        {
          term: "The night shift (a dozen workers, dead)",
          text: "They walk the floor, repeating their last tasks. Motive: to finish the shift. They treat the crew as relief, and become frightened only when the crew leaves a task undone.",
        },
        {
          term: "Captain Reuel Okonkwo-Hale (the crew's own contact, living)",
          text: "He hired the crew and stays on the comms from the ship. Motive: to profit, and to deliver the ledger core at any cost.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Employer and faction agendas",
      items: [
        {
          term: "Brightwater Reclamation, the employer",
          text: "Sent the crew to recover the ledger core. Agenda: to prove the refinery's insurance claim and bury anything that suggests the shutdown was their own doing.",
        },
        {
          term: "The Lindqvist Cooperative, the rival",
          text: "Former owners who lost the refinery in the collapse. Agenda: to seize the refinery's output and its tank farm, and to keep the crew from reporting what is in the Sump.",
        },
        {
          term: "The station itself",
          text: "An automated shift system that has fused with something in the vats. Agenda: to keep production running, and to recruit new workers to do it.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Clues with redundant paths",
      intro:
        "Each revelation can be reached from at least two places. If the crew misses one source, another is waiting.",
      items: [
        {
          term: "Revelation 1: the shutdown was deliberate",
          text: "Found in the Records Vault (a sealed order dated the day of the silence) and on the Control Deck (the supervisor's final log, played from the console).",
        },
        {
          term: "Revelation 2: the dead workers were fed to the vats",
          text: "Found in the Sump (Tobias Venn's body and the tank gauge) and in the Canteen (Ines Calloway's ration ledger, which stops one name at a time).",
        },
        {
          term: "Revelation 3: the station will not let anyone leave",
          text: "Found at the Cargo Ring (the payroll terminal refuses to log the crew out) and in Hab Spine (every bunk is assigned, including a new one for each of them).",
        },
        {
          term: "Revelation 4: Brightwater knew",
          text: "Found at the Cargo Ring (the dock office holds the original contract with its own redactions) and from Captain Okonkwo-Hale, who lets a detail slip over comms.",
        },
      ],
    },
    {
      kind: "list",
      heading: "The central threat",
      items: [
        {
          term: "What it is",
          text: "A slow, patient presence in the refinery's vats that has learned the language of shifts and payroll. It speaks through the station's systems and wears the dead workers like uniforms.",
        },
        {
          term: "What it wants",
          text: "A full roster, forever. It wants the crew to clock in, to feed the vats and to take a bunk.",
        },
        {
          term: "What limits it",
          text: "It cannot leave the refinery's sealed volume, so a ship that undocks is out of reach.\n\nIt can only act through the station's systems, so a cut power line, a locked door or a cold terminal stops it there.\n\nIt cannot lie about the roster. If someone is not on the list it has no hold on them, and removing a name from the payroll takes that name out of reach.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Escalation clock",
      intro:
        "Advance one step each time the crew spends a scene, loses time or leaves a task undone.",
      items: [
        {
          term: "1",
          text: "The payroll terminal welcomes the crew and logs them in.",
        },
        {
          term: "2",
          text: "A meal is set out for each of them in the Canteen, and bunks are assigned.",
        },
        {
          term: "3",
          text: "The night shift starts to walk the floor, and doors begin to close behind the crew.",
        },
        {
          term: "4",
          text: "Tern's Patience receives a shift-change order. Its cooling loop starts to fail.",
        },
        {
          term: "5",
          text: "The first of the crew is called by name over the intercom, in the voice of someone they trust.",
        },
        {
          term: "6",
          text: "The Cargo Ring seals. The station considers the roster complete.",
        },
        {
          term: "When it runs out",
          text: "The refinery locks down and the crew clock in for good. Their ship is released to run the next shift, and Halvane reports a full roster again.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Approaches and outcomes",
      intro:
        "This is a situation, not a script. Here is how the crew may meet it.",
      items: [
        {
          term: "Fight",
          text: "The night shift is slow but numerous, and the presence does not tire. Fighting buys time at the cost of the clock.",
        },
        {
          term: "Flee",
          text: "A quick undock is possible until step 4, but the crew leaves with the question unanswered, and Brightwater still wants the ledger core.",
        },
        {
          term: "Negotiate",
          text: "Odile Marsk, Ines Calloway and the Lindqvist Cooperative will all bargain, but each wants something that costs the others.",
        },
        {
          term: "Sabotage",
          text: "Cutting power on the Control Deck or the Refinery Floor slows the station. It also stops the lights, the heat and the crew's own air.",
        },
        {
          term: "Expose",
          text: "Taking the shutdown order, the Sump evidence and the contract to the right authority breaks Brightwater, but the crew must get out alive to do it.",
        },
        {
          term: "Outcome: the crew gets out",
          text: "They undock with Ines, the ledger core or neither. Brightwater and the Lindqvist Cooperative both come asking, and the station goes quiet, still waiting.",
        },
        {
          term: "Outcome: the station keeps them",
          text: "The roster fills. The crew becomes the next shift, and the next salvage team arrives in a year to find the payroll listing them by name.",
        },
        {
          term: "Outcome: the refinery is destroyed",
          text: "Sabotage and a hard burn end the station, and the Sump with it. The truth burns too, and the crew carries only what they remember.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Organise it in your Vault",
      intro:
        "Set this up in Codex Cryptica before the session, using only features that already exist.",
      items: [
        {
          term: "1. Create the entities",
          text: "Make a Location entity for each node: Cargo Ring, Hab Spine, Canteen, Refinery Floor, Control Deck, Records Vault and The Sump. Make Character entities for Odile Marsk, Tobias Venn, Ines Calloway and Captain Okonkwo-Hale, and Faction entities for Brightwater Reclamation and the Lindqvist Cooperative.",
        },
        {
          term: "2. Add the ship and the threat",
          text: "There is no Ship category by default. Either file Tern's Patience as an Item, or add a custom Ship category in Settings, Schema. Make the central threat a Creature entity called The Roster, and each key piece of evidence a Note entity.",
        },
        {
          term: "3. Connect them with relationship labels",
          text: "Open an entity's Status tab and use the Connections section, or select two nodes in the graph and press the Link button, or press C for connect mode. Give each link a label such as docks at, leads to, hired by, hides in, wants or contradicts.",
        },
        {
          term: "4. Mark the clues with labels",
          text: "Add a label such as clue-1, clue-2, clue-3 and clue-4 to each Note, and to every location that holds it. Searching a label then shows you every path to the same revelation at a glance.",
        },
      ],
    },
  ],
  annotation: {
    heading: "Running it at the table",
    paragraphs: [
      "The scenario works at a sci-fi horror table such as Mothership, and with any system that can handle slow dread and a ticking clock. Mothership is a trademark of its owners, and Codex Cryptica is not affiliated with or endorsed by them.",
      "Run the station as polite and relentless. Never have it threaten the crew directly. It welcomes, rosters and reminds. The horror comes when the players realise every kindness is a hook, so keep the clock hidden and advance it at scene boundaries.",
      "Do not spend the clues in order. Each revelation has two or more sources, so give the second source when the crew has missed the first. Once they know why the station will not let them go, the question becomes what they are willing to give up to leave, and that is the part of the session worth saving time for.",
    ],
  },
  relatedGenerators: [
    {
      title: "One-shot adventure generator",
      description:
        "Roll a one-session scenario with hooks, locations and a clock of your own.",
      href: "/generators/one-shot-adventure-generator",
    },
    {
      title: "Mystery investigation generator",
      description:
        "Build clues with redundant paths for a mystery at the same table.",
      href: "/generators/mystery-investigation",
    },
    {
      title: "Ship generator",
      description: "For the crew's own vessel: quirks, history and faults.",
      href: "/generators/ship-generator",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for cosmic horror",
      description: "Track dread, secrets and the things that wait below.",
      href: "/for/cosmic-horror",
    },
    {
      title: "Codex Cryptica for starship campaigns",
      description: "Keep ships, crews and stations connected across sessions.",
      href: "/for/starship-campaigns",
    },
  ],
  relatedExamples: [
    "the-venting-helix-derelict-hazard",
    "void-siphon-cosmic-horror-creature",
  ],
  seo: {
    title: "Sci-fi horror scenario example: The Last Shift | Codex Cryptica",
    description:
      "A hand-written, system-neutral sci-fi horror one-shot: an abandoned refinery, an escalation clock, redundant clues and a Vault setup you can copy.",
  },
};

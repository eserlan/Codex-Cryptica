import type { DungeonGenreTables } from "../genre-types";

export const steampunkTables: DungeonGenreTables = {
  hint: "Describe subterranean engine houses, high-pressure steam galleries, brass automaton foundries, governor halls, and coal-dusted service tunnels beneath a working city.",
  purposes: [
    "Clockwork Engine Works",
    "Rail Tunnel & Depot",
    "Mine & Shafts",
    "Research Facility",
    "Fortress & Citadel",
    "Prison & Vault",
  ],
  currentStates: [
    "Still Operational",
    "Abandoned Ruins",
    "Overrun by Squatters",
    "Occupied Stronghold",
    "Sealed Vault",
    "Buried & Forgotten",
  ],
  sampleTitles: [
    "Governor Hall Beneath Ashgrove",
    "The Brass Foundry of Pellet Row",
    "High-Pressure Gallery Seventeen",
    "The Silent Engine House at Cinder Wharf",
    "Automaton Works, Sub-Level Three",
  ],
  builders: [
    "an engineering concern with a royal charter and no oversight",
    "a guild of pressure-wrights who kept their methods secret",
    "a municipal works department that vastly overbuilt",
    "an industrialist who wanted his machines out of public sight",
    "a consortium of mill owners pooling one enormous engine",
  ],
  originalUses: [
    "an engine house driving every mill in the district above",
    "a pressure works regulating steam for half a city",
    "an automaton foundry turning out workers that needed no wages",
    "a governor hall balancing load across a dozen boiler stations",
    "a testing gallery for pressures no surface works would permit",
  ],
  entrances: [
    "a service stair behind a rank of street-level pressure gauges",
    "a coal chute wide enough for a person, if they do not mind the dark",
    "a maintenance hatch in the floor of a disused pumping station",
    "an inspection tunnel branching off the sewer main",
    "a freight lift with its brass gate rusted half-open",
  ],
  compositions: [
    "riveted iron plate over a brick barrel vault",
    "brass fittings gone green above soot-black masonry",
    "cast-iron columns bolted into bedrock",
    "glazed white tile, cracked and coal-stained",
    "copper pipework so dense it forms the walls themselves",
  ],
  conditions: [
    "still under pressure, hissing at every failing joint",
    "cold for the first time in a century",
    "thick with coal dust that muffles every sound",
    "shaking gently as something deeper keeps turning",
    "sweating condensation from every surface",
  ],
  causes: [
    "a boiler failure the company recorded as sabotage",
    "an inquest that shut the works and sealed the doors",
    "a strike that ended when the owners simply walked away",
    "a governor failing and taking three galleries with it",
    "a patent dispute that froze the whole enterprise mid-shift",
  ],
  sectors: [
    {
      name: "The Governor Hall",
      description:
        "A vaulted chamber of head-high brass regulators, most needles resting at zero.",
    },
    {
      name: "The Boiler Floor",
      description:
        "Rank upon rank of iron boilers, their fireboxes cold and their doors hanging open.",
    },
    {
      name: "The Automaton Line",
      description:
        "An assembly gallery where half-built brass figures stand waiting on their cradles.",
    },
    {
      name: "The Pressure Gallery",
      description:
        "A narrow catwalk between pipes that still tick and shift with residual heat.",
    },
    {
      name: "The Coal Sink",
      description:
        "A sloping bunker of loose coal that shifts underfoot and swallows dropped lamps.",
    },
    {
      name: "The Drafting Loft",
      description:
        "A mezzanine of tilted desks and rolled schematics, gas lamps still fitted overhead.",
    },
  ],
  inhabitants: [
    "A crew of pressure-wrights still running the works, decades past their last wage.",
    "Rogue automatons continuing an assembly order nobody remembers issuing.",
    "A squatter community tapping the residual steam for heat and cooking.",
    "A rival concern's saboteurs, methodically disabling the governors.",
    "Soot-choked vermin grown large and bold in the warm dark.",
  ],
  factionNames: [
    "the Pressure-Wrights' Guild",
    "the Brass Line Automatons",
    "the Cinder Wharf Squatters",
    "the Rival Concern's Saboteurs",
    "the Governor Hall Enginemen",
    "the Coal Sink Scavengers",
    "the Patent Office Inspectors",
    "the Ashgrove Strike Committee",
    "the Soot-Bloated Vermin",
    "the Foundry Watch",
  ],
  secrets: [
    "The works never shut down — someone has been feeding the boilers this whole time.",
    "The automatons on the line were built to a pattern the guild stole, and the original owner is still litigating.",
    "The governor hall does not regulate pressure; it regulates something the engineers refused to name in writing.",
    "The boiler failure was deliberate, and the man blamed for it was already dead when it happened.",
    "The lowest gallery breaks into a natural cavern the survey maps deliberately omit.",
  ],
  hazards: [
    "Pipe joints venting scalding steam without warning.",
    "Catwalk gratings rusted through above a forty-foot drop.",
    "Coal dust suspended thick enough to take a spark.",
    "A pressure vessel well past its rated limit and still climbing.",
    "Automaton arms that resume their cycle when power reaches them.",
  ],
  treasures: [
    "A sealed patent case containing drawings worth a fortune to the right buyer.",
    "A precision regulator movement, machined finer than anything on the market.",
    "A strongbox of the works' payroll in heavy silver coin.",
    "An automaton control key that commands every frame on the line.",
    "A bound set of the chief engineer's private notebooks.",
  ],
  hooks: [
    "The district above is losing pressure, and the fault is somewhere in the old works.",
    "A patent claim hinges on drawings last seen in the drafting loft.",
    "Automatons have begun walking out of the tunnels at night, and nobody can stop them.",
    "A squatter child has gone missing in the coal sink.",
    "An industrialist will pay handsomely for the works to stay shut, and asks no questions about how.",
  ],
  signatureFeatures: [
    "The Great Governor: A brass regulator the size of a cottage, its needle still creeping upward with nothing driving it.",
    "The Unfinished Frame: A single automaton twice the height of the others, complete but for its face.",
    "The Pressure Organ: A bank of relief valves that vent in sequence, producing a slow tolling chord.",
    "The Glass Boiler: An inspection vessel walled in thick armoured glass, its water still gently turning.",
    "The Clockwork Ceiling: An entire vault of meshed gears overhead, turning at the pace of a minute hand.",
  ],
};

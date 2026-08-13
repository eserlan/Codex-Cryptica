import type { CreaturePackEntry } from "../../types.js";

export const steampunkClockworkEntries: CreaturePackEntry[] = [
  {
    title: "Brass Automaton",
    category: "steampunk-clockwork",
    description:
      "A precision-engineered mechanical servant crafted from polished brass gears, copper wiring, and steam pistons.",
    habitat: "Inventor workshops, aristocratic mansions, and bank vaults.",
    behaviour:
      "Follows programmed instructions rigorously. Uses hydraulic strength to restrain intruders without damaging surrounding property.",
    threatLevel: "Low",
    variants: ["Gear Servant", "Clockwork Sentry", "Copper Guard"],
    hooks: [
      "A master clockmaker's estate is protected by brass automatons programmed to eject anyone lacking an engraved invitation medal.",
      "An automaton's mainspring has wound too tightly, sending it into a spinning, destructive frenzy across the town square.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Young%20Brass%20Dragon/YoungBrassDragon%20(1).webp",
  },
  {
    title: "Steam-Driven Juggernaut",
    category: "steampunk-clockwork",
    description:
      "A hulking iron mech powered by a coal-fired boiler chest, venting scalding steam clouds as it strides forward.",
    habitat: "Railroad yards, heavy mining tunnels, and foundry gates.",
    behaviour:
      "Crushes barricades underfoot. Blows deafening steam whistles before releasing scalding vapor jets at close quarters.",
    threatLevel: "High",
    variants: ["Boiler Mech", "Iron Colossus", "Foundry Walker"],
    hooks: [
      "Striking railroad workers commandeer a Steam-Driven Juggernaut to blockade the main supply tracks.",
      "Targeting the juggernaut's rear pressure release valve causes its boiler core to erupt safely.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Clockwork Arachnid",
    category: "steampunk-clockwork",
    description:
      "Multi-legged brass automata designed to scale walls and repair high-altitude machinery or patrol airship hulls.",
    habitat: "Airship rigging, clock tower belfries, and factory rafters.",
    behaviour:
      "Swarms targets in synchronized formations. Shoots barbed wire harpoons to entangle foes before delivering electric shocks.",
    threatLevel: "Low",
    variants: ["Gear Spider", "Airship Repair Bot", "Brass Spinner"],
    hooks: [
      "Mid-flight across the mountains, the passenger airship is boarded by rogue clockwork arachnids cutting the control cables.",
      "A thief uses modified clockwork arachnids to disable alarm bells inside the royal mint.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Aether Core Sentinel",
    category: "steampunk-clockwork",
    description:
      "An advanced automaton powered by a glowing blue aether crystal floating inside its open brass chest cavity.",
    habitat: "Alchemical laboratories, floating sky-cities, and crystal mines.",
    behaviour:
      "Projects directed lightning bolts from its brass gauntlets. Creates a shimmering electromagnetic force field around itself.",
    threatLevel: "High",
    variants: ["Lightning Automaton", "Crystal Mech", "Sky-Guard Unit"],
    hooks: [
      "The floating research laboratory is falling from the sky because the guardian sentinels are draining power from the levitation core.",
      "Removing an intact aether core from a slain sentinel provides the exact energy source needed to power an experimental airship.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Manticore/Manticore%20(1).webp",
  },
  {
    title: "Tesla-Coil Golem",
    category: "steampunk-clockwork",
    description:
      "A towering framework of copper coils and glass vacuum tubes crackling with continuous high-voltage electricity.",
    habitat:
      "Power generating stations, university lightning labs, and fortress towers.",
    behaviour:
      "Arcs electricity to nearby conductive surfaces. Slamming metal fists down creates paralyzing shockwaves.",
    threatLevel: "High",
    variants: ["Voltage Brute", "Galvanic Golem", "Spark Giant"],
    hooks: [
      "A thunderstorm supercharges the university's Tesla-Coil Golem, causing it to break out of containment and wander the flooded campus.",
      "Wearing thick rubberized suits protects the party from the golem's electrical arcs during melee combat.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Clay%20Golem/ClayGolem%20(1).webp",
  },
  {
    title: "Iron Gear-Soldier",
    category: "steampunk-clockwork",
    description:
      "Mass-produced infantry automatons stamped from sheet iron, equipped with built-in pneumatic repeating rifles.",
    habitat: "Imperial barracks, frontier forts, and armored trains.",
    behaviour:
      "Marches in relentless firing lines. Relies on overlapping fields of fire and mechanical discipline.",
    threatLevel: "Medium",
    variants: ["Pneumatic Rifleman", "Iron Infantry", "Trench Automaton"],
    hooks: [
      "An armored payroll train is defended by two dozen Iron Gear-Soldiers locked inside the bullion car.",
      "A rogue engineer has intercepted the imperial radio frequency, turning a garrison of gear-soldiers against their human commanders.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Mechanical Falcon",
    category: "steampunk-clockwork",
    description:
      "A delicate bird of prey crafted from overlapping bronze feathers and optical glass lenses, used for scouting and message relay.",
    habitat: "Airship observation decks, noble falconry mews, and rooftops.",
    behaviour:
      "Dives from high altitudes to slash optical lenses or deliver small explosive charges before returning to its master.",
    threatLevel: "Low",
    variants: ["Bronze Hawk", "Scout Bird", "Aether Flyer"],
    hooks: [
      "A Mechanical Falcon lands on the party's window ledge carrying a coded cylinder containing a plea for rescue.",
      "Shooting down a spymaster's bronze hawk prevents enemy artillery from obtaining the party's exact coordinates.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Boiler-Plate Enforcer",
    category: "steampunk-clockwork",
    description:
      "A heavy urban police automaton wearing thick boiler plate armor, carrying a riot baton and a tear-gas canister launcher.",
    habitat: "Cobblestone streets, factory district alleys, and workhouses.",
    behaviour:
      "Advances methodically through crowds. Deploys stinging chemical vapor clouds before subduing suspects with heavy bludgeoning blows.",
    threatLevel: "Medium",
    variants: ["Constable Bot", "Street Warden", "Iron Constable"],
    hooks: [
      "Corrupt city officials use Boiler-Plate Enforcers to evict desperate factory families from their tenement homes.",
      "A short circuit causes an enforcer to repeat the same arrest warrant endlessly while blocking the only bridge out of town.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Piston-Bruiser",
    category: "steampunk-clockwork",
    description:
      "An industrial mining automaton built with over-sized hydraulic piston arms capable of punching through solid granite.",
    habitat: "Coal mines, tunnel excavations, and quarry pits.",
    behaviour:
      "Uses rhythmic, earth-shaking punches to shatter obstacles. Creates minor cave-ins when striking cavern walls.",
    threatLevel: "Medium",
    variants: ["Granite Puncher", "Hydraulic Miner", "Tunnel Crusher"],
    hooks: [
      "Trapped deep underground by a cave-in, the party must repair a damaged Piston-Bruiser to punch their way out before air runs out.",
      "A mine owner's Piston-Bruisers have struck an ancient underground vault containing dormant eldritch horrors.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Alchemical Mech",
    category: "steampunk-clockwork",
    description:
      "A walking brass tank equipped with glass reservoirs filled with glowing green corrosive acid and liquid fire.",
    habitat:
      "Alchemical warfare ranges, fortress sieges, and industrial depots.",
    behaviour:
      "Sprays pressurized streams of alchemical fire or acid across wide areas, igniting terrain and dissolving armor.",
    threatLevel: "High",
    variants: ["Flame-Projector Mech", "Acid Spitter Bot", "Chemical Walker"],
    hooks: [
      "An Alchemical Mech defends the bridge leading to the mad chemist's mountain fortress, spraying liquid fire across the approach.",
      "Shattering the mech's glass chemical reservoirs from a distance causes it to dissolve in its own caustic fluids.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
];

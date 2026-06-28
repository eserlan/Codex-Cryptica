import type { CreaturePackEntry } from "../../types.js";

export const scifiMechEntries: CreaturePackEntry[] = [
  {
    title: "Patrol Drone",
    category: "scifi-mech",
    description:
      "An automated spherical hover-drone equipped with searchlights, stun blasters, and facial recognition scanners.",
    habitat:
      "Corporate facilities, orbital docks, and restricted research sectors.",
    behaviour:
      "Patrols pre-set grids tirelessly. Sounds station-wide alarms upon detecting unauthorized personnel before engaging stun protocols.",
    threatLevel: "Low",
    variants: ["Seeker Orb", "Viper Drone", "Stun Sentry"],
    hooks: [
      "A software glitch has caused the station's security drones to designate all organic crew members as hostile intruders.",
      "Hackers need someone to capture an intact patrol drone to reverse-engineer corporate encryption keys.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Security Automaton",
    category: "scifi-mech",
    description:
      "A bipedal combat android constructed from reinforced durasteel plating, integrated with heavy pulse rifles.",
    habitat: "Military outposts, bank vaults, and command bunkers.",
    behaviour:
      "Advances relentlessly on targets with military precision, utilizing cover and suppressing fire without fear or hesitation.",
    threatLevel: "Medium",
    variants: ["Shock Trooper Bot", "Siege Android", "Tactical Enforcer"],
    hooks: [
      "An abandoned orbital defense platform is still guarded by platoons of security automatons following orders from a long-dead admiral.",
      "A rogue rogue AI has hijacked factory assembly lines to manufacture an army of security automatons.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Heavy Mecha Sentinel",
    category: "scifi-mech",
    description:
      "A towering mechanized walking armor platform armed with twin missile pods and rotary cannon arms.",
    habitat: "Planetary defense perimeters, mining colonies, and war zones.",
    behaviour:
      "Unleashes devastating barrages to flatten obstacles. Uses its massive hydraulic limbs to crush armored vehicles.",
    threatLevel: "High",
    variants: ["Goliath Mech", "Titan Walker", "Juggernaut Armor"],
    hooks: [
      "Rebels must disable the bridge's Heavy Mecha Sentinel before their evacuation convoy can cross the canyon.",
      "A mercenary pilot suffered a heart attack inside their cockpit; the mecha's automated survival AI is now rampaging through the bazaar.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Cyborg Enforcer",
    category: "scifi-mech",
    description:
      "A former human heavily augmented with cybernetic limbs, sub-dermal armor plating, and neural combat targeting chips.",
    habitat: "Underbelly slums, syndicate hideouts, and corporate towers.",
    behaviour:
      "Uses superhuman speed and brute hydraulic strength to overwhelm foes. Impervious to pain or emotional appeals.",
    threatLevel: "Medium",
    variants: ["Chrome Gladiator", "Syndicate Heavy", "Cyber-Praetorian"],
    hooks: [
      "A notorious crime boss has dispatched their top Cyborg Enforcer to recover stolen data disks from the party.",
      "An enforcer's memory inhibitors are failing, leading them to seek out their past identity amidst violent flashbacks.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Plasma Turret Array",
    category: "scifi-mech",
    description:
      "An automated defense installation featuring multi-barrel plasma projectors linked to motion sensor networks.",
    habitat: "Fortified gates, prison corridors, and starship airlocks.",
    behaviour:
      "Locks onto movement instantly, laying down a grid of blistering plasma fire until the corridor is cleared.",
    threatLevel: "Medium",
    variants: ["Laser Sentry", "Flak Array", "Heavy Defense Grid"],
    hooks: [
      "To escape the lockdown, infiltrators must crawl through maintenance ducts to manually cut power to the turret arrays.",
      "Smugglers salvaged a military-grade plasma turret array to fortify their cavern hideout.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Nanite Cloud",
    category: "scifi-mech",
    description:
      "A shimmering swarm of microscopic robotic machines moving as a unified, fluid cloud capable of disassembling matter.",
    habitat:
      "High-tech laboratories, ancient precursor vaults, and research vessels.",
    behaviour:
      "Swarm targets to systematically strip away armor and flesh molecule by molecule, replicating more nanites from the harvested material.",
    threatLevel: "High",
    variants: ["Disassembler Swarm", "Repair Swarm Gone Rogue", "Gray Goo"],
    hooks: [
      "A containment breach has released a nanite cloud that is slowly eating its way through the starship's outer hull plating.",
      "Scientists seek an experimental electromagnetic pulse generator to neutralize a rogue nanite swarm engulfing an agro-dome.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cloud%20Giant/CloudGiantMale%20(1).webp",
  },
  {
    title: "Riot Droid",
    category: "scifi-mech",
    description:
      "A stocky, crowd-control automaton carrying a heavy ballistic shield and an electrified suppression baton.",
    habitat: "Colony plazas, prison complexes, and corporate protests.",
    behaviour:
      "Forms defensive shield walls with other droids. Advances systematically while deploying tear gas and concussive shocks.",
    threatLevel: "Low",
    variants: ["Suppressor Bot", "Phalanx Droid", "Pacifier Automaton"],
    hooks: [
      "During a worker uprising, riot droids corner a group of innocent refugees inside a sealed transit station.",
      "Reprogramming a captured riot droid provides the party with a sturdy mobile shield cover for urban combat.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Recon Roto-Drone",
    category: "scifi-mech",
    description:
      "A nimble quad-rotor aerial drone built for high-speed reconnaissance and sniper spotting.",
    habitat: "Urban skylines, jungle canopies, and industrial spires.",
    behaviour:
      "Hover out of reach while transmitting real-time telemetry to strike teams. Can fire pinpoint laser tagging beams.",
    threatLevel: "Low",
    variants: ["Spotter Drone", "Stealth Flyer", "Viper Quad"],
    hooks: [
      "The party realizes a silenced roto-drone has been tracking their movements across the city for the past 48 hours.",
      "Downing a syndicate scout drone allows the party to retrieve stored footage of a secret meet-up.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Combat Android",
    category: "scifi-mech",
    description:
      "Synthetic humanoids with synthetic skin masking titanium skeletons, designed for covert assassination and infiltration.",
    habitat:
      "Diplomatic summits, executive transport liners, and high-security estates.",
    behaviour:
      "Mimics human behavior until within striking distance before revealing lethal close-quarters combat blades and reflex speed.",
    threatLevel: "High",
    variants: ["Infiltrator Model", "Synth Assassin", "Doppelganger Unit"],
    hooks: [
      "One of the ambassador's trusted bodyguards is revealed to be a synthetic infiltrator programmed for assassination.",
      "An android discovers its synthetic nature and flees its corporate creators, asking the party for asylum.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Void Warder",
    category: "scifi-mech",
    description:
      "Heavy multi-limbed maintenance mechs repurposed for zero-gravity combat outside starship hulls.",
    habitat:
      "Starship exteriors, orbital construction yards, and asteroid mines.",
    behaviour:
      "Clamps onto hull plating with magnetic claws. Uses industrial plasma cutters and riveting cannons to tear apart hostiles.",
    threatLevel: "Medium",
    variants: ["Hull Crawler", "Zero-G Sentry", "Rig Warder"],
    hooks: [
      "While performing an external hull repair, spacewalkers are ambushed by hacked Void Warders wielding laser cutters.",
      "A derelict shipyard is guarded by decades-old Void Warders that still fiercely protect unbuilt starship skeletons.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
];

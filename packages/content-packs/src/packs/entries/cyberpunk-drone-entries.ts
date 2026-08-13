import type { CreaturePackEntry } from "../../types.js";

export const cyberpunkDroneEntries: CreaturePackEntry[] = [
  {
    title: "Surveillance Roto-Drone",
    category: "cyberpunk-drone",
    description:
      "A compact quad-rotor aerial unit equipped with high-definition optical zoom cameras and spotlight arrays.",
    habitat: "Corporate compounds, alleyway airspace, and rooftop helipads.",
    behaviour:
      "Hovers silently above crowds. Projects tracking lasers and relays target coordinates to ground response units.",
    threatLevel: "Low",
    variants: ["Watchdog Flyer", "Eye-in-the-Sky", "Patrol Quad"],
    hooks: [
      "A rogue hacker is using hijacked surveillance drones to blackmail high-profile corporate executives.",
      "Shooting down an intrusive corporate spy drone alerts a nearby heavily armed rapid response team.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "Spider-Mech Sentry",
    category: "cyberpunk-drone",
    description:
      "An multi-legged mechanical crawler capable of scaling vertical walls and clinging to ceilings while deploying stun tasers.",
    habitat: "Ventilation shafts, sewer tunnels, and secure server rooms.",
    behaviour:
      "Drops from ceilings onto intruders to deliver incapacitating electrical shocks before binding them with steel cable zip-ties.",
    threatLevel: "Low",
    variants: ["Wall-Crawler Bot", "Arachno-Sentry", "Ceiling Lurker"],
    hooks: [
      "While sneaking through the building vents, the party discovers a nest of Spider-Mech Sentries patrolling the air ducts.",
      "An engineer needs help recovering an experimental spider-mech that scuttled down into the flooded maintenance sublevels.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "Corporate Gun-Drone",
    category: "cyberpunk-drone",
    description:
      "A heavily armored hover-platform mounted with twin submachine guns and automated target recognition processors.",
    habitat: "VIP convoys, military checkpoints, and executive estates.",
    behaviour:
      "Lays down continuous suppressing fire while evading incoming projectiles using lateral thruster bursts.",
    threatLevel: "Medium",
    variants: ["Assault Hover-Bot", "Sentry Platform", "Viper Gun-Drone"],
    hooks: [
      "An armored limousine is guarded by a pair of aggressive gun-drones that open fire on anyone stepping within ten meters.",
      "Hackers can take control of corporate gun-drones if someone can get close enough to attach a hardware bypass dongle.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "Nano-Swarmer",
    category: "cyberpunk-drone",
    description:
      "A cloud of thousands of insect-sized micro-drones designed for electronic sabotage and data interception.",
    habitat:
      "Corporate mainframe vaults, research facilities, and hacker dens.",
    behaviour:
      "Infiltrates air seams to short-circuit cyberware, corrode weapon circuitry, and intercept wireless communications.",
    threatLevel: "Medium",
    variants: ["Static Cloud", "Bug Swarm", "Data Leech"],
    hooks: [
      "The party's encrypted comms are suddenly broadcast to city police after a nano-swarmer infiltrates their vehicle.",
      "Deploying a stolen EMP canister is the only way to stop a nano-swarmer cloud from destroying server banks.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "EMP Hover-Bot",
    category: "cyberpunk-drone",
    description:
      "A spherical drone containing an overcharged capacitor capable of unleashing localized electromagnetic pulses.",
    habitat: "Anti-riot barricades, cyber-rehab clinics, and security gates.",
    behaviour:
      "Charges into the center of cyborg groups before detonating its EMP charge to disable cybernetic limbs and weapons.",
    threatLevel: "Medium",
    variants: ["Shock Sphere", "Spark Bot", "Nullifier Drone"],
    hooks: [
      "Syndicate hitmen release EMP hover-bots into the night market to neutralize the party's cyberware before attacking.",
      "Scavenging the intact capacitor from an unexploded EMP hover-bot provides a potent one-shot weapon against security mechs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "Urban Cyber-Beast",
    category: "cyberpunk-drone",
    description:
      "A bio-mechanical quadruped combining cloned muscle tissue with robotic endoskeletons for riot suppression.",
    habitat: "Corporate kennels, border checkpoints, and industrial yards.",
    behaviour:
      "Combines animal ferocity with machine precision. Immune to pain and capable of running at highway speeds.",
    threatLevel: "Medium",
    variants: ["Synth-Hound", "Bio-Mech Panther", "Stalker Unit"],
    hooks: [
      "An escaped urban cyber-beast is terrorizing the lower housing projects after its control chip malfunctioned.",
      "Illegal betting rings host deathmatches in abandoned warehouses featuring custom-modified urban cyber-beasts.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "Security Turret",
    category: "cyberpunk-drone",
    description:
      "A ceiling-mounted automated automated cannon linked to thermal cameras and biometric scanning databases.",
    habitat: "Elevator lobbies, bank vaults, and corporate research labs.",
    behaviour:
      "Remains concealed behind ceiling panels until unauthorized biometrics are detected, then drops down to open fire.",
    threatLevel: "Medium",
    variants: ["Pop-down Sentry", "Smart Turret", "Defense Cannon"],
    hooks: [
      "The elevator doors open to reveal a hallway lined with active security turrets whose biometric database has been wiped.",
      "A clever decker can spoof the security turret network to turn corporate automated defenses against arriving guards.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "Delivery Interceptor",
    category: "cyberpunk-drone",
    description:
      "A high-speed courier drone retrofitted by street gangs with ramming blades and hacking transponders.",
    habitat: "Skyscraper flight lanes, package depots, and rooftop hideouts.",
    behaviour:
      "Intercepts legitimate corporate cargo drones mid-air, slicing their rotors and hijacking valuable shipments.",
    threatLevel: "Low",
    variants: ["Pirate Drone", "Sky Raider", "Cargo Hijacker"],
    hooks: [
      "A vital medical delivery drone carrying synthetic organs is shot down by gang interceptors on a nearby rooftop.",
      "The party is hired to operate aerial escort skiffs to protect a high-value cargo convoy from swarm interceptors.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
  {
    title: "Data-Vault Drone",
    category: "cyberpunk-drone",
    description:
      "An armored, self-destructing mobile server chassis used by couriers to transport top-secret AI algorithms physically.",
    habitat:
      "Armored transport vans, corporate helipads, and black-market drops.",
    behaviour:
      "Evades capture using smoke countermeasures. Initiates thermite core melting if unauthorized physical access is attempted.",
    threatLevel: "Low",
    variants: ["Courier Bot", "Memory Vault", "Secure Pod"],
    hooks: [
      "A corporate transport crash leaves an undamaged Data-Vault Drone wandering the alleys, ticking down to thermite detonation.",
      "Rival syndicates are racing across the city to capture a Data-Vault Drone carrying the identities of undercover agents.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Duodrone/Duodrone%20(1).webp",
  },
  {
    title: "Heavy Siege Bot",
    category: "cyberpunk-drone",
    description:
      "A tracked miniature tank drone deployed by SWAT units to breach fortified compound walls and barricades.",
    habitat:
      "Urban siege zones, syndicate fortress compounds, and riot fronts.",
    behaviour:
      "Deploys hydraulic battering rams and breaching charges to shatter reinforced doors while absorbing heavy gunfire.",
    threatLevel: "High",
    variants: ["Breacher Tank", "SWAT Juggernaut", "Wall-Buster Bot"],
    hooks: [
      "Police forces deploy a Heavy Siege Bot to breach the safehouse where the party is hiding with a rescued hostage.",
      "Taking control of a disabled siege bot allows the party to smash through the blast doors of a secure corporate compound.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Monodrone/Monodrone%20(1).webp",
  },
];

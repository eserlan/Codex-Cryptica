import type { CreaturePackEntry } from "../../types.js";

export const apocalypticRaiderEntries: CreaturePackEntry[] = [
  {
    title: "Wasteland Berserker",
    category: "apocalyptic-raider",
    description:
      "A chem-crazed raider clad in scrap iron plating and barbed wire, wielding a roaring engine-blade.",
    habitat:
      "Raider strongholds, highway checkpoints, and ruined industrial plants.",
    behaviour:
      "Charges headlong into enemy gunfire while screaming combat hymns. Ignores grievous wounds due to heavy combat stimulants.",
    threatLevel: "Medium",
    variants: ["Chem-Brute", "Scrap Warrior", "Road Fanatic"],
    hooks: [
      "A warlord's vanguard of berserkers breaches the settlement gate, setting fire to the grain silos.",
      "Defeating the berserker champion in single combat is the only way to earn safe passage across the bridge.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerOrcMale%20(1).webp",
  },
  {
    title: "Road Raider Chief",
    category: "apocalyptic-raider",
    description:
      "A cunning highway warlord commanding a fleet of spiked dune buggies and armored muscle cars.",
    habitat: "Desert highways, old drive-in theaters, and fortress garages.",
    behaviour:
      "Directs vehicle maneuvers from a command rig. Uses harpoons and incendiary cocktails to cripple trade convoys.",
    threatLevel: "High",
    variants: ["Highway Baron", "Convoy Warlord", "Speed Demon Chief"],
    hooks: [
      "The Road Raider Chief has captured the settlement's fuel tanker and demands an extortionate ransom in purified water.",
      "Rival raider gangs unite under a new chief's banner to lay siege to the regional trading hub.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Orc%20War%20Chief/OrcWarchief%20(1).webp",
  },
  {
    title: "Scrap-Armor Heavy",
    category: "apocalyptic-raider",
    description:
      "A towering brute encased in welded boiler plates and street signs, hefting a rotary machine gun.",
    habitat: "Scrapyards, fortress gates, and mining camps.",
    behaviour:
      "Provides heavy fire support while slowly advancing. Shrugs off small arms fire against their improvised armor.",
    threatLevel: "High",
    variants: ["Juggernaut Raider", "Boiler-Plate Gunner", "Iron Enforcer"],
    hooks: [
      "A Scrap-Armor Heavy blocks the narrow tunnel exit, forcing the party to find a flanking route through the air shafts.",
      "Salvaging the heavy's machine gun ammunition is essential for defending the town against an upcoming raid.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerDragonborn%20(1).webp",
  },
  {
    title: "Wasteland Sniper",
    category: "apocalyptic-raider",
    description:
      "A patient scout draped in desert camouflage netting, armed with a high-caliber scoped hunting rifle.",
    habitat: "Water towers, ruined bell towers, and canyon cliff edges.",
    behaviour:
      "Pins down travelers from long distances. Relocates immediately after firing two consecutive shots to avoid detection.",
    threatLevel: "Medium",
    variants: ["Canyon Sharpshooter", "Tower Lookout", "Ghost Hunter"],
    hooks: [
      "The party is pinned down behind a rusted bus by a concealed sniper picking off anyone who attempts to cross the street.",
      "Tracking the sniper back to their cliffside lookout uncovers a map detailing all planned raider ambush sites.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerDragonborn%20(1).webp",
  },
  {
    title: "Cultist of the Atom",
    category: "apocalyptic-raider",
    description:
      "A religious zealot worshiping unexploded nuclear warheads, armed with gamma-emitter pistols and radioactive grenades.",
    habitat: "Crater shrines, atomic missile silos, and glowing wastes.",
    behaviour:
      "Welcomes radiation sickness as a divine blessing. Attempts to irradiate unbelievers using dirty bombs.",
    threatLevel: "Medium",
    variants: ["Gamma Priest", "Crater Zealot", "Atomic Apostle"],
    hooks: [
      "Cultists of the Atom have seized control of an old missile silo and threaten to detonate a dormant warhead.",
      "Rescuing a kidnapped engineer from the crater shrine before she is sacrificed in a radiation ritual.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Panther/Panther%20(1).webp",
  },
  {
    title: "Pit Fighter Gladiator",
    category: "apocalyptic-raider",
    description:
      "A scarred arena combatant armed with rebar spears and buzzsaw shields, trained to entertain raider crowds.",
    habitat: "Wasteland colosseums, raider camps, and slave pits.",
    behaviour:
      "Uses theatrical flourishes and brutal close-quarters grappling to disarm opponents before playing to the crowd.",
    threatLevel: "Medium",
    variants: ["Arena Champion", "Rebar Duelist", "Pit Champion"],
    hooks: [
      "Captured by raiders, the party is thrown into the fighting pit against the undefeated reigning champion.",
      "A gladiator offers to help the party incite a slave uprising if they disable the arena's perimeter sniper towers.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gladiator/GladiatorElfMale%20(1).webp",
  },
  {
    title: "Junk-Mecha Brawler",
    category: "apocalyptic-raider",
    description:
      "A raider operating a crude, diesel-spewing industrial loader modified with hydraulic wrecking claws.",
    habitat: "Scrap refineries, construction sites, and raider garages.",
    behaviour:
      "Smashes through barricades and overturns vehicles. Belches thick black exhaust clouds to obscure vision.",
    threatLevel: "High",
    variants: ["Scrap Loader", "Diesel Walker", "Wrecking Mech"],
    hooks: [
      "A Junk-Mecha Brawler is smashing apart the settlement's solar panels; the party must target its exposed fuel lines.",
      "Hijacking a raider mecha allows the party to clear collapsed concrete rubble blocking the entrance to a pre-war bunker.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerDragonborn%20(1).webp",
  },
  {
    title: "Dune Scavenger",
    category: "apocalyptic-raider",
    description:
      "A solitary scavenger wearing goggles and rebreather masks, expert at laying trap wires and acoustic mines.",
    habitat: "Shifting sands, abandoned gas stations, and aircraft wrecks.",
    behaviour:
      "Lures intruders into rigged minefields and snare traps before looting their immobilized gear.",
    threatLevel: "Low",
    variants: ["Trap Master", "Desert Scav", "Wreck Looters"],
    hooks: [
      "While exploring a downed cargo plane, the party triggers an alarm tripwire set by territorial dune scavengers.",
      "A scavenger trades valuable pre-war medical supplies in exchange for working water purifier filters.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerDragonborn%20(1).webp",
  },
  {
    title: "Highway Marauder",
    category: "apocalyptic-raider",
    description:
      "Fast-moving motorcycle outlaws wielding sawed-off shotguns and chain whips, specializing in hit-and-run raids.",
    habitat: "Interstate highways, desert flats, and abandoned motels.",
    behaviour:
      "Circles convoys at high speed, tossing firebombs and snatching supplies before accelerating out of range.",
    threatLevel: "Low",
    variants: ["Biker Outlaw", "Road Marauder", "Speed Raider"],
    hooks: [
      "A pack of highway marauders harasses the party's vehicle across thirty miles of open desert blacktop.",
      "Infiltrating the motel hideout while the marauders are asleep to reclaim stolen communication gear.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerDragonborn%20(1).webp",
  },
  {
    title: "Chem-Crazed Brawler",
    category: "apocalyptic-raider",
    description:
      "A erratic raider who has consumed unregulated experimental combat chems, granting erratic bursts of insane strength.",
    habitat: "Raider drug labs, ruins, and slum bars.",
    behaviour:
      "Attacks wildly with bare fists and broken pipes. Immune to pain until the chemical rush wears off, causing collapse.",
    threatLevel: "Low",
    variants: ["Adrenaline Psycho", "Slum Brawler", "Chem Addict"],
    hooks: [
      "A chem lab explosion sends half a dozen crazed brawlers rampaging through the marketplace.",
      "Finding the chemist who synthesized the berserk drug before raiders distribute it to their entire army.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerDragonborn%20(1).webp",
  },
];

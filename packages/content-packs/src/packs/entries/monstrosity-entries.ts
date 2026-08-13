import type { CreaturePackEntry } from "../../types.js";

export const monstrosityEntries: CreaturePackEntry[] = [
  {
    title: "Harpy",
    category: "monstrosity",
    description:
      "A malicious avian monstrosity combining the body of a feathered vulture with the torso and head of a feral woman.",
    habitat: "Coastal cliffs, rocky gorges, and ruined towers.",
    behaviour:
      "Sings a captivating, magical melody that lures unsuspecting victims toward perilous cliff edges or rocky shoals before swooping in to feed.",
    threatLevel: "Low",
    variants: ["Storm Harpy", "Siren Queen", "Carrion Screamer"],
    hooks: [
      "Shipwrecks along the jagged coast have doubled this month after a flock of harpies nested in the abandoned lighthouse.",
      "A merchant's son walked out of his campsite in a trance toward the cliff edge, driven by an ethereal song.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Harpy/Harpy%20(1).webp",
  },
  {
    title: "Basilisk",
    category: "monstrosity",
    description:
      "A heavy, eight-legged reptilian beast whose supernatural gaze can petrify living flesh into solid stone.",
    habitat:
      "Subterranean caverns, dry scrublands, and ruined temple courtyards.",
    behaviour:
      "Sluggish and confident. Glares at prey until they turn to stone, then uses its powerful alchemical jaw secretions to digest the petrified remains.",
    threatLevel: "Medium",
    variants: ["Greater Basilisk", "Abyssal Basilisk", "Desert Stone-Gazer"],
    hooks: [
      "The entrance to the silver mine is littered with lifelike stone statues of miners trapped in poses of fleeing terror.",
      "An alchemist requires the intact gullet gland of a fresh basilisk to formulate a stone-to-flesh restoration salve.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Basilisk/Basilisk%20(1).webp",
  },
  {
    title: "Owlbear",
    category: "monstrosity",
    description:
      "A ferocious hybrid creature uniting the razor-sharp beak and piercing eyesight of a giant owl with the massive, muscular frame of a bear.",
    habitat: "Dense primal forests, overgrown ruins, and dark woodland caves.",
    behaviour:
      "Aggressive and notoriously bad-tempered. Screeches deafeningly before charging to crush and shred targets with beak and claws.",
    threatLevel: "Medium",
    variants: [
      "Snowy Owlbear",
      "Great Horned Owlbear",
      "Screeching Juggernaut",
    ],
    hooks: [
      "A pair of mated owlbears has made their nest in the ruined watchtower overlooking the logging road.",
      "An eccentric noble wants to purchase a live owlbear egg from the deep forest, offering a chest of gold.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Owlbear/Owlbear%20(1).webp",
  },
  {
    title: "Griffon",
    category: "monstrosity",
    description:
      "A proud aerial predator combining the head, forelimbs, and wings of a majestic eagle with the hindquarters of a lion.",
    habitat: "High mountain peaks, alpine cliffs, and rugged canyon eyries.",
    behaviour:
      "Swoops down from the clouds to snatch horses or livestock. Fiercely territorial and loyal unto death if reared from a fledgling.",
    threatLevel: "Medium",
    variants: [
      "Royal Golden Griffon",
      "Snowy Mountain Griffon",
      "Night Stalker Griffon",
    ],
    hooks: [
      "Royal cavalry officers are seeking daring adventurers to scale the thunder cliffs and secure griffon eggs for training.",
      "A rogue griffon has been swooping down into the valley pasture every noon to carry off prize draft horses.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Griffon/Griffon%20(1).webp",
  },
  {
    title: "Cockatrice",
    category: "monstrosity",
    description:
      "A bizarre, repulsive hybrid resembling a hideous cockerel with bat-like wings and a scaly serpentine tail.",
    habitat: "Overgrown farmland, ancient barn ruins, and damp caverns.",
    behaviour:
      "Frantically flits and pecks at intruders; its bite introduces a magical calcifying poison that turns victims into limestone.",
    threatLevel: "Low",
    variants: ["Plague Cockatrice", "Greater Stone-Beak", "Dungeon Spur"],
    hooks: [
      "A farmer found half his chickens turned into stone statues inside the coop this morning.",
      "A swarm of cockatrices has nested inside the city's aqueduct tunnels, threatening workers.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cockatrice/Cockatrice%20(1).webp",
  },
  {
    title: "Manticore",
    category: "monstrosity",
    description:
      "A sadistic monstrosity sporting a humanoid face with three rows of shark-like teeth, the body of a lion, dragon wings, and a tail tipped with iron spikes.",
    habitat: "Badland canyons, mountain ruins, and desolate scrublands.",
    behaviour:
      "Unleashes volleys of deadly tail spikes from the air while mocking and taunting prey in human tongue before closing in to feast.",
    threatLevel: "Medium",
    variants: ["Venom-Tail Manticore", "Desert Scourge", "Abyssal Manticore"],
    hooks: [
      "A cruel manticore demands a weekly tribute of cattle and gold from the mountain village to spare their children.",
      "Caravan guards found travelers pinned to trees by foot-long iron quills along the badland pass.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Manticore/Manticore%20(1).webp",
  },
  {
    title: "Chimera",
    category: "monstrosity",
    description:
      "A three-headed terror combining the forequarters of a lion, the hindquarters of a goat, and the wings and head of a red dragon.",
    habitat: "Volcanic crags, desolate mountain passes, and scorched caverns.",
    behaviour:
      "Breathes devastating cones of flame from its dragon head while goring with goat horns and tearing with lion claws.",
    threatLevel: "High",
    variants: ["Frost Chimera", "Shadow Chimera", "Gorgon-Headed Chimera"],
    hooks: [
      "A chimera has claimed the old dwarven fortress as its lair, incinerating any patrol sent to reclaim the armory.",
      "Three distinct animal roars echoing from the misty gorge warn that the beast of legends has awakened.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Chimera/Chimera%20(1).webp",
  },
  {
    title: "Medusa",
    category: "monstrosity",
    description:
      "A cursed humanoid cursed with venomous writhing serpents for hair and a terrifying gaze that instantly transforms onlookers into stone.",
    habitat:
      "Secluded ruined temples, sculpture gardens, and subterranean palaces.",
    behaviour:
      "Surrounds herself with petrified victims posed as decorative art. Uses archery and veiled deception to ambush intruders.",
    threatLevel: "High",
    variants: ["Gorgon Queen", "Venom-Hair Medusa", "Temple Curse-Lord"],
    hooks: [
      "An incredibly realistic sculpture garden discovered deep in the jungle contains statues of missing explorers.",
      "A lonely medusa seeks an antidote or magical blindfold so she can look upon the mortal world without destroying it.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Medusa/MedusaMale%20(1).webp",
  },
  {
    title: "Minotaur",
    category: "monstrosity",
    description:
      "A hulking, bull-headed humanoid possessing immense physical strength and an innate, supernatural sense of direction.",
    habitat:
      "Underground labyrinths, mazes, deep mine tunnels, and ruined amphitheaters.",
    behaviour:
      "Charges headdown to gore intruders with massive horns before cleaving them with a heavy greataxe. Never gets lost in mazes.",
    threatLevel: "Medium",
    variants: ["Labyrinth Lord", "Blood-Horn Minotaur", "Iron-Clad Beast"],
    hooks: [
      "The city sewers connect to an ancient labyrinth where a minotaur hunts prisoners cast down by a corrupt judge.",
      "A minotaur mercenary offers to guide heroes through the shifting crystal caverns if they help him defeat his rival.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Minotaur/MinotaurMale%20(1).webp",
  },
  {
    title: "Rust Monster",
    category: "monstrosity",
    description:
      "A subterranean, insectoid beast with feather-like antennae capable of instantly corroding any metal they touch into rust.",
    habitat: "Old mines, dwarf ruins, and underground armories.",
    behaviour:
      "Ignores organic matter to enthusiastically devour swords, armor, and iron coins. Frantically chases armored warriors.",
    threatLevel: "Low",
    variants: ["Corrosive Beetle", "Adamantine-Eater", "Plague-Rust Crawler"],
    hooks: [
      "Dwarven miners broke into a cavern filled with rust monsters; their pickaxes and carts disintegrated in seconds.",
      "A cunning goblin chief keeps a caged rust monster to threaten captured knights with the loss of their prized plate armor.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Rust%20Monster/RustMonster%20(1).webp",
  },
  {
    title: "Winter Wolf",
    category: "monstrosity",
    description:
      "A horse-sized canine with snow-white fur and glowing blue eyes, capable of exhaling freezing blasts of frost.",
    habitat: "Frozen tundras, glacial peaks, and snowy boreal forests.",
    behaviour:
      "Hunts in intelligent packs during blizzards. Speaks giant tongue and uses tactical ambushes to freeze prey solid.",
    threatLevel: "Medium",
    variants: ["Frost-Breath Alpha", "Glacial Stalker", "Blizzard Hound"],
    hooks: [
      "A pack of winter wolves led by an intelligent alpha has trapped a royal envoy inside a mountain lodge during a blizzard.",
      "Pelt hunters seek brave escorts into the northern ice fields where winter wolves hunt travelers for sport.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Winter%20Wolf/WinterWolf%20(1).webp",
  },
  {
    title: "Worg",
    category: "monstrosity",
    description:
      "A sinister, intelligent wolf of enormous size with dark shaggy fur and glowing red eyes, often speaking goblin tongue.",
    habitat: "Goblin war camps, dark forests, and ruined outposts.",
    behaviour:
      "Frequently serves as mounts or pack leaders for goblinoids. Delights in cruel taunting and hunting weakened stragglers.",
    threatLevel: "Low",
    variants: ["War Worg", "Shadow Worg", "Blood-Fang Alpha"],
    hooks: [
      "Goblin raiders mounted on armored worgs are outrunning the ducal cavalry and burning border farms.",
      "A lone worg offers to betray its goblin masters and reveal their hidden cave entrance in exchange for fresh mutton.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Worg/Worg%20(1).webp",
  },
  {
    title: "Bulette",
    category: "monstrosity",
    description:
      "A massive, land-shark beast with bullet-shaped armored plating that burrows through earth and rock at terrifying speeds.",
    habitat: "Rolling hills, open grasslands, and mining valleys.",
    behaviour:
      "Detects prey through ground vibrations before exploding up from beneath the earth to swallow livestock or horses whole.",
    threatLevel: "High",
    variants: ["Iron-Plated Landshark", "Deep Burrower", "Plague Bulette"],
    hooks: [
      "Tremors shaking the farming valley aren't an earthquake—a bulette is tunneling under the pasture eating cattle.",
      "Mining carts keep sinking into sinkholes created by a burrowing juggernaut guarding a rich mithril vein.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bulette/Bulette%20(1).webp",
  },
  {
    title: "Hydra",
    category: "monstrosity",
    description:
      "A colossal reptilian horror with multiple serpentine heads; severing one head causes two more to sprout in its place.",
    habitat: "Fetid swamps, sunken ruins, and flooded dungeon caverns.",
    behaviour:
      "Strikes with multiple snapping heads simultaneously. Unless cauterized with fire or acid, wounds rapidly regenerate new heads.",
    threatLevel: "High",
    variants: ["Cryo-Hydra", "Pyro-Hydra", "Fen-Lord Leviathan"],
    hooks: [
      "The bridge across the great marsh is closed because a nine-headed hydra has nested in the central ruins.",
      "Ancient runes indicate that only the flaming oil of a salamander can permanently seal the neck stumps of the swamp terror.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hydra/Hydra%20(1).webp",
  },
  {
    title: "Kraken Spawn",
    category: "monstrosity",
    description:
      "A monstrous deep-sea cephalopod with razor-barbed tentacles and an ink sac capable of blinding entire schools of fish.",
    habitat: "Coastal shipwrecks, deep ocean trenches, and flooded sea caves.",
    behaviour:
      "Reaches tentacles up over ship gunwales to drag sailors overboard into its crushing beak. Expels choking black ink when wounded.",
    threatLevel: "Medium",
    variants: ["Deep-Sea Terror", "Reef Strangler", "Abyssal Squid"],
    hooks: [
      "Fishing boats return to harbor with smashed hulls and broken oars, reporting giant suckered arms rising from the kelp beds.",
      "A sunken pirate galley holding a chest of pearls is guarded by a territorial kraken spawn.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Vampire%20Spawn/VampireSpawnElfFemale%20(1).webp",
  },
  {
    title: "Roper",
    category: "monstrosity",
    description:
      "A subterranean predator disguised perfectly as a stalagmite, possessing six adhesive tendrils and a toothy maw.",
    habitat: "Natural caverns, underdark highways, and deep dungeon passages.",
    behaviour:
      "Shoots sticky tendrils across caverns to reel prey into its central grinding jaw while sapping their physical strength.",
    threatLevel: "Medium",
    variants: ["Crystal Roper", "Lava Roper", "Shadow Strangler"],
    hooks: [
      "Explorers descending the vertical shaft keep getting plucked off their ropes by what looks like rock formations.",
      "Cutting open the stomach of an ancient roper reveals undigested gemstones and platinum coins from centuries of victims.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Roper/Roper%20(1).webp",
  },
  {
    title: "Stirge Swarm",
    category: "monstrosity",
    description:
      "A cloud of feathered, multi-legged winged horrors with barbed proboscises designed to latch on and siphon blood.",
    habitat: "Dark attics, damp cavern ceilings, and overgrown swamps.",
    behaviour:
      "Swarm targets in frantic clouds, piercing armor gaps to pump anticoagulant and bloat themselves on blood.",
    threatLevel: "Low",
    variants: ["Plague Stirges", "Jungle Blood-Suckers", "Cave Swarm"],
    hooks: [
      "Entering the old wine cellar awakens a buzzing cloud of blood-sucking beasts roosting among the dusty barrels.",
      "A strange anemia spreading through the barracks is caused by stirges squeezing through the chimney flues at night.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Stirge/Stirge%20(1).webp",
  },
  {
    title: "Ankheg",
    category: "monstrosity",
    description:
      "A multi-legged insectoid burrower with chitinous brown armor and mandibles capable of spraying digestive acid.",
    habitat:
      "Fertile agricultural farmland, loose forest soil, and sandy valleys.",
    behaviour:
      "Lurks five feet below the soil waiting for vibrations before erupting to grab prey in its mandibles and douse them in acid.",
    threatLevel: "Low",
    variants: ["Queen Ankheg", "Acid-Spitter", "Deep Burrower"],
    hooks: [
      "Autumn harvest is paralyzed because ankhegs are tunneling under the cornfields and pulling tractors underground.",
      "Ankheg chitin is prized by armorers for crafting lightweight, acid-resistant breastplates.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ankheg/Ankheg%20(1).webp",
  },
  {
    title: "Darkmantle",
    category: "monstrosity",
    description:
      "A tentacled subterranean creature resembling a stalactite that drops down from ceilings to envelope victims in darkness.",
    habitat: "Limestone caverns, underdark tunnels, and dungeon ceilings.",
    behaviour:
      "Projects an aura of magical darkness upon dropping onto a victim's head, crushing and suffocating them in pitch blackness.",
    threatLevel: "Low",
    variants: ["Shadow-Mantle", "Deep Cave Ceiling-Crusher", "Abyssal Drop"],
    hooks: [
      "Torches suddenly extinguish in the cavern tunnel before heavy fleshy shapes begin dropping from the ceiling onto the vanguard.",
      "Miners refuse to enter the lower shaft until the ceiling stalactites are cleared with long pikes and fire.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Darkmantle/DarkMantleDark%20(1).webp",
  },
  {
    title: "Gorgon",
    category: "monstrosity",
    description:
      "A ferocious iron-plated bull whose nostrils exhale a cloud of petrifying vapor that turns living creatures into stone.",
    habitat: "Rocky wilderness, mountain ruins, and petrified forests.",
    behaviour:
      "Tramples victims under iron hooves after breathing a green petrifying gas across the battlefield.",
    threatLevel: "Medium",
    variants: ["Adamantine Bull", "Plague Gorgon", "Iron Juggernaut"],
    hooks: [
      "An iron bull is terrorizing the mountain pass, shattering merchants' wagons and leaving petrified horses in its wake.",
      "The iron plating of a gorgon can be forged into impenetrable shields if harvested before the magical vapor dissipates.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gorgon/Gorgon%20(1).webp",
  },
];

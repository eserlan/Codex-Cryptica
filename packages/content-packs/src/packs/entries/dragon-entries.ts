import type { CreaturePackEntry } from "../../types.js";

export const dragonEntries: CreaturePackEntry[] = [
  {
    title: "Young Dragon",
    category: "dragon",
    description:
      "An arrogant dragon adolescent the size of a wagon, with hardening elemental scales and a dangerous breath weapon.",
    habitat:
      "Mountain peaks, abandoned ruins, volcanic caverns, and deep forests.",
    behaviour:
      "Aggressively territorial as it establishes its first hoard. Swoops down to unleash its breath weapon before rending with claws.",
    threatLevel: "Medium",
    variants: ["Red Dragonet", "Green Drake", "Blue Thunder-Wing"],
    hooks: [
      "A young green dragon has claimed the old ruined abbey and is forcing local kobolds to steal gold from travelers.",
      "A merchant caravan offers double pay for escorts through the gorge where a fire-breathing adolescent drake nests.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Young%20Red%20Dragon/YoungRedDragon%20(1).webp",
  },
  {
    title: "Wyvern",
    category: "dragon",
    description:
      "A two-legged draconic cousin with leathern wings and a whipping, segmented tail tipped with a dripping venomous stinger.",
    habitat: "Rocky cliffs, high crags, and alpine meadows.",
    behaviour:
      "Swoops silently from high crags to snatch prey in its talons while repeatedly stinging them with lethal neurotoxin.",
    threatLevel: "Medium",
    variants: ["Great Crested Wyvern", "Shadow Wyvern", "Stinger-King"],
    hooks: [
      "Wyverns have nested above the mountain pass, dropping cattle carcasses onto the road below.",
      "An apothecary needs an intact wyvern stinger sac harvested within an hour of death to create a rare antidote.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wyvern/Wyvern%20(1).webp",
  },
  {
    title: "Kobold",
    category: "dragon",
    description:
      "Small, reptilian humanoids claiming dragon ancestry who make up for their physical weakness with devious mechanical traps.",
    habitat: "Subterranean mines, dragon lairs, sewer mazes, and dense woods.",
    behaviour:
      "Cowardly in open combat. Lures intruders into tunnels filled with pit traps, falling rocks, and poisoned darts.",
    threatLevel: "Low",
    variants: ["Dragonshield Guard", "Scale Sorcerer", "Trapmaster"],
    hooks: [
      "The silver mine has been rigged with ingenious mechanical deadfalls by a tribe of kobolds worshiping a dragon scale.",
      "A kobold inventor wants to hire the heroes to test his newly engineered steam-powered trap suite.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Kobold/KoboldUrban%20(1).webp",
  },
  {
    title: "Pseudodragon",
    category: "dragon",
    description:
      "A tiny, housecat-sized dragon with reddish-brown scales and a flexible tail tipped with a non-lethal sleep-inducing stinger.",
    habitat: "Arcane libraries, sylvan woodlands, and wizard towers.",
    behaviour:
      "Shy and discerning. Bonds with kind-hearted spellcasters as a familiar, telepathically sharing emotions and scouting ahead.",
    threatLevel: "Low",
    variants: ["Chameleon Drake", "Forest Sprite-Drake", "Library Guardian"],
    hooks: [
      "A wild pseudodragon has taken a liking to the party's wizard, perched on their pack while refusing to leave.",
      "Poachers are attempting to capture rare pseudodragons to sell as exotic pets to wealthy city merchants.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Pseudodragon/PseudodragonDesert%20(1).webp",
  },
  {
    title: "Drake",
    category: "dragon",
    description:
      "A wingless, four-legged reptilian predator with thick draconic scales and elemental resistance bred as war hounds.",
    habitat: "Dragon cult fortresses, volcanic caves, and mercenary kennels.",
    behaviour:
      "Fights with pack coordinated ferocity, tearing opponents down with crushing jaws while shrugging off elemental spells.",
    threatLevel: "Medium",
    variants: ["Fire Drake", "Guard Drake", "Frost Drake"],
    hooks: [
      "A cult of dragon worshipers uses armored fire drakes to patrol the perimeters of their mountain sanctuary.",
      "A pack of wild drakes has escaped from a destroyed mercenary camp and is terrorizing local livestock.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Red%20Dragon%20Wyrmling/RedDragonWyrmling%20(1).webp",
  },
  {
    title: "Dragon Turtle",
    category: "dragon",
    description:
      "A titanic aquatic dragon protected by a shell the size of an island, capable of exhaling scalding clouds of steam.",
    habitat: "Deep oceans, tropical straits, and submerged volcanoes.",
    behaviour:
      "Demands toll from passing ships in treasure or cargo. If refused, surfaces underneath the vessel to capsize it or boil the crew.",
    threatLevel: "High",
    variants: ["Deep Sea Leviathan", "Steam Lord", "Ancient Shell-King"],
    hooks: [
      "Sailors mistook the mossy back of a sleeping dragon turtle for an island, anchoring their ship directly to its shell.",
      "A pirate king pays tribute to a massive dragon turtle that destroys any royal navy vessel entering his bay.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Faerie%20Dragon/FaerieDragonRed%20(1).webp",
  },
  {
    title: "Faerie Dragon",
    category: "dragon",
    description:
      "A mischievous, cat-sized dragon with butterfly wings and iridescent scales that shift colors as it ages.",
    habitat: "Enchanted forests, fey groves, and hidden sylvan glades.",
    behaviour:
      "Delights in harmless pranks and illusions. Exhales a puff of euphoric gas that causes victims to wander about giggling helplessly.",
    threatLevel: "Low",
    variants: ["Prismatic Dragonet", "Illusionist Drake", "Sprite Companion"],
    hooks: [
      "The party's weapons keep mysteriously turning into bunches of flowers thanks to a giggling invisible faerie dragon.",
      "A faerie dragon guides lost children out of the dark woods, but leads greedy lumberjacks into quicksand bogs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Faerie%20Dragon/FaerieDragonRed%20(1).webp",
  },
  {
    title: "Half-Dragon Champion",
    category: "dragon",
    description:
      "A formidable humanoid warrior infused with draconic blood, sporting scales, claws, and a lethal elemental breath weapon.",
    habitat: "Dragon armories, cult strongholds, and vanguard command tents.",
    behaviour:
      "Fights with honorable martial pride or ruthless cruelty, unleashing breath weapons before closing into melee with greatswords.",
    threatLevel: "Medium",
    variants: ["Red Scale General", "Lightning Blade", "Acid-Blood Duelist"],
    hooks: [
      "A half-dragon warlord has challenged the city's greatest champion to single combat at dawn.",
      "An elite guard of half-dragons protects the entrance to the ancient wyrm's treasure vault.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Red%20Dragon%20Wyrmling/RedDragonWyrmling%20(1).webp",
  },
  {
    title: "Shadow Dragon",
    category: "dragon",
    description:
      "A true dragon corrupted by centuries spent in the Shadowfell, its scales translucent and its breath a necrotic wave of despair.",
    habitat: "Shadow crossings, sunless ruins, and subterranean abysses.",
    behaviour:
      "Melts into deep shadows to become practically invisible. Exhales shadow breath that drains vitality and raises slain foes as shadows.",
    threatLevel: "High",
    variants: ["Gloom Wyrm", "Umbral Sovereign", "Nightmare Drake"],
    hooks: [
      "A shadow dragon has blotted out the sun over the valley, plunging the region into eternal twilight.",
      "Any creature slain by the shadow dragon's breath rises immediately as an undead shadow under its command.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shadow/Shadow%20(1).webp",
  },
  {
    title: "Dracolich",
    category: "dragon",
    description:
      "The skeletal remains of an ancient dragon transformed through dark necromancy into an undead wyrm of unimaginable power.",
    habitat: "Desolated peaks, necropolis vaults, and bone-strewn craters.",
    behaviour:
      "Combines the terrifying physical and breath capabilities of an ancient dragon with undead invulnerability and spellcasting.",
    threatLevel: "High",
    variants: ["Undying Wyrm", "Skeletal Dragon-King", "Necrotic Sovereign"],
    hooks: [
      "A cult has succeeded in binding the spirit of a long-dead red dragon into its excavated fossilized skeleton.",
      "To permanently destroy the dracolich, heroes must locate and crush the ruby gemstone serving as its phylactery.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Red%20Dragon%20Wyrmling/RedDragonWyrmling%20(1).webp",
  },
  {
    title: "Ancient Red Dragon",
    category: "dragon",
    description:
      "A colossal, arrogant tyrant of fire and wrath whose wingspan blots out the sky and whose roar shakes mountains.",
    habitat:
      "Volcanic peaks, subterranean magma chambers, and ruined mountain dwarf citadels.",
    behaviour:
      "Demands absolute worship and tribute. Incinerates entire armies with cones of fire before crushing survivors underfoot.",
    threatLevel: "High",
    variants: ["Volcanic Sovereign", "Ashen Tyrant", "Crimson Calamity"],
    hooks: [
      "The ancient dragon that burned the dwarven kingdom three centuries ago has woken from its slumber hungry for gold.",
      "The heat radiating from the dragon's body is so intense that flammable objects ignite simply by being in its presence.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Red%20Slaad/RedSlaad%20(1).webp",
  },
  {
    title: "Ancient White Dragon",
    category: "dragon",
    description:
      "A primal, bestial predator of the arctic wastes with diamond-hard crystalline scales and a breath of flash-freezing blizzard.",
    habitat: "Glacial caverns, ice spires, and frozen tundra peaks.",
    behaviour:
      "Hunts with cunning bestial ferocity, preserving defeated foes in walls of transparent ice like frozen trophies in a pantry.",
    threatLevel: "High",
    variants: ["Glacial Sovereign", "Frost-Fang Monarch", "Blizzard Wyrm"],
    hooks: [
      "Explorers inside the glacial cavern walk past hundreds of frozen warriors preserved perfectly in the ice palace walls.",
      "The dragon's roar triggers devastating mountain avalanches that bury approaching armies.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Faerie%20Dragon/FaerieDragonRed%20(1).webp",
  },
  {
    title: "Ancient Green Dragon",
    category: "dragon",
    description:
      "A deceitful, master manipulator covered in emerald scales who corrupts ancient forests and exhales billowing clouds of chlorine poison.",
    habitat:
      "Overgrown primeval forests, misty jungles, and ruined sylvan capitals.",
    behaviour:
      "Prefers corrupting heroes through lies, blackmail, and mind control over outright combat. Breathes deadly poison gas.",
    threatLevel: "High",
    variants: ["Forest Sovereign", "Venom-Wing Manipulator", "Sylvan Tyrant"],
    hooks: [
      "The green dragon controls the regional governor through blackmail and extortion, using city guards as its personal collectors.",
      "Entering the forest core requires masks treated with rare herbs to survive the lingering poison clouds.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Green%20Hag/GreenHag%20(1).webp",
  },
  {
    title: "Ancient Blue Dragon",
    category: "dragon",
    description:
      "A vain, lawful tyrant of the desert sands with azure scales, massive horned ridges, and a breath of crackling lightning.",
    habitat: "Arid badlands, desert canyons, and buried sandstone pyramids.",
    behaviour:
      "Burrows under loose desert sands to ambush caravans from below. Breathes devastating strokes of lightning that turn sand into glass.",
    threatLevel: "High",
    variants: ["Storm Sovereign", "Desert Lord", "Thunder-Wing Monarch"],
    hooks: [
      "Lightning strikes from a clear blue sky signal that the desert dragon is soaring overhead observing its domain.",
      "The dragon's lair is surrounded by fields of jagged glass tubes formed where its breath weapon struck the sand.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Blue%20Slaad/BlueSlaad%20(1).webp",
  },
  {
    title: "Ancient Black Dragon",
    category: "dragon",
    description:
      "A cruel, sadistic stalker of stagnant swamps with skull-like facial horns and a breath of corrosive, flesh-melting acid.",
    habitat: "Fetid marshes, sunken ruins, and subterranean acid lakes.",
    behaviour:
      "Delights in watching prey slowly dissolve in acid. Lurks submerged in murky swamp water before striking with terrifying speed.",
    threatLevel: "High",
    variants: ["Swamp Sovereign", "Acid-Lord", "Skull-Faced Wyrm"],
    hooks: [
      "The water in the great swamp has turned acidic and undrinkable since the black dragon claimed the central temple.",
      "The dragon keeps victims trapped in deep mud pits, pulling them out only when it wishes to torment them.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Black%20Bear/BlackBearCalm%20(1).webp",
  },
  {
    title: "Guard Drake Swarm",
    category: "dragon",
    description:
      "A coordinated pack of heavy, wingless draconic hounds bred specifically to patrol vault corridors and destroy thieves.",
    habitat: "Fortress dungeons, treasury vaults, and cult compounds.",
    behaviour:
      "Surround intruders in tight formations, using flanking maneuvers to pull heavy warriors to the ground.",
    threatLevel: "Low",
    variants: ["Iron-Scale Pack", "Treasury Hounds", "Vault Drakes"],
    hooks: [
      "The treasury door is unlocked, but the echoing barks of a dozen guard drakes inside make entering suicidal.",
      "Feeding the guard drakes raw spiced meat buys exactly ten seconds before they realize you aren't their handler.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Guard/GuardElfMale%20(1).webp",
  },
  {
    title: "Dragonborn Zealot",
    category: "dragon",
    description:
      "Proud, scale-skinned humanoid warriors who channel elemental breath and divine fury in service to draconic deities.",
    habitat: "Dragon temples, mountain sanctuaries, and honor-bound camps.",
    behaviour:
      "Unleashes short-range breath attacks before charging into combat with heavy glaives and unwavering honor.",
    threatLevel: "Medium",
    variants: ["Platinum Defender", "Chromasoul Warrior", "Scale Templar"],
    hooks: [
      "A company of dragonborn zealots has sworn to protect a sacred dragon egg until it hatches, regardless of who approaches.",
      "The zealot challenges the party leader to a test of strength and honor before allowing passage through the gates.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Red%20Dragon%20Wyrmling/RedDragonWyrmling%20(1).webp",
  },
  {
    title: "Amphiptere",
    category: "dragon",
    description:
      "A feathered serpent dragon without legs, flying through jungle canopies on brilliant plumed wings.",
    habitat:
      "Tropical rainforests, sacred step pyramids, and mountain valleys.",
    behaviour:
      "Glides silently between ancient trees. Strikes with lightning speed to deliver hypnotic bites or constrict prey.",
    threatLevel: "Low",
    variants: ["Plumed Serpent", "Sun-Wing Drake", "Temple Guardian"],
    hooks: [
      "Jungle tribes worship the radiant plumed serpent as a messenger of the sun god, bringing gifts of fruit and gold.",
      "The amphiptere guards a sacred golden reflecting pool whose waters reveal true intentions.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Red%20Dragon%20Wyrmling/RedDragonWyrmling%20(1).webp",
  },
  {
    title: "Lindwurm",
    category: "dragon",
    description:
      "A massive, two-legged wingless dragon resembling a titanic serpent with powerful foreclaws and a venomous bite.",
    habitat: "Northern fjords, deep river gorges, and burial mounds.",
    behaviour:
      "Slithers rapidly across rocky terrain. Constricts victims in its massive coils while snapping with venomous jaws.",
    threatLevel: "Medium",
    variants: ["Fjord Wyrm", "Barrow Lindwurm", "Venom Serpent"],
    hooks: [
      "A lindwurm has coiled itself around the keep's watchtower, trapping the garrison inside.",
      "Old sagas say the lindwurm can only be tamed by someone wearing armor forged from iron links dipped in dragon milk.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Red%20Dragon%20Wyrmling/RedDragonWyrmling%20(1).webp",
  },
  {
    title: "Sea Serpent",
    category: "dragon",
    description:
      "A titanic draconic reptile of the ocean depths with crested fins and jaws capable of snapping galleon masts in half.",
    habitat: "Stormy oceans, whirlpool straits, and deep sea trenches.",
    behaviour:
      "Circles ships to create whirlpool vortices before rearing up out of the water to crush decks and swallow sailors whole.",
    threatLevel: "High",
    variants: ["Ocean Leviathan", "Whirlpool Wyrm", "Crested Sea-King"],
    hooks: [
      "Navigating the strait of storms requires throwing a chest of gold overboard to appease the slumbering sea serpent.",
      "A sea serpent has swallowed a royal courier ship carrying a treaty essential to preventing continental war.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Sea%20Hag/SeaHag%20(1).webp",
  },
];

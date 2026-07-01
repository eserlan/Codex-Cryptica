import type { CreaturePackEntry } from "../../types.js";

export const oozeEntries: CreaturePackEntry[] = [
  {
    title: "Gelatinous Cube",
    category: "ooze",
    description:
      "A ten-foot transparent cube of acidic slime that glides silently down dungeon corridors absorbing organic matter and cleaning floors.",
    habitat: "Dungeon hallways, stone mazes, and underground sewers.",
    behaviour:
      "Nearly invisible in dim light. Engulfs unwary adventurers walking into it, paralyzing them while slowly dissolving their flesh and armor.",
    threatLevel: "Medium",
    variants: ["Acid Cube", "Electric Cube", "Sewer Scavenger Cube"],
    hooks: [
      "A floating skeleton wearing intact emerald rings inside what appears to be empty space is actually trapped inside a gelatinous cube.",
      "The dungeon floor in this section is suspiciously spotless and polished smooth, indicating a cube passed by recently.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gelatinous%20Cube/GelatinousCubeVisible%20(1).webp",
  },
  {
    title: "Black Pudding",
    category: "ooze",
    description:
      "An amorphous blob of sticky black acidic sludge capable of squeezing through tiny cracks and dissolving metal, wood, and flesh.",
    habitat: "Subterranean caverns, damp dungeons, and mine refuse pits.",
    behaviour:
      "Slithers across walls and ceilings. Striking it with lightning or slashing weapons causes it to split into two independent puddings.",
    threatLevel: "Medium",
    variants: ["Elder Pudding", "Abyssal Sludge", "Corrosive Blob"],
    hooks: [
      "The knight swung his broadsword down on the black blob, only to watch in horror as his blade dissolved and the puddle split in two.",
      "Black puddings avoid cold temperatures, which freeze their outer layer into fragile crusts.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Black%20Pudding/BlackPudding%20(1).webp",
  },
  {
    title: "Ochre Jelly",
    category: "ooze",
    description:
      "A yellowish puddle of living acidic amoeba that flows under doors and through ceiling cracks to drop onto unsuspecting victims.",
    habitat: "Moist dungeons, rotting forest logs, and cavern ceilings.",
    behaviour:
      "Flows along ceilings before dropping onto torches or heads. Divides into smaller jellies when hit by electricity or slashing blades.",
    threatLevel: "Low",
    variants: ["Yellow Slime", "Cave Blob", "Sewer Amoeba"],
    hooks: [
      "What looked like yellow moss dripping from the cavern ceiling suddenly detached and fell squarely onto the party's wizard.",
      "Ochre jellies can digest organic fiber like leather and cotton in seconds, leaving victims stripped armorless.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ochre%20Jelly/OchreJelly%20(1).webp",
  },
  {
    title: "Gray Ooze",
    category: "ooze",
    description:
      "A puddle of intelligent liquid stone slime that blends perfectly into wet dungeon flooring before striking like a snake.",
    habitat: "Wet subterranean flagstones, cave pools, and ruined basements.",
    behaviour:
      "Remains motionless indistinguishable from wet stone. Corrodes metal armor upon contact and lashes out with pseudopods.",
    threatLevel: "Low",
    variants: ["Psychic Ooze", "Stone-Camouflage Slime", "Corrosive Puddle"],
    hooks: [
      "Stepping on what looked like a wet cobblestone sent a wave of acid splashing up over the rogue's leather boots.",
      "Some gray oozes develop rudimentary psychic awareness, telepathically projecting feelings of intense hunger into intruders' minds.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
  {
    title: "Slime Mold Swarm",
    category: "ooze",
    description:
      "A creeping carpet of single-celled yellow-green slime colonies that consumes organic waste and dead adventurers.",
    habitat: "Dungeon refuse heaps, damp forest floors, and sewers.",
    behaviour:
      "Flows relentlessly toward warmth and organic smell. Covers sleeping victims to suffocate and slowly digest them.",
    threatLevel: "Low",
    variants: ["Sewer Carpet", "Fungal Slime", "Green Scavenger"],
    hooks: [
      "The campfire warmth attracted a creeping blanket of yellow slime that surrounded the campsite while the watchman slept.",
      "Throwing salt onto a slime mold causes it to hiss wildly and retreat into nearby floor cracks.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Swarm%20of%20Bats/SwarmOfBats%20(1).webp",
  },
  {
    title: "Crystal Ooze",
    category: "ooze",
    description:
      "A translucent aquatic ooze living in subterranean pools that appears identical to clean, clear drinking water.",
    habitat: "Cavern pools, dungeon wells, and underground streams.",
    behaviour:
      "Waits patiently in clear pools until thirsty creatures bend down to drink, then lunges up to envelope their heads and drown them.",
    threatLevel: "Medium",
    variants: ["Well Slime", "Transparent Aquatic Blob", "Glass Ooze"],
    hooks: [
      "The underground spring water looks crystal clear and refreshing, but tossing a pebble in causes the water to reach up and grab it.",
      "Crystal oozes do not corrode metal or stone, leaving the coins of past drowned victims glittering clearly at the bottom of the pool.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
  {
    title: "Blood Ooze",
    category: "ooze",
    description:
      "A crimson pool of coagulated alchemical blood animated by dark necromancy or sacrificial rituals gone wrong.",
    habitat: "Desecrated altars, battlefield pits, and vampire dungeons.",
    behaviour:
      "Sense the pulse of living creatures through stone floors. Siphons blood directly through skin contact to grow larger.",
    threatLevel: "Medium",
    variants: ["Vampiric Sludge", "Sacrificial Blob", "Crimson Tide"],
    hooks: [
      "The blood spilled on the sacrificial altar didn't drain away—it pooled together into a rearing crimson blob that attacked the high priest.",
      "Radiant spells cause a blood ooze to boil and shrink rapidly.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Blood%20Hawk/BloodHawk%20(1).webp",
  },
  {
    title: "Magma Ooze",
    category: "ooze",
    description:
      "A glowing, bubbling mass of liquid lava and silicate slime that ignites everything in its path.",
    habitat: "Volcanic tubes, forge waste pits, and fire-plane borders.",
    behaviour:
      "Flows slowly across stone floors leaving scorched trails. Engulfs victims in extreme volcanic heat while melting metallic weapons.",
    threatLevel: "Medium",
    variants: ["Lava Slime", "Obsidian Blob", "Ember Ooze"],
    hooks: [
      "A magma ooze slithering through the mine tunnel is blocking the only escape route as the cavern begins to collapse.",
      "Contact with water cools a magma ooze into an immobilized obsidian statue for several rounds.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
  {
    title: "Green Slime",
    category: "ooze",
    description:
      "A hazardous sessile dungeon plant-ooze patch adhering to ceilings that drops onto victims to rapidly turn them into green slime.",
    habitat: "Damp dungeon ceilings, sewer pipes, and subterranean arches.",
    behaviour:
      "Drops onto anything passing beneath. Dissolves wood, metal, and organic flesh at terrifying speed unless scraped off or burned instantly.",
    threatLevel: "Low",
    variants: ["Ceiling Drop Slime", "Corrosive Moss-Ooze", "Sewer Scourge"],
    hooks: [
      "A drop of green goo falling onto the warrior's shoulder plate burned a hole through the steel within three seconds.",
      "Sunlight cures green slime instantly, turning the dangerous goo into dry harmless powder.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Green%20Hag/GreenHag%20(1).webp",
  },
  {
    title: "Yellow Mold",
    category: "ooze",
    description:
      "A velvety yellow fungal ooze colony that releases a dense cloud of lethal, choking spores whenever disturbed.",
    habitat: "Dark dungeon corners, old wooden chests, and crypt walls.",
    behaviour:
      "Remains dormant until touched or vibrated, whereupon it violently ejects a ten-foot cloud of toxic yellow dust.",
    threatLevel: "Low",
    variants: ["Spore Dust Mold", "Golden Crypt-Slime", "Toxic Fungal Ooze"],
    hooks: [
      "Opening the ancient wooden treasure chest disturbed a colony of yellow mold growing inside the lid, filling the room with spores.",
      "Fire is the only reliable way to clean yellow mold off dungeon walls without triggering a spore burst.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gelatinous%20Cube/GelatinousCubeInvisible%20(1).webp",
  },
  {
    title: "Brown Mold",
    category: "ooze",
    description:
      "A fuzzy brown carpet ooze that feeds directly on ambient heat, instantly freezing any living creature that approaches too closely.",
    habitat: "Subterranean ice cellars, deep mines, and shadow dungeons.",
    behaviour:
      "Absorbs heat from sources within twenty feet. Casting fire spells near it causes the mold to double in size instantly.",
    threatLevel: "Low",
    variants: ["Heat-Vampire Mold", "Freezing Carpet", "Arctic Slime"],
    hooks: [
      "Bringing a burning torch into the ice cellar caused the brown mold on the walls to rapidly expand across the floorboards.",
      "Cold damage like ice storms or rays of frost instantly destroys patches of brown mold.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Brown%20Bear/BrownBearCave%20(1).webp",
  },
  {
    title: "Roiling Oil",
    category: "ooze",
    description:
      "A sentient puddle of flammable black lamp oil that slithers across tavern floors waiting for a spark.",
    habitat:
      "Alchemical storerooms, dwarven engine halls, and refinery sewers.",
    behaviour:
      "Coats warriors' boots and armor in slippery, highly flammable grease before intentionally igniting itself on nearby torches.",
    threatLevel: "Low",
    variants: ["Flammable Sludge", "Sentient Grease", "Alchemical Spill"],
    hooks: [
      "The spilled oil barrels in the warehouse suddenly merged together and began crawling toward the watchman's dropped lantern.",
      "Warriors coated in roiling oil suffer extreme fire damage if any flame touches them.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gelatinous%20Cube/GelatinousCubeInvisible%20(1).webp",
  },
  {
    title: "Starlight Ooze",
    category: "ooze",
    description:
      "A rare, glowing silver puddle found in fallen meteor craters that feeds on magical spells and astral energy.",
    habitat: "Impact craters, astral observatories, and planar crossroads.",
    behaviour:
      "Attracted to active spellcasting. Absorb magical projectiles cast at it, converting the spell energy into physical growth and radiant flashes.",
    threatLevel: "Medium",
    variants: ["Astral Slime", "Spell-Eater Blob", "Meteor Jelly"],
    hooks: [
      "The wizard's lightning bolt didn't harm the silver blob; instead, the ooze glowed bright blue and grew twice as large.",
      "Alchemists prize starlight ooze residue for brewing potions of spell resistance.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
  {
    title: "Bone Ooze",
    category: "ooze",
    description:
      "A milky white acidic sludge formed inside ossuaries that dissolves only calcium and bone, leaving flesh completely unharmed.",
    habitat: "Charnel houses, mass graves, and crypt pits.",
    behaviour:
      "Seeps through armor gaps to dissolve internal bones, turning victims into helpless, boneless sacks of skin.",
    threatLevel: "High",
    variants: ["Ossuary Sludge", "Calcium-Eater", "Crypt Jelly"],
    hooks: [
      "Skeletons walking into the white puddle dissolve instantly into piles of weapons and armor.",
      "A bone ooze guarding the necromancer's vault leaves intact fleshy corpses lying on the floor like deflated balloons.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bone%20Naga/BoneNaga%20(1).webp",
  },
  {
    title: "Phantasm Ooze",
    category: "ooze",
    description:
      "A shimmering, rainbow-hued ooze that exudes hallucinogenic vapors causing victims to fight imaginary monsters.",
    habitat: "Feywild caverns, alchemical dump sites, and deep mushrooms.",
    behaviour:
      "Surrounds itself with hypnotic gas clouds. Ambushes adventurers while they swing their weapons wildly at empty air.",
    threatLevel: "Medium",
    variants: ["Rainbow Slime", "Hallucinogenic Blob", "Mirage Jelly"],
    hooks: [
      "The barbarian suddenly began screaming and attacking his own shadow after inhaling the sweet-smelling mist rising from the puddle.",
      "Holding one's breath renders the phantasm ooze's primary hypnotic defense completely ineffective.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
  {
    title: "Tar Beast",
    category: "ooze",
    description:
      "A sticky, towering mound of animated asphalt and natural tar that traps weapons and slows movement to a crawl.",
    habitat: "Tar pits, volcanic swamps, and ancient asphalt lakes.",
    behaviour:
      "Lashes out with sticky tar pseudopods to pull victims into its viscous body where they suffocate in pitch.",
    threatLevel: "Medium",
    variants: ["Asphalt Colossus", "Sticky Pit-Lord", "Black Pitch Ooze"],
    hooks: [
      "Any sword striking the tar beast gets stuck fast in its sticky asphalt body, requiring a test of strength to pull free.",
      "Tar beasts are highly vulnerable to cold, which turns their flexible tar bodies into brittle, easily shattered glass.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Displacer%20Beast/DisplacerBeast%20(1).webp",
  },
  {
    title: "Congealed Shadow",
    category: "ooze",
    description:
      "An ooze composed of liquid darkness that flows across floors in unlit rooms, draining warmth and light from torches.",
    habitat: "Shadowfell ruins, deep dungeons, and unlit vaults.",
    behaviour:
      "Extinguishes magical and mundane lights within thirty feet before enveloping prey in freezing, suffocating shadow.",
    threatLevel: "Medium",
    variants: ["Liquid Gloom", "Umbral Slime", "Light-Eater Ooze"],
    hooks: [
      "Torches sputter and die as a wave of liquid blackness seeps under the heavy stone door of the vault.",
      "Casting daylight spells forces the congealed shadow to screech violently and evaporate into thin air.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shadow/Shadow%20(1).webp",
  },
  {
    title: "Plague Sludge",
    category: "ooze",
    description:
      "A bubbling green-brown cesspool ooze harboring dozens of debilitating dungeon diseases and festering parasites.",
    habitat: "City sewers, leper colony wells, and swamp middens.",
    behaviour:
      "Splashes infectious muck onto warriors. Anyone touched by its pseudopods contracts a wasting fever within hours.",
    threatLevel: "Low",
    variants: ["Sewer Muck", "Disease Blob", "Festering Sludge"],
    hooks: [
      "The town well was poisoned when a plague sludge fell down the shaft and dissolved into the drinking supply.",
      "Paladins immune to disease make ideal front-line fighters against these infectious sewer oozes.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gelatinous%20Cube/GelatinousCubeInvisible%20(1).webp",
  },
  {
    title: "Quicksand Ooze",
    category: "ooze",
    description:
      "An intelligent granular ooze disguised perfectly as a patch of dry sand or dirt that sucks heavy treaders downward.",
    habitat: "Desert oases, sandy dungeon floors, and river banks.",
    behaviour:
      "Waits until heavily armored warriors step onto it before liquefying instantly to suck them down into suffocation.",
    threatLevel: "Medium",
    variants: ["Sentient Quicksand", "Sand-Trap Blob", "Granular Slime"],
    hooks: [
      "The sandy floor of the tomb entrance suddenly liquefied under the paladin's feet, pulling him waist-deep in seconds.",
      "Throwing a wooden plank or rope across the quicksand ooze prevents trapped victims from sinking further.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
  {
    title: "Amber Ooze",
    category: "ooze",
    description:
      "A thick, golden pine-sap ooze that hardens rapidly when exposed to air, trapping victims inside solid translucent amber.",
    habitat: "Primeval pine forests, ancient tree hollows, and amber mines.",
    behaviour:
      "Spits blobs of sticky golden resin that encase victims' feet. Flows over immobilized prey to preserve them permanently as amber statues.",
    threatLevel: "Medium",
    variants: ["Resin Blob", "Golden Preserver", "Sap Slime"],
    hooks: [
      "Miners found an ancient goblin warrior preserved perfectly inside a giant block of golden amber deep in the mountain.",
      "Alcohol or strong vinegar dissolves the sticky resin cast by an amber ooze.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
];

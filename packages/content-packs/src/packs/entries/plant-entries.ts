import type { CreaturePackEntry } from "../../types.js";

export const plantEntries: CreaturePackEntry[] = [
  {
    title: "Shambling Mound",
    category: "plant",
    description:
      "A lumbering heap of animated rotting vegetation, vines, and swamp muck that absorbs electrical energy to heal.",
    habitat: "Fetid swamps, rainy jungles, and damp dungeon bottoms.",
    behaviour:
      "Engulfs prey inside its suffocating mass of rotting compost. Lightning strikes energize its fibrous core rather than burning it.",
    threatLevel: "Medium",
    variants: ["Swamp Juggernaut", "Rotting Heap", "Jungle Behemoth"],
    hooks: [
      "A shambling mound has blocked the drainage culvert, causing the town cemetery to flood with swamp water.",
      "Casting a lightning bolt on the shambling mound caused the mossy pile to glow bright blue and move twice as fast.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shambling%20Mound/ShamblingMound%20(1).webp",
  },
  {
    title: "Awakened Tree",
    category: "plant",
    description:
      "A deciduous or evergreen forest tree granted sentient mobility and speech by powerful druidic or sylvan magic.",
    habitat: "Sacred groves, druid circles, and royal gardens.",
    behaviour:
      "Remains rooted and still until intruders attack the forest, whereupon it uproots its root-feet to swing massive branch arms.",
    threatLevel: "Low",
    variants: ["Awakened Oak", "Sentinel Pine", "Guardian Willow"],
    hooks: [
      "The orchard trees around the hermit's cottage uproot themselves to chase apple thieves down the road.",
      "Awakened trees are vulnerable to fire axes and heavy logging saws.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Awakened%20Tree/AwakenedTree%20(1).webp",
  },
  {
    title: "Myconid Sovereign",
    category: "plant",
    description:
      "A tranquil, telepathic fungal humanoid giant who leads underground mushroom colonies through rapport rapport spores.",
    habitat: "Underdark mushroom forests, damp caverns, and deep mines.",
    behaviour:
      "Releases clouds of specialized spores to communicate telepathically, pacify aggressive attackers, or animate dead bodies into spore servants.",
    threatLevel: "Medium",
    variants: ["Spore King", "Fungal Patriarch", "Deep Mushroom Lord"],
    hooks: [
      "The myconid sovereign offers the party safe passage through the underdark if they clear a colony of destructive gricks.",
      "Myconids abhor violence and only animate dead trespassers to serve as peaceful agricultural labor around the colony.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Myconid%20Sovereign/MyconidSovereign%20(1).webp",
  },
  {
    title: "Violet Fungus",
    category: "plant",
    description:
      "A purple subterranean mushroom sprouting four writhing tentacles covered in flesh-rotting digestive enzymes.",
    habitat: "Dungeon corners, limestone caverns, and dark mines.",
    behaviour:
      "Lies indistinguishable from ordinary mushrooms until prey walks within reach, then lashes out with rotting tentacles.",
    threatLevel: "Low",
    variants: ["Rot-Tentacle Mushroom", "Purple Cave-Stalker", "Enzyme Fungus"],
    hooks: [
      "What looked like a patch of purple toadstools lashed out and rotted the leather straps off the rogue's pack.",
      "Alchemists harvest the glands of violet fungi to formulate potent organic composting solvents.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Violet%20Fungus/VioletFungus%20(1).webp",
  },
  {
    title: "Shrieker",
    category: "plant",
    description:
      "A human-sized subterranean fungus that emits an ear-splitting alarm screech whenever light or movement approaches.",
    habitat: "Underdark pathways, dungeon entrances, and cavern choke points.",
    behaviour:
      "Screeches incessantly for several minutes when disturbed, attracting every wandering monster in the surrounding tunnels.",
    threatLevel: "Low",
    variants: ["Alarm Mushroom", "Screaming Toadstool", "Deep Siren Fungus"],
    hooks: [
      "Subterranean goblins plant gardens of shriekers around their perimeter tunnels to act as foolproof biological burglar alarms.",
      "Casting silence over a shrieker allows heroes to chop it down without alerting the entire dungeon.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shrieker/Shrieker%20(1).webp",
  },
  {
    title: "Assassin Vine",
    category: "plant",
    description:
      "A creeping, predatory ivy plant that crushes living creatures to fertilize its soil with their rotting remains.",
    habitat: "Overgrown ruins, temperate forests, and swamp ravines.",
    behaviour:
      "Animates its vines to constrict passersby while dragging nearby weeds to entangle escaping survivors.",
    threatLevel: "Low",
    variants: ["Strangler Ivy", "Blood Vine", "Ruins Creeper"],
    hooks: [
      "The piles of bones scattered beneath the stone archway warn that the thick ivy hanging over the door is alive and hungry.",
      "Assassin vines produce delicious clusters of dark berries late in summer that sell for high prices in city markets.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Assassin/Assassin%20(1).webp",
  },
  {
    title: "Corpse Flower",
    category: "plant",
    description:
      "A repulsive, giant flesh-eating blossom that sprouts over mass graves, stuffing dead bodies into its petals to fuel its regeneration.",
    habitat: "Battlefield graveyards, plague pits, and jungle ruins.",
    behaviour:
      "Exhales a sickening stench of decay that incapacitates nearby warriors while creating zombies from ingested corpses.",
    threatLevel: "High",
    variants: ["Graveyard Blossom", "Plague Orchid", "Carrion Flower"],
    hooks: [
      "The graveyard keeper disappeared inside the greenhouse where a gigantic red flower has begun humming softly.",
      "Destroying the corpses wedged inside the flower's petals prevents the corpse flower from regenerating its health.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Kelpie Kelp Swarm",
    category: "plant",
    description:
      "A predatory tangle of animated ocean kelp that reaches up from reefs to drag swimmers down into drowning depths.",
    habitat: "Coastal reefs, shipwreck coves, and underwater ruins.",
    behaviour:
      "Entangles ship oars and anchor chains before wrapping slimy tendrils around submerged divers.",
    threatLevel: "Low",
    variants: ["Strangler Kelp", "Reef Snare", "Deep Seaweed Swarm"],
    hooks: [
      "Pearl divers refuse to explore the sunken Spanish galleon because the kelp beds around it actively reach for swimmers' legs.",
      "Sharp edged cutting tools like sickles or daggers are far more effective against kelp swarms than heavy maces.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Swarm%20of%20Bats/SwarmOfBats%20(1).webp",
  },
  {
    title: "Twig Blight",
    category: "plant",
    description:
      "A thorny, foot-tall shrub animated by dark vampiric tree roots that scuttles across the ground like a wooden spider.",
    habitat: "Corrupted woods, dead orchards, and shadow vales.",
    behaviour:
      "Hides among dead branches before swarming targets in frantic scratching hordes seeking fresh blood to drink.",
    threatLevel: "Low",
    variants: ["Needle Blight", "Vine Blight", "Thorn Stalker"],
    hooks: [
      "The dead brush in the ravine isn't blowing in the wind—hundreds of twig blights are marching toward the village farms.",
      "Twig blights originate wherever the blood of a vampire tainted the roots of a living tree.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Twig%20Blight/Twig%20Blight%20(1).webp",
  },
  {
    title: "Needle Blight",
    category: "plant",
    description:
      "A stooped humanoid plant covered in sharp pine needles that launches volleys of piercing thorns across the battlefield.",
    habitat: "Coniferous forests, corrupted groves, and dark ravines.",
    behaviour:
      "Stays at long range firing barrages of wooden needles before retreating into thick forest cover.",
    threatLevel: "Low",
    variants: ["Pine Stalker", "Thorn Archer", "Spruce Blight"],
    hooks: [
      "Travelers walking along the logging road were pinned to their wagons by hundreds of foot-long wooden needles.",
      "Needle blights are extremely flammable, exploding like dry pine cones when struck by fire spells.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Needle%20Blight/Needle%20Blight%20(1).webp",
  },
  {
    title: "Vine Blight",
    category: "plant",
    description:
      "A mass of writhing creepers shaped into a humanoid figure capable of entangling enemies in choking root constrictions.",
    habitat: "Jungle ruins, overgrown gardens, and swamp edges.",
    behaviour:
      "Animate surrounding weeds to entangle warriors' feet before squeezing the breath out of them with heavy vine coils.",
    threatLevel: "Medium",
    variants: ["Creeper Lord", "Root Strangler", "Overgrowth Sentinel"],
    hooks: [
      "The statues in the overgrown garden are actually adventurers trapped and strangled inside thick coats of vine blights.",
      "Vine blights can communicate through root networks over distances of several miles.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Vine%20Blight/VineBlight%20(1).webp",
  },
  {
    title: "Basidirond",
    category: "plant",
    description:
      "A multi-stemmed fungal horror shaped like an inverted umbrella that releases clouds of hallucinogenic spores.",
    habitat: "Underdark caves, damp dungeon basements, and fungal forests.",
    behaviour:
      "Emits colorful spore clouds causing victims to believe they are melting, shrinking, or sinking into quicksand.",
    threatLevel: "Medium",
    variants: [
      "Umbrella Fungus",
      "Hallucinogenic Spore-Stalker",
      "Cave Spitter",
    ],
    hooks: [
      "Inhaling the red spores caused the party's paladin to drop his sword and try to swim across the stone floor.",
      "Cold spells freeze the basidirond's spore flaps shut, temporarily neutralizing its cloud attacks.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Vegepygmy",
    category: "plant",
    description:
      "Small fungal humanoids born when russet mold infects a dead body, communicating through rhythmic chest-thumping.",
    habitat: "Moldy dungeons, jungle ruins, and swamp depths.",
    behaviour:
      "Fights in organized scavenging hunting bands wielding thorn spears and riding trained giant thorn-frogs.",
    threatLevel: "Low",
    variants: ["Mold Pygmy", "Thorn Hunter", "Fungal Scavenger"],
    hooks: [
      "Vegepygmies are scavenging rusted iron weapons from the old battlefield to forge into jagged thorn-bound spears.",
      "Vegepygmies are immune to lightning and piercing weapons, but burn rapidly when exposed to open fire.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Gas Spore",
    category: "plant",
    description:
      "A spherical floating fungus disguised perfectly to resemble a deadly beholder, packed with explosive pressurized gas.",
    habitat: "Underdark caverns, wizard ruinsres, and dungeon vaults.",
    behaviour:
      "Drifts harmlessly on air currents. When struck by weapons, explodes violently scattering flesh-rotting fungal spores.",
    threatLevel: "Low",
    variants: ["False Beholder", "Explosive Fungus", "Spore Bomb"],
    hooks: [
      "The party panicked and shot a fireball at what looked like a beholder, causing a massive fungal explosion that rocked the corridor.",
      "A successful nature check reveals that the gas spore lacks true eyes or teeth, distinguishing it from a real beholder.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gas%20Spore/GasSpore%20(1).webp",
  },
  {
    title: "Hangman Tree",
    category: "plant",
    description:
      "A deciduous tree whose hanging vine-like branches act as nooses to snare passing humanoids by the neck and haul them into the canopy.",
    habitat: "Deep forests, swamp trails, and dark ravines.",
    behaviour:
      "Drops vine nooses around victims' necks, hoisting them into the air to strangle before dropping their bodies into root digestive acid.",
    threatLevel: "High",
    variants: ["Noose Oak", "Gallows Tree", "Strangler Willow"],
    hooks: [
      "Six abandoned horses stand grazing beneath a large oak tree whose branches are festooned with hanging human skeletons.",
      "The hangman tree releases a sweet perfume that draws weary travelers to sit and rest beneath its lethal boughs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Awakened%20Tree/AwakenedTree%20(1).webp",
  },
  {
    title: "Tri-Flower Frond",
    category: "plant",
    description:
      "A predatory plant boasting three distinct colorful blossoms that work in unison to anesthetize, melt, and consume prey.",
    habitat: "Tropical jungles, royal greenhouses, and fey glades.",
    behaviour:
      "One flower sprays sleep pollen, the second pours corrosive acid over the sleeping victim, and the third drinks the dissolved slurry.",
    threatLevel: "Medium",
    variants: ["Carnivorous Orchid", "Jungle Terror-Frond", "Acid Blossom"],
    hooks: [
      "The royal botanist was found dissolved inside his locked greenhouse surrounded by sweet-smelling orange blossoms.",
      "Tri-flower fronds can be carefully transplanted into pots to serve as biological security guards for treasuries.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Obliviax",
    category: "plant",
    description:
      "A patch of dark moss that feeds on magical memories, magically stealing spells from wizards who approach too closely.",
    habitat: "Arcane ruins, wizard dungeons, and fey caverns.",
    behaviour:
      "Siphons prepared spells directly out of spellcasters' minds. Eating the moss restores the stolen memories and spells to the eater.",
    threatLevel: "Low",
    variants: ["Memory Moss", "Spell-Eater Lichen", "Forgetful Ivy"],
    hooks: [
      "The archmage walked out of the cavern completely unable to remember his own name or how to cast simple cantrips.",
      "Chewing a handful of obliviax moss allows a thief to temporarily recall the secret passcodes stolen from a guard's memory.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Man-Trap",
    category: "plant",
    description:
      "A giant venus flytrap plant standing eight feet tall capable of snapping its spiky leaves shut around an adult human.",
    habitat: "Swamp islands, jungle clearings, and druid test-groves.",
    behaviour:
      "Exhales an irresistible attractive odor. Snaps shut around stepping victims, trapping them inside dark acid-filled pods.",
    threatLevel: "Medium",
    variants: ["Giant Venus Trap", "Snap-Leaf Behemoth", "Jungle Jaw-Plant"],
    hooks: [
      "Prying open the clamped leaves of a man-trap before the acid takes effect requires the combined strength of two stout warriors.",
      "Jungle natives use the tough, acid-resistant outer pods of man-traps to craft durable wilderness shields.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Thorny",
    category: "plant",
    description:
      "A quadrupedal hound-like plant beast grown by vegepygmies from thorny briars and bark to serve as hunting guard dogs.",
    habitat: "Fungal jungles, vegepygmy camps, and bramble woods.",
    behaviour:
      "Charges into combat to bite and tackle enemies, inflicting piercing damage to anyone who tries to wrestle or grapple its thorny hide.",
    threatLevel: "Low",
    variants: ["Briar Hound", "Bark Mastiff", "Thorn Wolf"],
    hooks: [
      "A pack of thornies is patrolling the perimeter of the ruined ziggurat, barking with a wooden hollow clicking sound.",
      "Thornies require no meat or water, surviving entirely on sunlight and swamp soil nutrients.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Phantom Fungus",
    category: "plant",
    description:
      "A subterranean ambulatory fungus sporting a gaping toothed maw and four sturdy root-legs that remains permanently invisible.",
    habitat: "Deep caverns, underdark highways, and dark mines.",
    behaviour:
      "Stalks travelers silently in complete invisibility, biting with powerful jaws before retreating if tracked.",
    threatLevel: "Low",
    variants: [
      "Invisible Mushroom-Beast",
      "Unseen Stalker-Fungus",
      "Deep Phantom",
    ],
    hooks: [
      "Spilling a bag of flour across the cavern passage reveals the invisible four-legged footprints of a hunting phantom fungus.",
      "When killed, a phantom fungus loses its invisibility, revealing a bizarre nodular body covered in toothy feeding tubes.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Violet%20Fungus/VioletFungus%20(1).webp",
  },
];

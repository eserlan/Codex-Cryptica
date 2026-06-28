import type { CreaturePackEntry } from "../../types.js";

export const apocalypticMutantEntries: CreaturePackEntry[] = [
  {
    title: "Glowing Ghoul",
    category: "apocalyptic-mutant",
    description:
      "A severely irradiated human mutant whose decaying flesh emits a sickening green luminescence and lethal gamma radiation.",
    habitat:
      "Atomic blast craters, abandoned nuclear power stations, and irradiated sewer ruins.",
    behaviour:
      "Charges recklessly in berserk packs. Healing rapidly when exposed to radiation fields while poisoning organic foes nearby.",
    threatLevel: "Medium",
    variants: ["Rad-Stalker", "Luminous Crawler", "Atomic Berserker"],
    hooks: [
      "Scavengers exploring a pre-war hospital sub-basement awaken a horde of glowing ghouls nesting in the radiology wing.",
      "A settlement's water supply is contaminated by a glowing ghoul patriarch that has taken residence inside the filtration pump.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghoul/GhoulMale%20(1).webp",
  },
  {
    title: "Rad-Scorpion",
    category: "apocalyptic-mutant",
    description:
      "A mutated desert arachnid grown to the size of a pony, clad in bulletproof chitin and brandishing a dripping venom stinger.",
    habitat: "Arid wasteland dunes, rocky desert canyons, and dried riverbeds.",
    behaviour:
      "Burrows under desert sands to ambush passing trade caravans. Pinches victims with crushing pincers before delivering neurotoxic stings.",
    threatLevel: "Medium",
    variants: ["Giant Dunes Scorpion", "Albino Stalk-Scorpion", "Venom Queen"],
    hooks: [
      "Caravan drivers refuse to cross the salt flats until someone hunts down the giant rad-scorpion destroying their supply wagons.",
      "A local medic desperately needs fresh rad-scorpion venom glands to synthesize an antidote for a poisoned settlement elder.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghoul/GhoulFemale%20(1).webp",
  },
  {
    title: "Two-Headed Wasteland Bull",
    category: "apocalyptic-mutant",
    description:
      "A massive mutated bovine possessing two distinct horned heads, thick leathery hide, and a notoriously aggressive temper.",
    habitat:
      "Scrubland pastures, ruined agricultural farms, and wasteland trade routes.",
    behaviour:
      "Stampedes blindly when startled. Uses double-horned headbutts to overturn vehicles and crush fences.",
    threatLevel: "Low",
    variants: ["Pack-Bull", "Feral Wasteland Bull", "Armored Bull"],
    hooks: [
      "A herd of feral two-headed wasteland bulls breaks into the settlement's crops, threatening winter famine if not corralled.",
      "A wealthy merchant offers a hefty reward to safely escort a prized two-headed breeding bull across raider-infested territory.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bullywug/Bullywug%20(1).webp",
  },
  {
    title: "Irradiated Lurker",
    category: "apocalyptic-mutant",
    description:
      "A grotesque amphibian mutation with a hardened shell back, powerful snapping claws, and an elongated tongue.",
    habitat: "Flooded coastal ruins, toxic marshes, and sewer drainage basins.",
    behaviour:
      "Lies submerged in murky water until prey approaches the shoreline, dragging victims underwater to drown.",
    threatLevel: "Medium",
    variants: ["Swamp Snapper", "Toxic Crab-Beast", "Deep Mire Lurker"],
    hooks: [
      "Fishermen along the toxic river disappear one by one; tracks lead deep into the sunken ruins of the old boardwalk.",
      "The shell plates of an irradiated lurker can be fashioned into lightweight, acid-resistant armor suits.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghoul/GhoulFemale%20(1).webp",
  },
  {
    title: "Toxic Ooze Monster",
    category: "apocalyptic-mutant",
    description:
      "An amorphous blob of living industrial chemical waste that dissolves organic matter on contact.",
    habitat:
      "Chemical refinery runoff pits, industrial sewers, and hazardous waste dumps.",
    behaviour:
      "Seeps through floor grates and door cracks. Engulfs victims to digest them while emitting choking chlorine fumes.",
    threatLevel: "Medium",
    variants: ["Sludge Beast", "Acid Slime", "Corrosive Puddle"],
    hooks: [
      "A salvage team is trapped inside a chemical factory control room as a toxic ooze monster slowly dissolves the steel blast door.",
      "Freezing the toxic ooze monster with liquid nitrogen is the only way to shatter its nucleus before it contaminates the town well.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gray%20Ooze/GrayOozeHidden%20(1).webp",
  },
  {
    title: "Wasteland Death-Claw",
    category: "apocalyptic-mutant",
    description:
      "A towering bipedal reptilian apex predator featuring foot-long razor talons, thick armored scales, and immense agility.",
    habitat: "Mountain caverns, abandoned quarries, and dead forests.",
    behaviour:
      "Hunts with terrifying intelligence and speed. Disembowels prey in seconds with lightning-fast swipes of its hooked claws.",
    threatLevel: "Legendary",
    variants: ["Alpha Claw", "Albino Cave-Stalker", "Matriarch Claw"],
    hooks: [
      "A mining settlement must abandon its richest gold vein because a Wasteland Death-Claw matriarch has chosen the mine as her nesting site.",
      "A legendary bounty hunter's corpse lies inside the death-claw lair, still holding the rare plasma rifle the party needs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghoul/GhoulFemale%20(1).webp",
  },
  {
    title: "Acid-Spitting Toad",
    category: "apocalyptic-mutant",
    description:
      "A bloated, warty amphibian the size of a boar capable of regurgitating streams of highly corrosive stomach acid.",
    habitat:
      "Stagnant sludge ponds, ruined subway tunnels, and radioactive bogs.",
    behaviour:
      "Targets optical sensors and eye slits with blinding acid spit from a safe distance before leaping to swallow prey.",
    threatLevel: "Low",
    variants: ["Mire Toad", "Slime Spitter", "Giant Bog Toad"],
    hooks: [
      "A swarm of acid-spitting toads migrates through the settlement's scrap-metal wall, melting structural support beams.",
      "Harvesting the toad's intact acid bladders allows survivors to craft potent industrial etching bombs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Toad/GiantToadSwamp%20(1).webp",
  },
  {
    title: "Mutated Hound",
    category: "apocalyptic-mutant",
    description:
      "Hairless, muscular canines deformed by generations of radiation exposure, possessing exposed bone spurs and savage jaws.",
    habitat: "Wasteland ruins, raider encampments, and scrap heaps.",
    behaviour:
      "Hunts in coordinated packs. Surrounds victims to cut off escape routes before dragging them down.",
    threatLevel: "Low",
    variants: ["Plague Hound", "Raider Attack Dog", "Bone-Spur K-9"],
    hooks: [
      "A pack of starving mutated hounds has cornered a family of travelers atop a broken highway overpass.",
      "A raider warlord breeds giant mutated hounds fed on radioactive isotopes to unleash upon rival settlements.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hellhound/Hellhound%20(1).webp",
  },
  {
    title: "Spore-Blower Plant",
    category: "apocalyptic-mutant",
    description:
      "A fleshy mutated flora pod that violently erupts when triggered by vibrations, releasing clouds of hallucinogenic fungal spores.",
    habitat:
      "Overgrown botanical gardens, damp subway tunnels, and jungle swamps.",
    behaviour:
      "Remains immobile until vibrations are detected. Blasts dense spore clouds that turn victims into docile fertilizer for its roots.",
    threatLevel: "Low",
    variants: ["Hallucinogenic Pod", "Fungal Blower", "Toxic Bloom"],
    hooks: [
      "Explorers entering the old city conservatory begin experiencing vivid nightmares and attacking one another after inhaling spore dust.",
      "A wasteland botanist wants root cuttings from the Spore-Blower to synthesize a powerful painkilling sedative.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghoul/GhoulFemale%20(1).webp",
  },
  {
    title: "Giant Desert Centipede",
    category: "apocalyptic-mutant",
    description:
      "A twenty-foot multi-legged arthropod covered in armored bronze segments, armed with dripping venomous mandibles.",
    habitat: "Desert sand dunes, salt flats, and deep canyon crevices.",
    behaviour:
      "Coils around vehicles and beasts to crush them. Uses paralyzing venom to immobilize prey before dragging it into underground burrows.",
    threatLevel: "High",
    variants: ["Dune Weaver", "Armor-Plated Crawler", "Salt-Flat Giant"],
    hooks: [
      "Tremors shake the desert outpost every midnight as a giant desert centipede undermines the foundation walls.",
      "The centipede's shed carapace segments make exceptional, lightweight ballistic shields for wasteland caravans.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Centipede/GiantCentipede%20(1).webp",
  },
];

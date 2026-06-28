import type { CreaturePackEntry } from "../../types.js";

export const beastEntries: CreaturePackEntry[] = [
  {
    title: "Wolf",
    category: "beast",
    description:
      "A lean grey predator that hunts in coordinated packs, relentless and eerily silent until the moment of attack.",
    habitat: "Temperate forests, tundra, and mountain foothills.",
    behaviour:
      "Wolves stalk prey patiently, circling to separate weak members from a group before striking. They rarely attack humans unprovoked but will defend a kill fiercely.",
    threatLevel: "Low",
    variants: ["Dire Wolf", "Winter Wolf", "Shadow Wolf"],
    hooks: [
      "A rancher in the valley has lost three sheep this week and suspects wolves — but the tracks are too large.",
      "A lone wolf has been following the party for two days. Its behaviour is oddly cautious, almost purposeful.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wolf/Wolf%20(1).webp",
  },
  {
    title: "Giant Spider",
    category: "beast",
    description:
      "An arachnid the size of a draft horse, spinning thick sticky webs across cavern corridors and forest canopies.",
    habitat: "Deep dark forests, subterranean caves, and abandoned ruins.",
    behaviour:
      "Ambushes prey from above, dropping down to inject paralyzing venom before wrapping victims in silk.",
    threatLevel: "Low",
    variants: ["Phase Spider", "Trapdoor Spider", "Spitting Spider"],
    hooks: [
      "A local courier disappeared along the old forest road; thick webbing now blocks the mountain pass.",
      "Alchemists pay handsomely for intact giant spider venom sacs, but harvesting them requires dealing with the angry mother.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Spider/GiantSpider%20(1).webp",
  },
  {
    title: "Dire Bear",
    category: "beast",
    description:
      "A hulking apex predator with bony protrusions across its shoulders and claws capable of snapping pine trees.",
    habitat: "Old-growth forests, subalpine caves, and snowy mountain slopes.",
    behaviour:
      "Territorial and aggressively solitary. Will charge anything that intrudes upon its hunting grounds or disturbs its hibernation.",
    threatLevel: "Medium",
    variants: ["Cave Bear", "Glacier Bear", "Plague Bear"],
    hooks: [
      "Logging operations have ground to a halt after a massive bear shredded the lumber camp's supply wagons.",
      "A wounded dire bear has stumbled down from the mountains into the farming lowlands, crazed with pain.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cave%20Bear/CaveBear%20(1).webp",
  },
  {
    title: "Giant Bat",
    category: "beast",
    description:
      "A nocturnal flying mammal with a wingspan exceeding ten feet and razor-sharp fangs.",
    habitat:
      "Limestone caverns, abandoned cathedral belfries, and deep sinkholes.",
    behaviour:
      "Hunts in flocks using echolocation to detect prey in total darkness. Swoops down to bite and bleed out victims.",
    threatLevel: "Low",
    variants: ["Vampire Bat", "Fruit Bat", "Screaming Bat"],
    hooks: [
      "Guards report dark shadows blotting out the moon over the keep, followed by livestock being found drained of blood.",
      "Exploring the deeper cave levels requires passing through a roosting colony of thousands of bats without startling them.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Bat/GiantBat%20(1).webp",
  },
  {
    title: "Boar",
    category: "beast",
    description:
      "A thick-skinned, coarse-furred swine with curved tusks sharpened on stones.",
    habitat: "Dense woodlands, overgrown thickets, and muddy marshes.",
    behaviour:
      "Short-tempered and fearless when cornered. Will charge headlong into danger to gore opponents.",
    threatLevel: "Low",
    variants: ["Dire Boar", "Razorback", "Iron-Tusk Boar"],
    hooks: [
      "A legendary boar known as old 'Brag-Tusk' has evaded royal hunters for a decade and killed three hounds this morning.",
      "Villagers are desperate for hunters to clear a sounder of boars trampling their harvest before winter sets in.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gorgon/Gorgon%20(1).webp",
  },
  {
    title: "Giant Eagle",
    category: "beast",
    description:
      "A majestic bird of prey intelligent enough to understand speech, possessing talons like iron daggers.",
    habitat:
      "High alpine peaks, inaccessible cliff eyries, and cloud-veiled spires.",
    behaviour:
      "Proud and aloof, surveying the valleys below. Defends its territory and fledglings with terrifying aerial dives.",
    threatLevel: "Medium",
    variants: ["Storm Eagle", "Golden Eyrie-Lord", "Sunhawk"],
    hooks: [
      "A giant eagle has snatched a magical heirloom from a traveling scholar, mistaking its glitter for nesting material.",
      "Mountain emissaries seek aid to protect the eagles' eyrie from encroaching wyverns.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Eagle/GiantEagle%20(1).webp",
  },
  {
    title: "Panther",
    category: "beast",
    description:
      "A sleek, black-furred feline feline predator that moves like a shadow through the jungle undergrowth.",
    habitat: "Dense jungles, twilight forests, and ancient overgrown ruins.",
    behaviour:
      "Stalks silently from branches above, leaping onto the backs of prey to deliver a swift crushing bite to the neck.",
    threatLevel: "Low",
    variants: ["Shadow Panther", "Frost Leopard", "Ghost Cougar"],
    hooks: [
      "Patrols along the jungle border keep finding guards slain at their posts with no alarms sounded and no tracks left behind.",
      "A wealthy beast-collector wants a live panther cub captured from the deep ruins, offering a small fortune.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Panther/Panther%20(1).webp",
  },
  {
    title: "Crocodile",
    category: "beast",
    description:
      "A heavily armored reptile that lurks just beneath the water's surface, disguised as a floating log.",
    habitat: "Murky rivers, tropical swamps, and stagnant estuary mangroves.",
    behaviour:
      "Patiently waits for prey to drink at the water's edge before clamping down with bone-crushing jaws and dragging them under.",
    threatLevel: "Low",
    variants: ["Giant Crocodile", "Saltwater Leviathan", "Plague-Jaw Croc"],
    hooks: [
      "The main river crossing is blocked because a colossal twenty-foot crocodile has claimed the ferry dock as its sunning spot.",
      "A thieves' guild uses a flooded sewer chamber infested with crocodiles to dispose of informants and unwanted evidence.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Crocodile/GiantCrocodile%20(1).webp",
  },
  {
    title: "Wolfhound",
    category: "beast",
    description:
      "A massive, broad-chested canine bred for war and hunting beasts twice its size.",
    habitat: "Noble kennels, frontier outposts, and pastoral estates.",
    behaviour:
      "Loyal to its handler to the death. Uses its weight to knock opponents to the ground and pin them.",
    threatLevel: "Low",
    variants: ["War Mastiff", "Shadow-Hound", "Blink Dog"],
    hooks: [
      "A pack of trained war hounds broke out of a ruined fortress after their masters died, now running wild as disciplined killers.",
      "An old hound sits howling outside a locked crypt, refusing to leave its master's tomb.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mastiff/Mastiff%20(1).webp",
  },
  {
    title: "Giant Scorpion",
    category: "beast",
    description:
      "A chitin-plated desert predator with two crushing pincers and a segmented tail dripping with neurotoxin.",
    habitat: "Scorched sand dunes, rocky wasteland canyons, and dry tombs.",
    behaviour:
      "Burrows under loose sand to ambush passersby. Grabs victims with pincers while repeatedly stinging with its tail.",
    threatLevel: "Medium",
    variants: ["Glass Scorpion", "Venom-Tail", "Emperor Scorpion"],
    hooks: [
      "Caravans refuse to cross the salt flats after several wagons were found crushed and drained by burrowing horrors.",
      "An apothecary needs the intact stinger gland of a giant desert scorpion to brew an antidote for a poisoned prince.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Scorpion/GiantScorpion%20(1).webp",
  },
  {
    title: "Constrictor Snake",
    category: "beast",
    description:
      "A thick serpent twenty feet in length, covered in dappled green and brown scales for jungle camouflage.",
    habitat: "Rainforest canopies, warm swamp shallows, and overgrown temples.",
    behaviour:
      "Strikes from overhanging boughs to coil around prey, steadily tightening its grip with every exhale until suffocation occurs.",
    threatLevel: "Low",
    variants: ["Giant Anaconda", "Emerald Python", "Shadow Serpent"],
    hooks: [
      "Explorers in the sunken temple must cross a flooded courtyard where massive serpents glide silently through the reeds.",
      "A traveling menagerie's prize serpent escaped into the city sewers and is growing fat on strays and beggars.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Flying%20Snake/FlyingSnake%20(1).webp",
  },
  {
    title: "Poisonous Toad",
    category: "beast",
    description:
      "A bloated amphibian with warty, brightly colored skin that secretes a hallucinogenic and deadly slime.",
    habitat: "Fetid swamps, dank subterranean caverns, and mushroom forests.",
    behaviour:
      "Uses a long elastic tongue to snatch prey at a distance. When threatened, inflates its sac and sprays toxic mist.",
    threatLevel: "Low",
    variants: ["Hypnotic Toad", "Plague Toad", "Giant Bullfrog"],
    hooks: [
      "Swamp witches are paying top coin for live purple-spotted toads, causing local reckless youths to go hunting in the marshes.",
      "Drinking water in the lower ward has turned foul after a swarm of toxic toads migrated into the reservoir.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Frog/GiantFrog%20(1).webp",
  },
  {
    title: "Rhinoceros",
    category: "beast",
    description:
      "A living battering ram of thick hide and muscle, topped with a massive serrated horn.",
    habitat: "Open savannas, dry scrublands, and broad floodplains.",
    behaviour:
      "Poor eyesight makes it easily startled; its immediate reaction to unfamiliar sounds or scents is a devastating thunderous charge.",
    threatLevel: "Medium",
    variants: ["Woolly Rhino", "Iron-Horn", "Stamping Juggernaut"],
    hooks: [
      "Poachers hired by a corrupt noble are slaughtering rhinos for their horns, angering local druids who protect the herds.",
      "A stampeding herd of startled rhinos is heading straight toward an exposed nomad camp.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Rhinoceros/Rhinoceros%20(1).webp",
  },
  {
    title: "Giant Toad",
    category: "beast",
    description:
      "A monstrous amphibian large enough to swallow a pony whole, with cavernous jaws and warty hide.",
    habitat: "Marshlands, flooded dungeons, and murky lake shores.",
    behaviour:
      "Leaps suddenly across long distances to crush prey under its bulk before gulping them down into its acidic gullet.",
    threatLevel: "Low",
    variants: ["Gulper Toad", "Bile Frog", "Deep-Cave Toad"],
    hooks: [
      "A fisherman's child was swallowed whole by a gulper toad; there is a brief window to track the beast and slice it open before digestion.",
      "Giant toads have taken up residence in the moat of an abandoned castle, making crossing the broken drawbridge perilous.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Frog/GiantFrog%20(2).webp",
  },
  {
    title: "Hyena",
    category: "beast",
    description:
      "A scavenging canine with powerful crushing jaws and a chilling, human-like vocalization that sounds like manic laughter.",
    habitat: "Arid plains, brushlands, and the fringes of desert wastes.",
    behaviour:
      "Travels in large packs, harassing weakened or injured targets until exhausted before tearing them down.",
    threatLevel: "Low",
    variants: ["Dire Hyena", "Laughing Stalker", "Carrion Hound"],
    hooks: [
      "The eerie laughter of hyenas echoing through the hills at night seems to be responding to signals from a gnoll raiding party.",
      "Scavenging hyenas have dug up shallow graves along the battlefield, dragging remains into a nearby ravine.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hyena/Hyena%20(1).webp",
  },
  {
    title: "Giant Wasp",
    category: "beast",
    description:
      "An aggressive winged insect the size of a hound, sporting a yellow-and-black carapace and a dripping stinger.",
    habitat:
      "Hanging mud nests under forest cliffs, giant hollow trees, and ruined towers.",
    behaviour:
      "Fiercely defends its hive. Attacks in swarms, stinging victims to paralyze them so they can be dragged back for larvae.",
    threatLevel: "Low",
    variants: ["Hornet Guard", "Shadow Wasp", "Plague Stinger"],
    hooks: [
      "A paper-thin mud hive the size of a barn has been built inside the old clock tower, silencing the bells.",
      "Honey harvested from giant wasp nests possesses potent healing properties, tempting foragers into the dangerous swarm territory.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Stirge/Stirge%20(1).webp",
  },
  {
    title: "Sabre-Toothed Cat",
    category: "beast",
    description:
      "A heavy-set feline predator from ancient times, boasting twin upper canines protruding ten inches from its jaw.",
    habitat: "Snowy taiga, glacial valleys, and rugged mountain steppes.",
    behaviour:
      "Ambushes prey by wrestling them to the ground with muscular forelimbs before delivering a precise, fatal stab with its fangs.",
    threatLevel: "Medium",
    variants: ["Frost-Fang", "Cave Lion", "Primal Smilodon"],
    hooks: [
      "A thaw in the northern glacier has awakened a hibernating pack of primal sabre-tooths hungry for fresh meat.",
      "Barbarian tribesmen wear sabre-tooth fangs as status symbols; proving oneself requires hunting one alone with a spear.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Tiger/Tiger%20(2).webp",
  },
  {
    title: "Giant Crab",
    category: "beast",
    description:
      "An armored crustacean with thick shell plating and two massive pincers capable of snapping iron armor.",
    habitat:
      "Coastal tide pools, coral shipwrecks, and subterranean sea caves.",
    behaviour:
      "Scuttles sideways along the sea floor or beach, scavenging carrion and snapping at anything that enters its reach.",
    threatLevel: "Low",
    variants: ["Coral Hulk", "Deep-Sea King", "Shipwreck Pincer"],
    hooks: [
      "Scavengers diving for shipwreck treasures keep getting severed at the waist by monstrous crabs living in the hull.",
      "During the full moon tide, hundreds of giant crabs march across the coastal highway to spawn, cutting off travel.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Giant%20Crab/GiantCrab%20(1).webp",
  },
  {
    title: "Vulture",
    category: "beast",
    description:
      "A bald-headed avian scavenger with keen eyesight and an iron stomach capable of digesting putrid carrion.",
    habitat: "Deserts, badlands, and recent battlefields.",
    behaviour:
      "Circles high on thermal updrafts waiting for creatures to die. Will aggressively mob dying travelers.",
    threatLevel: "Low",
    variants: ["Giant Condor", "Bone-Eater", "Plague Buzzard"],
    hooks: [
      "A cloud of circling vultures points toward the location of the missing scout patrol in the arid badlands.",
      "Giant condors have begun attacking sheep and shepherds directly rather than waiting for them to die.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Vulture/Vulture%20(1).webp",
  },
  {
    title: "Shark",
    category: "beast",
    description:
      "A streamlined oceanic torpedo of cartilage and muscle, equipped with rows of serrated replacing teeth.",
    habitat: "Open oceans, coastal reefs, and deep tropical lagoons.",
    behaviour:
      "Attracted from miles away by the scent of blood or erratic vibrations in the water. Attacks with relentless frenzied bites.",
    threatLevel: "Medium",
    variants: ["Great White Megalodon", "Hammerhead Hunter", "Reef Stalker"],
    hooks: [
      "Pirates force their captives to walk the plank above a lagoon intentionally stocked with starved reef sharks.",
      "A sunken smuggling chest lies at the bottom of a cove guarded by a massive scarred shark known as Old Iron-Fin.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hunter%20Shark/HunterShark%20(1).webp",
  },
];

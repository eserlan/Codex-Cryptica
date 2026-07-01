import type { CreaturePackEntry } from "../../types.js";

export const giantEntries: CreaturePackEntry[] = [
  {
    title: "Troll",
    category: "giant",
    description:
      "A gaunt, green-skinned giant with gangly limbs and rubbery hide possessing miraculous regenerative powers.",
    habitat: "Swamps, ruined bridge arches, mountain passes, and dank caverns.",
    behaviour:
      "Fearless and voracious. Rushes into combat tearing with claws and teeth; severed limbs rapidly regenerate unless cauterized with fire or acid.",
    threatLevel: "Medium",
    variants: ["Cave Troll", "Ice Troll", "Venom Troll"],
    hooks: [
      "The stone bridge is impassable because a massive troll demands a toll of either fifty gold pieces or one fat draft horse.",
      "A troll has taken over the village granary and is eating both the grain and anyone sent inside to stop it.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Troll/TrollSwamp%20(1).webp",
  },
  {
    title: "Ogre",
    category: "giant",
    description:
      "A brutish nine-foot giant with thick hide, gluttonous appetites, and a dull, cruel temper.",
    habitat: "Hill country, ruined fortresses, and dark forest caverns.",
    behaviour:
      "Relies on brute physical force, swinging massive wooden tree-trunk clubs to crush opponents before looting their remains for food.",
    threatLevel: "Medium",
    variants: ["Ogre Brute", "Armoured Ogre", "Two-Headed Ogre"],
    hooks: [
      "A family of ogres has moved into the abandoned hilltop manor, using the roof timbers as firewood.",
      "An ogre mercenary demands to be paid in sheep and barrels of ale rather than coin.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ogre/Ogre%20(1).webp",
  },
  {
    title: "Hill Giant",
    category: "giant",
    description:
      "A selfish, gluttonous behemoth standing sixteen feet tall dressed in crude animal skins and wielding a boulder.",
    habitat: "Rolling hills, pastoral valleys, and rustic mud huts.",
    behaviour:
      "Bullying and clumsy. Hurls massive rocks from afar before closing in to smash buildings and grab cattle with bare hands.",
    threatLevel: "Medium",
    variants: ["Hill Chief", "Boulder-Hurler", "Gluttonous Behemoth"],
    hooks: [
      "A hill giant is systematically raiding farmsteads across the valley, stuffing entire cows into his burlap sack.",
      "Hill giants can be easily distracted during combat by throwing barrels of sweet mead or roasted pigs onto the ground.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantMale%20(1).webp",
  },
  {
    title: "Frost Giant",
    category: "giant",
    description:
      "A towering reaver of the frozen wastes with pale blue skin, braided hair, and icy iron plate armor.",
    habitat: "Glacial fjords, snowy mountain peaks, and ice fortresses.",
    behaviour:
      "Raids settlements during blizzards wielding great battleaxes of ice and iron. Values physical might and hunting trophies above all.",
    threatLevel: "High",
    variants: ["Glacial Jarl", "Frost Reaver", "Ice-Shaper Giant"],
    hooks: [
      "Longships crewed by frost giants have sailed into the fjord to plunder the coastal monastery before winter sets in.",
      "Frost giants keep packs of winter wolves as hunting hounds around their glacial stronghold.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Frost%20Giant/FrostGiantMale%20(1).webp",
  },
  {
    title: "Fire Giant",
    category: "giant",
    description:
      "A master smith colossus with soot-black skin, flaming orange hair, and heavy blackened plate armor forged in volcanic fires.",
    habitat:
      "Volcanic magma chambers, subterranean brass citadels, and mountain mines.",
    behaviour:
      "Highly disciplined and militaristic. Hurls balls of burning pitch and fights in organized shield formations with blazing greatswords.",
    threatLevel: "High",
    variants: ["Forge Duke", "Magma Smith", "Dread Dreadnought"],
    hooks: [
      "Fire giants have enslaved an entire dwarven mining clan to dig out an ancient adamantine anvil buried under the volcano.",
      "The heat radiating from the fire giants' forge castle can be felt a mile away down the valley.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fire%20Giant/FireGiantMale%20(1).webp",
  },
  {
    title: "Cloud Giant",
    category: "giant",
    description:
      "An aristocratic twenty-foot giant living in floating castles among the clouds, possessing innate magic over wind and weather.",
    habitat: "Cloud castles, high mountain peaks, and sky palaces.",
    behaviour:
      "Proud and ostentatious. Uses levitation and wind magic to command the skies while gambling fortunes on the struggles of mortals below.",
    threatLevel: "High",
    variants: ["Cloud Count", "Sky Sorcerer", "Wind Lord"],
    hooks: [
      "A massive golden beanstalk has grown overnight in the royal courtyard, reaching up into a drifting cloud castle above.",
      "A cloud giant bets his prized flying carpet against the party's best warrior in a game of giant-sized chess.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cloud%20Giant/CloudGiantMale%20(1).webp",
  },
  {
    title: "Storm Giant",
    category: "giant",
    description:
      "The supreme titan of giantkind standing twenty-four feet tall with violet skin, commanding lightning bolts and hurricane winds.",
    habitat:
      "Underwater palaces, stormy mountain pinnacles, and cloud citadels.",
    behaviour:
      "Wise and prophetic. Hurls thunderbolts from the sky or dives deep undersea wielding massive runed greatswords.",
    threatLevel: "High",
    variants: ["Storm King", "Oracle Titan", "Sea-Storm Lord"],
    hooks: [
      "A storm giant oracle living at the bottom of the ocean holds the only prophecy capable of stopping the impending demon war.",
      "When a storm giant angers, hurricane winds spontaneously erupt around their castle, tearing up nearby forests.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
  {
    title: "Stone Giant",
    category: "giant",
    description:
      "A reclusive, lean giant with slate-gray skin that blends seamlessly into granite cavern walls, master of stone carving.",
    habitat: "Deep mountain caverns, stone labyrinths, and underground cliffs.",
    behaviour:
      "Views surface dwellers as dreams. Catch thrown rocks out of the air and hurl granite boulders with devastating artillery precision.",
    threatLevel: "Medium",
    variants: ["Carver Elder", "Granite Sentinel", "Dream-Walker Giant"],
    hooks: [
      "Stone giants are throwing boulders across the mountain pass resembling a friendly game of catch, ignoring the terrified wagons below.",
      "Inside their cavern homes, stone giants sculpt breathtaking marble statues that rival the finest elven artwork.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Stone%20Giant/StoneGiantMale%20(1).webp",
  },
  {
    title: "Cyclops",
    category: "giant",
    description:
      "A primitive, one-eyed giant shepherd with poor depth perception and superstitious fear of magic, wielding a crude wooden club.",
    habitat: "Remote rocky islands, coastal caves, and mountain pastures.",
    behaviour:
      "Herds giant sheep and traps travelers in caves with boulder doorways to roast them over open spits.",
    threatLevel: "Medium",
    variants: ["Island Shepherd", "One-Eyed Brute", "Crag Cyclops"],
    hooks: [
      "Heroes are trapped inside a dark island cave behind a ten-ton boulder, waiting for the blinded cyclops to let his sheep out at dawn.",
      "Because of their single eye, cyclopes suffer disadvantage when aiming at targets further than thirty feet away.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cyclops/CyclopsMaleCostal%20(1).webp",
  },
  {
    title: "Ettin",
    category: "giant",
    description:
      "A two-headed, filthy giant brute clad in unwashed skins where each head argues constantly with the other in different dialects.",
    habitat: "Rugged hills, dark forest caves, and ruined watchtowers.",
    behaviour:
      "Never sleeps completely because one head always stays awake on watch. Swings two spiked clubs simultaneously in combat.",
    threatLevel: "Medium",
    variants: ["Bickering Brute", "Twin-Head Chief", "Orc-Lord Ettin"],
    hooks: [
      "An ettin is blocking the ravine pass because its left head wants to eat the travelers while its right head wants to rob them.",
      "Clever bards can turn an ettin's two heads against each other with insulting gossip until they start punching themselves.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ettin/EttinMale%20(1).webp",
  },
  {
    title: "Fomorian",
    category: "giant",
    description:
      "A hideous, deformed giant of the Underdark afflicted with an evil eye that twists the flesh of those it gazes upon.",
    habitat: "Underdark fungal forests, deep crystal caverns, and dark mines.",
    behaviour:
      "Rules over enslaved subterranean creatures with terrible cruelty. Uses its evil eye to inflict magical curses and physical deformities.",
    threatLevel: "High",
    variants: ["Evil-Eye Monarch", "Deformed Titan", "Deep Slave-Lord"],
    hooks: [
      "A fomorian king has captured a drow patrol and is forcing them to fight blinded monsters in his subterranean amphitheater.",
      "Looking into the fomorian's glowing purple eye requires a saving throw against a painful skin-warping curse.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fomorian/FemorianMale%20(1).webp",
  },
  {
    title: "Oni",
    category: "giant",
    description:
      "A blue or red-skinned ogre mage with white hair, ivory horns, and the magical ability to fly, turn invisible, and shape-shift into humanoids.",
    habitat: "Mountain tea houses, highway inns, and bamboo forests.",
    behaviour:
      "Disguises itself as a friendly traveler or helpless child to infiltrate camps before revealing its true form to slay with a glaive and cold magic.",
    threatLevel: "Medium",
    variants: ["Ogre Mage", "Shadow Oni", "Frost-Blade Demon-Giant"],
    hooks: [
      "The kindly old monk traveling with the caravan is actually a shape-shifted oni waiting for nightfall to steal the magic sword.",
      "Oni regenerate lost health every minute unless struck by fire or radiant spells.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Oni/Oni%20(1).webp",
  },
  {
    title: "Verbeeg",
    category: "giant",
    description:
      "A cunning, human-looking giant standing ten feet tall who uses trickery, traps, and ambush tactics rather than crude brute force.",
    habitat: "Foothill forests, bandit camps, and border strongholds.",
    behaviour:
      "Organizes human bandits or ogres into disciplined raiding squads. Uses polearms and nets from behind cover.",
    threatLevel: "Medium",
    variants: ["Giant Bandit King", "Spear-Master Verbeeg", "Cunning Giant"],
    hooks: [
      "The leader of the highwaymen isn't a normal human—he's a ten-foot verbeeg wearing custom steel plate armor.",
      "Verbeeg frequently disguise themselves as trees or wagons using large canvas cloaks to ambush royal patrols.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
  {
    title: "Firbolg Warden",
    category: "giant",
    description:
      "A gentle, nature-loving giant clad in leather and moss who protects ancient sylvan forests using druidic illusion magic.",
    habitat: "Primal sylvan vales, hidden forest groves, and sacred glades.",
    behaviour:
      "Turns invisible to avoid conflict or scare off trespassers. If forced to fight, wields massive wooden greatclubs with giant strength.",
    threatLevel: "Medium",
    variants: ["Sylvan Warden", "Druid Giant", "Forest Guardian"],
    hooks: [
      "A firbolg warden demands that the party leave their metal axes at the forest border before entering the sacred grove.",
      "Firbolgs can converse with woodland animals and plants to learn the exact movements of any intruder.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
  {
    title: "Goliath Champion",
    category: "giant",
    description:
      "A stony-skinned, eight-foot mountain warrior whose competitive tribal culture drives them to seek glory against the deadliest monsters.",
    habitat:
      "High alpine peaks, mountain cliff villages, and gladiator arenas.",
    behaviour:
      "Shrugs off grievous wounds through stone-like physical resilience. Challenges enemy commanders to honorable single combat.",
    threatLevel: "Medium",
    variants: ["Peak Champion", "Stone-Skinned Gladiator", "Mountain Chief"],
    hooks: [
      "A goliath barbarian insists on accompanying the heroes into the dragon's lair solely to prove his wrestling prowess.",
      "Goliath tribes settle all disputes through feats of strength like boulder-tossing or wrestling cliff bears.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
  {
    title: "Troll King",
    category: "giant",
    description:
      "A massive, ancient troll crowned with iron spikes whose mutated regenerative powers make him nearly immortal to standard weapons.",
    habitat:
      "Deep swamp fortresses, ruined keeps, and subterranean throne rooms.",
    behaviour:
      "Commands tribes of lesser trolls and ogres. Heals visible wounds instantly before the attacker can even withdraw their blade.",
    threatLevel: "High",
    variants: [
      "Two-Headed Troll King",
      "Venom-Blood Sovereign",
      "Regenerating Monarch",
    ],
    hooks: [
      "The troll king has gathered five hundred swamp trolls under his banner and is marching on the southern duchy.",
      "Even severed pieces of the troll king begin crawling back toward his torso to reattach during combat.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Troll/TrollSwamp%20(1).webp",
  },
  {
    title: "Athach",
    category: "giant",
    description:
      "A misshapen fourteen-foot giant sporting a third arm sprouting from its chest and a venomous tusked underbite.",
    habitat: "Rocky badlands, poisoned swamps, and mountain ruins.",
    behaviour:
      "Wields three heavy clubs or rocks simultaneously, overwhelming defenders with a flurry of attacks and poisoned bites.",
    threatLevel: "Medium",
    variants: ["Three-Armed Brute", "Venom-Tusk Giant", "Crag Athach"],
    hooks: [
      "An athach has taken over the mountain pass watchtower, using its three arms to throw rocks down three different approaches at once.",
      "The third arm of an athach moves independently, parrying incoming arrows while the other two hands swing heavy clubs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
  {
    title: "Mountain Giant",
    category: "giant",
    description:
      "A primitive fourteen-foot giant resembling a walking boulder covered in lichen and dirt that causes minor earthquakes when it leaps.",
    habitat: "High mountain crags, avalanche slopes, and rocky peaks.",
    behaviour:
      "Stomps the ground to knock entire adventuring parties off their feet before pounding them with granite tree trunks.",
    threatLevel: "High",
    variants: ["Avalanche Lord", "Cragsman Titan", "Stomping Colossus"],
    hooks: [
      "What explorers thought was a mountain peak boulder suddenly stands up on two massive legs and bellows at the sky.",
      "Mountain giants enjoy starting rock avalanches just to watch the tumbling boulders crash into the valley trees below.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
  {
    title: "Jungle Giant",
    category: "giant",
    description:
      "A tall, slender giant covered in bark-like tribal tattoos who swings through upper jungle canopies wielding massive wooden blowguns.",
    habitat: "Rainforest canopies, overgrown temples, and tropical valleys.",
    behaviour:
      "Snipes from high tree boughs with poisoned wooden darts before dropping down to impale survivors on twelve-foot wooden spears.",
    threatLevel: "Medium",
    variants: ["Canopy Stalker", "Blowgun Master", "Tribal Titan"],
    hooks: [
      "Five-foot-long poisoned darts falling from the jungle canopy warn that travelers have entered the hunting grounds of jungle giants.",
      "Jungle giants preserve the skulls of giant beasts to wear as ceremonial masks during religious eclipses.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
  {
    title: "Desert Giant",
    category: "giant",
    description:
      "A weathered, sand-colored giant who survives in scorching wastes by burying themselves under dunes to preserve moisture.",
    habitat: "Endless sand dunes, desert salt flats, and ruined obelisks.",
    behaviour:
      "Erupts from under sand dunes to ambush caravans. Wields twin scimitars forged from desert ironwood.",
    threatLevel: "Medium",
    variants: ["Dune Stalker", "Scimitar Titan", "Salt-Flat Nomad"],
    hooks: [
      "A nomad tribe of desert giants is guiding travelers across the scorching salt flats in exchange for steel weapons.",
      "Desert giants can rub their calloused hands together to generate sparks capable of lighting campfires in fierce sandstorms.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hill%20Giant/HillGiantFemale%20(1).webp",
  },
];

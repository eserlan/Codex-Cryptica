import type { CreaturePackEntry } from "../../types.js";

export const goblinoidEntries: CreaturePackEntry[] = [
  {
    title: "Goblin",
    category: "goblinoid",
    description:
      "A diminutive, green or yellow-skinned humanoid with pointed ears and sharp teeth, relying on numbers and cunning traps.",
    habitat: "Dank caves, ruined fortresses, dense thickets, and sewers.",
    behaviour:
      "Cowardly alone but aggressive in swarms. Uses nimble hit-and-run tactics, retreating into narrow tunnels when outmatched.",
    threatLevel: "Low",
    variants: ["Goblin Boss", "Goblin Shaman", "Wolfrider"],
    hooks: [
      "A tribe of goblins has stolen the clapper from the town bell and is using it as a holy relic in their sewer shrine.",
      "Goblins have rigged the forest bridge with tripwires that dump travelers into a net filled with angry hornets.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin/GoblinHillMaleRedMelee%20(1).webp",
  },
  {
    title: "Hobgoblin",
    category: "goblinoid",
    description:
      "A disciplined, orange or reddish-skinned martial goblinoid standing six feet tall, clad in well-maintained iron armor.",
    habitat:
      "Military encampments, conquered border keeps, and mountain passes.",
    behaviour:
      "Fights in rigid tactical phalanxes with shields and halberds. Exploits enemy weaknesses through coordinated squad commands.",
    threatLevel: "Medium",
    variants: ["Hobgoblin Captain", "Iron Shadow", "Devastator"],
    hooks: [
      "A hobgoblin legion is marching down the valley, offering towns protection from bandits in exchange for heavy military tribute.",
      "Unlike erratic goblins, hobgoblins maintain immaculate weapons and strictly enforce martial law across conquered territory.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hobgoblin/HobgoblinHillsMelee%20(1).webp",
  },
  {
    title: "Bugbear",
    category: "goblinoid",
    description:
      "A hulking, hairy goblinoid cousin standing seven feet tall with long arms and a natural talent for stealthy ambushes.",
    habitat: "Shadowy forests, dungeon corridors, and goblin camps.",
    behaviour:
      "Stalks prey silently despite its immense size. Delivers crushing surprise attacks with morningstars before overpowering stragglers.",
    threatLevel: "Medium",
    variants: ["Bugbear Chief", "Shadow Stalker", "Strangler"],
    hooks: [
      "A bugbear has made its lair inside the town cathedral attic, climbing down at night to steal food and shiny silverware.",
      "Goblin tribes frequently bribe solitary bugbears with roasted meat and gold to act as heavy shock troops for raids.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bugbear/Bugbear%20(1).webp",
  },
  {
    title: "Worg Rider",
    category: "goblinoid",
    description:
      "An elite goblin scout mounted atop a massive, intelligent worg wolf, armed with shortbows and barbed lances.",
    habitat: "Border frontiers, open steppes, and raiding trails.",
    behaviour:
      "Circles enemy caravans at high speed firing arrows before the worg mount leaps in to trip and tear down horses.",
    threatLevel: "Low",
    variants: ["Worg Cavalry Captain", "Wolf-Scout", "Spear Rider"],
    hooks: [
      "A fast-moving squad of worg riders cut the telegraph lines and burned the supply bridge ahead of the main army.",
      "If the rider is knocked out of the saddle, the intelligent worg mount often continues fighting or retreats on its own.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Worg/Worg%20(1).webp",
  },
  {
    title: "Goblin Hexer",
    category: "goblinoid",
    description:
      "A twitchy goblin spellcaster adorned with bone charms and rat skull headdresses who casts annoying hexes and curses.",
    habitat: "Goblin shrines, tribal huts, and dark mine depths.",
    behaviour:
      "Stays well behind the frontline swarms chanting curses that cause enemies to trip, drop weapons, or suffer painful blindness.",
    threatLevel: "Low",
    variants: ["Rat-Bone Shaman", "Swamp Hexer", "Curse-Chanter"],
    hooks: [
      "The goblin hexer has placed a curse on the village well, making anyone who drinks the water speak entirely in gibberish.",
      "Defeating the hexer instantly dispels the itching curse afflicting the local garrison.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin/GoblinHillMaleRedMelee%20(1).webp",
  },
  {
    title: "Hobgoblin Iron Shadow",
    category: "goblinoid",
    description:
      "An elite hobgoblin monk and assassin trained in dark shadow magic and unarmed combat to eliminate enemy officers.",
    habitat: "Shadowy rooftops, military command tents, and fortress vaults.",
    behaviour:
      "Uses shadow-stepping teleportation to bypass front lines and assassinate spellcasters or commanders with throwing darts and iron fists.",
    threatLevel: "Medium",
    variants: ["Shadow Monk", "Night Infiltrator", "Iron Fist Assassin"],
    hooks: [
      "The general was found strangled inside his locked tent; only a charred iron shuriken remained embedded in the table.",
      "Iron shadows undergo rigorous tests of endurance, meditating in freezing mountain waterfalls for days without rest.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shadow/Shadow%20(1).webp",
  },
  {
    title: "Hobgoblin Devastator",
    category: "goblinoid",
    description:
      "A battle-mage trained in the hobgoblin academies who weaves destructive fire and force spells around allied shield walls.",
    habitat: "War camps, artillery ridges, and fortress ramparts.",
    behaviour:
      "Casts fireballs that magically shape around allied hobgoblin infantry, incinerating enemies while leaving allies completely unscathed.",
    threatLevel: "High",
    variants: ["War Sorcerer", "Artillery Mage", "Flame Weaver"],
    hooks: [
      "The devastator stands atop the siege tower hurling blasts of concussive force that shatter castle battlements.",
      "Hobgoblin army commanders protect their devastators with dedicated squads of heavy shield guards.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hobgoblin/HobgoblinHillsMelee%20(1).webp",
  },
  {
    title: "Bugbear Strangler",
    category: "goblinoid",
    description:
      "A specialized bugbear assassin equipped with wire garrotes and padded boots who eliminates sentries without a sound.",
    habitat: "Dark alleys, castle ramparts, and forest outposts.",
    behaviour:
      "Drops from ceiling rafters or tree branches to wrap garrotes around sentries' necks, dragging them into dark shadows.",
    threatLevel: "Medium",
    variants: ["Garrote Master", "Rafter Stalker", "Silent Killer"],
    hooks: [
      "Three watchguards disappeared from the ramparts last night; no blood was found, only scuffed dust where they dragged away.",
      "Bugbear stranglers coat their fur in charcoal dust to eliminate any scent and blend into pitch darkness.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bugbear/Bugbear%20(1).webp",
  },
  {
    title: "Goblin Tinker",
    category: "goblinoid",
    description:
      "A manic goblin inventor strapped with volatile black powder bombs, clockwork toys, and unstable mechanical contraptions.",
    habitat: "Scrap heaps, mine workshops, and alchemy labs.",
    behaviour:
      "Hurls unstable bombs that might explode, release smoke, or scatter caltrops. Occasionally blows himself up by accident.",
    threatLevel: "Low",
    variants: ["Bombardier", "Clockwork Rigger", "Powder-Monkey"],
    hooks: [
      "The goblin tinker has built a steam-powered catapult that hurls flaming beehives across the castle moat.",
      "Targeting the large backpack of fireworks strapped to the tinker's back causes a spectacular chain reaction.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin/GoblinHillMaleRedMelee%20(1).webp",
  },
  {
    title: "Nilbog",
    category: "goblinoid",
    description:
      "A goblin possessed by a trickster trickster spirit whose magical aura reverses damage into healing and causes attackers to praise him.",
    habitat: "Goblin throne rooms, court fool quarters, and chaos nodes.",
    behaviour:
      "Prances around mocking warriors. Any strike directed at the nilbog magically forces the attacker to stop and compliment the goblin instead.",
    threatLevel: "Low",
    variants: ["Trickster Goblin", "Chaos Fool", "Jester Spirit"],
    hooks: [
      "The mighty paladin raised his sword to strike the tiny goblin, but instead dropped his blade and applauded the goblin's hat.",
      "To defeat a nilbog, one must heal it or offer it gifts, which the reversal magic interprets as damaging attacks.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin%20Boss/GoblinBossMaleGraygreenForest%20(1).webp",
  },
  {
    title: "Barghest",
    category: "goblinoid",
    description:
      "A fiendish goblinoid predator born in the Gehenna planes that shape-shifts between a large goblin and a monstrous fiendish wolf.",
    habitat: "Goblin leadership tents, dark forests, and planar rifts.",
    behaviour:
      "Devours the bodies of fallen goblin leaders to grow in power. Fights with fiendish claws and hypnotic shape-shifting deception.",
    threatLevel: "Medium",
    variants: ["Greater Barghest", "Fiend-Wolf", "Gehenna Stalker"],
    hooks: [
      "The mysterious advisor guiding the goblin chief is actually a barghest fattening the tribe up for its own sinister harvest.",
      "Fire and radiant spells reveal the barghest's true demonic form when it attempts to hide in goblin disguise.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin%20Boss/GoblinBossMaleGraygreenForest%20(1).webp",
  },
  {
    title: "Goblin Sapper",
    category: "goblinoid",
    description:
      "Tunneling demolition experts carrying heavy pickaxes and barrels of blasting powder to undermine castle walls.",
    habitat: "Underground tunnels, siege trenches, and mine shafts.",
    behaviour:
      "Frantically digs under fortifications to plant powder charges before sprinting away before the fuse burns down.",
    threatLevel: "Low",
    variants: ["Tunnel Underminer", "Powder-Carrier", "Demolitionist"],
    hooks: [
      "Faint tapping sounds under the tavern floorboards indicate goblin sappers are tunneling toward the bank vault across the street.",
      "Dousing the sapper's sputtering fuse with water prevents the powder barrel from detonating.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin/GoblinHillMaleRedMelee%20(1).webp",
  },
  {
    title: "Hobgoblin Phalanx Guard",
    category: "goblinoid",
    description:
      "Heavy infantry equipped with interlocking tower shields and long spears trained to hold defensive lines against cavalry charges.",
    habitat: "Fortress gates, mountain narrows, and battlefronts.",
    behaviour:
      "Locks shields together to grant cover to adjacent allies. Braces spears against charging monsters with unflinching discipline.",
    threatLevel: "Medium",
    variants: ["Tower Shield Wall", "Spear Phalanx", "Iron Vanguard"],
    hooks: [
      "Breaking the hobgoblin phalanx requires flanking maneuvers or area-of-effect spells to force them apart.",
      "Even when outnumbered three to one, the phalanx guard holds the bridge until their captain orders a tactical retreat.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Guard/GuardElfMale%20(1).webp",
  },
  {
    title: "Bugbear Brute",
    category: "goblinoid",
    description:
      "An oversized bugbear who eschews stealth in favor of thick iron plate armor and a two-handed spiked executioner club.",
    habitat: "Arena pits, warlord bodyguards, and front lines.",
    behaviour:
      "Swings massive weapons with reach, knocking multiple opponents prone with each sweep of its spiked club.",
    threatLevel: "Medium",
    variants: ["Executioner Bugbear", "Iron-Clad Brute", "Pit Champion"],
    hooks: [
      "The goblin warlord uses a pair of seven-foot bugbear brutes chained to his throne as personal executioners.",
      "Despite their heavy armor, bugbear brutes retain surprising agility and can leap across wide dungeon pits.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bugbear/Bugbear%20(1).webp",
  },
  {
    title: "Goblin Beast-Catcher",
    category: "goblinoid",
    description:
      "Scavenging trappers equipped with barbed poles, nets, and chains who capture wild subterranean beasts to unleash in battle.",
    habitat: "Monster dens, cavern trails, and arena kennels.",
    behaviour:
      "Throws weighted nets to entangle heroes while poking trapped monsters with goads to drive them into enemy lines.",
    threatLevel: "Low",
    variants: ["Net-Master", "Monster Handler", "Trap-Rigger"],
    hooks: [
      "Beast-catchers have trapped an angry owlbear in a wooden cage and are rolling it down the hill toward the party.",
      "Cutting the goad ropes allows captured monsters to turn on their goblin handlers.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin/GoblinHillMaleRedMelee%20(1).webp",
  },
  {
    title: "Hobgoblin Marshal",
    category: "goblinoid",
    description:
      "A seasoned veteran commander whose shouted orders inspire nearby goblinoids to fight with suicidal bravery and enhanced speed.",
    habitat: "Command chariots, fortress towers, and war banners.",
    behaviour:
      "Directs troop movements across the battlefield. Rallying shouts grant temporary health and bonus attacks to all surrounding allies.",
    threatLevel: "High",
    variants: ["War General", "Legion Commander", "Banner Lord"],
    hooks: [
      "Slaying the hobgoblin marshal breaks the discipline of the entire goblinoid army, sending lesser goblins fleeing into the woods.",
      "The marshal wears an ancestral suit of red dragon-scale armor inherited from the legion's founder.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hobgoblin/HobgoblinHillsMelee%20(1).webp",
  },
  {
    title: "Goblin Rat-Master",
    category: "goblinoid",
    description:
      "A filthy sewer goblin surrounded by swarms of diseased giant rats that obey his squeaking commands.",
    habitat: "City sewers, garbage dumps, and damp basements.",
    behaviour:
      "Sends swarms of rats to overwhelm and distract heroes while snipe-shooting poisoned darts from inside a drainpipe.",
    threatLevel: "Low",
    variants: ["Sewer King", "Rat Piper", "Vermin Lord"],
    hooks: [
      "The rat-master has trained giant rodents to chew through grain sacks and steal shiny jewelry from cellar windows.",
      "Area-of-effect fire or cold spells easily disperse the rat swarms protecting the goblin.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin/GoblinHillMaleRedMelee%20(1).webp",
  },
  {
    title: "Bugbear Chief",
    category: "goblinoid",
    description:
      "The cunning, brutal ruler of a bugbear tribe adorned with the skulls of defeated rival champions and bears.",
    habitat: "Fortress strongholds, deep cavern caves, and war tents.",
    behaviour:
      "Ambushes the strongest enemy hero first, seeking to decapitate the enemy leadership in one crushing blow.",
    threatLevel: "High",
    variants: ["Skull-Lord", "Tribe Alpha", "Great Morningstar"],
    hooks: [
      "The bugbear chief challenges the party's barbarian to a contest of strength inside a ring of burning coals.",
      "Defeating the chief earns the grudging respect of the tribe, who may allow the party safe passage.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bugbear%20Chief/BugbearChief%20(1).webp",
  },
  {
    title: "Goblin Glider",
    category: "goblinoid",
    description:
      "Daredevil goblins strapped to crude leather hang-gliders who launch off cliffs to drop incendiary bombs onto caravans.",
    habitat: "Cliff faces, mountain canyon fortresses, and high towers.",
    behaviour:
      "Glides silently over targets to drop firebombs or caltrops before crashing unceremoniously into nearby trees.",
    threatLevel: "Low",
    variants: ["Sky-Raider", "Bomb-Glider", "Cliff-Jumper"],
    hooks: [
      "Travelers through the canyon must watch the skies as goblin gliders launch from high caves on thermal wind currents.",
      "A single well-aimed fire arrow can ignite the canvas wings of a goblin glider, sending it spiraling down.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Goblin/GoblinHillMaleRedMelee%20(1).webp",
  },
  {
    title: "Hobgoblin Doom-Caller",
    category: "goblinoid",
    description:
      "A grim military war-priest devoted to dark gods of conquest who chants war hymns that demoralize enemy troops.",
    habitat: "Battlefield altars, conquered cathedrals, and war camps.",
    behaviour:
      "Chants dark hymns that reduce enemy attack rolls while blessing hobgoblin weapons with dark necrotic energy.",
    threatLevel: "Medium",
    variants: ["Conquest Priest", "War Chaplain", "Dark Herald"],
    hooks: [
      "The doom-caller's chanting creates an ominous red fog across the battlefield that conceals advancing hobgoblin phalanxes.",
      "Silence spells shut down the doom-caller's unholy chants immediately.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hobgoblin/HobgoblinHillsMelee%20(1).webp",
  },
];

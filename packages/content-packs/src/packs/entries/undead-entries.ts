import type { CreaturePackEntry } from "../../types.js";

export const undeadEntries: CreaturePackEntry[] = [
  {
    title: "Skeleton",
    category: "undead",
    description:
      "An animated human skeleton stripped of personality and self-will, compelled to serve whoever raised it or guard whatever it was set upon.",
    habitat:
      "Crypts, tombs, ruins, and any site suffused with necromantic energy.",
    behaviour:
      "Skeletons follow the last orders given to them with mechanical persistence, neither tiring nor wavering. They cannot reason beyond their directive.",
    threatLevel: "Low",
    variants: ["Skeletal Archer", "Armoured Skeleton", "Giant Skeleton"],
    hooks: [
      "The local cemetery's oldest grave has been disturbed from the inside. The coffin lid was pushed open, not broken.",
      "A noble's mausoleum is being renovated. Workers flee, claiming the old dead have woken to defend their resting place.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Skeleton/SkeletonBow%20(1).webp",
  },
  {
    title: "Ghoul",
    category: "undead",
    description:
      "A gaunt, hunched corpse-eater with elongated fingernails hardened into claws and a jaw lined with needle-like teeth.",
    habitat: "Graveyards, charnel houses, sewers, and plague pits.",
    behaviour:
      "Ghouls are driven by an insatiable hunger for rotting flesh. They hunt in packs at night, paralyzing living prey with their claws so the victims can be dragged away and buried to ripen.",
    threatLevel: "Low",
    variants: ["Ghast", "Lacedon", "Crypt Ghoul"],
    hooks: [
      "Fresh graves in the village churchyard are being dug up from underneath, tunneling between burial vaults.",
      "A subterranean thieves' guildway has been abandoned after ghouls broke through from a forgotten plague ossuary.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghoul/GhoulMale%20(1).webp",
  },
  {
    title: "Zombie",
    category: "undead",
    description:
      "A shambling, rotting corpse animated by dark sorcery, oblivious to pain or injury.",
    habitat: "Battlefields, necromancers' lairs, and cursed marshes.",
    behaviour:
      "Moves relentlessly toward the nearest living creature to pummel and bite. Will ignore lost limbs until completely severed or destroyed.",
    threatLevel: "Low",
    variants: ["Plague Zombie", "Drowned Zombie", "Hulk Zombie"],
    hooks: [
      "A dense fog rolled off the marsh, bringing with it dozens of drowned sailors shambling toward the coastal tavern.",
      "An eccentric alchemist claims his reanimated servants are harmless labor, until one bites a dockworker.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Zombie/ZombieElfMale%20(1).webp",
  },
  {
    title: "Wraith",
    category: "undead",
    description:
      "A shadowy, weightless entity born of malice and darkness, draining the life force of any living thing it touches.",
    habitat:
      "Sunless catacombs, ruined castles, and places of ancient betrayal.",
    behaviour:
      "Glides through solid stone and walls to ambush intruders. Hates sunlight and seeks to extinguish all warmth and joy.",
    threatLevel: "Medium",
    variants: ["Dread Wraith", "Shadow Lord", "Grave Spirit"],
    hooks: [
      "Anyone who spends the night in the ruined keep awakens with frostbitten breath and graying hair, weakened by a lingering chill.",
      "A royal seal ring was lost in a crypt guarded by a wraith who was the king's betrayed brother in life.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wraith/Wraith%20(1).webp",
  },
  {
    title: "Lich",
    category: "undead",
    description:
      "An immortal skeletal sorcerer who bound their soul to a phylactery to defeat death, wielding godlike arcane mastery.",
    habitat:
      "Isolated subterranean sanctums, obsidian spires, and astral vaults.",
    behaviour:
      "Calculated, patient, and infinitely arrogant. Uses intricate traps, magical wards, and armies of undead minions to deal with threats.",
    threatLevel: "High",
    variants: ["Arch-Lich", "Demilich", "Frost Lich"],
    hooks: [
      "An ancient prophecy reveals that the kingdom's founder never died, but rules secretly from beneath the capital as a skeletal monarch.",
      "To destroy the plague cloud over the realm, adventurers must locate and shatter the jeweled phylactery hidden in a volcano.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wraith/Wraith%20(1).webp",
  },
  {
    title: "Vampire",
    category: "undead",
    description:
      "A sophisticated aristocratic undead that feeds on the blood of the living, commanding hypnotic charm and unnatural strength.",
    habitat:
      "Gothic manors, urban noble estates, and secluded mountain castles.",
    behaviour:
      "Operates through charm, political manipulation, and thralls during the day, hunting personally under the cover of night.",
    threatLevel: "High",
    variants: ["Vampire Lord", "Feral Bloodsucker", "Nosferatu"],
    hooks: [
      "High society in the capital is captivated by a mysterious foreign count who only hosts grand masquerades after midnight.",
      "Local villagers are found drained of blood with two puncture wounds on their necks, yet they defend their attacker with fanatical devotion.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Vampire%20Spawn/VampireSpawnElfFemale%20(1).webp",
  },
  {
    title: "Banshee",
    category: "undead",
    description:
      "The sorrowful, glowing spirit of a female elf or noble whose wailing shriek can stop a beating heart instantly.",
    habitat:
      "Misty moorlands, ruined elven manors, and ancient ancient battle sites.",
    behaviour:
      "Weeps in solitude until disturbed, whereupon her grief turns to vengeful fury, unleashing a lethal sonic wail.",
    threatLevel: "Medium",
    variants: ["Wailing Maid", "Dread Banshee", "Moor Spirit"],
    hooks: [
      "Travelers across the black moors report hearing heartbreaking weeping that leads unwary listeners into bottomless peat bogs.",
      "A banshee guards a shattered mirror containing the only clue to locating a lost elven dynasty.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Banshee/BansheeCoast%20(1).webp",
  },
  {
    title: "Mummy",
    category: "undead",
    description:
      "A preserved corpse wrapped in embalming linens, animated by dark funerary rites to guard sacred tombs.",
    habitat:
      "Desert pyramids, subterranean burial complexes, and museum vaults.",
    behaviour:
      "Shambles forward with terrifying inevitability, inflicting a rotting curse with its burning touch that defies magical healing.",
    threatLevel: "Medium",
    variants: ["Mummy Lord", "Royal Guard Mummy", "Sand-Cursed Mummy"],
    hooks: [
      "Archaeologists who breached the golden seal of the sun pharaoh have begun succumbing one by one to a wasting rot.",
      "The mummy of an ancient general has awakened and is gathering desert tribes to reconquer its ancient empire.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mummy/Mummy%20(1).webp",
  },
  {
    title: "Shadow",
    category: "undead",
    description:
      "A sentient silhouette of darkness that glides across floors and walls, draining the physical strength of its victims.",
    habitat: "Dark alleys, unlit dungeons, and shadow-cursed ruins.",
    behaviour:
      "Melts into existing shadows to approach unnoticed. Touches victims to siphon their vitality until they collapse into new shadows.",
    threatLevel: "Low",
    variants: ["Greater Shadow", "Shadow Demon", "Gloom Crawler"],
    hooks: [
      "In the city's slum district, people are waking up utterly exhausted and unable to lift their arms, their shadows looking strangely detached.",
      "A magical lantern is required to illuminate the sanctum without casting shadows where the lurkers can hide.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shadow/Shadow%20(1).webp",
  },
  {
    title: "Wight",
    category: "undead",
    description:
      "A desiccated corpse retaining its martial skill and cruel intelligence from life, burning with hatred for the living.",
    habitat: "Barrows, ancient battlefields, and ruined fortresses.",
    behaviour:
      "Commands lesser undead with tactical precision. Uses ancient rusted weapons charged with life-draining dark magic.",
    threatLevel: "Medium",
    variants: ["Barrow Wight", "Frost Wight", "Death Lord"],
    hooks: [
      "An ancient king's barrow mound was opened by grave robbers; now a wight leads a skeletal warband to reclaim the stolen crown.",
      "The garrison at the northern border post stopped sending messages; scouts found the soldiers standing watch as hollow-eyed wights.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wight/WightElfMale%20(1).webp",
  },
  {
    title: "Ghost",
    category: "undead",
    description:
      "The translucent, bound soul of a deceased person anchored to the mortal realm by unfinished business or tragic trauma.",
    habitat: "Haunted houses, execution squares, and shipwrecks.",
    behaviour:
      "Manifests to reenact its death or plead for aid. When angered, it can possess the living or terrify them into madness.",
    threatLevel: "Medium",
    variants: ["Poltergeist", "Spectral Guardian", "Vengeful Phantom"],
    hooks: [
      "The ghost of a murdered judge appears every midnight in the courthouse, pointing an accusing finger at the city mayor's portrait.",
      "A ghostly pirate ship appears in the bay during sea fogs, seeking a brave crew to lift their centuries-old curse.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghost/Ghost%20(1).webp",
  },
  {
    title: "Death Knight",
    category: "undead",
    description:
      "A fallen paladin or martial champion bound to eternal undead servitude in armored glory, commanding hellfire.",
    habitat: "Desolated keeps, ruined citadels, and dark vanguard camps.",
    behaviour:
      "Fought with unmatched martial prowess and tactical genius. Channels unholy fire through its runed greatsword.",
    threatLevel: "High",
    variants: ["Grave Knight", "Hellfire Champion", "Fallen Paladin"],
    hooks: [
      "A death knight rides a nightmare steed across the countryside challenging knights to single combat for their souls.",
      "To break the siege of the holy city, heroes must defeat the undead commander who was once the city's greatest defender.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Knight/Knight%20(1).webp",
  },
  {
    title: "Revenant",
    category: "undead",
    description:
      "A corpse possessed by its own relentless spirit, granted supernatural resilience to track down and slay its murderer.",
    habitat: "Anywhere its killer flees.",
    behaviour:
      "Fixated entirely on its target. Will ignore other combatants unless impeded, regenerating almost any wound until vengeance is achieved.",
    threatLevel: "Medium",
    variants: ["Vengeance Stalker", "Relentless Soul", "Undying Pursuer"],
    hooks: [
      "A terrified merchant hires the party for protection against a relentless stranger who walks through arrow fire without flinching.",
      "The revenant of a wrongfully executed rebel leader has risen to dismantle the corrupt council one member at a time.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Revenant/RevenantDwarfMale%20(1).webp",
  },
  {
    title: "Will-o'-Wisp",
    category: "undead",
    description:
      "A floating ball of phosphorescent marsh light that feeds on the terror and despair of dying creatures.",
    habitat: "Treacherous bogs, quicksand marshes, and ancient battlefields.",
    behaviour:
      "Bobs enticingly in the darkness to lure lost travelers away from safe paths into deep sinkholes or monster dens before feeding on their panic.",
    threatLevel: "Low",
    variants: ["Corpse Candle", "Marsh Beacon", "Dread Wisp"],
    hooks: [
      "Travelers keep drowning in the black bog after following what they believed were lantern lights of search parties.",
      "A circle of floating wisps hovers over a sunken altar, glowing brighter whenever blood is spilled nearby.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Will-o'-Wisp/WillOWispRed%20(1).webp",
  },
  {
    title: "Bone Golem",
    category: "undead",
    description:
      "A towering construct fused together from hundreds of human and monster skeletons, bound by dark runes.",
    habitat: "Necromantic laboratories and bone ossuaries.",
    behaviour:
      "Fights with four or more multi-jointed arms of bone blades. Can assimilate skeletons from the battlefield to repair itself.",
    threatLevel: "Medium",
    variants: ["Ossuary Colossus", "Skull Juggernaut", "Charnel Construct"],
    hooks: [
      "A cult is raiding charnel houses across the city to gather raw materials for a towering bone engine.",
      "Defeating the necromancer requires first dismantling the towering skeleton monster that guards his throne.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bone%20Naga/BoneNaga%20(1).webp",
  },
  {
    title: "Crawling Claw",
    category: "undead",
    description:
      "The severed hand of a murderer animated by dark magic to scuttle across floors and strangle unsuspecting victims.",
    habitat: "Wizard laboratories, dusty libraries, and murder sites.",
    behaviour:
      "Hides under furniture or in drapery before leaping at a victim's throat or eyes.",
    threatLevel: "Low",
    variants: ["Swarm of Claws", "Armored Gauntlet Claw", "Venom-Claw"],
    hooks: [
      "A librarian was found strangled in a locked study with finger marks around his neck but no footsteps leading away.",
      "Dozens of animated severed hands are scurrying out of the sewers carrying stolen rings and jewels.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Crawling%20Claw/CrawlingClawRug%20(1).webp",
  },
  {
    title: "Dullahan",
    category: "undead",
    description:
      "A headless horseman clad in black armor riding a spectral steed, carrying its grinning severed head under its arm.",
    habitat: "Country crossroads, dark forest highways, and execution hills.",
    behaviour:
      "Rides down travelers at gallop, using a whip made of a human spine to disarm or drag victims.",
    threatLevel: "Medium",
    variants: ["Headless Rider", "Spine-Whipper", "Grave Courier"],
    hooks: [
      "Whenever the dullahan stops before a house and calls out a name, the occupant dies by sunrise.",
      "The party must race across the bridge before midnight to escape the pursuing headless horseman.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wraith/Wraith%20(1).webp",
  },
  {
    title: "Flame Skull",
    category: "undead",
    description:
      "The levitating, emerald-flame-wreathed skull of a dead wizard that cackles madly while casting destructive spells.",
    habitat: "Arcane vaults, ancient libraries, and ruined wizard towers.",
    behaviour:
      "Patrols its assigned corridor eternally. Blasts intruders with fireballs and rays of frost before regenerating from its dust.",
    threatLevel: "Medium",
    variants: ["Frost Skull", "Lightning Cranium", "Shadow Skull"],
    hooks: [
      "To permanently destroy the guardian green-flame skull, holy water must be poured over its bone shards within one hour of defeating it.",
      "A pair of flame skulls guard the entrance to the forbidden archives, arguing with each other in ancient dead languages.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Flameskull/Flameskull%20(1).webp",
  },
  {
    title: "Mohrg",
    category: "undead",
    description:
      "The reanimated skeleton of a mass murderer with thick loops of animated intestines coiling within its ribcage and a paralyzing tongue.",
    habitat: "Prison dungeons, execution pits, and mass graves.",
    behaviour:
      "Lashes out with its prehensile visceral tongue to paralyze victims before tearing them apart with skeletal claws.",
    threatLevel: "Medium",
    variants: ["Visceral Skeleton", "Gibet Horror", "Executioner's Remains"],
    hooks: [
      "Inmates in the royal dungeon are being found dead with frozen expressions of sheer terror in locked cells.",
      "Any humanoid killed by a mohrg rises the next night as a fast-shambling zombie under its control.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wraith/Wraith%20(1).webp",
  },
  {
    title: "Grave Titan",
    category: "undead",
    description:
      "A gargantuan amalgamation of tomb earth, gravestones, and thousands of corpses forming a walking mountain of death.",
    habitat: "Ancient necropolises and cursed badlands.",
    behaviour:
      "Crushes everything in its path under massive gravestone fists while constantly spawning lesser undead from its rotting flank.",
    threatLevel: "High",
    variants: ["Necropolis Colossus", "Tomb Avalanche", "Charnel Mountain"],
    hooks: [
      "An entire graveyard has uprooted itself and is slowly marching toward the cathedral city.",
      "Heroes must climb the walking grave titan while fighting off zombies to destroy the necromancer controlling it from its peak.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wraith/Wraith%20(1).webp",
  },
];

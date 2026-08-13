import type { CreaturePackEntry } from "../../types.js";

export const fiendEntries: CreaturePackEntry[] = [
  {
    title: "Hellhound",
    category: "fiend",
    description:
      "A monstrous infernal canine with coal-black fur, burning red eyes, and a maw dripping with liquid sulfur.",
    habitat: "Volcanic wastes, infernal portals, and dark warlock kennels.",
    behaviour:
      "Hunts in disciplined packs under the command of devils. Exhales searing cones of fire before rushing in to tear burning flesh.",
    threatLevel: "Low",
    variants: ["Cerberus Pup", "Shadow Hound", "Abyssal Mastiff"],
    hooks: [
      "Smoldering paw prints leading away from the burnt manor indicate the arsonist had infernal assistance.",
      "A warlock has released a pack of starved hellhounds into the city woods to hunt down an escaped sacrifice.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hellhound/Hellhound%20(1).webp",
  },
  {
    title: "Imp",
    category: "fiend",
    description:
      "A diminutive, winged devil with crimson skin, a barbed stinging tail, and a malicious talent for shape-shifting and invisibility.",
    habitat: "Warlock sanctums, corrupt noble courts, and infernal libraries.",
    behaviour:
      "Acts as a cunning familiar or spy. Whispers evil advice into its master's ear while turning invisible to sting enemies with poison.",
    threatLevel: "Low",
    variants: ["Quasit", "Spined Devil", "Crimson Familiar"],
    hooks: [
      "An invisible imp has been stealing royal signet rings and dropping them into rival nobles' pockets to spark civil war.",
      "The dying wizard's imp familiar offers to transfer its loyalty and dark spellbook to whoever spares its life.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Imp/Imp%20(1).webp",
  },
  {
    title: "Succubus",
    category: "fiend",
    description:
      "A seductive fiend of supernatural beauty that manipulates mortal desires to enslave minds and drain souls through a lethal kiss.",
    habitat: "Urban palaces, high society galas, and decadent salons.",
    behaviour:
      "Operates entirely through charm, shape-shifting, and mind-controlled thralls. Retreats into the ethereal plane when physically threatened.",
    threatLevel: "Medium",
    variants: ["Incubus", "Dream Seducer", "Infernal Courtier"],
    hooks: [
      "The high general has suddenly halted the campaign and imprisoned his best officers at the behest of his mysterious new bride.",
      "In victims' dreams, a captivating figure promises them heart's desire in exchange for signing a parchment in blood.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Succubus/Succubus%20(1).webp",
  },
  {
    title: "Bone Devil",
    category: "fiend",
    description:
      "A gaunt, skeletal devil standing eight feet tall with dried skin stretched over bone, sporting a scorpion tail dripping with venom.",
    habitat: "Infernal inquisitions, desolate planes, and summoner circles.",
    behaviour:
      "Acts as a cruel taskmaster or inquisitor. Hooks victims with claws before driving its debilitating venomous tail into their spine.",
    threatLevel: "High",
    variants: ["Osyluth", "Inquisitor Devil", "Spined Enforcer"],
    hooks: [
      "A corrupt magistrate summoned a bone devil to torture confessions out of political dissidents in the city dungeon.",
      "The bone devil demands three innocent souls by midnight or it will break its containment circle and slaughter the town.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bone%20Devil/BoneDevil%20(1).webp",
  },
  {
    title: "Barbed Devil",
    category: "fiend",
    description:
      "A bipedal reptilian fiend covered in razor-sharp thorns and quills, delighting in impaling prey on its own body.",
    habitat: "Infernal vanguard camps and planar breaches.",
    behaviour:
      "Grapples opponents in bear hugs to impale them on its thorny hide while hurling fiery sparks from its hands.",
    threatLevel: "Medium",
    variants: ["Hamatula", "Thorn Fiend", "Hell Guard"],
    hooks: [
      "Barbed devils are standing guard over a dark portal opening inside the volcanic caldera.",
      "Any melee weapon striking the barbed devil risks getting wedged between its iron-hard quills.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Barbed%20Devil/BarbedDevil%20(1).webp",
  },
  {
    title: "Chain Devil",
    category: "fiend",
    description:
      "A tormented fiend wrapped in animated iron chains tipped with hooks and blades that move like metallic serpents.",
    habitat: "Infernal prisons, torture chambers, and dungeon vaults.",
    behaviour:
      "Animate surrounding chains and shackles to bind, flay, and suspend intruders from ceiling hooks.",
    threatLevel: "Medium",
    variants: ["Kyton", "Chain Master", "Shackle Fiend"],
    hooks: [
      "The chains hanging in the old asylum suddenly lash out on their own as a chain devil materializes in the courtyard.",
      "To free the captive paladin, heroes must defeat the chain devil anchoring his soul to the dungeon floor.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Chain%20Devil/ChainDevil%20(1).webp",
  },
  {
    title: "Balor",
    category: "fiend",
    description:
      "A towering demonic general of fire and shadow wielding a lightning-wreathed greatsword and a multi-tailed whip of flames.",
    habitat: "Abyssal rifts, volcanic strongholds, and ruined kingdoms.",
    behaviour:
      "Uses its whip to drag foes into its fiery aura before cleaving them with its sword. Explodes in a devastating fireball upon death.",
    threatLevel: "High",
    variants: ["Abyssal Lord", "Pit General", "Flame Scourge"],
    hooks: [
      "A cult's century-long ritual is one hour away from unleashing a balor upon the mortal realm.",
      "Defeating the balor requires a plan to escape the blast radius when its fiery form detonates at death.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Barbed%20Devil/BarbedDevil%20(1).webp",
  },
  {
    title: "Marilith",
    category: "fiend",
    description:
      "A six-armed demonic warlord with the lower body of a massive serpent, wielding six distinct enchanted swords with blinding speed.",
    habitat: "Abyssal command palaces and desecrated temples.",
    behaviour:
      "Parries incoming attacks while executing flawless multi-weapon blade dances that slice through entire squads in seconds.",
    threatLevel: "High",
    variants: ["Serpent Blade-Queen", "Six-Armed General", "Abyssal Duelist"],
    hooks: [
      "A legendary marilith challenges the party's best warrior to a duel for control of the dimensional portal.",
      "Each of the six swords wielded by the demon queen contains the trapped soul of a famous hero.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Barbed%20Devil/BarbedDevil%20(1).webp",
  },
  {
    title: "Vrock",
    category: "fiend",
    description:
      "A repulsive vulture-demon that emits a stunning screech and releases clouds of toxic, flesh-eating spores from its feathers.",
    habitat: "Abyssal skies, battlefield charnel grounds, and ruined spires.",
    behaviour:
      "Swoops down to emit a paralyzing screech, then dances with other vrocks to summon destructive electrical storms.",
    threatLevel: "Medium",
    variants: ["Carrion Demon", "Spore Vulture", "Storm Screecher"],
    hooks: [
      "A flock of vrocks is circling the besieged citadel, performing a dark dance that is causing storm clouds to gather.",
      "Spores inhaled from a wounded vrock begin sprouting into painful vines unless treated with holy blessing.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Vrock/Vrock%20(1).webp",
  },
  {
    title: "Hezrou",
    category: "fiend",
    description:
      "A massive toad-like demon dripping with foul grease that radiates a stench so horrific it sickens nearby foes.",
    habitat: "Abyssal swamps, sewer corruption nodes, and stagnant pools.",
    behaviour:
      "Wades into melee relying on its sickening stench to weaken foes before crushing them in powerful crocodilian jaws.",
    threatLevel: "Medium",
    variants: ["Toad Demon", "Stench Lord", "Abyssal Behemoth"],
    hooks: [
      "The city reservoir has turned black and foul-smelling after a hezrou took up residence in the central filter hub.",
      "Warriors fighting the hezrou must hold their breath or spend their turns retching violently.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hezrou/HezrouGrey%20(1).webp",
  },
  {
    title: "Glabrezu",
    category: "fiend",
    description:
      "A towering four-armed demon with two crushing pincer claws and two human-like hands casting powerful illusions and wish temptations.",
    habitat: "Corrupt courts, wizard laboratories, and dark sanctuaries.",
    behaviour:
      "Tempts mortals with power, wealth, or forbidden knowledge. When treachery fails, it snaps spines with massive crab pincers.",
    threatLevel: "High",
    variants: ["Temptation Demon", "Pincer Juggernaut", "Wish Corrupter"],
    hooks: [
      "A glabrezu disguised as an angel is advising the king to launch a holy war against his peaceful neighbors.",
      "The demon offers to grant the desperate hero a wish to save their village—at the cost of their firstborn's soul.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Glabrezu/Glabrezu%20(1).webp",
  },
  {
    title: "Night Hag",
    category: "fiend",
    description:
      "A hideous fiendish crone with purple skin and iron claws who invades mortal dreams to harvest souls for infernal trade.",
    habitat: "Ethereal borderlands, dark huts, and planar crossroads.",
    behaviour:
      "Perches on sleeping victims' chests in the ethereal plane to induce suffocating nightmares until the soul slips away.",
    threatLevel: "Medium",
    variants: ["Dream Stalker", "Soul Trader", "Coven Mother"],
    hooks: [
      "The prince has been trapped in an unconvincing coma for weeks; a night hag is tormenting his spirit nightly.",
      "A night hag's soul bag contains the spirit of a legendary blacksmith needed to forge a god-slaying weapon.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Night%20Hag/NightHag%20(1).webp",
  },
  {
    title: "Shadow Demon",
    category: "fiend",
    description:
      "A bodiless demonic entity composed of pure darkness that leaps through shadows to rake minds with incorporeal claws.",
    habitat: "Dark dungeons, unlit temples, and shadowy ruins.",
    behaviour:
      "Hides within existing shadows to deliver devastating rake attacks before melting back into the darkness unharmed.",
    threatLevel: "Low",
    variants: ["Gloom Fiend", "Abyssal Shadow", "Nightmare Shade"],
    hooks: [
      "A shadow demon bound inside a cursed jewel is possessing whoever puts the necklace on.",
      "Bright magical light weakens the shadow demon, forcing it to flee into the nearest unlit corridor.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shadow%20Demon/ShadowDemon%20(1).webp",
  },
  {
    title: "Ice Devil",
    category: "fiend",
    description:
      "An insectoid, mandicled devil radiating intense arctic cold, armed with an ice spear that slows targets to a crawl.",
    habitat: "Frozen infernal wastes, glacial portals, and frost vaults.",
    behaviour:
      "Fights with ruthless tactical precision. Uses walls of ice to divide enemy parties before impaling stragglers with frost spears.",
    threatLevel: "High",
    variants: ["Gelugon", "Frost Fiend", "Glacial Commander"],
    hooks: [
      "An ice devil has forged an alliance with frost giants to plunge the northern kingdoms into an eternal winter.",
      "The heat of normal torches is instantly snuffed out within fifty feet of the ice devil's freezing aura.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bone%20Devil/BoneDevil%20(1).webp",
  },
  {
    title: "Pit Fiend",
    category: "fiend",
    description:
      "The supreme aristocrat of the infernal hierarchy—a hulking red devil wrapped in fire, commanding terrifying magic and legions.",
    habitat: "Infernal citadels, dark thrones, and apocalyptic war zones.",
    behaviour:
      "Inspires absolute obedience in lesser devils. Radiates an aura of fear while crushing foes with a flaming mace and poisonous bite.",
    threatLevel: "High",
    variants: ["Infernal Duke", "Arch-Devil Proxy", "Supreme Pit Lord"],
    hooks: [
      "A pit fiend has personally arrived on the material plane to oversee the final stage of an imperial conquest.",
      "To break an unbreakable contract, heroes must infiltrate the pit fiend's iron fortress and burn the original parchment.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Barbed%20Devil/BarbedDevil%20(1).webp",
  },
  {
    title: "Barlgura",
    category: "fiend",
    description:
      "A hulking, orangutan-like ape demon with glowing red eyes and fearsome tusks that leaps great distances to pummel foes.",
    habitat: "Abyssal jungles, ruined temples, and savage arenas.",
    behaviour:
      "Uses innate camouflage to ambush from trees before leaping into combat with blood-curdling roars and pounding fists.",
    threatLevel: "Medium",
    variants: ["Abyssal Ape", "Blood-Fist Demon", "Jungle Terror"],
    hooks: [
      "A cult of savage beasts is worshiping a barlgura that has taken over the ruined jungle ziggurat.",
      "The barlgura can climb vertical stone surfaces as fast as a human can run across flat ground.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Barlgura/Barlgura%20(1).webp",
  },
  {
    title: "Chasme",
    category: "fiend",
    description:
      "A disgusting demonic fly the size of a pony whose droning buzzing induces magical slumber before it drains blood with its proboscis.",
    habitat: "Abyssal cesspools, battlefield corpses, and plague pits.",
    behaviour:
      "Flies over enemies emitting a hypnotic drone that puts listeners to sleep, then lands to suck their heart's blood.",
    threatLevel: "Medium",
    variants: ["Plague Fly", "Abyssal Drone", "Blood-Sucker Fiend"],
    hooks: [
      "Soldiers standing watch along the ramparts keep falling asleep and waking up drained of half their blood.",
      "Plugging one's ears with wax is essential before entering the chasme hive in the lower dungeon.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Chasme/Chasme%20(1).webp",
  },
  {
    title: "Dretch",
    category: "fiend",
    description:
      "A bloated, whimpering wretch of a demon that attacks in swarms and releases clouds of sickening fetid gas.",
    habitat: "Abyssal front lines, dark summon pits, and sewers.",
    behaviour:
      "Cowardly alone but reckless in hordes. Releases toxic gas clouds upon dying to choke surviving attackers.",
    threatLevel: "Low",
    variants: ["Abyssal Wretch", "Fetid Swarm", "Slum Demon"],
    hooks: [
      "A botched summoning ritual by amateur apprentices flooded the academy basement with dozens of whimpering dretches.",
      "Slaying a dretch causes it to burst into a cloud of nauseating yellow vapor.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dretch/Dretch%20(1).webp",
  },
  {
    title: "Lemure",
    category: "fiend",
    description:
      "A mindless, melting mass of tormented flesh representing the lowest rung of infernal souls, driven forward by devil overseers.",
    habitat: "Infernal rivers, vanguard trenches, and summoner cages.",
    behaviour:
      "Shambles blindly toward the nearest living thing to engulf and dissolve them in acidic slime.",
    threatLevel: "Low",
    variants: ["Infernal Slime", "Tormented Soul-Blob", "Pit Fodder"],
    hooks: [
      "An army of thousands of lemures is being marched across the planar bridge to act as meat shields for a bone devil.",
      "Unless blessed with holy water upon death, a lemure regenerates and reforms from the infernal mud within days.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Lemure/Lemure%20(1).webp",
  },
  {
    title: "Erinyes",
    category: "fiend",
    description:
      "A fierce, winged warrior devil resembling a fallen angel clad in crimson plate armor, wielding a venomous longbow.",
    habitat: "Infernal skies, royal execution grounds, and planar outposts.",
    behaviour:
      "Fights with ruthless discipline from the air, sniping targets with poisoned arrows or entangling them in magical rope.",
    threatLevel: "Medium",
    variants: ["Fallen Fury", "Infernal Sniper", "Crimson Avenger"],
    hooks: [
      "An erinyes has been dispatched from the hells to hunt down a warlock who broke his pact with an archduke.",
      "The ropes wielded by an erinyes animate on command to bind captured prisoners securely.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Barbed%20Devil/BarbedDevil%20(1).webp",
  },
];

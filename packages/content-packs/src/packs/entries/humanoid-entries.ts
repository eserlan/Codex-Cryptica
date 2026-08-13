import type { CreaturePackEntry } from "../../types.js";

export const humanoidEntries: CreaturePackEntry[] = [
  {
    title: "Bandit",
    category: "humanoid",
    description:
      "Desperate outlaws, army deserters, or ruthless mercenaries who make their living preying on travelers and weakly defended settlements.",
    habitat:
      "Roadside ambushes, forest hideouts, abandoned forts, and mountain passes.",
    behaviour:
      "Bandits prefer unfair fights. They set traps, demand tolls, and strike from cover, retreating quickly if their victims put up stiff resistance.",
    threatLevel: "Low",
    variants: ["Bandit Captain", "Highwayman", "Poacher"],
    hooks: [
      "A well-organized bandit troop has taken over the old toll bridge and is demanding exorbitant fees from farmers bringing crops to market.",
      "One of the bandits captured during the skirmish turns out to be the runaway heir of a prominent noble house.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bandit/BanditHumanArcticFemaleMelee%20(1).webp",
  },
  {
    title: "Cultist",
    category: "humanoid",
    description:
      "Fanatical worshippers of dark gods, forbidden demons, or eldritch entities, hiding behind masks of ordinary citizenship.",
    habitat:
      "Hidden basements, ruined temples, forest clearings, and urban back alleys.",
    behaviour:
      "Operates in secret cells. Willing to sacrifice their own lives to complete unholy rituals or protect their high priest.",
    threatLevel: "Low",
    variants: ["Cult Acolyte", "Doomsday Fanatic", "Ritual Dagger-Master"],
    hooks: [
      "Several prominent citizens have been spotted entering an abandoned warehouse at midnight wearing crimson robes.",
      "The town well has been tainted with a strange black oil by cultists preparing the populace for a sacrificial eclipse.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cultist/CultistForest%20(1).webp",
  },
  {
    title: "Mercenary",
    category: "humanoid",
    description:
      "Hardened professional soldiers who sell their martial skills to the highest bidder without loyalty to crown or creed.",
    habitat: "Taverns, disputed borders, mercenary camps, and trade caravans.",
    behaviour:
      "Fights with disciplined shield walls and combined arms tactics. Will rarely fight to the death if the contract isn't worth it.",
    threatLevel: "Medium",
    variants: ["Veteran Halberdier", "Crossbow Sniper", "Sellsword Captain"],
    hooks: [
      "A mercenary company hired to protect the copper mine has switched sides after the rival guild offered them double pay.",
      "Unemployed mercenaries are loitering in the town square, bullying locals until someone hires them.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Veteran/VeteranHumanFemaleMelee%20(1).webp",
  },
  {
    title: "Pirate",
    category: "humanoid",
    description:
      "Seafaring raiders who plunder merchant ships and coastal villages, armed with cutlasses, boarding pikes, and flintlocks.",
    habitat: "Open seas, hidden coves, pirate havens, and coastal taverns.",
    behaviour:
      "Uses grappling hooks to board enemy vessels in chaotic melee. Intimidates victims into surrender to avoid damaging the plunder.",
    threatLevel: "Low",
    variants: ["Buccaneer", "Pirate Captain", "Quartermaster"],
    hooks: [
      "A notorious pirate captain has put a bounty on the party after they thwarted his smuggling ring.",
      "A shipwrecked crew of pirates has taken over an island lighthouse, luring ships onto the jagged reefs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bandit%20Captain/BanditCaptainDragonbornArctic%20(1).webp",
  },
  {
    title: "Berserker",
    category: "humanoid",
    description:
      "Wild frontier warriors clad in fur and war paint who channel primal rage to ignore pain and cleave through armor.",
    habitat:
      "Northern steppes, rugged mountain highlands, and wilderness camps.",
    behaviour:
      "Charges recklessly into the thickest melee wielding heavy two-handed axes, refusing to fall until their heart stops beating.",
    threatLevel: "Medium",
    variants: ["Bear-Warrior", "Whirlwind Raider", "Blood-Chanter"],
    hooks: [
      "A berserker champion stands at the narrow mountain pass challenging any warrior to face him without magic.",
      "A northern raiding party driven from their homeland by dragon fire is looking to conquer a new valley.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Berserker/BerserkerHumanFemale%20(1).webp",
  },
  {
    title: "Assassin",
    category: "humanoid",
    description:
      "Cold, professional killers trained in stealth, poison, and anatomy to terminate targets without leaving a trace.",
    habitat: "Shadowy rooftop perches, noble galas, and crowded bazaars.",
    behaviour:
      "Stalks the target for days to learn their routine before delivering a single poisoned dagger strike and vanishing into the crowd.",
    threatLevel: "Medium",
    variants: ["Shadow Blade", "Poisoner Guildmaster", "Faceless Killer"],
    hooks: [
      "The party discovers a poisoned crossbow bolt lodged in their inn door with a black lotus note attached.",
      "A dying informant hands the heroes a ledger listing the next three targets of the royal assassin guild.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Assassin/Assassin%20(1).webp",
  },
  {
    title: "Necromancer",
    category: "humanoid",
    description:
      "A dark arcane scholar who manipulates the energies of life and death to command skeletal armies and drain vitality.",
    habitat:
      "Crypt observatories, bone-strewn laboratories, and plague-ridden slums.",
    behaviour:
      "Surrounds themselves with a wall of zombie and skeleton bodyguards while casting debilitating curses from afar.",
    threatLevel: "Medium",
    variants: ["Bone-Weaver", "Plague Caller", "Death Scholar"],
    hooks: [
      "Graves are being emptied across the shire; the local magistrate suspects the secluded scholar living in the old watchtower.",
      "A repentant necromancer offers the party ancient secrets if they protect him from his former apprentices.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mage/MageHumanFemale%20(1).webp",
  },
  {
    title: "Smuggler",
    category: "humanoid",
    description:
      "Wily contraband traffickers who navigate secret tunnels, hidden sea coves, and bribed checkpoints.",
    habitat:
      "Underground sewers, coastal docks, border checkpoints, and hidden cellars.",
    behaviour:
      "Relies on misdirection, traps, and hidden escape routes. Fights only as a last resort to protect valuable cargo.",
    threatLevel: "Low",
    variants: ["Contraband Boss", "Tunnel Runner", "Dock Boss"],
    hooks: [
      "The innkeeper offers the heroes a cut of the profits if they escort a wagon of illicit spellbooks past the city guard.",
      "Rival smuggling gangs have turned the docks into a nightly warzone over a shipment of stolen dragon scales.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Thug/ThugHumanFemaleMelee%20(1).webp",
  },
  {
    title: "Gladiator",
    category: "humanoid",
    description:
      "Arena combatants trained to fight with exotic weapons and theatrical flair for the entertainment of cheering crowds.",
    habitat: "Colosseums, fighting pits, and noble slave estates.",
    behaviour:
      "Uses nets, tridents, and shields to disarm and disable opponents. Plays to the crowd to earn favor and adrenaline surges.",
    threatLevel: "Medium",
    variants: ["Pit Champion", "Net-and-Trident Master", "Beast Slayer"],
    hooks: [
      "The reigning arena champion challenges one of the heroes to an exhibition match where the stakes are a rare artifact.",
      "A gladiator uprising has seized control of the grand amphitheater, taking several wealthy nobles hostage.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gladiator/GladiatorHumanFemale%20(1).webp",
  },
  {
    title: "Warlock",
    category: "humanoid",
    description:
      "A spellcaster who gained magical power by forging a dark pact with an otherworldly patron like a fiend or fey lord.",
    habitat: "Secluded sanctums, crossroads at midnight, and occult libraries.",
    behaviour:
      "Unleashes crackling blasts of eldritch energy and commands forbidden hexes to weaken and terrorize foes.",
    threatLevel: "Medium",
    variants: [
      "Fiend-Bound Spellbinder",
      "Fey-Touched Hexer",
      "Star-Sworn Warlock",
    ],
    hooks: [
      "A desperate warlock begs the party to help break the infernal contract before their soul is collected at midnight.",
      "Eldritch blasts have shattered the town hall windows during an argument between rival warlock covens.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cult%20Fanatic/CultFanaticForest%20(1).webp",
  },
  {
    title: "Poacher",
    category: "humanoid",
    description:
      "Woodland hunters who illegally trap royal game and rare magical beasts for their hides, horns, and meat.",
    habitat: "Royal forests, game reserves, and remote trapping cabins.",
    behaviour:
      "Sets hidden bear traps, snare pits, and tripwire crossbows around their camp to maim intruders before picking them off with bows.",
    threatLevel: "Low",
    variants: ["Beast Trapper", "Ivory Hunter", "Snare Master"],
    hooks: [
      "A unicorn colt was found caught in an iron jaw-trap; the poachers are tracking the blood trail to finish the job.",
      "The gamekeeper promises a reward for dismantling a network of poachers who have been supplying a dark apothecary.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Scout/ScoutHumanFemale%20(1).webp",
  },
  {
    title: "Knight",
    category: "humanoid",
    description:
      "Heavily armored cavalry elite bound by a code of chivalry and sworn fealty to a lord or holy order.",
    habitat: "Castles, tourney grounds, and feudal manors.",
    behaviour:
      "Charges into battle atop armored warhorses with lances couched, before dismounting to fight with longsword and shield.",
    threatLevel: "Medium",
    variants: ["Errant Knight", "Paladin Commander", "Black Knight"],
    hooks: [
      "A disgraced knight errant blocks the bridge, refusing passage until someone defeats him in honorable combat to restore his name.",
      "A corrupt knight templar is using his holy authority to extort excessive taxes from peasants.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Knight/KightHalflingFemaleGood%20(1).webp",
  },
  {
    title: "Thief",
    category: "humanoid",
    description:
      "Nimble city rogues adept at picking pockets, bypassing locks, and disarming traps in dark alleys and mansions.",
    habitat:
      "Crowded marketplaces, thieves' guild cellars, and rooftop pathways.",
    behaviour:
      "Flanks enemies to deliver devastating sneak attacks with shortswords or daggers before smoke-bombing out of sight.",
    threatLevel: "Low",
    variants: ["Master Footpad", "Cat burglar", "Cutpurse"],
    hooks: [
      "A thief picked the wizard's pocket and accidentally unleashed a bottled smoke demon in the middle of the crowded bazaar.",
      "The thieves' guild has left a black chalk symbol on the party's inn door indicating they are marked for robbery.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Thug/ThugElfFemaleMelee%20(10).webp",
  },
  {
    title: "Tribal Warrior",
    category: "humanoid",
    description:
      "Indigenous hunters and defenders who protect their ancestral wilderness homes with bone spears and hide shields.",
    habitat: "Deep jungles, arid canyons, and remote island archipelagos.",
    behaviour:
      "Uses terrain knowledge to surround intruders, attacking in coordinated skirmish waves while using war cries to signal teammates.",
    threatLevel: "Low",
    variants: ["Spear Hunter", "Blowgun Scout", "War Chief"],
    hooks: [
      "Loggers have desecrated a sacred burial mound, causing the local warrior tribe to declare war on the frontier outpost.",
      "A tribal scout warns the party that an ancient sleeping horror in the valley has begun to stir.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Tribal%20Warrior/TribalWarriorDragonbornCoastal%20(1).webp",
  },
  {
    title: "Shaman",
    category: "humanoid",
    description:
      "Spiritual guides and medicine makers who channel primal elemental spirits and herbal concoctions.",
    habitat: "Sacred groves, hilltop stone circles, and tribal villages.",
    behaviour:
      "Cast elemental wards, healing mists, and lightning bolts while summoning spirit totems to buff allies.",
    threatLevel: "Medium",
    variants: ["Storm Caller", "Spirit Speaker", "Beast-Binder Shaman"],
    hooks: [
      "The village shaman's spirit totem has been stolen by river bandits, causing erratic storms over the valley.",
      "A dying shaman entrusts the party with a glowing acorn that must be planted at the heart of the corrupted forest.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Druid/DruidHumanFemale%20(1).webp",
  },
  {
    title: "Enforcer",
    category: "humanoid",
    description:
      "Muscular muscle-for-hire employed by crime syndicates and corrupt merchants to collect debts and break bones.",
    habitat: "Gambling dens, waterfront warehouses, and slum taverns.",
    behaviour:
      "Uses iron-shod clubs and brass knuckles to pummel targets into submission without killing them—unless ordered to.",
    threatLevel: "Low",
    variants: ["Syndicate Bruiser", "Debt Collector", "Tavern Bouncer"],
    hooks: [
      "Three hulking enforcers have cornered an indebted shopkeeper in the alley outside your tavern.",
      "A crime boss sends his top enforcers to deliver a 'friendly warning' to the adventurers.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Guard/GuardDragonborn%20(1).webp",
  },
  {
    title: "Scout",
    category: "humanoid",
    description:
      "Lightly armored wilderness pathfinders trained in tracking, survival, and long-range reconnaissance.",
    habitat: "Border watchtowers, frontier forests, and mountain outposts.",
    behaviour:
      "Avoids direct melee, preferring to snipe from longbow range from high vantage points before retreating to alert the main garrison.",
    threatLevel: "Low",
    variants: ["Border Ranger", "Outrider", "Falconer Scout"],
    hooks: [
      "A wounded army scout collapses at the tavern doors bearing news of an approaching goblin invasion force.",
      "The party needs to hire a local pathfinder scout to navigate the treacherous shifting sands of the whispering desert.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Scout/ScoutDragonbornArctic%20(2).webp",
  },
  {
    title: "Zealot",
    category: "humanoid",
    description:
      "Religious militants who enforce divine dogma with iron flails and unwavering, fanatical conviction.",
    habitat: "Inquisitorial dungeons, cathedral plazas, and crusade camps.",
    behaviour:
      "Fights with reckless fervor, ignoring pain or wounds while shouting holy scriptures to inspire nearby allies.",
    threatLevel: "Medium",
    variants: ["Inquisitor Guard", "Temple Crusader", "Flagellant"],
    hooks: [
      "An inquisitorial zealot has accused the town herbalist of witchcraft and is preparing a public pyre.",
      "Zealots are blocking the mountain pilgrim trail, demanding that all travelers denounce foreign gods.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Priest/PriestDarkDwarfFemale%20(1).webp",
  },
  {
    title: "Alchemist",
    category: "humanoid",
    description:
      "Experimental chemists who fling volatile glass flasks of alchemical fire, acid, and choking gas into combat.",
    habitat: "Cluttered laboratories, apothecary shops, and siege workshops.",
    behaviour:
      "Stays behind heavy cover throwing explosive bombs and quaffing mutation elixirs to temporarily enhance their physical strength.",
    threatLevel: "Medium",
    variants: ["Mad Bombardier", "Plague Brewer", "Mutagenic Chemist"],
    hooks: [
      "An alchemist's laboratory exploded, flooding the street below with a bizarre pink fog that makes inanimate objects animate.",
      "A desperate alchemist hires the party to recover a stolen crate of unstable dragon-fire bombs before they detonate.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Acolyte/AcolyteDarkDragonborn%20(1).webp",
  },
  {
    title: "Warlord",
    category: "humanoid",
    description:
      "Charismatic and ruthless military commanders who unite fractured warbands into conquering legions.",
    habitat: "War camps, conquered fortresses, and battlefield command tents.",
    behaviour:
      "Issues tactical commands that grant allies extra movements and attacks. Fights clad in heavy plate armor wielding a warhammer.",
    threatLevel: "High",
    variants: ["Iron Marshal", "Mercenary General", "Bandit King"],
    hooks: [
      "A charismatic warlord has united the local bandit gangs and mercenary troupes into an army threatening the regional capital.",
      "Defeating the warlord in single combat in front of his troops is the only way to disperse the besieging army without bloodshed.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hobgoblin%20Warlord/HobgoblinWarlordDesert%20(1).webp",
  },
];

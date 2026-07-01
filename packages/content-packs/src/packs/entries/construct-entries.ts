import type { CreaturePackEntry } from "../../types.js";

export const constructEntries: CreaturePackEntry[] = [
  {
    title: "Iron Golem",
    category: "construct",
    description:
      "A towering, twelve-foot automaton forged of heavy iron plating, smelling of hot oil and breathing clouds of poisonous vapor.",
    habitat: "Archmage treasuries, royal vaults, and dwarven fortresses.",
    behaviour:
      "Pounds foes with devastating iron fists that never tire. Exhales clouds of poison gas while absorbing fire attacks to heal itself.",
    threatLevel: "High",
    variants: [
      "Adamantine Sentinel",
      "Forge Colossus",
      "Steam-Driven Juggernaut",
    ],
    hooks: [
      "An iron golem programmed centuries ago to guard the city bridge still stands there, refusing to let anyone cross with drawn weapons.",
      "Casting magical fire on an iron golem repairs its dents and melts away rust rather than harming it.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Clay%20Golem/ClayGolem%20(1).webp",
  },
  {
    title: "Stone Golem",
    category: "construct",
    description:
      "A heavy, rough-hewn statue animated by primordial earth spirits, moving with grinding ponderous force.",
    habitat: "Ancient temple gates, wizards' gardens, and tomb doorways.",
    behaviour:
      "Fights with relentless mechanical persistence. Emits a slowing magical aura that halves the movement and attack speed of nearby enemies.",
    threatLevel: "High",
    variants: ["Granite Guardian", "Marble Sentinel", "Obsidian Warder"],
    hooks: [
      "Two ancient stone statues flanking the temple doors grind to life and step forward to block the entrance when the gong sounds.",
      "A stone golem has continued executing its final order—digging a moat around the ruined castle—for three hundred years.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Stone%20Golem/StoneGolem%20(1).webp",
  },
  {
    title: "Clay Golem",
    category: "construct",
    description:
      "A hulking humanoid sculpted from sacred river clay and inscribed with divine Hebrew-style animation runes across its chest.",
    habitat: "Sacred sanctuaries, alchemical labs, and temple vaults.",
    behaviour:
      "Can magically accelerate its movements to blinding speed. Wounds inflicted by its clay fists resist magical healing.",
    threatLevel: "Medium",
    variants: ["Terracotta Guardian", "Mud Colossus", "Runed Sentinel"],
    hooks: [
      "Erasing the first letter of the rune inscribed on the clay golem's forehead deactivates the automaton instantly.",
      "If damaged by acid, a clay golem goes berserk, attacking friends and foes alike until destroyed.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Clay%20Golem/ClayGolem%20(1).webp",
  },
  {
    title: "Flesh Golem",
    category: "construct",
    description:
      "A grotesque patchwork humanoid stitched together from graveyard body parts and animated through lightning alchemical energy.",
    habitat: "Mad scientist laboratories, lightning towers, and anatomy halls.",
    behaviour:
      "Lumbering and strong. Goes berserk when heavily wounded unless calmed by its creator. Absorbs lightning bolts to restore health.",
    threatLevel: "Medium",
    variants: ["Stitched Abomination", "Alchemical Brute", "Galvanic Monster"],
    hooks: [
      "A lightning storm over the old laboratory has reanimated a dormant flesh golem that is now breaking out through the wall.",
      "The golem retains vague, confused memories from one of its donor brains, recognizing a song played on a music box.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Flesh%20Golem/FleshGolem%20(1).webp",
  },
  {
    title: "Animated Armor",
    category: "construct",
    description:
      "A suit of empty steel plate armor clanking forward under the command of ancient binding enchantment.",
    habitat: "Castle hallways, noble armories, and wizard vestibules.",
    behaviour:
      "Stands motionless among decorative suits of armor until intruders step past, then draws its sword to strike from behind.",
    threatLevel: "Low",
    variants: ["Plate Guardian", "Enchanted Halberdier", "Honor Guard"],
    hooks: [
      "The gallery of historic suits of armor suddenly clanks to life to defend the royal heir from assassins.",
      "When defeated, the animated armor collapses into a pile of ordinary steel plates and leather straps.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Flying Sword",
    category: "construct",
    description:
      "A hovering longsword dancing through the air on invisible threads of arcane telekinesis.",
    habitat: "Wizard studies, weapon racks, and treasure vaults.",
    behaviour:
      "Whirls and slashes with uncanny precision. When undisturbed, hovers upright or rests innocently inside a scabbard.",
    threatLevel: "Low",
    variants: ["Dancing Scimitar", "Enchanted Greatsword", "Whirling Dagger"],
    hooks: [
      "Reaching for the jeweled sword on the pedestal causes it to leap into the air and slash at the thief's hand.",
      "A flying sword fights alongside its elderly wizard master, parrying attacks directed at the frail spellcaster.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Flying%20Sword/FlyingSwordMace%20(1).webp",
  },
  {
    title: "Rug of Smothering",
    category: "construct",
    description:
      "An ornate, finely woven Persian-style carpet enchanted to wrap around and suffocate anyone who steps upon it.",
    habitat: "Palace parlors, wizard libraries, and treasure galleries.",
    behaviour:
      "Lies flat and innocent until stepped on, whereupon it rolls up tightly around the victim to crush and smother them.",
    threatLevel: "Low",
    variants: ["Suffocating Tapestry", "Crushing Carpet", "Enchanted Runner"],
    hooks: [
      "Striking a rug of smothering with melee weapons while it wraps a victim deals half the damage directly to the trapped person inside.",
      "The thieves thought they found a valuable silk carpet to steal, until it wrapped around the guildmaster's head.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Rug%20of%20Smothering/RugOfSmothering%20(1).webp",
  },
  {
    title: "Homunculus",
    category: "construct",
    description:
      "A tiny, winged clay or mandrake construct created by a wizard to serve as a spy, laboratory assistant, and telepathic extension.",
    habitat: "Alchemical workshops, wizard robes, and libraries.",
    behaviour:
      "Perches on rafters to observe intruders, sharing everything it sees telepathically with its master. Delivers venomous bites.",
    threatLevel: "Low",
    variants: ["Alchemical Imp", "Clay Spy", "Mandrake Familiar"],
    hooks: [
      "If a homunculus is slain, its creator suffers a sudden sharp psychic shock and temporarily loses part of their magical power.",
      "A stray homunculus is carrying a vial of rare blue liquid across the rooftops trying to deliver it to its imprisoned master.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Homunculus/Homunculus%20(1).webp",
  },
  {
    title: "Shield Guardian",
    category: "construct",
    description:
      "A heavy wood-and-metal automaton bound by a magical amulet to absorb half the damage taken by its designated master.",
    habitat: "Archmage side, noble bodyguards, and treasury entrances.",
    behaviour:
      "Interposes its bulky frame between attackers and its amulet wearer. Can store a single powerful spell inside its chest plate to cast later.",
    threatLevel: "High",
    variants: [
      "Amulet Sentinel",
      "Spell-Storing Warder",
      "Wood-and-Iron Protector",
    ],
    hooks: [
      "The thief who stole the wizard's brass amulet suddenly finds a towering ten-foot automaton following him everywhere and following his orders.",
      "To defeat the spellcaster, heroes must first separate him from the shield guardian absorbing his wounds.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shield%20Guardian/ShieldGuardian%20(1).webp",
  },
  {
    title: "Helmed Horror",
    category: "construct",
    description:
      "A suit of glowing plate armor hovering with empty dark eye slits, completely immune to force spells and mind control.",
    habitat: "Planar gateways, ancient ruins, and divine vaults.",
    behaviour:
      "Fights with tactical intelligence unlike mindless automatons. Shrugs off magic missiles and charms while cleaving with glowing swords.",
    threatLevel: "Medium",
    variants: ["Spell-Immune Sentinel", "Eldritch Armor", "Planar Knight"],
    hooks: [
      "The helmed horror can see through invisibility and illusions, making sneaking past it virtually impossible.",
      "Unlike animated armor, a helmed horror retains tactically adaptive combat programming bequeathed by ancient battle mages.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Helmed%20Horror/HelmedHorror%20(1).webp",
  },
  {
    title: "Caryatid Column",
    category: "construct",
    description:
      "A graceful stone pillar carved in the likeness of a female warrior that transforms into a living stone maiden when disturbed.",
    habitat: "Temple porticos, royal colonnades, and marble halls.",
    behaviour:
      "Steps down from its architectural pedestal wielding a marble sword that shatters non-magical weapons upon parrying.",
    threatLevel: "Medium",
    variants: ["Marble Maiden", "Pillar Sentinel", "Colonnade Guard"],
    hooks: [
      "Any mundane sword or axe that strikes the caryatid column must survive a structural integrity check or snap in two against her stone skin.",
      "When destroyed, the caryatid column reverts to a broken structural pillar, potentially causing the ceiling above to cave in.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Iron Cobra",
    category: "construct",
    description:
      "A three-foot segmented mechanical snake forged from dark iron, equipped with fangs connected to refillable alchemical poison reservoirs.",
    habitat: "Treasure chests, alchemical vaults, and assassin workshops.",
    behaviour:
      "Springs out from opened drawers or chests to bite victims with sleep or paralyzing venom before slithering into dark corners.",
    threatLevel: "Low",
    variants: ["Adamantine Viper", "Mechanical Asp", "Poison-Fang Automaton"],
    hooks: [
      "The lock on the chest wasn't trapped, but opening the lid released a mechanical iron cobra hiding under the gold coins.",
      "An artificer sells iron cobras that can be loaded with custom potions to inject either lethal venom or healing drafts.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Scarecrow",
    category: "construct",
    description:
      "A burlap sack stuffed with straw and bound to wooden crosses by witch witchcraft, glowing with evil yellow eye coals.",
    habitat: "Pumpkin patches, cornfields, and witch hovels.",
    behaviour:
      "Stands limply on its pole until intruders pass, then hops down to rake with wooden claws that instill paralyzing supernatural fear.",
    threatLevel: "Low",
    variants: ["Witch-Straw Stalker", "Cornfield Terror", "Burlap Horror"],
    hooks: [
      "The farmer's scarecrows keep moving closer to the farmhouse every morning when the mist clears.",
      "Scarecrows are extremely vulnerable to fire, igniting into blazing beacons when struck by torches.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Scarecrow/Scarecrow%20(1).webp",
  },
  {
    title: "Modron",
    category: "construct",
    description:
      "A geometric mechanical construct from the plane of absolute law, resembling a sphere or cube with clockwork limbs and wings.",
    habitat: "Clockwork marches, planar portals, and mechanus outposts.",
    behaviour:
      "Follows logical instructions with absolute literalism. Fights in synchronized mathematical formations.",
    threatLevel: "Low",
    variants: ["Monodrone", "Duodrone", "Pentadrone Officer"],
    hooks: [
      "A rogue modron separated from the Great March is searching frantically for someone to repair its ticking internal gearwork.",
      "Modron formations attack with mechanical synchronicity, never breaking rank or showing fear.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Nimblewright",
    category: "construct",
    description:
      "A sleek, metallic automaton constructed from rapier blades and silver joints, moving with graceful, human-like fencing fluidity.",
    habitat: "Opera houses, noble fencing academies, and artificer manors.",
    behaviour:
      "Parries enemy thrusts effortlessly before retaliating with lightning-fast rapier strikes from hidden wrist blades.",
    threatLevel: "Medium",
    variants: ["Silver Fencer", "Rapier Automaton", "Clockwork Duelist"],
    hooks: [
      "A wealthy noble uses a nimblewright disguised in domino masks and courtly cloaks to fight his duels of honor for him.",
      "When severely damaged, a nimblewright can jettison its heavy outer plating to double its fencing speed for one final desperate attack.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Clockwork Horror",
    category: "construct",
    description:
      "A multi-legged mechanical spider forged from electrum or adamantine that strips metal from its surroundings to build self-replicating clones.",
    habitat: "Dwarven forges, mine shafts, and ruined workshops.",
    behaviour:
      "Swarm over armor and weapons, using rotating razor saws to slice metal and flesh apart with equal efficiency.",
    threatLevel: "Medium",
    variants: [
      "Electrum Horror",
      "Adamantine Saw-Spider",
      "Platinum Sovereign Horror",
    ],
    hooks: [
      "An infestation of clockwork horrors has completely stripped the mining village of every nail, pot, and iron tool.",
      "Destroying the central platinum sovereign horror immediately transmits a deactivation signal to all lesser worker spiders.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hook%20Horror/HookHorror%20(1).webp",
  },
  {
    title: "Gorgon Construct",
    category: "construct",
    description:
      "A mechanical iron bull engineered by ancient artificers to replicate the petrifying breath of biological gorgons using alchemical gas.",
    habitat: "Artificer testing grounds and fortress gateways.",
    behaviour:
      "Tramples targets under iron wheels before venting pressurized clouds of calcifying green vapor from its brass snout vents.",
    threatLevel: "High",
    variants: ["Alchemical Iron Bull", "Steam Gorgon", "Brass Juggernaut"],
    hooks: [
      "The artificer guild uses mechanical gorgons to patrol their testing grounds, turning intruders into stone statues they sell as lawn decorations.",
      "Sabotaging the exhaust valves on the construct causes its petrifying gas engine to build pressure and explode.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gorgon/Gorgon%20(1).webp",
  },
  {
    title: "Bronze Serpent",
    category: "construct",
    description:
      "A forty-foot articulated mechanical snake forged from overlapping bronze scales that slithers through dungeon hallways.",
    habitat: "Ancient desert tombs and mechanical labyrinths.",
    behaviour:
      "Constricts prey in crushing bronze coils while snapping with heavy metal jaws that lock shut like bear traps.",
    threatLevel: "Medium",
    variants: ["Articulated Viper", "Tomb Anaconda", "Clockwork Constrictor"],
    hooks: [
      "The bronze serpent slithers through narrow wall slots designed specifically to let it ambush tomb robbers from any angle.",
      "Prying open the serpent's head compartment reveals complex gears lubricated with rare magical essential oils.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Young%20Bronze%20Dragon/YoungBronzeDragon%20(1).webp",
  },
  {
    title: "Figurine of Wondrous Power",
    category: "construct",
    description:
      "A miniature stone carving of a beast that grows into a full-sized living construct creature when its command word is spoken.",
    habitat: "Adventurer pockets, royal display cases, and wizard desks.",
    behaviour:
      "Obeys its summoner completely for a limited duration before reverting to a small inert stone statuette to recharge.",
    threatLevel: "Low",
    variants: ["Onyx Dog", "Ebony Fly", "Ivory Goat"],
    hooks: [
      "The merchant sold the party a tiny stone lion, but forgot to tell them the exact pronunciation of the ancient command word.",
      "If the construct is slain while in its animated state, the stone statuette shatters beyond repair.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
  {
    title: "Juggernaut",
    category: "construct",
    description:
      "A house-sized rolling fortress of stone and iron wheels designed to crush infantry formations flat under its grinding rollers.",
    habitat: "Ancient battlefields and temple approaches.",
    behaviour:
      "Rolls in straight lines crushing everything beneath its spiked wooden rollers. Impervious to frontal spells and arrows.",
    threatLevel: "High",
    variants: ["Temple Roller", "Siege Engine Automaton", "Stone Crusher"],
    hooks: [
      "Heroes must jump onto the top platform of the moving juggernaut and jam its main steering gear before it crushes the city gates.",
      "The juggernaut cannot easily turn around; luring it into a narrow dead-end canyon traps it completely.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Animated%20Armor/AnimatedArmor%20(1).webp",
  },
];

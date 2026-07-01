import type { CreaturePackEntry } from "../../types.js";

export const feyEntries: CreaturePackEntry[] = [
  {
    title: "Dryad",
    category: "fey",
    description:
      "A mystical, tree-bound spirit appearing as an ethereal elven beauty whose skin shifts from green leaves in spring to bark in winter.",
    habitat: "Ancient sacred groves, sylvan forests, and druidic rings.",
    behaviour:
      "Shy and protective of woodland homes. Charms intruders into laying down their weapons or luring them away from her sacred tree.",
    threatLevel: "Low",
    variants: ["Oak Dryad", "Willow Maiden", "Blighted Dryad"],
    hooks: [
      "A dryad begs the heroes to stop lumberjacks who are about to chop down the ancient oak containing her life force.",
      "A noble knight wandered into the enchanted grove ten years ago and remains there still, charmed by a dryad's beauty.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Satyr",
    category: "fey",
    description:
      "A hedonistic sylvan reveler featuring the upper body of a wild elf and the horns, furry legs, and hooves of a goat.",
    habitat: "Sunlit glades, sylvan vineyards, and woodland festivals.",
    behaviour:
      "Plays panpipes to produce enchanting magical music that can put listeners to sleep, incite uncontrollable dancing, or spark fear.",
    threatLevel: "Low",
    variants: ["Faun Reveler", "Bacchic Piper", "Wild Horned-Lord"],
    hooks: [
      "A satyr's musical festival in the woods has drawn half the youth of the village into an endless three-day dance party.",
      "The satyr challenges the party's bard to a musical duel; if the bard loses, they must leave their instrument behind.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Satyr/Satyr%20(1).webp",
  },
  {
    title: "Pixie",
    category: "fey",
    description:
      "A tiny, invisible sprite barely a foot tall with gossamer wings and a magical pouch of glowing fairy dust.",
    habitat: "Flower glades, mushroom rings, and moonlight clearings.",
    behaviour:
      "Turn invisible at will to play elaborate benign pranks. Uses fairy dust to make allies fly or confuse enemies.",
    threatLevel: "Low",
    variants: ["Frost Pixie", "Moonlight Sprite", "Blossom Wing"],
    hooks: [
      "A mischievous pixie has swapped the party's health potions with flasks of harmless sparkling violet dye.",
      "Pixies demand a thimble full of sweet honey wine as toll before revealing the hidden woodland path.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Pixie/PixieMale%20(1).webp",
  },
  {
    title: "Redcap",
    category: "fey",
    description:
      "A murderous, gnome-sized fey with iron-shod boots and a woolen cap dyed red in the fresh blood of its victims.",
    habitat: "Blood-stained ruins, execution grounds, and dark fairy rings.",
    behaviour:
      "Must constantly kill to keep its cap wet with blood or it will perish. Sprints across battlefields wielding a heavy iron scythe.",
    threatLevel: "Medium",
    variants: ["Iron-Boot Stalker", "Blood-Cap", "Scythe Gnome"],
    hooks: [
      "A gang of redcaps has ambushed a royal carriage, seeking to soak their caps in noble blood before sunrise.",
      "Despite their tiny stature, redcaps kick with iron boots hard enough to dent plate armor.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Hag",
    category: "fey",
    description:
      "A ancient, malevolent crone of the Feywild who trades in misery, cursed bargains, and dark cauldrons of corruption.",
    habitat: "Murky swamps, dark twisted woods, and lonely coastal cliffs.",
    behaviour:
      "Form covens of three to unlock godlike magical hexes. Tricks mortals into terrible agreements where the price is always tragic.",
    threatLevel: "Medium",
    variants: ["Green Hag", "Sea Hag", "Annis Hag"],
    hooks: [
      "The village crops will only grow if someone honors an ancient promise made to the swamp hag fifty years ago.",
      "A hag offers to restore the warrior's lost eyesight in exchange for his happiest childhood memory.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Sea%20Hag/SeaHag%20(1).webp",
  },
  {
    title: "Treant",
    category: "fey",
    description:
      "An awakened animated tree giant with thick bark armor, root-like feet, and branch arms capable of hurling massive boulders.",
    habitat: "Old-growth forests, deep sylvan vales, and primal valleys.",
    behaviour:
      "Slumber for decades resembling normal trees until ancient woods are threatened. Animates nearby trees to crush invaders.",
    threatLevel: "High",
    variants: [
      "Ancient Oak Treant",
      "Weeping Willow Treant",
      "Blighted Treant",
    ],
    hooks: [
      "A marching grove of angry treants is advancing on the sawmill town to avenge the clear-cutting of the elder woods.",
      "Speaking with the ancient treant requires endless patience; it takes several hours just to say good morning.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Treant/TreantEvil%20(1).webp",
  },
  {
    title: "Unicorn",
    category: "fey",
    description:
      "A majestic celestial white stallion crowned with a single spiraling pearlescent horn radiating pure divine and sylvan magic.",
    habitat: "Enchanted glades, moonlit waterfalls, and pristine forests.",
    behaviour:
      "Purifies poisoned waters and heals innocent souls with a touch of its horn. Teleports across its domain to baffle pursuers.",
    threatLevel: "Medium",
    variants: ["Silver Horn", "Twilight Stallion", "Sylvan Sovereign"],
    hooks: [
      "A corrupt lord has trapped a unicorn inside an iron circle, causing the surrounding forest to wither and die.",
      "Drinking voluntarily given unicorn tears cures any mortal curse, but hunting one brings a lifelong curse of bad luck.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Unicorn/Unicorn%20(1).webp",
  },
  {
    title: "Quickling",
    category: "fey",
    description:
      "A malicious, miniature fey moving at blurring supernatural speeds, appearing as a chaotic streak of wind and laughter.",
    habitat: "Overgrown crossroads, fey portals, and sylvan thickets.",
    behaviour:
      "Zips between combatants faster than the eye can track to tie shoelaces together, steal daggers, or deliver rapid blade slashes.",
    threatLevel: "Low",
    variants: ["Wind-Sprite", "Blur Runner", "Silver-Blade Quickling"],
    hooks: [
      "The party's coin purses disappear in the blink of an eye accompanied by high-pitched mocking laughter echoing from the trees.",
      "To catch a quickling, one must spread birdlime or sticky sap across the woodland path where it runs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Boggle",
    category: "fey",
    description:
      "A cowardly, rubbery fey creature that secretes dimensional oil allowing it to reach through space and squeeze under doors.",
    habitat: "Childhood closets, attic crawlspaces, and fey borderlands.",
    behaviour:
      "Creates dimensional rifts in door frames to snatch shiny toys or food. Secretes either slippery oil or sticky glue from its skin.",
    threatLevel: "Low",
    variants: ["Oil-Skin Boggle", "Attic Sneak", "Dimensional Thief"],
    hooks: [
      "A boggle keeps reaching its arm out of a tiny mouse hole to steal keys off the guard's belt.",
      "The floorboards outside the treasure vault have been coated in boggle grease, sending armored intruders sliding into walls.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Meenlock",
    category: "fey",
    description:
      "A twisted, crustacean-like fey horror born when fear and despair corrupt a sylvan location, torturing victims telepathically.",
    habitat: "Dark subterranean lairs, twisted forests, and abandoned mines.",
    behaviour:
      "Paralyzes victims with pincers before dragging them into underground lairs to psychically torture them until they transform into meenlocks.",
    threatLevel: "Low",
    variants: ["Despair Stalker", "Shadow Pincer", "Corrupted Fey"],
    hooks: [
      "Missing villagers aren't dead—they are being slowly twisted into monsters inside the mossy caves beneath the hill.",
      "Meenlocks are repelled by bright sunlight and the joyous laughter of innocent children.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Korred",
    category: "fey",
    description:
      "A stout, wild-haired fey dwarf whose hair is woven into magical living ropes capable of binding giants to the ground.",
    habitat: "Rocky hills, stone circles, and subterranean fey caverns.",
    behaviour:
      "Throws animated hair ropes to entangle enemies before using innate geomancy to shape stone boulders around them.",
    threatLevel: "Medium",
    variants: ["Stone Dancer", "Hair-Weaver", "Earth Fey"],
    hooks: [
      "Korreds are dancing wildly around the standing stones, causing the very earth beneath the road to ripple and heave.",
      "Cutting a rope made of korred hair causes the strands to turn into heavy lead weights.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Darkling",
    category: "fey",
    description:
      "A cursed fey whose body absorbs light; upon death, their absorbed light flashes outward in a blinding, searing explosion.",
    habitat: "Shadowy alleys, underground bazaars, and twilight woods.",
    behaviour:
      "Operates as assassins or thieves in pitch darkness. Fights with poisoned daggers and explodes into blinding flashes when slain.",
    threatLevel: "Low",
    variants: ["Darkling Elder", "Shadow Assassin", "Twilight Thief"],
    hooks: [
      "Slaying the assassin in the crowded tavern caused a blinding flash of light that set the wooden drapes on fire.",
      "Darklings wear heavy cloth wrappings to shield their cursed skin from the painful rays of the sun.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Nymph",
    category: "fey",
    description:
      "An embodiment of nature's pristine beauty whose uncovered gaze can blind mortals and whose voice commands wilderness beasts.",
    habitat: "Secluded forest pools, crystal springs, and mountain meadows.",
    behaviour:
      "Surrounds herself with guardian animals. Blinds hostile intruders with her radiant beauty or teleports through clear water.",
    threatLevel: "Medium",
    variants: ["Water Nymph", "Woodland Sovereign", "Spring Guardian"],
    hooks: [
      "A arrogant prince attempted to capture a sacred pool nymph and was permanently struck blind for his insolence.",
      "The nymph will only grant the heroes some healing water if they clear a corrupting ooze from the headspring.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Spriggan",
    category: "fey",
    description:
      "A ugly, grotesque gnome-like fey capable of magically inflating its body from three feet tall to the size of a hulking giant.",
    habitat: "Ruined fortresses, rocky cairns, and sylvan badlands.",
    behaviour:
      "Lures travelers in with deceptive small stature before suddenly expanding into a towering giant wielding massive tree clubs.",
    threatLevel: "Medium",
    variants: ["Giant-Gnome", "Ruins Stalker", "Thorn Clubber"],
    hooks: [
      "What looked like a scrawny goblin begging by the road suddenly quadrupled in size and picked up the party's wagon.",
      "Spriggans hoard stolen weapons in hollow cairn mounds protected by thorny illusions.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Blink Dog",
    category: "fey",
    description:
      "A noble yellowish canine with long ears that possesses the innate magical ability to teleport short distances in the blink of an eye.",
    habitat: "Sylvan woodlands, fey borderlands, and noble meadows.",
    behaviour:
      "Hunts in coordinated packs, blinking behind prey to deliver bites before teleporting out of reach of counterattacks.",
    threatLevel: "Low",
    variants: ["Fey Hound", "Teleporting Mastiff", "Sylvan Pack-Leader"],
    hooks: [
      "A pack of blink dogs is fighting a desperate war against a displaced displacer beast pack in the western forest.",
      "Blink dogs understand sylvan speech and will ally with adventurers who respect woodland balance.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Blink%20Dog/BlinkDogRunning%20(1).webp",
  },
  {
    title: "Displacer Beast",
    category: "fey",
    description:
      "A sleek six-legged panther with blue-black fur and two spiked tentacles sprouting from its shoulders, surrounded by light-bending illusions.",
    habitat: "Twilight woods, fey ruins, and royal menageries.",
    behaviour:
      "Projects a magical illusion of itself several feet away from its actual body, causing enemy attacks to miss before lashing with spiked tentacles.",
    threatLevel: "Medium",
    variants: [
      "Pack Alpha Displacer",
      "Shadow Panther",
      "Spike-Tentacle Stalker",
    ],
    hooks: [
      "Arrows keep passing cleanly through the panther's body while its spiked tentacles lash out from empty air nearby.",
      "The pelt of a displacer beast can be tailored into a cloak of displacement that bends light around the wearer.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Displacer%20Beast/DisplacerBeast%20(1).webp",
  },
  {
    title: "Kelpie",
    category: "fey",
    description:
      "A shape-shifting water fey taking the form of a lost, saddled horse standing by a riverbank to tempt riders onto its back.",
    habitat: "River crossings, deep lakes, and marshy fjords.",
    behaviour:
      "Once a rider mounts its adhesive hide, the kelpie plunges into deep water to drown and consume the victim.",
    threatLevel: "Medium",
    variants: ["River Horse", "Bog Stallion", "Drowning Fey"],
    hooks: [
      "A magnificent black stallion bridled in silver stands patiently by the swollen river ford, waiting for someone to mount.",
      "The kelpie can be forced to serve as a tireless aquatic steed if one manages to steal its enchanted silver bridle.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Pooka",
    category: "fey",
    description:
      "A shapeshifting trickster taking the form of a black goat, eagle, or dog with glowing golden eyes that loves causing wilderness chaos.",
    habitat: "Rural farmsteads, foggy moors, and mountain passes.",
    behaviour:
      "Offers rides to drunken travelers only to take them on terrifying midnight flights through brambles before dumping them in mud.",
    threatLevel: "Low",
    variants: ["Moors Goat", "Shadow Eagle", "Midnight Trickster"],
    hooks: [
      "Farmers leave out bowls of fresh cream every Friday night so the pooka won't sour their milk or open their stable doors.",
      "A talking black hare offers to show the party a shortcut through the bogs that actually leads right into a troll lair.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
  {
    title: "Yeth Hound",
    category: "fey",
    description:
      "A headless or demonic-faced hound created by dark fey lords that flies silently through the night sky hunting souls.",
    habitat: "Night skies, dark sylvan forests, and unseelie courts.",
    behaviour:
      "Emits a terrifying baying howl that causes listeners to flee in panic before swooping down to bite with ghostly jaws.",
    threatLevel: "Medium",
    variants: ["Unseelie Hound", "Night Sky Stalker", "Baying Horror"],
    hooks: [
      "When the yeth hounds bay on a moonless night, everyone in the village locks their shutters and refuses to look outside.",
      "Sunlight destroys a yeth hound instantly, forcing the pack to race back to the Feywild before dawn.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hellhound/Hellhound%20(1).webp",
  },
  {
    title: "Leprechaun",
    category: "fey",
    description:
      "A clever, miniature cobbler fey clad in green who hoards pots of illusory gold and grants twisted wishes when captured.",
    habitat: "Rainbow ends, clover meadows, and hidden hollow logs.",
    behaviour:
      "Uses illusions, invisibility, and ventriloquism to lead greedy pursuers into embarrassing traps or badger dens.",
    threatLevel: "Low",
    variants: ["Clover Trickster", "Gold Hoarder", "Sylvan Cobbler"],
    hooks: [
      "A captured leprechaun promises a pot of gold in exchange for his freedom, but the coins turn into dry leaves by sunset.",
      "The leprechaun has stolen the paladin's boots while he slept and is repairing them with magical speed on a tree branch.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dryad/Dryad%20(1).webp",
  },
];

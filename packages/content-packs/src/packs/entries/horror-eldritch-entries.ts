import type { CreaturePackEntry } from "../../types.js";

export const horrorEldritchEntries: CreaturePackEntry[] = [
  {
    title: "Deep Shoggoth",
    category: "horror-eldritch",
    description:
      "A colossal, bubbling mass of black protoplasm constantly forming and reabsorbing temporary eyes, mouths, and pseudopods.",
    habitat:
      "Sunken ancient cities, Antarctic ice caverns, and deep subterranean abysses.",
    behaviour:
      "Rolls through dark tunnels like a living tidal wave, crushing and digesting everything in its path while uttering piping cries.",
    threatLevel: "Legendary",
    variants: ["Abyssal Slime", "Protoplasmic Horror", "Elder Slave-Beast"],
    hooks: [
      "Submarine miners breach an undersea cavern, releasing a Deep Shoggoth that begins systematically flooding the facility.",
      "An ancient bas-relief depicts how to construct an electric barrier capable of repelling the protoplasmic mass.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Deep%20Gnome/DeepGnomeMale%20(1).webp",
  },
  {
    title: "Sanity Devourer",
    category: "horror-eldritch",
    description:
      "A floating entity resembling a brain surrounded by barbed tentacles and snapping beaked orifices.",
    habitat: "Forgotten libraries, astral rifts, and deep underdark caverns.",
    behaviour:
      "Paralyzes victims with psionic blasts before latching onto their skulls to extract memories and cerebrospinal fluid.",
    threatLevel: "High",
    variants: ["Mind Eater", "Cerebral Horror", "Psionic Lurker"],
    hooks: [
      "Scholars at the grand archives are being found in catatonic states with all memories of their research completely erased.",
      "A captive Sanity Devourer holds the psychic combination needed to unlock a precursor vault.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Intellect%20Devourer/IntellectDevourer%20(1).webp",
  },
  {
    title: "Faceless Watcher",
    category: "horror-eldritch",
    description:
      "Tall, slender humanoids lacking any facial features, dressed in dark robes that ripple without any wind.",
    habitat: "Dreamscapes, threshold doorways, and foggy crossroads.",
    behaviour:
      "Observes victims silently from the periphery of vision. Teleports instantly when approached, inducing debilitating paranoia.",
    threatLevel: "Medium",
    variants: ["Blank Observer", "Threshold Lurker", "Silent Stalker"],
    hooks: [
      "A party member realizes a Faceless Watcher has appeared in the background of every family portrait they own.",
      "The watchers gather outside a house in great numbers whenever someone inside is about to tear the fabric of reality.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Aboleth/AbolethAberration%20(1).webp",
  },
  {
    title: "Gibbering Horror",
    category: "horror-eldritch",
    description:
      "An amorphous blob composed of hundreds of babbling mouths and weeping eyes merged from previous victims.",
    habitat: "Asylum dungeons, alchemical waste pits, and cursed ruins.",
    behaviour:
      "Emits an incessant, maddening cacophony that disorients prey before biting them from every direction simultaneously.",
    threatLevel: "Medium",
    variants: ["Babbling Mouther", "Choir of Madness", "Flesh Puddle"],
    hooks: [
      "The subterranean tunnels below the mad cultist's mansion echo with the weeping voices of missing townsfolk.",
      "Silence spells render the Gibbering Horror disoriented and vulnerable to kinetic attacks.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hook%20Horror/HookHorror%20(1).webp",
  },
  {
    title: "Tentacled Void-Beast",
    category: "horror-eldritch",
    description:
      "A massive floating entity with a leathery mantle and dozens of grasping, sucker-lined tentacles reaching between dimensions.",
    habitat: "Interdimensional portals, dark nebulae, and ruined temples.",
    behaviour:
      "Reaches through rifts to snatch prey off the ground, dragging them back into the void.",
    threatLevel: "High",
    variants: ["Rift Krakodawn", "Dimensional Greeper", "Void Squid"],
    hooks: [
      "A glowing portal opens above the town altar, and gigantic tentacles begin reaching down to grab screaming villagers.",
      "Severing the Void-Beast's anchor tentacles causes the portal to destabilize and collapse.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Aboleth/AbolethAberration%20(1).webp",
  },
  {
    title: "Eldritch Parasite",
    category: "horror-eldritch",
    description:
      "A centipede-like organism with an iridescent crystalline carapace that latches onto the human nervous system.",
    habitat: "Meteorite impact craters, alien monoliths, and ancient tombs.",
    behaviour:
      "Burrows into the host's spinal column to control their motor functions while granting them unnatural telekinesis.",
    threatLevel: "Medium",
    variants: ["Spinal Leech", "Star Worm", "Puppet Master"],
    hooks: [
      "The town mayor acts strangely robotic; an inspection reveals a glowing crystalline ridge protruding from behind his neck.",
      "A surgical extraction must be performed carefully in a magic-dampened room to prevent the parasite from detonating psychically.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Aboleth/AbolethAberration%20(1).webp",
  },
  {
    title: "Eyestalk Horror",
    category: "horror-eldritch",
    description:
      "A levitating sphere of fleshy armor dominated by a central unblinking eye and crowned with writhing magical eyestalks.",
    habitat:
      "Deep subterranean vaults, wizard towers, and ruined treasure rooms.",
    behaviour:
      "Exerts an anti-magic cone from its central eye while firing rays of petrification, disintegration, and charm from its stalks.",
    threatLevel: "Legendary",
    variants: ["Sphere of Many Eyes", "Occult Tyrant", "Gaze Horror"],
    hooks: [
      "A paranoid Eyestalk Horror has taken over the city's thieves guild, using charm rays to control key criminal lieutenants.",
      "Using polished mirror shields allows adventurers to reflect the creature's petrification rays back at its own eyestalks.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hook%20Horror/HookHorror%20(1).webp",
  },
  {
    title: "Crawling Madness",
    category: "horror-eldritch",
    description:
      "A swarm of severed, mummified hands covered in arcane runes that scuttle together like spiders.",
    habitat: "Necromancer laboratories, sacrificial altars, and cursed crypts.",
    behaviour:
      "Leaps onto victims' faces to suffocate them or grasp their limbs to hold them down for heavier horrors.",
    threatLevel: "Low",
    variants: ["Rune Claws", "Scuttling Hands", "Grip Swarm"],
    hooks: [
      "While investigating a murder scene, the victim's severed hand suddenly reanimates and scuttles into the ventilation shaft.",
      "A wizard uses a bound Crawling Madness to sort books and ingredients in his forbidden library.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Crawling%20Claw/CrawlingClawRug%20(1).webp",
  },
  {
    title: "Astral Abomination",
    category: "horror-eldritch",
    description:
      "A shifting geometric anomaly that defies three-dimensional physics, burning the eyes of those who try to focus on it.",
    habitat:
      "Astral plane crossroads, shattered crystal spires, and observatory tops.",
    behaviour:
      "Fires beams of non-Euclidean force. Folds space to appear instantly behind fleeing targets.",
    threatLevel: "High",
    variants: ["Geometric Horror", "Tesseract Entity", "Phase Abomination"],
    hooks: [
      "An astronomer's telescope accidentally aligns with an astral anomaly, summoning an abomination into the observatory dome.",
      "Attacking the abomination with physical steel fails; only harmonic sound frequencies can shatter its geometric lattice.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Yuan-ti%20Abomination/YuanTiAbominationMelee%20(1).webp",
  },
  {
    title: "Dimensional Lurker",
    category: "horror-eldritch",
    description:
      "A spindly, insectoid creature that exists primarily in the space between dimensions, visible only out of the corner of the eye.",
    habitat: "Mirror mazes, haunted hallways, and dimensional tear zones.",
    behaviour:
      "Reaches through reflective surfaces to grab victims, pulling them into the mirror realm where their reflections replace them.",
    threatLevel: "Medium",
    variants: ["Mirror Fiend", "Glass Stalker", "Between-Shade"],
    hooks: [
      "People in the manor notice their reflections in mirrors moving a split second too late, smiling maliciously.",
      "Shattering every mirror and glasspane in the room traps the Dimensional Lurker in the physical realm where it can be fought.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Aboleth/AbolethAberration%20(1).webp",
  },
];

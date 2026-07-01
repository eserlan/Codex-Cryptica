import type { CreaturePackEntry } from "../../types.js";

export const horrorUndeadEntries: CreaturePackEntry[] = [
  {
    title: "Vampire Lord",
    category: "horror-undead",
    description:
      "An aristocratic immortal predator possessing hypnotic charm, supernatural strength, and an insatiable thirst for warm blood.",
    habitat:
      "Gothic castles, underground catacombs, and decadent metropolitan manors.",
    behaviour:
      "Controls thralls from the shadows. Beguiles victims before striking at their jugular veins; transforms into mist to escape.",
    threatLevel: "Legendary",
    variants: ["Blood Sovereign", "Nosferatu Elder", "Crimson Count"],
    hooks: [
      "Young nobles in the city are mysteriously disappearing following invitations to a midnight masquerade ball.",
      "To slay the Vampire Lord permanently, investigators must locate its hidden ancestral burial soil.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gnoll%20Pack%20Lord/GnollPackLord%20(1).webp",
  },
  {
    title: "Stalking Wraith",
    category: "horror-undead",
    description:
      "A shadowy apparition born of intense malice and sudden violent death, draining warmth and life essence from the living.",
    habitat: "Haunted ruins, execution courtyards, and misty graveyards.",
    behaviour:
      "Glides silently through solid walls. Extends freezing spectral hands that chill victims to the bone and weaken their vitality.",
    threatLevel: "High",
    variants: ["Shadow Wraith", "Grave Phantom", "Frost Shade"],
    hooks: [
      "An abandoned lighthouse is haunted by the vengeful wraith of a murdered keeper who extinguishes the beacon every storm.",
      "Entering the royal vault awakens ancient stalking wraiths sworn to guard the crown jewels for eternity.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Wraith/Wraith%20(1).webp",
  },
  {
    title: "Cursed Banshee",
    category: "horror-undead",
    description:
      "A sorrowful wailing spirit dressed in tattered mourning gowns whose mournful scream can cause instant cardiac arrest.",
    habitat: "Family burial moors, ruined estates, and lonely peat bogs.",
    behaviour:
      "Wails a terrifying death song before attacking with raking claws. Avoids direct sunlight and holy consecrated ground.",
    threatLevel: "High",
    variants: ["Wailing Maiden", "Moorland Spirit", "Harbinger Shade"],
    hooks: [
      "The patriarch of a prominent family hears the banshee's wail outside his window, signaling an imminent assassination attempt.",
      "Traversing the foggy moors requires ear-plugs or magical silence wards to survive the banshee's shriek.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Banshee/BansheeCoast%20(1).webp",
  },
  {
    title: "Rotting Zombie Horde",
    category: "horror-undead",
    description:
      "A shambling mass of reanimated corpses driven only by a primitive, ravenous hunger for fresh organic flesh.",
    habitat: "Plague-stricken villages, mass graves, and crypt corridors.",
    behaviour:
      "Surrounds victims through sheer numerical superiority. Ignores pain and loss of limbs until the cranial cavity is destroyed.",
    threatLevel: "Low",
    variants: ["Plague Walkers", "Graveyard Shamblers", "Marsh Zombies"],
    hooks: [
      "A necromancer's curse awakens the town cemetery, trapping survivors inside the fortified tavern.",
      "The party must fight their way through a barricaded bridge choked with hundreds of shambling zombies.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Zombie/ZombieElfMale%20(1).webp",
  },
  {
    title: "Graveyard Skeleton Warrior",
    category: "horror-undead",
    description:
      "An animated frame of yellowed bone wielding rusted iron swords and wooden shields held together by dark necromancy.",
    habitat: "Ancient battlefields, tomb vaults, and ossuaries.",
    behaviour:
      "Fights in silent, disciplined formations. Reassembles broken bones unless shattered by bludgeoning weapons or holy fire.",
    threatLevel: "Low",
    variants: ["Tomb Guard", "Bone Legionnaire", "Ossuary Knight"],
    hooks: [
      "Disturbing the sarcophagus in the crypt triggers mechanical pressure plates that awaken dozens of skeleton warriors.",
      "An unholy relic placed atop the cathedral tower is continuously animating skeletons from the adjacent boneyard.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Skeleton/SkeletonBow%20(1).webp",
  },
  {
    title: "Ancient Mummy Sovereign",
    category: "horror-undead",
    description:
      "A withered monarch wrapped in embalming linens inscribed with hieroglyphic curses, wielding dark divine magic.",
    habitat: "Pyramid tombs, desert sepulchers, and museum exhibit halls.",
    behaviour:
      "Inflicts a wasting rot curse with its touch. Commands swarms of desert locusts and suffocating sandstorms.",
    threatLevel: "High",
    variants: ["Pharaoh Lord", "Tomb Sovereign", "Cursed Mummy"],
    hooks: [
      "Archaeologists opening a sealed golden sarcophagus unleash a mummy sovereign determined to reclaim its stolen canopic jars.",
      "A museum curator falls ill with mummy rot after acquiring an ancient jewelers amulet.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mummy/Mummy%20(1).webp",
  },
  {
    title: "Vengeful Ghost",
    category: "horror-undead",
    description:
      "The translucent spirit of someone wronged in life, bound to the physical realm until its tragic mystery is resolved.",
    habitat: "Victorian mansions, old attics, and scene-of-the-crime rooms.",
    behaviour:
      "Telekinetically hurls heavy furniture and shatters mirrors. Manipulates lights and temperature to terrorize intruders.",
    threatLevel: "Medium",
    variants: ["Poltergeist", "Restless Spirit", "Manor Ghost"],
    hooks: [
      "The ghost of a wrongfully condemned maid haunts the manor until the party uncovers the true murderer's confession journal.",
      "A poltergeist violently prevents anyone from entering the locked cellar where its physical remains were hidden.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghost/Ghost%20(1).webp",
  },
  {
    title: "Shadow Stalker",
    category: "horror-undead",
    description:
      "A two-dimensional silhouette composed of living darkness that merges with ordinary shadows to stalk unsuspecting prey.",
    habitat: "Dark alleyways, unlit dungeons, and subterranean ruins.",
    behaviour:
      "Detaches from the wall behind victims to strike at their own shadow, draining physical strength with every blow.",
    threatLevel: "Medium",
    variants: ["Lurking Shade", "Umbral Stalker", "Darkness Fiend"],
    hooks: [
      "In the unlit mine shafts, miners report their own shadows moving independently and attacking them.",
      "Torches and lanterns mysteriously flicker out whenever a Shadow Stalker approaches within fifty feet.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Shadow/Shadow%20(1).webp",
  },
  {
    title: "Weeping Maiden",
    category: "horror-undead",
    description:
      "An unliving construct or spirit taking the form of a veiled marble statue that moves only when unobserved.",
    habitat: "Cemetery gardens, overgrown courtyards, and forgotten chapels.",
    behaviour:
      "Freezes motionless when looked at directly. Crosses distances instantly when blinked at, strangling victims with stone hands.",
    threatLevel: "High",
    variants: ["Marble Stalker", "Veiled Angel", "Stone Weeper"],
    hooks: [
      "Navigating the overgrown cemetery maze requires the party to maintain constant eye contact with the weeping maidens lining the path.",
      "A wealthy collector brought a stone maiden into his art gallery; by morning, all the security guards were found strangled.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Vampire%20Spawn/VampireSpawnDragonborn%20(1).webp",
  },
  {
    title: "Spectral Knight",
    category: "horror-undead",
    description:
      "The phantom armor and glowing spectral essence of an ancient champion bound by oath to guard a sacred site.",
    habitat: "Ruined keeps, mountain passes, and royal shrines.",
    behaviour:
      "Challenges intruders to honorable formal duels. Wields a greatsword forged of ghostly blue flame.",
    threatLevel: "High",
    variants: ["Oath-Bound Phantom", "Ghostly Paladin", "Keep Guardian"],
    hooks: [
      "To claim the legendary sword from the altar, an investigator must defeat the Spectral Knight without resorting to trickery.",
      "The Spectral Knight warns the party of a far greater evil awakening beneath the ruined castle floorstones.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Knight/Knight%20(1).webp",
  },
];

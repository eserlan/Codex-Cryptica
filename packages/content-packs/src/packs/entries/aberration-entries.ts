import type { CreaturePackEntry } from "../../types.js";

export const aberrationEntries: CreaturePackEntry[] = [
  {
    title: "Beholder",
    category: "aberration",
    description:
      "A floating orb of paranoid alien intelligence dominated by a central anti-magic eye and crowned with eyestalks shooting lethal rays.",
    habitat: "Deep underdark caverns, carved stone lairs, and astral ruins.",
    behaviour:
      "Paranoid and megalomaniacal. Suppresses enemy magic with its central eye while firing disintegration, petrification, and charm rays.",
    threatLevel: "High",
    variants: ["Death Tyrant", "Spectator", "Eye of the Deep"],
    hooks: [
      "A subterranean thieves' guild is secretly controlled by a paranoid beholder who communicates through mind-controlled proxies.",
      "To recover an ancient artifact, heroes must navigate vertical shafts carved by disintegration rays inside the eye tyrant's lair.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Beholder%20Zombie/BeholderZombie%20(1).webp",
  },
  {
    title: "Mind Flayer",
    category: "aberration",
    description:
      "A humanoid horror with octopus-like tentacles surrounding its lamprey mouth, possessing psionic power to enslave minds and consume brains.",
    habitat:
      "Subterranean cities, alien nautiloid ships, and deep Underdark colonies.",
    behaviour:
      "Stuns entire groups with psychic blasts before using tentacles to extract and devour brains. Rules over thralls.",
    threatLevel: "High",
    variants: ["Ulitharid", "Alhoon", "Elder Brain Proxy"],
    hooks: [
      "Miners are returning from the deep shafts with vacant stares, speaking in unison about the 'Grand Chorus' below.",
      "A captive mind flayer offers psionic secrets to anyone willing to help it sever its connection to its colony's elder brain.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mindflayer/Mindflayer%20(1).webp",
  },
  {
    title: "Chuul",
    category: "aberration",
    description:
      "An amphibious crustacean horror with massive crushing pincers and a face paralyzed by writhing paralyzing tentacles.",
    habitat: "Submerged temple ruins, underground lakes, and dark swamps.",
    behaviour:
      "Lurks in murky shallows to snap prey in armored pincers before pressing paralyzing facial tentacles against their flesh.",
    threatLevel: "Medium",
    variants: ["Abyssal Chuul", "Deep-Lake Lurker", "Armored Temple-Guard"],
    hooks: [
      "Explorers diving into the flooded temple vault are being dragged into underwater burrows by armored horrors.",
      "Chuuls gather glowing magic items from their victims, hoarding them in underwater altars to forgotten alien gods.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Chuul/Chuul%20(1).webp",
  },
  {
    title: "Gibbering Mouther",
    category: "aberration",
    description:
      "An amorphous blob of shifting eyes and babbling mouths that drives listeners mad with incessant cacophony.",
    habitat: "Dungeon sewers, subterranean sewers, and asylum basements.",
    behaviour:
      "Melts the ground around it into sticky dough while babbling insanely to confuse foes, before biting and absorbing them.",
    threatLevel: "Low",
    variants: ["Abyssal Mouther", "Sewer Cacophony", "Madness Ooze"],
    hooks: [
      "The screams coming from the asylum basement aren't the patients—it's a gibbering mouther formed from magical runoff.",
      "Anyone who listens to the mouther's babble for too long begins hearing secrets about their own future death.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gibbering%20Mouther/GibberingMouther%20(1).webp",
  },
  {
    title: "Carrion Crawler",
    category: "aberration",
    description:
      "A subterranean centipede ten feet long whose facial tentacles secrete a fast-acting paralyzing mucus.",
    habitat: "Dungeon refuse pits, sewer networks, and battlefield graveyards.",
    behaviour:
      "Scuttles across walls and ceilings to whip paralyzing tentacles across victims before feasting leisurely on the immobilized prey.",
    threatLevel: "Low",
    variants: [
      "Plague Crawler",
      "Enormous Sewer-Scavenger",
      "Deep-Cave Centipede",
    ],
    hooks: [
      "The city sewer maintenance crew disappeared near the central midden; their tools lie covered in sticky paralyzing slime.",
      "Alchemists pay well for uncoagulated carrion crawler mucus to brew non-lethal paralytic blade coatings.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Carrion%20Crawler/CarrionCrawler%20(1).webp",
  },
  {
    title: "Aboleth",
    category: "aberration",
    description:
      "A primordial amphibian leviathan with psionic mastery and ancestral memories dating back to before the gods were born.",
    habitat:
      "Sunken subterranean seas, forgotten flooded ruins, and deep ocean trenches.",
    behaviour:
      "Enslaves minds from miles away telepathically. Transmutes victims' skin with clear slime so they can only breathe underwater.",
    threatLevel: "High",
    variants: ["Overseer Aboleth", "Deep-Sea Primordial", "Slime Lord"],
    hooks: [
      "An entire coastal village has begun walking into the sea at midnight to serve an ancient mind lurking in the bay.",
      "The aboleth knows the forgotten secret weakness of the demon king, but demands an eternity of servitude in exchange.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Aboleth/AbolethEel%20(1).webp",
  },
  {
    title: "Cloaker",
    category: "aberration",
    description:
      "A shadow-dwelling horror resembling a dark leather cloak or tapestry that flies silently to wrap around victims.",
    habitat: "Dungeon wardrobes, shadowy caverns, and abandoned noble halls.",
    behaviour:
      "Hang motionless on walls until prey approaches, then envelops them to suffocate while emitting Moaning infrasound that causes panic.",
    threatLevel: "Medium",
    variants: ["Shadow Cloaker", "Vampiric Tapestry", "Deep Cave Shroud"],
    hooks: [
      "A wealthy noble bought an ancient black velvet cloak from a mysterious merchant, only to be found suffocated in his dressing room.",
      "Exploring the dark wardrobe room requires poking every hanging tapestry with long spears before entering.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Cloaker/Cloaker%20(1).webp",
  },
  {
    title: "Intellect Devourer",
    category: "aberration",
    description:
      "A quadrupedal brain with bestial clawed legs that hunts psychic energy and telepathically hollows out humanoids to wear their bodies.",
    habitat:
      "Mind flayer colonies, dark academic vaults, and subterranean ruins.",
    behaviour:
      "Invisibly stalks targets to consume their intellect psychically, then teleports inside the empty skull to puppet the host body.",
    threatLevel: "Low",
    variants: ["Psionic Crawler", "Puppet Master Brain", "Deep Devourer"],
    hooks: [
      "The captain of the city guard has been acting strangely robotic, retaining his memories but completely lacking human empathy.",
      "A tiny walking brain scurries out of a defeated cultist's shattered skull and tries to burrow into the nearest wizard.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Intellect%20Devourer/IntellectDevourer%20(1).webp",
  },
  {
    title: "Nothic",
    category: "aberration",
    description:
      "A cursed, hunched cyclopean scholar transformed by forbidden arcane secrets, possessing a single glowing eye that plunders secrets.",
    habitat: "Arcane ruins, library sub-basements, and magical academies.",
    behaviour:
      "Peers into the minds of intruders using its weird eye to steal dark secrets and leverage them for magical trinkets or fresh meat.",
    threatLevel: "Low",
    variants: ["Arcane Stalker", "Eye of Secrets", "Cursed Scholar"],
    hooks: [
      "A nothic living under the magic academy whispers embarrassing secrets about the professors to students who feed it cured meats.",
      "The party must bargain with a subterranean nothic to learn the password to the archmage's vault.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Nothic/Nothic%20(1).webp",
  },
  {
    title: "Otyugh",
    category: "aberration",
    description:
      "A bloated three-legged garbage eater with vine-like tentacles ending in spiked pads and a vine stalk bearing three eyes.",
    habitat: "Dungeon cesspools, city sewers, and refuse heaps.",
    behaviour:
      "Submerges itself in filth with only its eyestalk protruding. Grabs passing creatures with tentacles to drag them into its rotting maw.",
    threatLevel: "Medium",
    variants: ["Plague Lord Otyugh", "Sewer Behemoth", "Filth Crawler"],
    hooks: [
      "A sentient otyugh living in the royal sewer hub acts as an underworld information broker in exchange for gourmet garbage.",
      "Clearing a blockage in the aqueduct requires negotiating or battling a territorial otyugh that has made the valve its home.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mindflayer%20Arcanist/MindflayerArcanist%20(1).webp",
  },
  {
    title: "Grell",
    category: "aberration",
    description:
      "A floating brain-like carnivore crowned with a sharp parrot beak and dangling poisonous, venomous tentacles.",
    habitat: "Vertical dungeon shafts, cavern ceilings, and underdark chasms.",
    behaviour:
      "Silently floats down from above to paralyze victims with venomous tentacles before floating back up into inaccessible shafts to dine.",
    threatLevel: "Low",
    variants: ["Colony Grell", "Venom-Brain", "Chasm Stalker"],
    hooks: [
      "Climbing the endless spiral staircase is perilous because grells lurk in the dark central shaft waiting to snatch climbers.",
      "A grell patriarch commands a flock of floaters ambushing underdark trade caravans from stalactite forests.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Grell/Grell%20(1).webp",
  },
  {
    title: "Hook Horror",
    category: "aberration",
    description:
      "A bipedal subterranean beast covered in thick beetle carapace, speaking in clicking echolocation and wielding massive scythe-like hooks.",
    habitat: "Underdark cavern networks, rocky gorges, and deep mines.",
    behaviour:
      "Communicates across miles by clicking against stone walls. Ambushes from cavern ledges, eviscerating foes with bone hooks.",
    threatLevel: "Medium",
    variants: ["Carapace Juggernaut", "Deep Clicker", "Cavern Scythe"],
    hooks: [
      "Rhythmic clicking echoing through the mine shafts signals that a hunting pack of hook horrors has surrounded the party.",
      "Dwarven smiths prize hook horror carapace for crafting lightweight, sound-dampening underground armor.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hook%20Horror/HookHorror%20(1).webp",
  },
  {
    title: "Grick",
    category: "aberration",
    description:
      "A worm-like subterranean ambush predator with rubbery rubbery hide, four writhing facial tentacles, and a snapping parrot beak.",
    habitat: "Rocky crevices, rubble heaps, and dark mine corridors.",
    behaviour:
      "Blends perfectly into stone rubble until prey walks past, then strikes to entangle with tentacles and crush with its beak.",
    threatLevel: "Low",
    variants: ["Grick Alpha", "Stone-Skin Worm", "Deep Crevice Lurker"],
    hooks: [
      "What looked like a pile of broken mining tools suddenly writhes to life as a nest of hungry gricks.",
      "An alpha grick the size of a wagon has blocked the escape tunnel from the collapsing dungeon.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mindflayer%20Arcanist/MindflayerArcanist%20(1).webp",
  },
  {
    title: "Ettercap",
    category: "aberration",
    description:
      "A bipedal spider-folk shepherd that tends swarms of giant arachnids and spins elaborate web traps across forest trails.",
    habitat: "Web-choked forests, shadowy gorges, and insect-infested ruins.",
    behaviour:
      "Sets tripwire garrotes and pit traps before ordering giant spiders to swarm entangled victims while snipe-spitting silk.",
    threatLevel: "Low",
    variants: ["Webmaster", "Venom Shepherd", "Arachnid Lord"],
    hooks: [
      "The eastern woods have become impassable; thick canopy webbing blocks the sun and ettercaps patrol the trails.",
      "An ettercap has captured a druid and is slowly wrapping her in silk to serve as a host for spider brood.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ettercap/Ettercap%20(1).webp",
  },
  {
    title: "Flumph",
    category: "aberration",
    description:
      "A benevolent, jellyfish-like floating aberration that feeds on psionic energy and glows softly in the dark.",
    habitat: "Underdark sanctuaries, psionic nodes, and cavern ceilings.",
    behaviour:
      "Peaceful and curious. Emits foul-smelling spray when threatened while telepathically warning travelers of nearby psychic horrors.",
    threatLevel: "Low",
    variants: [
      "Psionic Beacon Flumph",
      "Deep Sanctuary Flumph",
      "Glow-Drifter",
    ],
    hooks: [
      "A timid flumph drifts down to warn the heroes that a mind flayer hunting party is right behind them.",
      "The monks of the deep monastery keep a colony of glowing flumphs as companions and detectors of evil telepathy.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Flumph/Flumph%20(1).webp",
  },
  {
    title: "Destrachan",
    category: "aberration",
    description:
      "A blind, bipedal subterranean reptile with tubular ears that blasts destructive harmonic sonic waves to shatter stone and flesh.",
    habitat: "Resonant caverns, crystal mines, and underdark highways.",
    behaviour:
      "Uses echolocation to see. Tunes its sonic blasts to harmonize with steel armor or stone walls, causing them to shatter.",
    threatLevel: "Medium",
    variants: ["Sonic Stalker", "Resonance Beast", "Crystal Shatterer"],
    hooks: [
      "A destrachan is stalking the party through crystal caverns, using sonic pulses to trigger devastating glass avalanches.",
      "The creature's sonic organ can be harvested to craft a magical horn capable of breaching castle gates.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mindflayer%20Arcanist/MindflayerArcanist%20(1).webp",
  },
  {
    title: "Choker",
    category: "aberration",
    description:
      "A small, rubbery aberration with rubbery limbs that stretch astonishing distances to strangle victims from ceiling corners.",
    habitat: "Dungeon archways, sewer pipes, and ruined alcoves.",
    behaviour:
      "Elongates its arms down from dark ceiling nooks to grab victims by the throat, lifting and strangling them in silence.",
    threatLevel: "Low",
    variants: ["Rubbery Strangler", "Sewer Lurker", "Deep Archway Choker"],
    hooks: [
      "The rearguard mercenary was lifted silently into the dark archway above; only his dropped torch remained on the floor.",
      "Chokers hoard shiny trinkets in tight ceiling crevices too small for armored humanoids to reach.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mindflayer%20Arcanist/MindflayerArcanist%20(1).webp",
  },
  {
    title: "Neogi",
    category: "aberration",
    description:
      "An eel-like slave trader resembling a furry spider with an eel neck, using mind control to command hulking umber hulk bodyguards.",
    habitat:
      "Spelljammer wrecks, Underdark slave markets, and planar outposts.",
    behaviour:
      "Cowardly when alone. Uses venomous bites to enslave minds while ordering enslaved umber hulks to tear attackers apart.",
    threatLevel: "Medium",
    variants: ["Neogi Master", "Slave Lord", "Spider-Eel Slaver"],
    hooks: [
      "A neogi slave caravan guarded by mind-controlled ogres is passing through the lower tunnels carrying captured elves.",
      "Defeating a neogi master breaks the psychic leash on his umber hulk bodyguard, sending it into a blind rampage.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mindflayer%20Arcanist/MindflayerArcanist%20(1).webp",
  },
  {
    title: "Star Spawn",
    category: "aberration",
    description:
      "Eldritch emissaries from deep cosmic space, possessing shifting geometries that defy mortal sanity and physical law.",
    habitat: "Crater impact sites, astrology towers, and dimensional rifts.",
    behaviour:
      "Twists gravity and psychic energy around them. Fights with erratic teleportation and mind-shattering psychic pulses.",
    threatLevel: "High",
    variants: ["Cosmic Hulk", "Void Seer", "Dimensional Grue"],
    hooks: [
      "A meteor struck the mountain observatory; now shifting star spawn are reshaping the peak into an alien gateway.",
      "Looking directly at the star spawn requires a saving throw against overwhelming cosmic dread.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Vampire%20Spawn/VampireSpawnElfFemale%20(1).webp",
  },
  {
    title: "Slithering Tracker",
    category: "aberration",
    description:
      "A transparent puddle of sentient plasma formed from the vengeful soul of a wizard who underwent a failed transformation.",
    habitat: "Dungeon floors, wet cobblestones, and wizard laboratories.",
    behaviour:
      "Flows silently under doors and through cracks. Flows over a sleeping victim to paralyze and drain their bodily fluids.",
    threatLevel: "Low",
    variants: ["Plasma Stalker", "Vengeful Slime", "Transparent Assassin"],
    hooks: [
      "A locked room murder leaves a desiccated corpse but no footprints; a wet shimmer on the floorboards points to the killer.",
      "A slithering tracker is hunting the descendants of the wizard guild that betrayed it centuries ago.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mindflayer%20Arcanist/MindflayerArcanist%20(1).webp",
  },
];

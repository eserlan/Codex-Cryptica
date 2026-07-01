import type { CreaturePackEntry } from "../../types.js";

export const elementalEntries: CreaturePackEntry[] = [
  {
    title: "Fire Elemental",
    category: "elemental",
    description:
      "A dancing, crackling pillar of living flame summoned from the Elemental Plane of Fire that incinerates anything it touches.",
    habitat: "Volcanic calderas, wizard furnaces, and desert fire-rifts.",
    behaviour:
      "Glides effortlessly across terrain setting wooden structures ablaze. Engulfs enemies in swirling vortexes of extreme heat.",
    threatLevel: "Medium",
    variants: ["Living Inferno", "Magma Pillar", "Ember Lord"],
    hooks: [
      "An experimental forge in the dwarven district cracked open, releasing a raging fire elemental into the coal storage.",
      "Splashing cold water on a fire elemental creates a blinding cloud of scalding steam across the battlefield.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fire%20Elemental/FireElemental%20(1).webp",
  },
  {
    title: "Water Elemental",
    category: "elemental",
    description:
      "A swirling cresting wave of sentient water capable of sweeping up humanoids and drowning them within its liquid core.",
    habitat: "Submerged ruins, ocean vortexes, and ancient aqueducts.",
    behaviour:
      "Flows over obstacles and through narrow grates. Engulfs foes in a whirlpool vortex to batter and suffocate them.",
    threatLevel: "Medium",
    variants: ["Tidal Juggernaut", "Brine Lord", "River Vortex"],
    hooks: [
      "A water elemental guarding the temple fountain will only permit passage to those who offer a pure unblemished pearl.",
      "Freezing spells cast on a water elemental temporarily solidify its outer shell, slowing its movements significantly.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Water%20Elemental/WaterElementalSea%20(1).webp",
  },
  {
    title: "Earth Elemental",
    category: "elemental",
    description:
      "A lumbering humanoid colossus formed from jagged stone, soil, and crystal veins that glides through solid rock like water.",
    habitat: "Deep mines, mountain hearts, and earth-node circles.",
    behaviour:
      "Earth-glides through cavern walls to ambush miners from below. Pounds foes with stone fists that shatter shields and bone.",
    threatLevel: "Medium",
    variants: ["Granite Behemoth", "Crystal Colossus", "Mud Juggernaut"],
    hooks: [
      "Deep excavation broke into a sacred earth geode, awakening an angry stone elemental that is sealing up the mine exits.",
      "Striking an earth elemental with adamantine pickaxes causes chunks of valuable gem-studded ore to break off its frame.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Earth%20Elemental/EarthElemental%20(1).webp",
  },
  {
    title: "Air Elemental",
    category: "elemental",
    description:
      "A howling, funneling cyclone of roaring wind capable of lifting warriors off their feet and flinging them across rooms.",
    habitat: "Mountain peaks, cloud palaces, and storm towers.",
    behaviour:
      "Flies with blinding speed. Traps enemies inside its spinning whirlwind core before flinging them against stone walls.",
    threatLevel: "Medium",
    variants: ["Whirlwind Lord", "Cyclone Sentinel", "Zephyr Stalker"],
    hooks: [
      "An air elemental trapped inside a magical windmill is spinning the grain stones so fast they are throwing off sparks.",
      "Ranged arrows are deflected helplessly aside by the violent circular winds surrounding the elemental.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Air%20Elemental/AirElementalDessert%20(1).webp",
  },
  {
    title: "Salamander",
    category: "elemental",
    description:
      "A serpentine elemental humanoid sporting a bronze torso wielding a heated spear, trailing a long smoldering snake tail.",
    habitat: "Magma rivers, volcanic forges, and brass citadels.",
    behaviour:
      "Constricts prey in its superheated metallic tail while thrusting with spears that ignite whatever they pierce.",
    threatLevel: "Medium",
    variants: ["Noble Salamander", "Magma Serpent", "Flame-Spear Master"],
    hooks: [
      "Efreeti slavers use salamanders as blacksmiths and guards inside their volcanic obsidian fortress.",
      "The metal spear of a salamander remains white-hot for an hour after the creature is slain.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Salamander/Salamander%20(1).webp",
  },
  {
    title: "Xorn",
    category: "elemental",
    description:
      "A bizarre three-legged barrel-shaped elemental with three arms and three eyes spaced around a gaping grinding top mouth.",
    habitat: "Subterranean jewel veins and elemental earth pockets.",
    behaviour:
      "Glides through stone searching for gold and gemstones to eat. Begs adventurers for snacks of silver and rubies.",
    threatLevel: "Low",
    variants: ["Jewel-Eater", "Tri-Symmetric Earth-Glider", "Deep Gem-Lurker"],
    hooks: [
      "A xorn emerges from the dungeon wall smelling the wizard's bag of diamonds and persistently follows the party begging for treats.",
      "Feeding a xorn a magical ruby causes it to happily guide the party directly to the richest undiscovered ore vein nearby.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fire%20Elemental/FireElemental%20(1).webp",
  },
  {
    title: "Invisible Stalker",
    category: "elemental",
    description:
      "A permanently invisible air elemental bound by powerful summoning magic to track down and slay a specific designated target.",
    habitat: "Anywhere its quarry flees.",
    behaviour:
      "Tracks prey unerringly across continents without resting. Attacks with crushing wind vortices from total invisibility.",
    threatLevel: "Medium",
    variants: ["Air Assassin", "Bound Tracker", "Unseen Slayer"],
    hooks: [
      "A paranoid merchant is being hunted by an unseen force that leaves footprints in spilled flour and slams doors.",
      "The only way to stop an invisible stalker is to kill it or force the wizard who summoned it to rescind the command.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Invisible%20Stalker/InvisibleStalker%20(1).webp",
  },
  {
    title: "Magmin",
    category: "elemental",
    description:
      "A goblin-sized humanoid of glowing magma and obsidian crust that ignites anything it touches and explodes when killed.",
    habitat: "Volcanic vents, alchemical furnaces, and ash wastes.",
    behaviour:
      "Runs gleefully toward wooden objects or enemies to set them on fire. Detonates in a splash of molten lava upon death.",
    threatLevel: "Low",
    variants: ["Magma Goblin", "Lava Popper", "Cinder Imp"],
    hooks: [
      "A swarm of giggling magmins escaped from the smelter and are setting fire to the wooden market stalls along the river.",
      "Striking a magmin in melee splashes burning magma onto the attacker's weapon and hands.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Magmin/Magmin%20(1).webp",
  },
  {
    title: "Gargoyle",
    category: "elemental",
    description:
      "A winged stone construct or earth elemental guardian perched frozen on cathedral eaves until intruders approach within strike reach.",
    habitat: "Gothic rooftops, temple parapets, and dungeon archways.",
    behaviour:
      "Remains motionless as stone until prey passes below, then drops silently to rend with stone claws and horned headbutts.",
    threatLevel: "Low",
    variants: [
      "Obsidian Sentinel",
      "Cathedral Guardian",
      "Winged Stone-Stalker",
    ],
    hooks: [
      "One of the stone gargoyles adorning the city bank is missing its head, matching the stony assailant that robbed the vault.",
      "Gargoyles are immune to non-magical weapons that aren't forged from adamantine.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Gargoyle/Gargoyle%20(1).webp",
  },
  {
    title: "Azer",
    category: "elemental",
    description:
      "A stocky elemental dwarf cast in solid bronze with a flowing beard of living flame, master artisan of the Fire Plane.",
    habitat: "Brass workshops, planar armories, and volcanic mines.",
    behaviour:
      "Fights in disciplined bronze shield walls wielding flaming warhammers. Loyal to their forge masters and bound oaths.",
    threatLevel: "Medium",
    variants: ["Bronze Artisan", "Flame-Bearded Smith", "Planar Guard"],
    hooks: [
      "An azer smith offers to forge an immune-to-fire shield for the heroes if they retrieve pure mithril ore from the deep magma rift.",
      "Azers do not reproduce; each new individual is masterfully sculpted from bronze and imbued with internal fire.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Azer/Azer%20(1).webp",
  },
  {
    title: "Water Weird",
    category: "elemental",
    description:
      "A serpentine guardian elemental bound inside a specific font, pool, or well that lashes out to drown intruders.",
    habitat: "Sacred fountains, temple wells, and dungeon basins.",
    behaviour:
      "Invisible while submerged in water. Rears up as a watery serpent to grapple and pull victims under the surface to drown.",
    threatLevel: "Low",
    variants: ["Font Guardian", "Well Serpent", "Brine Weird"],
    hooks: [
      "Looking into the wishing well reveals a watery serpent peering back up through the coins.",
      "If purified with holy water, a water weird transforms from a malicious drowner into a helpful prophetic oracle.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Water%20Weird/WaterWeird%20(1).webp",
  },
  {
    title: "Djarni",
    category: "elemental",
    description:
      "A noble air spirit riding a flying carpet or whirlwind, wielding a scimitar of condensed lightning and storm breezes.",
    habitat: "Cloud islands, desert oases, and mountain palaces.",
    behaviour:
      "Proud and aristocratic. Conjures illusions and windwalls while fighting with sweeping, lightning-fast scimitar slashes.",
    threatLevel: "High",
    variants: ["Storm Noble", "Whirlwind Knight", "Zephyr Emir"],
    hooks: [
      "A djarni trapped inside an ancient brass oil lamp offers three wishes, but interprets the phrasing with extreme literalism.",
      "The air spirit demands a contest of storytelling before granting passage across the chasm of storms.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fire%20Elemental/FireElemental%20(1).webp",
  },
  {
    title: "Efreeti",
    category: "elemental",
    description:
      "A cruel, domineering fire genie standing twelve feet tall with crimson skin, brass jewelry, and an aura of intense heat.",
    habitat: "City of Brass, volcanic palaces, and desert ruins.",
    behaviour:
      "Enslaves lesser elementals and mortals. Hurl balls of fire and wields giant scimitars forged from blackened meteor iron.",
    threatLevel: "High",
    variants: ["Brass Sultan", "Fire Pasha", "Infernal Genie"],
    hooks: [
      "An efreeti warlord has built a brass fortress around the desert oasis and charges exorbitant slave-tribute for water.",
      "Efreeti consider mortals inferior creatures fit only to serve as entertainment or fuel for their endless planar wars.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fire%20Elemental/FireElemental%20(1).webp",
  },
  {
    title: "Marid",
    category: "elemental",
    description:
      "A capricious, powerful water genie of immense size who views all other creatures as commoners beneath their royal dignity.",
    habitat: "Coral palaces, deep ocean trenches, and elemental vortexes.",
    behaviour:
      "Commands water jets capable of capsizing ships. Demands elaborate flattery and gifts before granting audiences or favors.",
    threatLevel: "High",
    variants: ["Coral Shah", "Tidal Pasha", "Oceanic Genie"],
    hooks: [
      "To obtain the pearl of true sight, the bard must perform a song praising the marid's glorious fins for an entire hour.",
      "A marid has flooded the sunken city to turn it into his personal underwater sculpture garden.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fire%20Elemental/FireElemental%20(1).webp",
  },
  {
    title: "Dao",
    category: "elemental",
    description:
      "A greedy, industrious earth genie adorned in gold and gems who carves subterranean empires using slave labor.",
    habitat: "Crystal caverns, deep planar gem mines, and stone labyrinths.",
    behaviour:
      "Traps foes in stone walls or quicksand pits before crushing them with mauls of solid granite.",
    threatLevel: "High",
    variants: ["Gem Khan", "Stone Pasha", "Earth Genie"],
    hooks: [
      "A dao has purchased the rights to the royal diamond mine from a corrupt vizier and is sealing the entrance with stone walls.",
      "Dao value rare gems above all else and will gladly trade magical secrets for unique unrefined gemstones.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Fire%20Elemental/FireElemental%20(1).webp",
  },
  {
    title: "Mud Mephit",
    category: "elemental",
    description:
      "A impish, complaining elemental prankster formed of dripping mud that sprays blinding sludge at passersby.",
    habitat: "Muddy swamps, sewer outflows, and river banks.",
    behaviour:
      "Belittles enemies with annoying complaints while vomiting blobs of sticky mud to blind and slow warriors.",
    threatLevel: "Low",
    variants: ["Sludge Imp", "Swamp Mephit", "Filth Prankster"],
    hooks: [
      "A trio of mud mephits living under the tavern porch keep tying the patrons' horse reins into muddy knots.",
      "When slain, a mud mephit splatters into a slippery puddle of grease that causes running warriors to fall prone.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Mud%20Mephit/MudMephit%20(1).webp",
  },
  {
    title: "Steam Mephit",
    category: "elemental",
    description:
      "A hissing elemental imp of boiling water vapor that scalds victims with jets of hot steam while screaming frantically.",
    habitat: "Hot springs, alchemical boiler rooms, and volcanic vents.",
    behaviour:
      "Expels clouds of scalding steam to obscure vision and burn exposed skin before darting away on vaporous wings.",
    threatLevel: "Low",
    variants: ["Vapor Imp", "Boiler Mephit", "Geyser Sprite"],
    hooks: [
      "The city bathhouse has been taken over by steam mephits who crank the boiler heat up to lethal temperatures.",
      "Steam mephits leave no corpse upon death, dissolving entirely into a harmless cloud of warm mist.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Steam%20Mephit/SteamMephit%20(1).webp",
  },
  {
    title: "Ice Mephit",
    category: "elemental",
    description:
      "A sharp-featured imp carved from blue glacial ice that exhales cones of frost and complains bitterly about warmth.",
    habitat: "Meat freezers, glacial crevasses, and winter cellars.",
    behaviour:
      "Exhales freezing breath to coat floorboards in slippery ice, laughing merrily when heavily armored knights slip and fall.",
    threatLevel: "Low",
    variants: ["Frost Imp", "Glacial Mephit", "Icicle Sprite"],
    hooks: [
      "An ice mephit trapped inside the butcher's cold storage has frozen all the winter meat supplies into solid stone blocks.",
      "Shattering an ice mephit causes sharp icicle shards to explode outward in all directions.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ice%20Mephit/IceMephit%20(1).webp",
  },
  {
    title: "Magma Mephit",
    category: "elemental",
    description:
      "A glowing, ember-dripping imp composed of molten rock that radiates heat and spits blobs of liquid lava.",
    habitat: "Forge chimneys, lava tubes, and volcano rims.",
    behaviour:
      "Spits small globs of molten lava at combustible clothing before hiding inside forge fires to regenerate.",
    threatLevel: "Low",
    variants: ["Lava Imp", "Ember Mephit", "Slag Sprite"],
    hooks: [
      "A magma mephit is living inside the blacksmith's forge, heating the iron so hot that swords melt during hammering.",
      "Dropping a magma mephit into cold water causes it to harden into a brittle stone statue for ten minutes.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Magma%20Mephit/MagmaMephit%20(1).webp",
  },
  {
    title: "Dust Mephit",
    category: "elemental",
    description:
      "A gaunt, coughing imp composed of dry desert dust and grit that creates irritating blinding dust storms.",
    habitat: "Attics, dusty tombs, and desert ruins.",
    behaviour:
      "Blinds foes with puffs of irritating sand before scratching with grit-coated claws while hacking and coughing.",
    threatLevel: "Low",
    variants: ["Sand Imp", "Grit Mephit", "Tomb Dust-Sprite"],
    hooks: [
      "Opening the ancient sarcophagus released a coughing dust mephit that immediately blew out the party's lantern.",
      "Dust mephits are easily bribed with sips of clean water, which they absorb greedily into their dry frames.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Dust%20Mephit/DustMephit%20(1).webp",
  },
];

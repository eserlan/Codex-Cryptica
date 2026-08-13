import type { CreaturePackEntry } from "../../types.js";

export const steampunkFrontierEntries: CreaturePackEntry[] = [
  {
    title: "Desert Wendigo",
    category: "steampunk-frontier",
    description:
      "A gaunt, antlered spirit of starvation roaming arid canyon badlands during freezing desert nights.",
    habitat: "Isolated frontier outposts, mountain passes, and desert canyons.",
    behaviour:
      "Mimics human voices crying for help in the dark to lure guards away from campfires before tearing them apart.",
    threatLevel: "High",
    variants: ["Canyon Wendigo", "Badlands Spirit", "Hunger Demon"],
    hooks: [
      "A stagecoach carrying silver bullion arrives at the waystation with the horses exhausted and all passengers missing.",
      "The Wendigo cannot step within the circle of light cast by a lantern fueled with pure consecrated oil.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bandit%20Captain/BanditCaptainDragonbornArctic%20(1).webp",
  },
  {
    title: "Canyon Skinwalker",
    category: "steampunk-frontier",
    description:
      "A shapeshifting dark shaman capable of assuming the form of coyotes, wolves, or crows to stalk frontier travelers.",
    habitat: "Red rock mesas, desert highways, and native burial grounds.",
    behaviour:
      "Runs alongside galloping horses at unnatural speeds. Transforms into human form to deliver curses or shoot poisoned arrows.",
    threatLevel: "Medium",
    variants: ["Mesa Shapeshifter", "Coyote Shaman", "Badlands Stalker"],
    hooks: [
      "A mysterious coyote follows the party's wagon train for three days, disappearing whenever someone points a rifle at it.",
      "Silver bullets or weapons blessed by tribal elders are required to pierce the Skinwalker's supernatural hide.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bandit%20Captain/BanditCaptainDragonbornArctic%20(1).webp",
  },
  {
    title: "Mine-Dwelling Crawler",
    category: "steampunk-frontier",
    description:
      "Blind, pale subterranean humanoids descended from trapped miners who adapted to life in pitch-black silver mines.",
    habitat: "Abandoned mine shafts, deep caverns, and subterranean streams.",
    behaviour:
      "Uses echolocation to hunt in total darkness. Ambushes miners by dropping from timber support ceilings.",
    threatLevel: "Low",
    variants: ["Deep Miner", "Blind Crawler", "Pit Lurker"],
    hooks: [
      "Miners refuse to enter the lower levels after hearing eerie tapping noises echoing along the rails.",
      "Bright flashes of light from flares or dynamite blasts temporarily blind and disorient the crawlers.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Carrion%20Crawler/CarrionCrawler%20(1).webp",
  },
  {
    title: "Frontier Outlaw Captain",
    category: "steampunk-frontier",
    description:
      "A ruthless gang leader wearing a reinforced iron chest plate under a duster coat, wielding dual steam-assisted revolvers.",
    habitat: "Saloon hideouts, desert box canyons, and railroad water towers.",
    behaviour:
      "Orders gang members to flank while drawing fire. Uses quick-draw steam revolvers to lay down rapid bursts of gunfire.",
    threatLevel: "Medium",
    variants: ["Desperado Chief", "Iron-Vest Outlaw", "Canyon Bandit King"],
    hooks: [
      "The Frontier Outlaw Captain has placed a five-thousand dollar bounty on the party's heads payable in gold dust.",
      "A shootout erupts in the middle of the frontier town saloon just as the high-noon train blows its whistle.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hobgoblin%20Captain/HobgoblinCaptainArmy%20(1).webp",
  },
  {
    title: "Alchemy-Spliced Chimera",
    category: "steampunk-frontier",
    description:
      "A monstrous hybrid creature created by runaway traveling snake-oil salesmen combining cougar, rattlesnake, and bear DNA.",
    habitat:
      "Abandoned traveling carnivals, badlands scrub, and foothill forests.",
    behaviour:
      "Strikes with rattlesnake fangs while mauling with bear claws. Enters an alchemically induced rage when injured.",
    threatLevel: "High",
    variants: ["Snake-Oil Monster", "Badlands Chimera", "Spliced Beast"],
    hooks: [
      "A traveling medicine show wagon crashed off the canyon road, releasing the alchemist's secret exhibition beast into the wild.",
      "The alchemist's journal contains the formula for a chemical neutralizing spray that weakens the chimera's metabolism.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Chimera/Chimera%20(1).webp",
  },
  {
    title: "Rattlesnake Horror",
    category: "steampunk-frontier",
    description:
      "A gigantic thirty-foot serpent with metallic scales and a tail rattle loud enough to shatter glass and cause disorientation.",
    habitat: "Rocky outcrops, desert salt flats, and abandoned mine entrances.",
    behaviour:
      "Shake its deafening rattle to paralyze prey with sonic vibrations before striking with venomous fangs as long as cavalry sabers.",
    threatLevel: "Medium",
    variants: ["Sonic Rattler", "Iron-Scale Serpent", "Canyon King Snake"],
    hooks: [
      "The sonic vibration of the Rattlesnake Horror's tail triggers a rockslide that traps the party in a narrow box canyon.",
      "The snake's venom is prized by frontier doctors as a potent coagulant for treating severe gunshot wounds.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hook%20Horror/HookHorror%20(1).webp",
  },
  {
    title: "Prairie Stalker",
    category: "steampunk-frontier",
    description:
      "A fast, bipedal predatory bird standing six feet tall with razor-sharp beak and disemboweling toe talons.",
    habitat: "Tall grass prairies, open plains, and river valleys.",
    behaviour:
      "Hunts in packs across open plains. Uses tall prairie grass for concealment before ambushing horses and cattle.",
    threatLevel: "Low",
    variants: ["Terror Bird", "Plains Runner", "Sickle-Claw Bird"],
    hooks: [
      "A pack of Prairie Stalkers spooks the cattle herd, starting a massive stampede heading directly toward the railroad campsite.",
      "Ranchers offer a bounty for every pair of Prairie Stalker talons brought to the sheriff's office.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Invisible%20Stalker/InvisibleStalker%20(1).webp",
  },
  {
    title: "Silver-Mine Ghost",
    category: "steampunk-frontier",
    description:
      "The glowing blue apparition of a deceased prospector holding a spectral pickaxe and lantern.",
    habitat:
      "Rich silver veins, flooded mine shafts, and ruined assay offices.",
    behaviour:
      "Misleads miners down dead-end tunnels or triggers phantom collapses. Swings its chilling spectral pickaxe at trespassers.",
    threatLevel: "Medium",
    variants: ["Prospector Shade", "Claim Ghost", "Phantom Miner"],
    hooks: [
      "The ghost refuses to let anyone mine the richest silver vein until its stolen claim deed is returned to its descendants.",
      "Following the ghost's lantern light through the flooded mine leads the party to a hidden vein of pure silver.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Ghost/Ghost%20(1).webp",
  },
  {
    title: "Train-Robbing Bandit",
    category: "steampunk-frontier",
    description:
      "Masked horsemen equipped with grappling hooks, dynamite sticks, and repeating lever-action rifles.",
    habitat: "Railroad tracks, mountain tunnels, and badlands hideouts.",
    behaviour:
      "Boards moving trains from horseback. Uses dynamite to blow safe doors and takes hostages to deter armed guards.",
    threatLevel: "Low",
    variants: ["Rail Raider", "Dynamite Bandit", "Masked Horseman"],
    hooks: [
      "Bandits blow the train tracks ahead, forcing the locomotive to screech to a halt inside a narrow mountain gorge.",
      "The party must defend the express car's safe containing the payroll gold while bandits storm the train roofs.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Bandit/BanditElfUrbanMaleMelee%20(1).webp",
  },
  {
    title: "Mechanical Hound",
    category: "steampunk-frontier",
    description:
      "A tracking robot built of iron pipes, spring legs, and an acoustic tracking horn mounted on its snout.",
    habitat: "Sheriff kennels, bounty hunter camps, and frontier borders.",
    behaviour:
      "Runs tirelessly across rough terrain without needing water or rest. Bays a loud brass siren when closing in on quarry.",
    threatLevel: "Low",
    variants: ["Iron Bloodhound", "Tracker Bot", "Spring-Leg K-9"],
    hooks: [
      "A relentless Pinkerton bounty hunter sets a pair of Mechanical Hounds on the party's trail across the badlands.",
      "Disabling the hound's acoustic tracking horn leaves it wandering aimlessly in circles.",
    ],
    image:
      "https://raw.githubusercontent.com/IsThisMyRealName/too-many-tokens-dnd/main/Hellhound/Hellhound%20(1).webp",
  },
];

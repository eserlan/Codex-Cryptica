/**
 * Local-fallback content for the One-Shot Adventure Builder. Each bucket is a
 * genre family; strings use {patron}, {villain}, {item} and {place}
 * placeholders that the builder fills in. System-neutral: no DCs, stat blocks
 * or rules text.
 */

export interface OneShotSeed {
  places: string[];
  patronRoles: string[];
  villainRoles: string[];
  witnessRoles: string[];
  items: string[];
  hooks: string[];
  complications: string[];
  climaxes: string[];
  truths: string[];
  weaknesses: string[];
  stakes: string[];
  readAloud: string[];
}

export const ONE_SHOT_SEEDS: Record<string, OneShotSeed> = {
  fantasy: {
    places: [
      "the Sunken Chapel",
      "a toll bridge in the mist",
      "the old hill fort",
      "a drowned market",
      "the lamplit crypt",
      "a witch's orchard",
    ],
    patronRoles: ["village reeve", "temple archivist", "worried innkeeper"],
    villainRoles: ["exiled magister", "hollow knight", "charming baron"],
    witnessRoles: ["frightened apprentice", "road warden", "hedge priest"],
    items: ["the Moonlit Seal", "a stolen relic bell", "the reeve's ledger"],
    hooks: [
      "{patron} begs the party to recover {item} before the festival bells ring tomorrow.",
      "{patron} found {item} missing and a stranger's footprints leading to {place}.",
    ],
    complications: [
      "Locals close ranks and will not speak of {place} while strangers are watching.",
      "{villain}'s agents have already been here and left a warning that sounds almost kind.",
      "The road to {place} is blocked, and every detour costs something.",
    ],
    climaxes: [
      "midway through a ritual that will bind {item} to their will",
      "waiting with {item}, ready to bargain, and ready to lie",
    ],
    truths: [
      "{villain} is trying to undo an old wrong, and the cost falls on the village.",
      "{patron} sold {item} years ago and has been hiding the debt.",
    ],
    weaknesses: [
      "the ritual fails if the old bell is rung at the wrong hour",
      "{villain} cannot cross water that has been blessed by the locals",
    ],
    stakes: [
      "the village loses its protection and the harvest festival becomes a funeral",
    ],
    readAloud: [
      "Rain drums on the tavern roof as the door swings open and a hush falls over the room.",
    ],
  },
  scifi: {
    places: [
      "Docking Ring Four",
      "the derelict hydroponics deck",
      "a quarantined research wing",
      "the survey outpost on the ridge",
      "an abandoned relay station",
      "the freight sorting hall",
    ],
    patronRoles: [
      "station quartermaster",
      "grant-funded surveyor",
      "union rep",
    ],
    villainRoles: [
      "rogue systems engineer",
      "corporate fixer",
      "mutinous officer",
    ],
    witnessRoles: ["night-shift technician", "stowaway", "damaged ship AI"],
    items: [
      "the black-box recorder",
      "a sealed core sample",
      "the override keys",
    ],
    hooks: [
      "{patron} hires the party to retrieve {item} before the next resupply window closes.",
      "An automated distress ping from {place} names {patron} as the only person who can open it.",
    ],
    complications: [
      "Station systems start refusing the party's credentials one door at a time.",
      "{villain} has rerouted life support priorities, and the clock is now visible to everyone.",
      "A rival crew arrives at {place} first and claims salvage rights.",
    ],
    climaxes: [
      "at the controls, three minutes from making {item} impossible to recover",
      "barricaded with hostages and {item}, willing to talk until the airlock timer ends",
    ],
    truths: [
      "{villain} is covering up a failure that {patron} signed off on.",
      "{item} shows the incident was deliberate, and the order came from above.",
    ],
    weaknesses: [
      "the override keys also lock {villain} out of the control deck",
      "{villain} depends on a maintenance schedule the party can disrupt",
    ],
    stakes: ["the colony loses its air supply and its only witnesses"],
    readAloud: [
      "The corridor lights stutter, and somewhere below, a pump that should be silent starts to hum.",
    ],
  },
  horror: {
    places: [
      "the Marsh House",
      "a shuttered lighthouse",
      "the cellar under the chapel",
      "the sleeping asylum wing",
      "a fog-bound ferry landing",
      "the church bell tower",
    ],
    patronRoles: ["grieving widow", "local doctor", "nervous constable"],
    villainRoles: [
      "patient thing in the walls",
      "cult's quiet founder",
      "returned drowned man",
    ],
    witnessRoles: [
      "sleepless child",
      "caretaker",
      "ferryman who stopped speaking",
    ],
    items: [
      "the dead man's journal",
      "a locked music box",
      "the founding deed",
    ],
    hooks: [
      "{patron} needs the party to learn what is wrong with {place} before another night passes.",
      "{patron} gives the party {item} and asks them to find out why it is still warm.",
    ],
    complications: [
      "Whatever lives here knows the party's names by the second night.",
      "{villain} offers a tempting bargain through the person least able to refuse.",
      "The only safe room is the one with the most to hide.",
    ],
    climaxes: [
      "at the heart of {place}, finishing what {item} began",
      "wearing the face of someone the party trusts, waiting for dawn to pass",
    ],
    truths: [
      "{villain} is what is left of a promise {patron} made and broke.",
      "The haunting protects something worse that lies beneath {place}.",
    ],
    weaknesses: [
      "{villain} is bound by {item} and weakens when it is spoken over",
      "the thing cannot enter a room that has been honestly named",
    ],
    stakes: ["the town loses its dead and its sleeping, one house at a time"],
    readAloud: [
      "The fog thickens as you reach the door. It is already open, and the hallway beyond is warm.",
    ],
  },
  cyberpunk: {
    places: [
      "a neon-lit noodle bar",
      "the Spire's service levels",
      "a data-clinic in the undercity",
      "a corporate loading dock",
      "the flooded transit hub",
      "a rooftop server farm",
    ],
    patronRoles: ["ex-corp fixer", "street doc", "nervous journalist"],
    villainRoles: [
      "ambitious VP",
      "cold-eyed security chief",
      "rogue AI proxy",
    ],
    witnessRoles: [
      "burned-out courier",
      "freelance netrunner",
      "janitor with access",
    ],
    items: [
      "the encrypted shard",
      "a leaked audit trail",
      "the patient's implant logs",
    ],
    hooks: [
      "{patron} needs {item} out of {place} before the corp's cleaners arrive at dawn.",
      "{patron} sends the party a message that arrives three minutes after {patron} goes dark.",
    ],
    complications: [
      "{villain}'s security has flagged the party's licence tags and doors begin to lock.",
      "The payment clears, and then so does the account it came from.",
      "A rival crew wants {item} too, and they are better connected.",
    ],
    climaxes: [
      "uploading {item} to a buyer from the penthouse floor",
      "inside a locked server room, patient and well armed",
    ],
    truths: [
      "{patron} stole {item} first and is playing both sides.",
      "{villain} is hiding that the product being sold is killing its users.",
    ],
    weaknesses: [
      "the building's own failover can be turned against {villain}",
      "{villain} needs a witness to make the deal legal, and the party can be that witness",
    ],
    stakes: [
      "a whole district loses its only clinic, its records and its voice",
    ],
    readAloud: [
      "Rain turns the neon to smears as the message pings once, then twice, then goes quiet.",
    ],
  },
  modern: {
    places: [
      "the old library annex",
      "a closed-down motel",
      "the harbour warehouse",
      "a small-town diner after hours",
      "the county records office",
      "a locked storage unit",
    ],
    patronRoles: ["retired detective", "worried sibling", "small-town mayor"],
    villainRoles: [
      "respected local benefactor",
      "obsessive collector",
      "fixer with an alibi",
    ],
    witnessRoles: ["night clerk", "teenage witness", "reluctant coroner"],
    items: [
      "the missing ledger",
      "a stack of unsent letters",
      "the stolen painting",
    ],
    hooks: [
      "{patron} asks the party to find {item} before the inquiry opens in the morning.",
      "{patron} left a voicemail naming {place} and nothing else.",
    ],
    complications: [
      "The one useful witness gets cold feet the moment {villain}'s name comes up.",
      "Someone has been through {place} ahead of the party and tidied up badly.",
      "A well-meaning local calls the authorities, and time just got shorter.",
    ],
    climaxes: [
      "at the benefit dinner, with {item} and a good excuse",
      "alone in {place}, burning what's left of the evidence",
    ],
    truths: [
      "{villain} has been paying {patron} to look away for years.",
      "{item} proves the original accident was staged.",
    ],
    weaknesses: [
      "{villain} cannot afford a public scene tonight",
      "the paper trail ends at someone who is willing to talk if asked kindly",
    ],
    stakes: [
      "an innocent person takes the fall and the truth is buried for good",
    ],
    readAloud: [
      "The phone buzzes once on the desk. A voicemail, no caller ID, and a name you almost recognise.",
    ],
  },
  frontier: {
    places: [
      "the dry-wash crossing",
      "an abandoned silver mine",
      "the salvage yard",
      "a wind-battered watchtower",
      "the caravan camp",
      "the water station",
    ],
    patronRoles: ["trail boss", "settlement elder", "bounty clerk"],
    villainRoles: [
      "warlord's lieutenant",
      "land-grabbing rancher",
      "smooth-talking claim jumper",
    ],
    witnessRoles: ["scarred scout", "runaway deputy", "child with a map"],
    items: [
      "the water deed",
      "a sealed manifest",
      "the only working generator",
    ],
    hooks: [
      "{patron} offers the party a share if they bring {item} back from {place}.",
      "{patron} limps into camp with a story about {place} and not enough water.",
    ],
    complications: [
      "A storm closes the trail, and the safest shelter belongs to {villain}'s people.",
      "The map is right, but the landmarks have been moved.",
      "{villain} is already offering the locals a better deal than the party can.",
    ],
    climaxes: [
      "at {place} with {item} and a dozen guns that haven't yet been drawn",
      "poisoning the well, one barrel at a time",
    ],
    truths: [
      "{villain} has been paying raiders to create the crisis they will solve.",
      "{patron} is hiding that {item} was never theirs to sell.",
    ],
    weaknesses: [
      "{villain}'s allies leave if the water deal is exposed",
      "the stolen supply wagon can still be turned around",
    ],
    stakes: [
      "the settlement loses its water and its independence in the same week",
    ],
    readAloud: [
      "Dust hangs in the low sun, and for the first time in an hour, nobody speaks.",
    ],
  },
};

export function seedKeyForGenre(genre: string): string {
  const g = genre.toLowerCase();
  if (/(horror|gothic|vampire|dread|cosmic)/.test(g)) return "horror";
  if (/(cyber|corporate|noir)/.test(g)) return "cyberpunk";
  if (/(sci|space|lancer|exploration|star)/.test(g)) return "scifi";
  if (/(modern|conspiracy|mystery|contemporary|intrigue)/.test(g))
    return "modern";
  if (/(western|frontier|post|apocal|pirate|wasteland)/.test(g))
    return "frontier";
  return "fantasy";
}

export interface OneShotKit {
  approaches: string[];
  challenges: {
    middle: {
      type: "combat" | "social" | "exploration" | "puzzle" | "hazard";
      text: string;
    }[];
    climax: {
      type: "combat" | "social" | "exploration" | "puzzle" | "hazard";
      text: string;
    };
  };
  purposes: string[];
}

export const ONE_SHOT_KITS: Record<string, OneShotKit> = {
  "Investigation / mystery": {
    approaches: [
      "Question the people who were there",
      "Search the scene for what doesn't belong",
      "Follow the paperwork, money or footprints",
    ],
    challenges: {
      middle: [
        {
          type: "social",
          text: "A witness is hiding something. They talk if the party earns trust or shows they already know.",
        },
        {
          type: "puzzle",
          text: "Two accounts of the same night don't match. Working out which is false opens the way forward.",
        },
      ],
      climax: {
        type: "social",
        text: "Confront {villain} with what the party has pieced together. The scene is won by laying out the truth, not by hitting hardest.",
      },
    },
    purposes: [
      "Learn what happened",
      "Press the lead",
      "Test a theory",
      "Close in on the truth",
    ],
  },
  Exploration: {
    approaches: [
      "Scout ahead and map the safest route",
      "Read the signs the place leaves behind",
      "Ask locals what they avoid",
    ],
    challenges: {
      middle: [
        {
          type: "exploration",
          text: "The route is blocked or unstable. Finding another way costs time, supplies or a risk.",
        },
        {
          type: "hazard",
          text: "The ground itself is the opponent. The party chooses between speed and safety.",
        },
      ],
      climax: {
        type: "puzzle",
        text: "Reach {item} through the heart of {place}, solving how it works as the party goes.",
      },
    },
    purposes: [
      "Reach the threshold",
      "Cross the obstacle",
      "Survive the setback",
      "Find the way in",
    ],
  },
  Action: {
    approaches: [
      "Charge in and take control",
      "Use the terrain to even the odds",
      "Strike where the enemy is stretched thin",
    ],
    challenges: {
      middle: [
        {
          type: "combat",
          text: "A tough fight against {villain}'s people. Victory should cost something other than hit points.",
        },
        {
          type: "hazard",
          text: "A chase or collapsing set piece where each choice has a price.",
        },
      ],
      climax: {
        type: "combat",
        text: 'The showdown with {villain}, with a goal beyond "defeat them", such as saving something or stopping a countdown.',
      },
    },
    purposes: [
      "Hit the first target",
      "Escalate the fight",
      "Turn the tide",
      "Break their hold",
    ],
  },
  Intrigue: {
    approaches: [
      "Charm, bribe or pressure someone with access",
      "Trade favours between factions",
      "Watch who talks to whom",
    ],
    challenges: {
      middle: [
        {
          type: "social",
          text: "A delicate negotiation where every ally wants something the party can't give to all.",
        },
        {
          type: "social",
          text: "An uneasy gathering where the party must read the room and choose whom to trust.",
        },
      ],
      climax: {
        type: "social",
        text: "A public reckoning with {villain}. The party must win the room and the proof, not just the argument.",
      },
    },
    purposes: [
      "Learn who holds power",
      "Win an ally",
      "Survive a betrayal",
      "Force the reveal",
    ],
  },
  Survival: {
    approaches: [
      "Ration supplies and set watches",
      "Find shelter and secure it",
      "Use what the environment offers",
    ],
    challenges: {
      middle: [
        {
          type: "hazard",
          text: "Weather, hunger or exhaustion becomes a clock. Pressing on is risky, resting costs time.",
        },
        {
          type: "exploration",
          text: "Resources are scarce. The party chooses what to carry, share or abandon.",
        },
      ],
      climax: {
        type: "hazard",
        text: "A last stand or desperate crossing where {villain}'s pressure and the environment arrive together.",
      },
    },
    purposes: [
      "Secure the basics",
      "Push through the hardship",
      "Weather the crisis",
      "Reach safety",
    ],
  },
};

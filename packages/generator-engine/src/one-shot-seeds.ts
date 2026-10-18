/**
 * Local-fallback content for the One-Shot Adventure Builder. Each bucket is a
 * genre family; strings use {patron}, {villain}, {item} and {place}
 * placeholders that the builder fills in. System-neutral: no DCs, stat blocks
 * or rules text.
 *
 * Slot grammar (the builder drops these into fixed sentences):
 * - places, items: noun phrases with their article ("the Sunken Chapel").
 * - roles: lower-case nouns ("village reeve").
 * - climaxes: what {villain} is doing, after "where {villain} is …". Name no
 *   location: the scene already has one.
 * - weaknesses: a lower-case clause, after "A way to stop {villain}: …".
 * - stakes: a lower-case clause naming what is lost.
 * - hooks, complications, truths, readAloud: whole sentences.
 *
 * Avoid a number next to a unit ("three nights", "two steps") in hooks and
 * stakes: the playability check compares such counts with the clock.
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
      "the miller's flooded wheelhouse",
      "a standing-stone circle",
      "the guildhall vaults",
      "a ruined watch-abbey",
    ],
    patronRoles: [
      "village reeve",
      "temple archivist",
      "worried innkeeper",
      "retired adventurer",
      "young heir",
    ],
    villainRoles: [
      "exiled magister",
      "hollow knight",
      "charming baron",
      "fey bargainer",
      "jealous guildmaster",
    ],
    witnessRoles: [
      "frightened apprentice",
      "road warden",
      "hedge priest",
      "goatherd",
      "travelling minstrel",
    ],
    items: [
      "the Moonlit Seal",
      "a stolen relic bell",
      "the reeve's ledger",
      "the Crown of Thorns and Wheat",
      "a dragon's tithe-stone",
      "the founder's sword",
    ],
    hooks: [
      "{patron} begs the party to recover {item} before the festival bells ring tomorrow.",
      "{patron} found {item} missing and a stranger's footprints leading to {place}.",
      "{patron} slides a purse across the table and asks the party to bring back {item}, no questions asked.",
      "A wounded courier dies at the party's feet, clutching a note from {patron} about {item}.",
      "{patron} has been accused of stealing {item} and needs the party to find the real thief before the trial.",
    ],
    complications: [
      "Locals close ranks and will not speak of {place} while strangers are watching.",
      "{villain}'s agents have already been here and left a warning that sounds almost kind.",
      "The road to {place} is blocked, and every detour costs something.",
      "A rival band of sellswords is after the same prize and offers to split it.",
      "The temple will help, but only if the party swears an oath it may regret.",
      "Someone in the party's own lodgings has been paid to watch them.",
    ],
    climaxes: [
      "midway through a ritual that will bind {item} to their will",
      "waiting with {item}, ready to bargain, and ready to lie",
      "holding the gate with sworn knights, {item} on the altar behind them",
      "about to crown themselves with {item} before the whole town",
    ],
    truths: [
      "{villain} is trying to undo an old wrong, and the cost falls on the village.",
      "{patron} sold {item} years ago and has been hiding the debt.",
      "{item} was never sacred; the priests forged it to keep the peace.",
      "{villain} and {patron} were once sworn companions, and only one of them kept the oath.",
    ],
    weaknesses: [
      "the ritual fails if the old bell is rung at the wrong hour",
      "{villain} cannot cross water that has been blessed by the locals",
      "{villain}'s knights will lay down arms if their oath is read back to them",
      "{item} answers to whoever speaks its true name, and the archive still holds it",
    ],
    stakes: [
      "the village loses its protection and the harvest festival becomes a funeral",
      "the barony falls to {villain} and its people become tenants on their own land",
      "the old pact breaks and the forest takes back the road",
      "{patron} hangs for a crime they did not commit",
    ],
    readAloud: [
      "Rain drums on the tavern roof as the door swings open and a hush falls over the room.",
      "The market is loud with bargaining until the bell in the square rings once, out of turn, and everyone stops.",
      "Lanterns sway on the bridge. Below, something heavy drifts past in the black water.",
      "The hall smells of wax and wet wool, and the only empty seats are the ones nearest the door.",
    ],
  },
  darkfantasy: {
    places: [
      "the gallows crossroads",
      "a plague village under quarantine",
      "the bone-white cathedral",
      "a battlefield nobody buried",
      "the inquisitor's tower",
      "the black-water fen",
      "a burned monastery",
      "the duke's oubliette",
      "a charnel orchard",
      "the last mill before the dead lands",
    ],
    patronRoles: [
      "excommunicated priest",
      "deserter captain",
      "plague doctor",
      "widowed duchess",
      "gravedigger",
    ],
    villainRoles: [
      "witch-hunting inquisitor",
      "lich-touched lord",
      "saint who refused to die",
      "mercenary prince",
      "flesh-sculptor",
    ],
    witnessRoles: [
      "starving orphan",
      "condemned prisoner",
      "flagellant pilgrim",
      "half-mad soldier",
      "corpse-cart driver",
    ],
    items: [
      "the Saint's finger-bone",
      "a reliquary of black iron",
      "the Duke's death warrant",
      "the Red Chalice",
      "a crown of rusted thorns",
      "the plague ledger",
    ],
    hooks: [
      "{patron} offers the party absolution, gold or a horse out of here in exchange for {item}.",
      "The pyres in the square are being built for {patron}, unless the party brings back {item} first.",
      "{patron} digs an empty reliquary case out of a fresh grave and asks the party to find {item}, and whoever took it.",
      "{patron} pays in coins still warm from a dead man's purse and names {place}.",
      "A procession of the faithful passes, and {patron} pulls the party into an alley to talk about {item}.",
    ],
    complications: [
      "Every ally the party makes is a heretic in someone's eyes, and the inquisition is counting.",
      "The sick keep coming, and helping them costs time the party does not have.",
      "{villain}'s mercy is real, and that makes it harder to refuse.",
      "The road is held by deserters who want a toll in blood or bread.",
      "A rival sees the party as the real monster and preaches against them in the square.",
      "The dead in {place} do not rest, and they remember who wronged them.",
    ],
    climaxes: [
      "presiding over a burning, {item} raised before the crowd",
      "offering the party a share of what {item} grants, if they will only stand aside",
      "kneeling over {item}, calling back what should stay buried",
      "behind a wall of hired swords, ready to sell {item} to the highest bidder",
    ],
    truths: [
      "{villain} believes the plague is a judgement, and {item} is how they mean to deliver it.",
      "{patron} signed the order that started all of this and wants the evidence gone.",
      "{item} does work, but only by taking the life it gives from someone else.",
      "The church knew what {villain} was doing and paid for it.",
    ],
    weaknesses: [
      "{villain} cannot lie on consecrated ground, and the old chapel still counts",
      "the hired swords desert if their pay is proven false",
      "{item} breaks if it is carried out of the dead lands before dawn",
      "the crowd turns on {villain} if they see the wounds the faithful were promised would heal",
    ],
    stakes: [
      "the town burns its innocents and calls it salvation",
      "{villain} becomes a living saint and no one can stand against them again",
      "the dead rise in the fen and walk toward the living",
      "{patron} and everyone who sheltered them go to the pyre",
    ],
    readAloud: [
      "Smoke from the pyres hangs low over the road, and somewhere a bell tolls for nobody in particular.",
      "The gate guard looks at you the way a butcher looks at a carcass, then waves you through.",
      "Crows line the gallows. None of them fly when you pass, and one of them follows.",
      "Candle stubs cover the chapel floor, each one lit for someone who did not come back.",
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
      "the observation blister",
      "a cryo-bay full of sleepers",
      "the reactor maintenance crawlway",
      "a crashed shuttle on the ice",
    ],
    patronRoles: [
      "station quartermaster",
      "grant-funded surveyor",
      "union rep",
      "acting captain",
      "diplomatic attaché",
    ],
    villainRoles: [
      "rogue systems engineer",
      "corporate fixer",
      "mutinous officer",
      "alien envoy with a secret",
      "chief medical officer",
    ],
    witnessRoles: [
      "night-shift technician",
      "stowaway",
      "damaged ship AI",
      "cargo-loader pilot",
      "xenobiology intern",
    ],
    items: [
      "the black-box recorder",
      "a sealed core sample",
      "the override keys",
      "the navigation codes",
      "a first-contact artefact",
      "the medical manifest",
    ],
    hooks: [
      "{patron} hires the party to retrieve {item} before the next resupply window closes.",
      "An automated distress ping from {place} names {patron} as the only person who can open it.",
      "{patron} meets the party in a dead zone between cameras and asks them to find {item}.",
      "The station goes to lockdown just as {patron} reports {item} stolen from a sealed vault.",
      "{patron} offers the party passage home if they bring {item} back from {place}.",
    ],
    complications: [
      "Station systems start refusing the party's credentials one door at a time.",
      "{villain} has rerouted life support priorities, and the countdown is now on every screen.",
      "A rival crew arrives at {place} first and claims salvage rights.",
      "The station AI is helpful, honest, and has been told to report everything to {villain}.",
      "Gravity fails on the next deck, and so does the lighting.",
      "A delegation arrives early, and every move the party makes is now a diplomatic incident.",
    ],
    climaxes: [
      "at the controls, moments from making {item} impossible to recover",
      "barricaded with hostages and {item}, willing to talk until the airlock timer ends",
      "sealing the bulkheads behind them, {item} in hand, with an escape pod waiting",
      "using {item} to hold the whole station hostage",
    ],
    truths: [
      "{villain} is covering up a failure that {patron} signed off on.",
      "{item} shows the incident was deliberate, and the order came from above.",
      "The aliens were never hostile; {villain} provoked them to win a contract.",
      "{patron} has been a corporate plant since before the mission launched.",
    ],
    weaknesses: [
      "the override keys also lock {villain} out of the control deck",
      "{villain} depends on a maintenance schedule the party can disrupt",
      "the station AI obeys a direct order from the acting captain over anyone else",
      "{villain}'s implants fail inside the shielded medical bay",
    ],
    stakes: [
      "the colony loses its air supply and its only witnesses",
      "the station is written off and everyone aboard with it",
      "first contact ends in war before anyone has said hello",
      "{villain} sells the crew's lives to cover the company's losses",
    ],
    readAloud: [
      "The corridor lights stutter, and somewhere below, a pump that should be silent starts to hum.",
      "Frost creeps across the viewport while the station's voice repeats, politely, that everything is fine.",
      "The airlock cycles, and the air that greets you tastes of metal and somebody else's breath.",
      "Every screen in the mess hall shows the same frozen frame: a face, mid-scream, in the hydroponics bay.",
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
      "the empty schoolhouse",
      "a taxidermist's shop",
      "the flooded quarry",
      "an attic nobody has opened",
    ],
    patronRoles: [
      "grieving widow",
      "local doctor",
      "nervous constable",
      "estate lawyer",
      "village schoolteacher",
    ],
    villainRoles: [
      "patient thing in the walls",
      "cult's quiet founder",
      "returned drowned man",
      "kindly family doctor",
      "the house itself",
    ],
    witnessRoles: [
      "sleepless child",
      "caretaker",
      "ferryman who stopped speaking",
      "medium who is a fraud",
      "postman on the last round",
    ],
    items: [
      "the dead man's journal",
      "a locked music box",
      "the founding deed",
      "a wax-sealed photograph",
      "the asylum's patient register",
      "a child's drawing of the house",
    ],
    hooks: [
      "{patron} needs the party to learn what is wrong with {place} before another night passes.",
      "{patron} gives the party {item} and asks them to find out why it is still warm.",
      "{patron} has inherited {place} and asks the party to spend a night there and prove it is empty.",
      "A letter from {patron} arrives, posted long ago, asking the party to come and bring {item}.",
      "{patron} is the only one in town who still remembers the missing family, and wants {item} found.",
    ],
    complications: [
      "Whatever lives here knows the party's names by the second night.",
      "{villain} offers a tempting bargain through the person least able to refuse.",
      "The only safe room is the one with the most to hide.",
      "The townsfolk are friendly, helpful, and lying about everything.",
      "One of the party's own memories turns out not to be theirs.",
      "The phones die, the road floods, and the only light left is in {place}.",
    ],
    climaxes: [
      "at the heart of {place}, finishing what {item} began",
      "wearing the face of someone the party trusts, waiting for dawn to pass",
      "calling the drowned up out of the dark water, {item} in hand",
      "sitting at a table laid for the party, waiting for them to join",
    ],
    truths: [
      "{villain} is what is left of a promise {patron} made and broke.",
      "The haunting protects something worse that lies beneath {place}.",
      "The whole town made a bargain with {villain}, and the party are the payment.",
      "{patron} is already dead, and does not know it.",
    ],
    weaknesses: [
      "{villain} is bound by {item} and weakens when it is spoken over",
      "the thing cannot enter a room that has been honestly named",
      "{villain} must answer any question asked by someone it has wronged",
      "burying {item} with the right body ends the bargain",
    ],
    stakes: [
      "the town loses its dead and its sleeping, one house at a time",
      "the party become the next names on the wall",
      "{villain} walks out of {place} and into the town",
      "{patron} is taken, and nobody remembers they existed",
    ],
    readAloud: [
      "The fog thickens as you reach the door. It is already open, and the hallway beyond is warm.",
      "The clocks in the house all stopped at the same minute, and none of them are wound.",
      "Somebody has set the table for exactly as many guests as you are.",
      "From the cellar comes a soft, patient knocking, as if whoever it is has all the time in the world.",
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
      "a capsule hotel",
      "the black-market chop shop",
      "an arcology's executive garden",
      "a pirate broadcast studio",
    ],
    patronRoles: [
      "ex-corp fixer",
      "street doc",
      "nervous journalist",
      "gang lieutenant",
      "burned-out executive",
    ],
    villainRoles: [
      "ambitious VP",
      "cold-eyed security chief",
      "rogue AI proxy",
      "celebrity influencer",
      "chrome-heavy enforcer",
    ],
    witnessRoles: [
      "burned-out courier",
      "freelance netrunner",
      "janitor with access",
      "street kid with a camera",
      "bartender who hears everything",
    ],
    items: [
      "the encrypted shard",
      "a leaked audit trail",
      "the patient's implant logs",
      "a prototype neural chip",
      "the board's kill-list",
      "the original source code",
    ],
    hooks: [
      "{patron} needs {item} out of {place} before the corp's cleaners arrive at dawn.",
      "{patron} sends the party a message that arrives moments after {patron} goes dark.",
      "{patron} offers to wipe the party's debts if they lift {item} from {place}.",
      "{patron} wakes up the party with a gun and an apology: {item} is gone, and so is their cut.",
      "A dead drop meant for someone else hands the party {item}'s location and a target on their backs.",
    ],
    complications: [
      "{villain}'s security has flagged the party's licence tags and doors begin to lock.",
      "The payment clears, and then so does the account it came from.",
      "A rival crew wants {item} too, and they are better connected.",
      "The party's own cyberware starts phoning home.",
      "Live footage of the party is trending, and every bounty hunter in the city is watching.",
      "The gang that controls the block wants a cut, or a favour, or a body.",
    ],
    climaxes: [
      "uploading {item} to a buyer from the penthouse floor",
      "inside a locked server room, patient and well armed",
      "live on every feed in the city, about to use {item} as proof of their innocence",
      "surrounded by hired chrome, {item} wired to their own heart monitor",
    ],
    truths: [
      "{patron} stole {item} first and is playing both sides.",
      "{villain} is hiding that the product being sold is killing its users.",
      "{villain} is a puppet; the real decision was made by an algorithm nobody audits.",
      "{item} contains a copy of a person, and they want out.",
    ],
    weaknesses: [
      "the building's own failover can be turned against {villain}",
      "{villain} needs a witness to make the deal legal, and the party can be that witness",
      "{villain}'s chrome runs on a corporate licence that can be revoked",
      "the board will cut {villain} loose the moment the story goes public",
    ],
    stakes: [
      "a whole district loses its only clinic, its records and its voice",
      "the party are framed, flatlined, and forgotten by the next news cycle",
      "{villain} owns every mind that ever used the product",
      "{patron} disappears into a corporate black site",
    ],
    readAloud: [
      "Rain turns the neon to smears as the message pings once, then twice, then goes quiet.",
      "The noodle bar's holo-menu flickers, and for a moment it shows your face and a price.",
      "Drones hum overhead like insects, and every one of them pauses as you pass.",
      "The elevator stops between floors, and a polite voice asks you to wait for an associate.",
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
      "the country club",
      "a hospital basement",
      "the radio station",
      "a lakeside cabin",
    ],
    patronRoles: [
      "retired detective",
      "worried sibling",
      "small-town mayor",
      "investigative podcaster",
      "family lawyer",
    ],
    villainRoles: [
      "respected local benefactor",
      "obsessive collector",
      "fixer with an alibi",
      "charismatic pastor",
      "police captain",
    ],
    witnessRoles: [
      "night clerk",
      "teenage witness",
      "reluctant coroner",
      "delivery driver",
      "neighbour who keeps notes",
    ],
    items: [
      "the missing ledger",
      "a stack of unsent letters",
      "the stolen painting",
      "the original will",
      "a dashcam memory card",
      "the coroner's first report",
    ],
    hooks: [
      "{patron} asks the party to find {item} before the inquiry opens in the morning.",
      "{patron} left a voicemail naming {place} and nothing else.",
      "{patron} recognises the party from the news and begs them to look at a case the police closed.",
      "A package arrives for the party containing a key, a photo of {place}, and {patron}'s number.",
      "{patron}'s brother vanished last week, and {item} vanished with him.",
    ],
    complications: [
      "The one useful witness gets cold feet the moment {villain}'s name comes up.",
      "Someone has been through {place} ahead of the party and tidied up badly.",
      "A well-meaning local calls the authorities, and time just got shorter.",
      "A journalist starts following the party, and their story will name names.",
      "The party's alibi for last night has just become very important.",
      "{villain} sends a lawyer, a donation and a polite warning, in that order.",
    ],
    climaxes: [
      "at the benefit dinner, with {item} and a good excuse",
      "alone in {place}, burning what's left of the evidence",
      "about to give a statement to the press that buries everything",
      "alone with {item} and someone who knows too much",
    ],
    truths: [
      "{villain} has been paying {patron} to look away for years.",
      "{item} proves the original accident was staged.",
      "The victim was blackmailing half the town, and {villain} is only the one who got caught.",
      "{patron} wants {item} found so it can be destroyed.",
    ],
    weaknesses: [
      "{villain} cannot afford a public scene tonight",
      "the paper trail ends at someone who is willing to talk if asked kindly",
      "{villain}'s alibi depends on a witness who has started to doubt it",
      "a copy of {item} is already in a safe-deposit box only {patron} can open",
    ],
    stakes: [
      "an innocent person takes the fall and the truth is buried for good",
      "{villain} wins the election and the town's records go with them",
      "the next victim is someone the party has already met",
      "{patron} loses their family, their name and their freedom",
    ],
    readAloud: [
      "The phone buzzes once on the desk. A voicemail, no caller ID, and a name you almost recognise.",
      "The diner's neon sign hums, half the letters dead, and the coffee has been sitting there since closing.",
      "Rain on the windscreen, the wipers out of time, and a motel sign that just switched off.",
      "The file is thinner than it should be. Someone has taken pages out and left the staples.",
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
      "the railhead saloon",
      "a burned homestead",
      "the canyon toll road",
      "the circuit judge's courthouse",
    ],
    patronRoles: [
      "trail boss",
      "settlement elder",
      "bounty clerk",
      "frontier doctor",
      "railroad surveyor",
    ],
    villainRoles: [
      "warlord's lieutenant",
      "land-grabbing rancher",
      "smooth-talking claim jumper",
      "hanging judge",
      "outlaw folk hero",
    ],
    witnessRoles: [
      "scarred scout",
      "runaway deputy",
      "child with a map",
      "travelling preacher",
      "telegraph operator",
    ],
    items: [
      "the water deed",
      "a sealed manifest",
      "the only working generator",
      "the payroll strongbox",
      "a stolen land grant",
      "the sheriff's badge",
    ],
    hooks: [
      "{patron} offers the party a share if they bring {item} back from {place}.",
      "{patron} limps into camp with a story about {place} and not enough water.",
      "{patron} pins a reward notice to the post and asks the party to read the small print.",
      "The stage arrives without its driver, and {patron} wants to know what happened to {item}.",
      "{patron} needs the party to get {item} to the judge before the circuit rider leaves town.",
    ],
    complications: [
      "A storm closes the trail, and the safest shelter belongs to {villain}'s people.",
      "The map is right, but the landmarks have been moved.",
      "{villain} is already offering the locals a better deal than the party can.",
      "The sheriff is honest, scared, and outgunned.",
      "A posse is riding, and they think the party did it.",
      "The horses are poisoned, and the next town is a long walk away.",
    ],
    climaxes: [
      "at {place} with {item} and a dozen guns that haven't yet been drawn",
      "poisoning the well, one barrel at a time",
      "loading {item} onto a wagon, with hired guns covering the road",
      "ready to hang the only witness in front of the whole town",
    ],
    truths: [
      "{villain} has been paying raiders to create the crisis they will solve.",
      "{patron} is hiding that {item} was never theirs to sell.",
      "The railroad wants the town empty, and {villain} is only their hired hand.",
      "{villain} is protecting the town from something the party has not met yet.",
    ],
    weaknesses: [
      "{villain}'s allies leave if the water deal is exposed",
      "the stolen supply wagon can still be turned around",
      "the judge will hear any case brought before sundown, even against {villain}",
      "{villain}'s outlaws will not shoot a preacher, and they all know it",
    ],
    stakes: [
      "the settlement loses its water and its independence in the same week",
      "the town is sold out from under the people who built it",
      "an innocent hangs and the guilty ride away rich",
      "{patron} loses the land, the herd and the family name",
    ],
    readAloud: [
      "Dust hangs in the low sun, and for the first time in an hour, nobody speaks.",
      "The saloon piano stops mid-song as you push through the doors.",
      "Buzzards circle something past the ridge, and the wind carries the smell back to you.",
      "The telegraph clicks once, then again, then falls silent, and the operator will not meet your eye.",
    ],
  },
  wasteland: {
    places: [
      "the ruined overpass",
      "a sealed fallout bunker",
      "the scrap market",
      "a dead shopping mall",
      "the irradiated reservoir",
      "a convoy camp in a parking lot",
      "the old seed vault",
      "a half-buried subway station",
      "the radio tower on the hill",
      "a greenhouse dome",
    ],
    patronRoles: [
      "settlement mechanic",
      "water-rights broker",
      "convoy captain",
      "vault overseer",
      "scavenger matriarch",
    ],
    villainRoles: [
      "raider queen",
      "pre-war AI's last caretaker",
      "water baron",
      "cult prophet of the bomb",
      "convoy boss with a monopoly",
    ],
    witnessRoles: [
      "mutant scavenger",
      "rescued vault dweller",
      "wandering trader",
      "raider who wants out",
      "radio operator",
    ],
    items: [
      "the water purifier core",
      "a crate of antibiotics",
      "the vault access codes",
      "the last seed bank sample",
      "a working fusion cell",
      "the map to the clean zone",
    ],
    hooks: [
      "{patron} trades the party clean water and ammunition to bring back {item} from {place}.",
      "A dying scavenger staggers into camp with {item}'s location and {patron}'s name on their lips.",
      "{patron} needs {item} before the settlement's last filter gives out.",
      "The settlement's radio picks up a looped message from {place}, and {patron} recognises the voice.",
      "{patron} has bought the party's debts from the raiders and wants them repaid in {item}.",
    ],
    complications: [
      "A dust storm rolls in, and the only shelter is a raider waystation.",
      "The geiger counter starts clicking where the map said it was clean.",
      "{villain}'s convoy is offering the settlement more water than the party can.",
      "The fuel runs out, and the next cache has been looted.",
      "Something in {place} has been living down there since the bombs, and it is hungry.",
      "The party's vehicle breaks down in raider territory with night coming on.",
    ],
    climaxes: [
      "holding {item}, ready to destroy it or sell it",
      "behind a wall of war-rigs, {item} chained to the lead vehicle",
      "about to use {item} to restart something that should stay off",
      "holding court over a fight to the death, with {item} as the prize",
    ],
    truths: [
      "{villain} started the drought by damming the river upstream.",
      "{patron} sold the settlement's location to the raiders to save their own family.",
      "{item} was designed to work only for the people who sealed themselves in the vault.",
      "{villain} is trying to save everyone, by deciding who gets to live.",
    ],
    weaknesses: [
      "{villain}'s raiders follow strength, and will change sides if {villain} is seen to lose",
      "the war-rig's fuel line runs right past the driver's cab",
      "the bunker's old security still answers to the vault overseer's voice",
      "{villain}'s followers turn if they learn the prophecy was a pre-war advert",
    ],
    stakes: [
      "the settlement runs dry and scatters into the wastes",
      "{villain} controls every drop of water in the region",
      "the last clean seeds are lost and nothing will grow again",
      "{patron} and their people are taken as slaves for the convoys",
    ],
    readAloud: [
      "The wind carries grit and the faint tinny sound of a pre-war jingle from somewhere ahead.",
      "Rust-red sky, a cracked highway, and a single working streetlight that should not have power.",
      "The settlement gate opens a crack, and a dozen rifles watch you walk through it.",
      "The geiger counter goes quiet as you step inside, and that is somehow worse.",
    ],
  },
};

export function seedKeyForGenre(genre: string): string {
  const g = genre.toLowerCase();
  if (/(dark fantasy|grimdark|vampire)/.test(g)) return "darkfantasy";
  if (/(horror|gothic|vampire|dread|cosmic)/.test(g)) return "horror";
  if (/(cyber|corporate|noir)/.test(g)) return "cyberpunk";
  if (/(sci|space|lancer|exploration|star)/.test(g)) return "scifi";
  if (/(modern|conspiracy|mystery|contemporary|intrigue)/.test(g))
    return "modern";
  if (/(post|apocal|wasteland|fallout)/.test(g)) return "wasteland";
  if (/(superhero|comic)/.test(g)) return "modern";
  if (/(western|frontier|pirate)/.test(g)) return "frontier";
  return "fantasy";
}

type ChallengeType = "combat" | "social" | "exploration" | "puzzle" | "hazard";

export interface OneShotKit {
  /** Each scene offers three of these. */
  approaches: string[];
  challenges: {
    /** Drawn without repeats inside one adventure. */
    middle: { type: ChallengeType; text: string }[];
    climax: { type: ChallengeType; text: string }[];
  };
  purposes: string[];
}

export const ONE_SHOT_KITS: Record<string, OneShotKit> = {
  "Investigation / mystery": {
    approaches: [
      "Question the people who were there",
      "Search the scene for what doesn't belong",
      "Follow the paperwork, money or footprints",
      "Set a trap and see who takes the bait",
      "Reconstruct the night, hour by hour",
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
        {
          type: "exploration",
          text: "{place} has been cleaned, but not well. Searching it turns up what was meant to be thrown away.",
        },
        {
          type: "puzzle",
          text: "A coded note, a ledger with gaps, or a timetable that doesn't add up. Cracking it names the next place to look.",
        },
        {
          type: "social",
          text: "A suspect with a perfect alibi. Breaking it means finding who gave it to them, and why.",
        },
      ],
      climax: [
        {
          type: "social",
          text: "Confront {villain} with what the party has pieced together. The scene is won by laying out the truth, not by hitting hardest.",
        },
        {
          type: "puzzle",
          text: "Catch {villain} in the act, using what the party knows to be in the right place at the right moment.",
        },
        {
          type: "social",
          text: "Put the case before someone with power over {villain}, who will judge on the evidence the party brings.",
        },
      ],
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
      "Push on fast and deal with trouble as it comes",
      "Find a guide who knows the way, at a price",
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
        {
          type: "puzzle",
          text: "An old mechanism, marking or lock guards the way on. Working out how it was meant to be used opens it.",
        },
        {
          type: "exploration",
          text: "{place} hides more than one way through. Each route shows something different about what happened here.",
        },
        {
          type: "hazard",
          text: "Something in {place} is waking up. The deeper the party goes, the faster it notices them.",
        },
      ],
      climax: [
        {
          type: "puzzle",
          text: "Reach {item} through the heart of {place}, solving how it works as the party goes.",
        },
        {
          type: "exploration",
          text: "Race {villain} to {item} through the last stretch of {place}, choosing which dangers to risk.",
        },
        {
          type: "hazard",
          text: "{place} begins to collapse around {item}. The party must get it, and themselves, out.",
        },
      ],
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
      "Create a distraction and hit from another side",
      "Pick off the leaders and let the rest break",
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
        {
          type: "combat",
          text: "An ambush at {place}. The party must protect someone or something while they fight.",
        },
        {
          type: "combat",
          text: "Hold {place} until help arrives, or until the party can get what it came for and leave.",
        },
        {
          type: "hazard",
          text: "Get through {place} while it burns, floods or falls, with {villain}'s people closing in.",
        },
      ],
      climax: [
        {
          type: "combat",
          text: 'The showdown with {villain}, with a goal beyond "defeat them", such as saving something or stopping a countdown.',
        },
        {
          type: "combat",
          text: "Storm {villain}'s stronghold at {place}, fighting through to {item} before it is used.",
        },
        {
          type: "hazard",
          text: "Stop {villain} in a running fight across a place that is coming apart, with {item} at stake.",
        },
      ],
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
      "Spread a rumour and see where it lands",
      "Play two rivals against each other",
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
        {
          type: "social",
          text: "A secret the party could use as leverage, if they are willing to ruin someone with it.",
        },
        {
          type: "social",
          text: "A go-between offers a deal from {villain}. Accepting, refusing or stalling each closes a door.",
        },
        {
          type: "social",
          text: "An ally is about to switch sides. The party learns why, and decides whether to stop them.",
        },
      ],
      climax: [
        {
          type: "social",
          text: "A public reckoning with {villain}. The party must win the room and the proof, not just the argument.",
        },
        {
          type: "social",
          text: "A private meeting with {villain}, where the party's leverage is all that stands between them and {item}.",
        },
        {
          type: "social",
          text: "The vote, the trial or the wedding: the moment {villain} needs to go right, and the party's chance to turn it.",
        },
      ],
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
      "Split up to cover more ground",
      "Trade with whoever else is out here",
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
        {
          type: "combat",
          text: "Something hunts the party at {place}. Fighting it off costs supplies; running costs ground.",
        },
        {
          type: "hazard",
          text: "Someone in the party is hurt or sick, and the cure is in {place}.",
        },
        {
          type: "exploration",
          text: "Other survivors at {place} have what the party needs, and need something in return.",
        },
      ],
      climax: [
        {
          type: "hazard",
          text: "A last stand or desperate crossing where {villain}'s pressure and the environment arrive together.",
        },
        {
          type: "combat",
          text: "{villain} comes for {item} as the shelter fails, and the party must hold or flee.",
        },
        {
          type: "exploration",
          text: "Get {item} and everyone left alive to safety, choosing who and what to leave behind.",
        },
      ],
    },
    purposes: [
      "Secure the basics",
      "Push through the hardship",
      "Weather the crisis",
      "Reach safety",
    ],
  },
};

/**
 * Public Heist generator — framework-free, for the marketing/SEO generator
 * surface (no login, no vault context).
 *
 * Turns the framework from the "How do you run a heist in a tabletop RPG?"
 * answer page into a table-ready score: a concrete objective, a prize with a
 * practical complication, actionable casing intel, three distinct security
 * rings, a five-step alarm track, complications with a trigger, a compromised
 * getaway, and a menu of flashbacks the players *could* establish (#2768).
 *
 * The design constraint that separates this from the quest generator: a heist
 * is a situation with moving parts, not a hook. Every section has to give the
 * table something to act on — multiple approaches per security ring, an alarm
 * state that actually changes the fiction, and escape options whose availability follows the security response.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
import { NAME_BAN_PROMPT } from "./public-npc";
import {
  type Rng,
  defaultRng,
  pickFrom,
  generatePlaceholderName as generateName,
} from "./random-utils";
import { parseFencedJson } from "./llm-response-utils";
import { formatCampaignContextBlock } from "./campaign-context";
import {
  heistLocalState,
  HEIST_LOCAL_RESPONSE,
  HEIST_LOCAL_ESCAPE,
} from "./heist-local-state";

export const heistConfig = {
  heistTypes: [
    "Theft",
    "Rescue",
    "Sabotage",
    "Extraction",
    "Information",
    "Plant Evidence",
    "Assassination",
  ],
  targetScales: ["Small", "Major", "Legendary"],
  targetTypes: [
    "Private Vault",
    "Fortified Archive",
    "Guarded Estate",
    "Secure Depot",
  ],
  targetTypesByTheme: {
    "Classic Fantasy": [
      "Temple Reliquary",
      "Baronial Treasury",
      "Wizard's Sanctum",
      "Guild Vault",
    ],
    Pirate: [
      "Governor's Strongroom",
      "Anchored Treasure Galleon",
      "Harbour Customs House",
      "Smuggler's Sea Cave",
    ],
    "Cyberpunk / Corporate": [
      "Corporate Arcology",
      "Black Clinic",
      "Data Fortress",
      "Executive Penthouse",
    ],
    "Vampire / Gothic Noir": [
      "Ancestral Crypt",
      "Opera House Vault",
      "Bloodline Manor",
      "Cathedral Undercroft",
    ],
    "Cosmic Horror": [
      "University Special Collection",
      "Sealed Lighthouse Archive",
      "Private Cabinet of Curiosities",
      "Quarantined Sanatorium",
    ],
    "Sci-Fi / Space Opera": [
      "Orbital Station Vault",
      "Research Habitat",
      "Impounded Freighter",
      "Planetary Datacore",
    ],
    "Modern Conspiracy": [
      "Private Bank Vault",
      "Government Records Facility",
      "Auction House Strongroom",
      "Secure Server Farm",
    ],
    "Post-Apocalyptic": [
      "Pre-Collapse Bunker",
      "Warlord's Armoury",
      "Water Reclamation Plant",
      "Convoy Depot",
    ],
    "Western / Frontier": [
      "Bank Strongbox",
      "Railroad Payroll Car",
      "Assay Office",
      "Fortified Ranch House",
    ],
    Steampunk: [
      "Guild Patent Vault",
      "Aetheric Foundry",
      "Imperial Dirigible Hold",
      "Clockwork Exchange",
    ],
    Lancer: [
      "Corpro-State Archive",
      "Mech Hangar Deck",
      "Union Evidence Locker",
      "NHP Containment Wing",
    ],
    "Space Opera Resistance": [
      "Imperial Garrison Vault",
      "Detention Block",
      "Governor's Private Collection",
      "Orbital Shipyard",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Embassy Secure Archive",
      "Precursor Vault",
      "Xenobiology Containment Lab",
      "Flagship Records Core",
    ],
    "Space Western": [
      "Frontier Assay Vault",
      "Ore Hauler's Hold",
      "Company Town Payroll Office",
      "Way-Station Strongroom",
    ],
  } as Record<string, string[]>,
  /**
   * The practical, physical catch that stops the prize from being a bag of
   * coins. Every generated heist gets exactly one, because "the prize is
   * awkward" is what turns the getaway into a scene.
   */
  prizeComplications: [
    "Huge — it cannot be carried by one person or hidden under a coat",
    "Fragile — a hard knock ruins it and the job pays nothing",
    "Alive — it has its own opinions about being moved",
    "Cursed — carrying it costs the bearer something with every hour",
    "Traceable — it can be followed while the crew still holds it",
    "Volatile — rough handling makes it dangerous to everyone nearby",
    "Anchored — it is fixed in place and must be freed before it can be taken",
    "Unwilling — it does not want to leave, and can say so",
  ],
  /**
   * The catch pools, by what the objective actually is. A catch drawn from
   * the wrong pool reads as nonsense — "carrying it costs the bearer" applied
   * to an assassination target, or "it does not want to leave" applied to a
   * machine being sabotaged — so the pool is chosen by heist type rather than
   * shared across all of them.
   */
  catchesByKind: {
    object: [
      "Huge — it cannot be carried by one person or hidden under a coat",
      "Fragile — a hard knock ruins it and the job pays nothing",
      "Alive — it has its own opinions about being moved",
      "Cursed — carrying it costs the bearer something with every hour",
      "Traceable — it can be followed while the crew still holds it",
      "Volatile — rough handling makes it dangerous to everyone nearby",
      "Anchored — it is fixed in place and must be freed before it can be taken",
    ],
    person: [
      "Injured — they cannot walk far, or fast, without help",
      "Unwilling — they do not trust the crew and will not come quietly",
      "Watched — someone looks in on them to a schedule that will not bend",
      "Traceable — something on them can be followed once they are moved",
    ],
    deed: [
      "Deniable — it must not read as the crew's work, or the patron is finished",
      "Delayed — it must not happen until the crew is somewhere else",
      "Precise — one specific thing must happen and nothing beside it",
      "Witnessed — the right person has to see it, or it counts for nothing",
    ],
    // Something the crew brings IN cannot need freeing from a plinth, and
    // cannot be "traceable while the crew still holds it" — the trail runs
    // backwards, to whoever supplied it.
    carried: [
      "Fragile — a hard knock ruins it and it will not pass inspection",
      "Volatile — rough handling makes it dangerous to everyone nearby",
      "Distinctive — it cannot be hidden on a person, only carried openly",
      "Perishable — it stops looking convincing after tonight",
      "Sourced — it can be traced back to whoever supplied it",
    ],
    // A record need not leave the building at all, so catches about carrying
    // it out ("Huge", "Anchored") contradict the objective's own terms.
    record: [
      "Sealed — it cannot be read where it lies, and moving it is what gets noticed",
      "Encrypted — it needs a key the crew does not have, or someone who can read it",
      "Voluminous — copying it takes far longer than reading it",
      "Registered — every reading writes a line that cannot be skipped",
    ],
  } as Record<string, string[]>,
  /** Which catch pool each heist type draws from. */
  catchKindByType: {
    Theft: "object",
    Information: "record",
    "Plant Evidence": "carried",
    Rescue: "person",
    Extraction: "person",
    Assassination: "deed",
    Sabotage: "deed",
  } as Record<string, string>,
  /**
   * What the crew is after when the caller does not name a prize. Keyed by
   * heist type, because "the most closely held object in the building" is the
   * wrong default for a rescue, an extraction, or an assassination.
   */
  defaultPrizes: {
    Theft: "the single most closely held object in the building",
    Rescue: "a prisoner nobody outside is supposed to know is held here",
    Sabotage: "the mechanism the whole operation depends on",
    Extraction: "a specialist the building will not let leave",
    Information: "the record that proves what everyone here denies",
    "Plant Evidence":
      "an incriminating item the target must appear to have hidden",
    Assassination: "a mark who is only ever alone inside this building",
  } as Record<string, string>,
  /**
   * The semantic model for each heist type, not just its vocabulary.
   *
   * Renaming "The Prize" to "The Package" is not adaptation: a Plant Evidence
   * job whose package is already inside the target, and whose pivotal moment
   * is "when the prize is taken", is still a theft with the nouns swapped. So
   * each type declares what the crew begins with, what the rings actually
   * protect, what action completes the objective, what starts the escape, and
   * what the point-of-no-return section is even called.
   */
  objectives: {
    Theft: {
      heading: "The Prize",
      momentHeading: "When the Prize Is Taken",
      innerRingLabel: "Inner Vault",
      fields:
        "what it is, who wants it and why, why it matters beyond its price, where it is normally kept, and — separately from reaching it — two or three genuinely different ways to get it out of its place",
      startsWith:
        "The target holds the prize. The crew arrives empty-handed and leaves carrying it.",
      protects: "the prize itself, where it is kept",
      casing:
        "an entry vector, a known obstacle, and where the prize is kept and how it is handled",
      completion: "lifting the prize out of its place",
      escapeCause: "the prize's absence being registered",
      complicationFocus:
        "the prize's location, its handling routine, and who else wants it",
      score: "one night to get {prize} clear of it",
      lead: "{Prize} — worth more to whoever is paying than to any honest market, and the target cannot replace it.",
      where: "In the innermost secured space, behind all three rings.",
      window:
        "Moved only during the fixed handling routine — that routine is the crew's opening.",
      protection:
        "The vault layer itself, plus the few staff who hold legitimate access.",
      aftermath: "The target misses it within the hour and comes after it.",
      moment: "Lifting the prize",
      casingLine:
        "Kept in the innermost secured space and handled by a few named staff on a fixed routine.",
      momentBody:
        "{prize} leaves its place, and the space it occupied is now conspicuously empty.",
    },
    "Plant Evidence": {
      heading: "The Package",
      momentHeading: "When the Evidence Is Planted",
      innerRingLabel: "Inner Vault",
      fields:
        "what it is and whom it will incriminate, where inside the target it must end up for anyone to believe it, what would give it away as planted, who will find it and when, and — separately from reaching the spot — two or three genuinely different ways to make the placement convincing",
      startsWith:
        "The crew already has the package when the job begins. Nothing has to be stolen first, and the package is NOT inside the target — getting it in is the entire job.",
      protects:
        "the destination the package must reach, not the package itself",
      casing:
        "an entry vector, the exact placement spot and its handling routine, and when and by whom the package will be discovered",
      completion: "leaving the package where it will be found and believed",
      escapeCause:
        "the plant being completed, or the crew being seen making it",
      complicationFocus:
        "the package's credibility, its placement, the timing of its discovery, and anyone who could testify it was planted",
      score: "one night to place {prize} where it will be believed",
      lead: "{Prize}. The crew already has it; getting in is half the job, and leaving it somewhere convincing is the other half.",
      where:
        "It has to end up in the innermost secured space, where only the guilty could have put it.",
      window:
        "Before the next inspection, so that inspection is what finds it.",
      protection:
        "The same three rings — placing something is as hard as removing it.",
      aftermath:
        "Whoever finds it starts an investigation the crew no longer controls.",
      moment: "Leaving the package",
      casingLine:
        "The placement spot is inspected on a fixed schedule, and that inspection is who finds the package.",
      momentBody:
        "The package settles into place and reads as having always been there. Retrieving it now would be as hard as planting it was, and twice as incriminating.",
    },
    Assassination: {
      heading: "The Target",
      momentHeading: "When the Target Is Killed",
      innerRingLabel: "Inner Sanctum",
      fields:
        "who they are, where they will be tonight, a concrete window in which they are alone or unguarded, what protects them the rest of the time, what changes the moment they die and how long it takes anyone to notice, and — separately from any question of getting to them — two or three genuinely different opportunities or methods for the kill itself",
      startsWith:
        "The target is inside and alive. The crew arrives with whatever they mean to use and leaves without it if they are sensible.",
      protects:
        "the target — their routine, their escort, and the rooms they are ever alone in",
      casing:
        "an entry vector, the target's routine and escort, and the window in which they are alone",
      completion: "the killing blow",
      escapeCause:
        "the body being found, or the target failing to appear for whatever came next",
      complicationFocus:
        "the target's protection, the timing of the window, and who else is in the room",
      score: "one night to reach {prize} and leave without being placed there",
      lead: "{Prize}. Killing them is the job; not being the obvious answer afterwards is the rest of it.",
      where:
        "On the secured floor, during a nightly inspection nobody else attends.",
      window:
        "Alone for a few minutes at the end of that inspection — the only time no one else is in the room.",
      protection:
        "An escort everywhere else in the building, and a standing order that they are never alone in public.",
      aftermath:
        "Their death stops whatever they were due to do next, and is noticed the moment they fail to appear for it.",
      moment: "The kill",
      casingLine:
        "They are alone only at the end of the nightly inspection, and escorted every other hour of the day.",
      momentBody:
        "They go down, and the clock starts on whoever expects to see them next.",
    },
    Rescue: {
      heading: "The Captive",
      momentHeading: "When the Captive Is Freed",
      innerRingLabel: "Custody Floor",
      fields:
        "who they are, the conditions they are held in, what state they are in and what they can or cannot do for themselves, who guards them and on what routine, what happens when they are found missing, and — separately from reaching the cell — two or three genuinely different ways to actually get them out",
      startsWith:
        "The target holds the captive. The crew arrives with only what they can carry and leaves with a person who cannot move as fast as they can.",
      protects: "the captive — the cell, the keyholder, and the guard rota",
      casing:
        "an entry vector, where the captive is held and who guards them, and the schedule of checks on the cell",
      completion: "getting the captive out of the cell",
      escapeCause: "the empty cell being found at the next check",
      complicationFocus:
        "the captive's condition, the guard rota, and whether the captive cooperates",
      score: "one night to get {prize} out alive",
      lead: "{Prize}. They cannot fight, and they cannot run far.",
      where:
        "Held on the secured floor, away from the parts of the building the staff use.",
      window:
        "Between guard reliefs, when the corridor outside is briefly unwatched.",
      protection:
        "A locked door, a single keyholder, and a guard who checks on a schedule.",
      aftermath:
        "The empty cell is found at the next check, and the search starts from there.",
      moment: "Getting them out of the cell",
      casingLine:
        "The cell is checked on a fixed rota, and the corridor outside is unwatched only between reliefs.",
      momentBody:
        "The cell is empty and the captive is in the corridor. Everything from here is a chase with a passenger.",
    },
    Extraction: {
      heading: "The Subject",
      momentHeading: "When the Subject Leaves Custody",
      innerRingLabel: "Custody Floor",
      fields:
        "who they are, why they cannot simply walk out, what they will and will not agree to, who is watching them, what happens when they are missed, and — separately from reaching them — two or three genuinely different ways to get them out past the routine that tracks them",
      startsWith:
        "The subject is inside and wants out. The crew arrives with a way to move them, not a way to carry them.",
      protects:
        "the routine that keeps track of the subject, far more than any lock",
      casing:
        "an entry vector, the subject's supervised routine, and the roll-call schedule",
      completion: "walking the subject off the floor",
      escapeCause: "the subject being missed at the next roll call",
      complicationFocus:
        "the subject's willingness, who is watching them, and the timing of the handover",
      score: "one night to walk {prize} out without anyone stopping them",
      lead: "{Prize}. They want to leave; the building is what will not let them.",
      where:
        "On the secured floor, in plain sight, doing the work they are kept for.",
      window:
        "The shift handover, when who is where stops being tracked for a few minutes.",
      protection:
        "Not a lock but a routine — someone always knows where they are meant to be.",
      aftermath:
        "They are missed at the next roll call, and the building starts asking who signed them out.",
      moment: "Walking them off the floor",
      casingLine:
        "Their whereabouts are tracked by routine rather than by lock, and the tracking lapses at the shift handover.",
      momentBody:
        "They step off the floor with the crew. From here they are a person out of place, and every routine in the building is built to notice that.",
    },
    Sabotage: {
      heading: "The System",
      momentHeading: "When the Sabotage Is Committed",
      innerRingLabel: "Inner Works",
      fields:
        "what the system does, which single part actually matters, what protects that part, what visibly happens when it fails and how long the failure lasts, and — separately from reaching it — two or three genuinely different ways to break it",
      startsWith:
        "The crew arrives with tools and leaves with them. The system is running and stays in the building.",
      protects:
        "the system's critical part, and the attendants who would notice a hand on it",
      casing:
        "an entry vector, which part of the system actually matters, and the inspection schedule",
      completion: "breaking the part that matters",
      escapeCause:
        "the failure showing, or an attendant noticing the tampering",
      complicationFocus:
        "the system's redundancy, the inspection timing, and who is on the floor",
      score: "one night to break {prize} and be gone before it shows",
      lead: "{Prize}. Breaking it is easy; breaking it so that nobody knows who did is the job.",
      where:
        "The one part of the system everything else depends on, in the innermost secured space.",
      window:
        "While it is running — stopped, it gets inspected, and the damage would be found.",
      protection:
        "The vault layer, plus an attendant who would notice a hand on the wrong lever.",
      aftermath:
        "It fails visibly some time after the crew has gone, and stays failed until it can be rebuilt.",
      moment: "The moment the system breaks",
      casingLine:
        "Only one component actually matters, and it is looked over on a fixed inspection schedule.",
      momentBody:
        "The part gives way. Nothing visible happens yet, which is the point — the failure surfaces later, on its own schedule.",
    },
    Information: {
      heading: "The Record",
      momentHeading: "When the Record Is Read",
      innerRingLabel: "Inner Archive",
      fields:
        "what it records and whom it damages, what form it takes and whether it can be copied rather than removed, where it is kept and who is permitted to read it, what happens when it is found missing or found altered, and — separately from reaching it — two or three genuinely different ways to read, copy or remove it",
      startsWith:
        "The record is inside. The crew arrives with the means to read or copy it, and may not need to remove anything at all.",
      protects: "the record and the register of who is permitted to read it",
      casing:
        "an entry vector, where the record is kept and who may read it, and the audit schedule",
      completion: "reading or copying the record",
      escapeCause:
        "the record being found missing, found altered, or found read out of turn",
      complicationFocus:
        "whether a copy will do, the reading register, and the timing of the audit",
      score: "one night to get {prize} out, or a copy of it",
      lead: "{Prize}. It does not have to leave the building — it only has to be read.",
      where:
        "In the innermost secured space, filed with the rest of the records.",
      window: "During the hours it is out for use rather than sealed away.",
      protection:
        "The vault layer, and a register of who is permitted to read it.",
      aftermath:
        "A missing record is noticed at the next audit; an altered one may never be.",
      moment: "Taking or copying the record",
      casingLine:
        "It is filed with the rest of the records, readable only by the register's names, and audited on a schedule.",
      momentBody:
        "The record is read and the crew knows what it says. Whether anyone else ever learns that depends entirely on how they leave.",
    },
  } as Record<
    string,
    {
      heading: string;
      momentHeading: string;
      /**
       * The Security Rings' innermost layer's label. "Inner Vault" fits a
       * theft, a record, or a sabotage target; it does not fit a person being
       * moved through custody, which is the security rings' actual subject
       * for Extraction and Rescue jobs.
       */
      innerRingLabel: string;
      fields: string;
      startsWith: string;
      protects: string;
      casing: string;
      completion: string;
      escapeCause: string;
      complicationFocus: string;
      /** Tokens {prize} / {Prize} / {site} are substituted by the fallback. */
      score: string;
      lead: string;
      where: string;
      window: string;
      protection: string;
      aftermath: string;
      moment: string;
      casingLine: string;
      momentBody: string;
    }
  >,
  /** Fixed five-state ladder, matching the answer page's alarm track. */
  alarmStates: ["Quiet", "Suspicion", "Alert", "Lockdown", "Lethal Response"],
  complications: [
    "The buyer is already inside, negotiating with the target in person.",
    "The one detail the crew's intel was surest about changed this morning, and only one person on site knows how.",
    "A rival crew has started its own run on the same target tonight.",
    "Someone the crew knows is on guard duty and will recognise them.",
    "A member of staff has decided tonight is the night they finally do their job properly.",
    "The target expected the crew and deliberately let them in.",
    "A scheduled inspection has put twice the usual staff on site tonight.",
    "The inside contact has already been caught and is being questioned.",
  ],
  triggers: [
    "an alarm nobody knew was there starts sounding",
    "every lock in the building closes at once, including the ones behind the crew",
    "the lights die, and something in the dark starts calling the staff's names one by one",
    "a countersign the crew has never heard is shouted from three directions",
    "something that was watching announces the crew's presence in a voice nobody recognises",
    "a second, quieter alarm sounds — one the staff were never told about",
  ],
  /**
   * Why the way in closes at the point of no return. Every entry is caused by
   * the prize being lifted or the alarm it raises — a closure with an
   * unrelated cause ("the tide turned") would contradict the trigger that is
   * supposed to have caused it.
   */
  routeClosures: [
    "the doors on that side seal on the alarm and cannot be reopened from inside",
    "the reinforcements the alarm calls muster in exactly that corridor",
    "the contact who was holding it open bolts the moment the alarm starts",
    "the rival crew hears the alarm, takes that exit first, and leaves it watched",
    "the staff evacuating through it turn a quiet route into a witnessed one",
  ],
  pursuits: [
    "A specialist tracker who is paid on delivery, not on capture",
    "A patrol that has cut ahead to the crew's likely destination",
    "The rival crew, who would rather have the job's payoff than the credit",
    "A single relentless officer who saw a face and will not stop",
    "Whatever the target keeps for exactly this situation",
    "The buyer's own people, sent to make the handover cheaper",
  ],
  flashbackSeeds: [
    "A guard bribed weeks ago, who is on shift tonight",
    "Forged credentials that stand up to a bored check, but not a careful one",
    "Equipment cached somewhere inside during a legitimate visit",
    "Prior reconnaissance that answers one specific question the crew now needs",
    "An inside contact who owes someone in the crew a favour",
    "Knowledge of how the security system fails, learned from whoever installed it",
    "A rehearsed distraction that will pull staff to the wrong part of the building",
    "A debt called in with a local fixer for a single, no-questions favour",
  ],
  /**
   * What the prize's catch actually costs during play, keyed by the catch.
   * Each one names a trigger the GM can see fire — an obstacle cleared, an
   * alarm tick, a handover — rather than a wall-clock rate like "once per
   * hour" that would never come up inside a single infiltration.
   */
  pressureByComplication: {
    Huge: "Two of the crew have their hands full at all times, so every obstacle is solved short-handed by the rest — and each one solved that way costs them minutes they do not have before the shift changes.",
    Fragile:
      "Each time it is run with, fought over, or dropped, it takes a mark. The third mark ruins it.",
    Alive:
      "Once it is moved, advance a three-step distress clock each time the crew relocates it; at three steps it cries out. Calming it before a move prevents that step.",
    Cursed:
      "Every ten minutes it is carried, the bearer loses something small and permanent. Handing it on does not undo what is already gone.",
    Traceable:
      "Tracking starts only once the objective is moved out of its shielded resting place. Ten minutes later, and every ten minutes while its trace remains active, the watcher learns its rough location and can begin pursuit; disabling or shielding the trace stops these updates.",
    Volatile:
      "After handling begins, advance a three-step instability clock at each hurried climb or hard impact; at three steps it ruptures. Secure transport prevents steps; one minute spent stabilising it removes a step.",
    Anchored:
      "Freeing it takes three stages of several minutes each. Advance the house clock after every stage; on the third advance the dawn staff begin arriving.",
    Unwilling:
      "Every time it changes hands they argue, stall, or call out — once per handover, without fail.",
    Injured:
      "Two of the crew are supporting them, so every stretch of ground takes twice as long — and the patrol cycle does not slow down to match.",
    Watched:
      "The next look-in is thirty minutes after entry. Advance a three-step check clock every ten minutes of scene time; at three steps the keeper opens the door. Moving the captive does not move this deadline.",
    Deniable:
      "Advance a three-step investigation clock whenever a new witness sees the crew acting for the patron. At three steps the patron is identified; an intact cover story prevents a step.",
    Delayed:
      "The shift ends thirty minutes after entry. Advance a three-step shift clock every ten minutes; finish and conceal the delay before the third step or the incoming attendant sees the work. Set the activation time before leaving.",
    Precise:
      "Observe the routine, isolate the intended target, then prepare the tools: each stage takes five minutes and advances a three-step work clock. At three steps an attendant visits the work area; a convincing cover story explains the crew. Harming anything outside the agreed target fails the job.",
    Witnessed:
      "The witness leaves twenty minutes after entry. Advance a four-step patrol clock every five minutes; at four steps they leave unless persuaded to stay, so the deed needs another witness or a new arrangement.",
    Distinctive:
      "While carrying the package openly, advance a three-step exposure clock each time a new staff member sees it; at three steps its carrier can be described. A credible delivery cover prevents a step.",
    Perishable:
      "Advance a four-step decay clock every ten minutes from entry. At four steps the evidence looks too old to convince the inspector; keeping it chilled suspends the clock until placement.",
    Sourced:
      "Advance a three-step trace clock at every documented handover of the package. At three steps an investigator examining those records can identify the supplier; an undocumented handover leaves no step.",
    Sealed:
      "Removing the sealed record starts a three-step exposure clock, advancing every five minutes. At three steps the keeper reaches its shelf and sees the gap; returning it or leaving a convincing substitute prevents that discovery.",
    Encrypted:
      "Each attempt at the key takes ten minutes and advances a three-step work clock. At three steps the keeper refiles the record; a borrowed key avoids the attempts, while an authorised extension grants more time.",
    Voluminous:
      "The record has three sections; each takes ten minutes to copy and advances a three-step copy clock. At three steps the keeper refiles it. The first section proves the claim; the other two identify witnesses and payments.",
    Registered:
      "Each reading writes an entry in the register. A three-step audit clock advances every ten minutes from entry; at three steps the keeper checks the names. A borrowed authorised identity or a credible amendment prevents the entry exposing the crew.",
  } as Record<string, string>,
  /**
   * The quick-reference form of each pressure: the trigger and the stake, and
   * nothing else. The full line lives in the objective section; repeating it
   * verbatim in a section whose whole job is to be scannable was the single
   * most common redundancy in generated output.
   */
  pressureSummaryByComplication: {
    Huge: "Every short-handed obstacle costs time before the shift changes.",
    Fragile: "Three marks and it is ruined.",
    Alive: "Three unsettled moves cause a cry; calming it prevents a step.",
    Cursed: "A permanent loss every ten minutes carried.",
    Traceable:
      "After shielding is left, an active trace reports every ten minutes; blocking it stops pursuit updates.",
    Volatile: "Three jolts cause rupture; stabilising it removes a step.",
    Anchored: "Three stages to free; dawn staff arrive on the third.",
    Unwilling: "They stall at every handover.",
    Injured: "Twice as long over every stretch of ground.",
    Watched:
      "Cell check thirty minutes after entry, regardless of when the captive moves.",
    Deniable:
      "Three witnesses who connect the crew to the patron expose the patron.",
    Delayed: "Conceal the delay before the shift changes at thirty minutes.",
    Precise:
      "Three five-minute preparations; an attendant then visits the work area.",
    Witnessed:
      "The witness leaves after twenty minutes unless persuaded to stay.",
    Distinctive:
      "Three sightings identify the carrier unless a delivery cover explains them.",
    Perishable:
      "Evidence spoils at forty minutes; chilling pauses decay until placement.",
    Sourced: "Three recorded handovers let an investigator trace the supplier.",
    Sealed:
      "Fifteen minutes after removal, the keeper sees an unexplained gap.",
    Encrypted:
      "Three ten-minute attempts before refiling; a key or extension saves time.",
    Voluminous:
      "Ten minutes per section; the first proves the claim, all three take thirty minutes.",
    Registered:
      "The keeper audits the reading register thirty minutes after entry.",
  } as Record<string, string>,
};

/**
 * Length targets. The prompt aims at {@link HEIST_WORD_TARGET} and the
 * validator tolerates up to {@link HEIST_WORD_BUDGET}: aiming low is what
 * actually moves a model's output down, while flagging every word over the
 * target would fire on most generations and buy nothing, since length alone
 * never earns a repair call. Both live here so the two numbers cannot drift
 * apart by accident — the gap between them is deliberate.
 */
export const HEIST_WORD_TARGET = 900;
export const HEIST_WORD_BUDGET = 1300;

export interface HeistGeneratorOptions {
  genre?: string;
  heistType?: string;
  targetScale?: string;
  targetType?: string;
  prize?: string;
  campaignContext?: string;
}

export interface ResolvedHeist {
  genre: string;
  heistType: string;
  targetScale: string;
  targetType: string;
  prize?: string;
  campaignContext?: string;
  title: string;
  prizeComplication: string;
  /** The catch's label alone, e.g. "Fragile" — keys `pressureByComplication`. */
  prizeComplicationLabel: string;
  /** What the catch costs during play, and the trigger that makes it cost. */
  pressure: string;
  /** The scannable form of the same, for the GM Quick Reference. */
  pressureSummary: string;
  /** The objective section's heading for this heist type, e.g. "The Target". */
  objectiveHeading: string;
  /** The actionable fields that section has to carry for this heist type. */
  objectiveFields: string;
  /** The point-of-no-return section's heading for this heist type. */
  momentHeading: string;
  /** The label for Security Rings' innermost layer, e.g. "Custody Floor". */
  innerRingLabel: string;
  /** Who holds the core object when the job begins, and what the crew carries. */
  objectiveStartsWith: string;
  /** What the three security rings actually protect for this heist type. */
  objectiveProtects: string;
  /** What the three casing bullets must cover for this heist type. */
  objectiveCasing: string;
  /** The action that completes the objective. */
  objectiveCompletion: string;
  /** What tips the job from infiltration into escape. */
  objectiveEscapeCause: string;
  /** What complications should threaten for this heist type. */
  objectiveComplicationFocus: string;
  /** Per-type fallback copy; tokens are substituted in generateHeistLocal. */
  objectiveCopy: {
    score: string;
    lead: string;
    where: string;
    window: string;
    protection: string;
    aftermath: string;
    moment: string;
    casingLine: string;
    momentBody: string;
  };
}

function resolveHeist(options: HeistGeneratorOptions, rng: Rng): ResolvedHeist {
  const genre = options.genre?.trim() || "Classic Fantasy";
  const targetType =
    options.targetType?.trim() ||
    pickFrom(
      heistConfig.targetTypesByTheme[genre] ?? heistConfig.targetTypes,
      rng,
    );
  const heistType =
    options.heistType?.trim() || pickFrom(heistConfig.heistTypes, rng);
  // The catch has to suit what the objective actually is — see catchesByKind.
  const catchKind = heistConfig.catchKindByType[heistType] ?? "object";
  const prizeComplication = pickFrom(
    heistConfig.catchesByKind[catchKind] ?? heistConfig.prizeComplications,
    rng,
  );
  const prizeComplicationLabel = prizeComplication.split(" — ")[0];
  // A custom heist type has no dedicated section, so it falls back to the
  // generic objective rather than losing the section altogether.
  const objective = heistConfig.objectives[heistType] ?? {
    heading: "The Objective",
    momentHeading: "When the Objective Is Met",
    innerRingLabel: "Inner Vault",
    fields:
      "what it is, where it is, what protects it, what changes once the crew has it, and two or three genuinely different ways to reach it",
    startsWith:
      "The objective is inside the target. The crew arrives with what they can carry.",
    protects: "the objective, wherever it sits",
    casing:
      "an entry vector, a known obstacle, and where the objective sits and how it is handled",
    completion: "doing the thing the job was hired for",
    escapeCause: "the crew's work being noticed",
    complicationFocus:
      "the objective's location, its handling, and who else has an interest in it",
    score: "one night to get {prize} clear of it",
    lead: "{Prize}. Getting to it is the job; getting away afterwards is the rest of it.",
    where: "In the innermost secured space, behind all three rings.",
    window: "Only while the space is open for its usual business.",
    protection: "The vault layer, plus whoever holds legitimate access to it.",
    aftermath: "The target knows within the hour, and acts on it.",
    moment: "Taking the objective",
    casingLine:
      "It sits in the innermost secured space and is handled on a fixed routine.",
    momentBody:
      "The job is done, and the building has not caught up with that fact yet.",
  };
  return {
    genre,
    heistType,
    targetScale:
      options.targetScale?.trim() || pickFrom(heistConfig.targetScales, rng),
    targetType,
    prize: options.prize?.trim() || undefined,
    campaignContext: options.campaignContext?.trim() || undefined,
    title: `The ${generateName(rng)} ${pickFrom(["Job", "Score", "Run", "Lift", "Take"], rng)}`,
    prizeComplication,
    prizeComplicationLabel,
    pressure:
      heistConfig.pressureByComplication[prizeComplicationLabel] ??
      "The catch bites every time the crew has to move quickly, and moving quickly is the whole job.",
    pressureSummary:
      heistConfig.pressureSummaryByComplication[prizeComplicationLabel] ??
      "The catch bites whenever the crew has to move quickly.",
    objectiveHeading: objective.heading,
    objectiveFields: objective.fields,
    momentHeading: objective.momentHeading,
    innerRingLabel: objective.innerRingLabel,
    objectiveStartsWith: objective.startsWith,
    objectiveProtects: objective.protects,
    objectiveCasing: objective.casing,
    objectiveCompletion: objective.completion,
    objectiveEscapeCause: objective.escapeCause,
    objectiveComplicationFocus: objective.complicationFocus,
    objectiveCopy: {
      score: objective.score,
      lead: objective.lead,
      where: objective.where,
      window: objective.window,
      protection: objective.protection,
      aftermath: objective.aftermath,
      moment: objective.moment,
      casingLine: objective.casingLine,
      momentBody: objective.momentBody,
    },
  };
}

// The only labels this generator's own schema asks for. "heist" drives the
// main/rail content split in generator-document-layout.ts (LAYOUT_RULES),
// matched by `labels.includes(rule.label)` in rule-array order — so a stray
// foreign label the model echoes back (e.g. "quest-generator", which appears
// earlier in that array) would win the match against this generator's own,
// differently-headed lore. Whitelisting closes that off.
const KNOWN_LABELS = ["heist", "heist-generator", "infiltration"];

// The resolved options are just as user-controlled as the model's output: the
// public form's genre/heist-type/target selects all accept custom free text
// (SelectWithCustomOption), and the in-app "Target" option is a plain text
// field. Echoing them into `labels` unchecked would reopen exactly the hijack
// KNOWN_LABELS closes — a user typing "quest-generator" as their target would
// win the LAYOUT_RULES match ahead of "heist" and split this generator's lore
// against quest's headings. Custom values still flavour the generated content;
// they just don't become labels.
const CANONICAL_GENRES = Object.keys(heistConfig.targetTypesByTheme);
const CANONICAL_TARGETS = [
  ...Object.values(heistConfig.targetTypesByTheme).flat(),
  ...heistConfig.targetTypes,
];

function canonicalOptionLabels(resolved: ResolvedHeist): string[] {
  const labels: string[] = [];
  if (heistConfig.heistTypes.includes(resolved.heistType)) {
    labels.push(resolved.heistType);
  }
  if (CANONICAL_TARGETS.includes(resolved.targetType)) {
    labels.push(resolved.targetType);
  }
  if (CANONICAL_GENRES.includes(resolved.genre)) {
    labels.push(resolved.genre);
  }
  return labels;
}

export interface HeistPrompt {
  systemInstruction: string;
  userMessage: string;
  resolved: ResolvedHeist;
}

export function buildHeistPrompt(
  options: HeistGeneratorOptions = {},
  sessionContext = "",
  rng: Rng = defaultRng,
): HeistPrompt {
  const resolved = resolveHeist(options, rng);

  const userMessage = `Generate a table-ready RPG heist scenario in JSON format. This is a playable situation with interacting parts — an objective, intel, layered security, escalating consequences, and an escape shaped by the crew's choices — not an adventure synopsis and not long-form prose. Every detail you write must either create a decision, reveal usable information, or change how the heist can play. Cut anything that only sets a mood.
Options:
- Genre: ${resolved.genre}
- Heist Type: ${resolved.heistType}
- Target Scale: ${resolved.targetScale}
- Target: ${resolved.targetType}
- Starting position: ${resolved.objectiveStartsWith}
- What the security protects: ${resolved.objectiveProtects}
- Objective transition (not full mission success): ${resolved.objectiveCompletion}
- Possible detection trigger (not necessarily immediate): ${resolved.objectiveEscapeCause}
- Objective Complication (the objective MUST have this practical problem): ${resolved.prizeComplication}
- Pressure (what that complication costs during play, and when it bites): ${resolved.pressure}
${resolved.prize ? `- Requested Prize / Objective: ${resolved.prize}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative name for this score (3-6 words)",
  "summary": "One sentence preserving the full success condition of The Score",
  "content": "Player-facing material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### The Score' (ONE sentence naming the full success condition, the place, and the deadline, including getting clear with the objective where required — e.g. \\"Steal the Glass Testament from beneath the Cathedral of Saint Orla before its contents are read aloud at dawn\\" — plus at most one more sentence of context), '### ${resolved.objectiveHeading}' (at most four sentences covering ${resolved.objectiveFields}, then two bullets: '- **The catch**: ' restating the practical complication given in the options as a concrete physical problem, and '- **Pressure**: ' stating what that costs and the exact trigger that makes it cost. State when this pressure becomes active; do not apply carrying or tracking pressure before the objective is moved or the tracking mechanism activates. Use a concrete trigger during play: an obstacle cleared, an alarm tick, a handover, or a short in-scene interval of minutes. Never a long wall-clock cadence such as once an hour, once a day, or once a week, and never a vague \\"over time\\"), '### Casing the Target' (exactly three '- **Label**: detail' bullets, one sentence each, covering ${resolved.objectiveCasing}).",
  "lore": "GM-only material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### GM Quick Reference' (seven one-line bullets and nothing else — '- **Objective**:', '- **Primary obstacle**:', '- **Hidden factor**:', '- **Point of no return**:', '- **Pressure**:', '- **Default complication**:', '- **Escape problem**:' — each a single short sentence summarising the corresponding section; Objective must preserve the full success condition from The Score, including escape where required, so a GM understands the whole heist in under thirty seconds. Summarise; never copy a sentence verbatim from the section it stands for), '### The Hidden Factor' (at most two sentences: one thing the crew's intel gets wrong, and when it becomes obvious at the table. It must complicate the plan, never invalidate every approach at once), '### Security Rings' (three bullets, '- **Perimeter**: ', '- **Access**: ', '- **${resolved.innerRingLabel}**: ', TWO TO FOUR SENTENCES EACH. These rings protect ${resolved.objectiveProtects} — describe what protects each layer, then two or three genuinely different ways past it. Draw those from stealth, deception, social leverage, stolen credentials, magic or technology, physical infiltration, bribery, prior preparation, exploiting a schedule, or environmental access — not three variations on fighting, and never one intended solution), '### Alarm Track' (exactly five bullets, '- **0 — Quiet**:' through '- **4 — Lethal Response**:', ONE OR TWO SENTENCES EACH, using the labels Quiet, Suspicion, Alert, Lockdown, Lethal Response. Each level must change what the opposition does, close or complicate some options, and still leave the crew a real choice. Level 4 is extremely dangerous but still interactive — no automatic death, and no state where every exit is simply impossible; if something seals the building, name the obvious but costly way to answer it), '### Complications' (exactly three '- **Label**: detail' bullets, one sentence each, one marked '(default)' after its label. They should threaten ${resolved.objectiveComplicationFocus}. Build them from people, factions, or facts already established elsewhere in this scenario wherever you can, rather than introducing new ones), '### ${resolved.momentHeading}' (at most two sentences: what changes when the crew completes ${resolved.objectiveCompletion}, then whether and when security can discover it through ${resolved.objectiveEscapeCause}. Preserve any undetected window, successful bypass, or scheduled delay; an objective transition does not itself advance time or force an alarm. The consequences in \\"The Getaway\\" must follow that timing), '### The Getaway' (one sentence stating whether and until when the entry route remains usable, according to \\"${resolved.momentHeading}\\", then two or three '- **Label**: detail' bullets, one sentence each, for genuinely different escape options, including the original route if still usable — fast but exposed, covert but socially risky, environmentally dangerous, one that costs the crew their equipment, one that needs an NPC's help — then a final '**Pursuit**: ' line naming a possible pursuer and the event or information that lets them follow; a successful covert escape may avoid pursuit), '### Flashback Opportunities' (four to six '- ' bullets, one line each, naming preparations the players COULD establish. Each must attach to an obstacle actually described above, and none may do something the security rules established above say is impossible. Offer them; never state that the players used them).",
  "labels": ["heist", "heist-generator"]
}
Every heading above appears exactly ONCE in the whole result. "content" and "lore" must share no heading between them, neither may repeat one of its own, and you must never emit a heading with nothing written under it. Do not restate a section you have already written.
Density matters as much as content. The entire result — "content" and "lore" together — must come in under ${HEIST_WORD_TARGET} words; a GM has to be able to scan it at the table. Short paragraphs and bullets only. Do not restate the same fact in "The Prize", "Security Rings", "Alarm Track", "The Getaway", and "Flashback Opportunities" — state it once, in the section that owns it, and let the others rely on it.
Keep every effect system-neutral: describe what happens in the fiction, never in one game's mechanics. Do not use rounds, turns, saving throws, DCs, checks, advantage/disadvantage, hit points, damage numbers, or any named condition from a specific system. Write "the tuning fork can briefly immobilise whoever it is aimed at", not "the tuning fork freezes the bearer for one round". This generator only produces the idea — a GM converts it to their system of choice at the table.
Do NOT merely rename theft concepts for the other heist types. The selected heist type determines the scenario's logic: what the crew begins with, what they must reach, what action completes the objective, and what enables detection or pursuit. Take the starting position above literally — if the crew already carries the objective then it is NOT inside the target, there is no retrieval step to write, and the security exists to keep them away from where it must go; if the objective is a person, a system, or a record, the job is not a removal unless the starting position says it is. The selected heist type must materially shape the scenario, not just the wording of "The Score". "${resolved.objectiveHeading}" carries the actionable detail for a ${resolved.heistType} job, and the casing intel, security rings, complications and getaway must all engage with that objective rather than treating it as a container to be lifted. If "The Score" names a second objective as well — an object to take AND a person to kill, say — that objective gets its own section immediately after "${resolved.objectiveHeading}", written to the same depth, with its own location, window, protection and two or three ways to reach it.
Getting to the objective and accomplishing it are two different problems, and the scenario must solve both. The security rings answer "how do we reach it"; "${resolved.objectiveHeading}" must answer "and then what do we actually do", with more than one live option. A job whose only answer is a single prescribed action once the crew arrives has no objective for the players to solve.
If the objective has a special vulnerability, weakness, or single point that matters, say in one clause WHY it works — a ward anchored there, an old injury the wards never sealed, a maker's flaw. An unexplained weak point reads as an arbitrary game mechanic rather than something true about the fiction, and the players cannot reason about it.
Any clock you introduce must be runnable: name what advances it and how many advances fill it. "Advance the work clock" with no stated stages and no stated limit cannot be run at a table.
Once active, Pressure must advance during the job, not only on failure. Give it a visible independent trigger and consequence.
Set the score firmly within the ${resolved.genre} genre — the target, its security, the alarm flavour, and the pursuit should all feel native to that setting rather than a fantasy heist with the nouns swapped.
Scale the target to "${resolved.targetScale}": a Small score is a single building with a handful of staff, a Major score is a well-defended institution with a real security budget, and a Legendary score is a place that has never been successfully robbed and everyone knows it.
${NAME_BAN_PROMPT}
${sessionContext}
Write every section as scene-appropriate prose. Do not restate the wording of these instructions verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated — the output is the scenario itself, nothing about producing it.
Before returning, run a consistency pass and fix anything that fails it. Contradictions: nothing offered as a solution may be something an earlier rule declared impossible, unless the text explicitly explains how that rule is circumvented — if the ward only admits a living guild member, no later flashback or route may bypass it with a dead member's signet. Every access method obeys the rules established for that ring; every named person, faction, patron, or rival keeps one consistent role throughout; no alarm effect closes a route that a later section still offers; "The Hidden Factor" complicates the plan without invalidating every approach at once. Continuity: the prize in "The Score", "The Prize", and the "Casing the Target" bullet is the same object; the entry vector is a real way through the "Perimeter" ring; escape options remain usable until their stated closure triggers, including the original entry route; the "GM Quick Reference" lines match the sections they summarise. Ownership and location: confirm who holds the objective when the job begins, and keep it consistent everywhere. If the crew starts with it, no section may also describe it as already secured inside the target, and there must be no step spent retrieving it. If the target holds it, the crew must not already have it. Alarm reachability: every level of the alarm track must be a state that can plausibly be reached during play — a mandatory objective action may not jump the track straight to Lockdown or Lethal Response, since that skips the escalation the track exists to provide. Objective completion need not raise the alarm at all; only an established detection event does, and it must respect successful bypasses. Objective coverage: every objective named in "The Score" has its own section with its own location, window, protection and multiple ways in, and is engaged with by the casing intel, the rings, and the getaway — never introduce an objective in "The Score" and then ignore it for the rest of the scenario. Playability: each security ring names at least two genuinely different approaches; the five alarm states escalate without repeating each other and level 4 still leaves a costly option; exactly one complication is marked "(default)"; pressure has an activation condition and a concrete trigger during play; an independent deadline can advance even while objective-specific pressure is dormant. Distinctness: if the alarm track already closes a route at some level, "When the Prize Is Taken" must not simply close it again — either name a different mechanism, or say explicitly that it makes the existing closure irreversible. No section repeats a heading used anywhere else, and no heading is left with nothing under it. Density: delete any sentence that does not create a decision, reveal usable information, or change how the heist plays.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

/**
 * Drop repeated and heading-only sections at parse time.
 *
 * The renderer already enforces this for what a reader sees, but the parsed
 * output is also what gets saved to the vault — and, more to the point, a
 * duplicate is something code can fix perfectly, so it must never be worth a
 * repair call. Measured: asking the model to deduplicate turned one duplicate
 * into three, because "tidy this up" invites restructuring.
 *
 * `seen` carries across the content and lore fields so a lore section cannot
 * duplicate a heading that content already used. Untitled preamble text has no
 * key to collide on and is always kept.
 */
function dedupeSections(markdown: string, seen: Set<string>): string {
  const matches = [...markdown.matchAll(/^#{2,4}\s+(.+?)\s*$/gm)];
  if (matches.length === 0) return markdown;
  const kept: string[] = [];
  const preamble = markdown.slice(0, matches[0].index ?? 0).trim();
  if (preamble) kept.push(preamble);
  for (const [i, match] of matches.entries()) {
    const start = match.index ?? 0;
    const end = matches[i + 1]?.index ?? markdown.length;
    const block = markdown.slice(start, end).trim();
    const heading = match[1].trim();
    const body = block.split("\n").slice(1).join("\n").trim();
    if (!body) continue;
    const key = heading.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(block);
  }
  return kept.join("\n\n");
}

/**
 * Pass 2 — validate and repair.
 *
 * Pass 1 is asked to invent an interesting heist *and* police its own logic,
 * and those goals compete: the remaining failures in real output were almost
 * all consistency failures rather than dull content. This turn reads the
 * finished heist as a whole and fixes it, with the deterministic findings from
 * heist-validation.ts passed in verbatim so the model spends its attention on
 * the semantic checks it is the only thing that can do.
 *
 * The hard constraint is minimal edits. A repair pass that decides to move the
 * job to the docks and replace the fixer with a cyborg priest has thrown away
 * pass 1's work, so this prompt forbids reinvention in as many words.
 *
 * DESIGN NOTE (#2768): live samples repeatedly applied consequences in the
 * wrong state or mistook freeing/taking the objective for completing the
 * whole Score. Reconstructing the scenario's states replaces the separate
 * timing, detection, propagation, and bypass invariants. These are a model
 * of possible play, not mandatory sequential scenes: detection can occur
 * early, or the crew can escape before it. Keep the remaining review compact
 * and carry physical constraints through every state.
 *
 * @param findings deterministic problems already detected, possibly empty;
 *   semantic review runs even when these checks pass.
 */
export function buildHeistRepairPrompt(
  findings: readonly { message: string }[],
  resolved: ResolvedHeist,
): string {
  // Built without a leading/trailing newline of its own, so the template
  // below controls all line breaks and the prompt is stable either way
  // rather than depending on `detected` carrying its own whitespace.
  const detected = findings.length
    ? `Automated checks already found these specific problems — fix every one; if one asks you to cut length, cutting IS the minimal edit:\n${findings.map((f, i) => `${i + 1}. ${f.message}`).join("\n")}\n\n`
    : "";

  return `Verify and repair this generated tabletop RPG heist.

Do not generate a new heist. Make the smallest fixes. Replace sentences instead of expanding sections. Return no more words than the original and never exceed ${HEIST_WORD_BUDGET} words; delete at least as much as you add.

Job: ${resolved.heistType}, ${resolved.genre}. Objective: "${resolved.objectiveHeading}". Transition: "${resolved.momentHeading}". Starting position: ${resolved.objectiveStartsWith}

Before repairing the heist, silently reconstruct its sequence of states:
1. Infiltration — the objective action is not yet completed.
2. Objective transition — prize taken, captive freed, evidence planted, sabotage committed, etc.; the full Score may remain incomplete.
3. Undetected window — if one logically exists, the objective action is complete but security has not discovered it.
4. Detection / response — a specific event reveals the action or intrusion; identify when discovery, alarm, and response each occur.
5. Escape — fulfil the full Score by leaving with the prize, captive, information, etc., as required.

These are possible states, not mandatory scenes. Detection may occur during infiltration. Escape can overlap the undetected window or finish before detection; immediate detection requires an established mechanism. Never invent an automatic alarm merely to force a getaway.

For every clock, pressure, security response, route closure, pursuit, and alarm trigger, identify its active state, activation event, and consequence. No tracking pursuit before the fiction provides an active way to track the crew or objective. Never make a scheduled future event happen instantly because the objective transition occurred: transition → undetected window → scheduled check → discovery → alarm. Deadlines, inspections, handovers, windows, and lockdowns that refer to the same event must agree on its time. Every clock must say exactly what advances it; "each obstacle" only works if those obstacles are defined.

Keep the original entry route available until its stated closure trigger, including a race to leave before it closes. Carry successful bypasses into every later state: a spoofed or disabled sensor cannot detect them unless an established event restores it. Any independent detection needs its own explicit trigger. Consequences of a failed approach must not become inevitable on the successful path.

Verify that "The Score", "${resolved.momentHeading}", "The Getaway", "GM Quick Reference", "Alarm Track", "Pressure", and "Complications" describe the same sequence; summaries must preserve the same facts and default complication. The GM Quick Reference Objective must preserve the full success condition from "The Score": leaving a cell, vault, or custody floor is not mission success when escape is still required.

Carry the prize's catch through to the end. The established catch — ${resolved.prizeComplication} — must still be true in "The Getaway", the flashbacks, and the pursuit, not only inside the security rings. Repair any route, tool, or pursuer that ignores it, such as a roof escape or a hand-carried tool for something huge or fragile.

${detected}Then do the normal pass: contradictions between sections; objectives in "The Score" left unsupported; wrong terminology for the heist type; inconsistent locations, ownership, NPC roles, or motivations; hidden factors that invalidate rather than complicate the plan; security approaches that turn out not to work; alarm levels that are skipped or insufficiently escalating; generic flashbacks where scenario-specific ones are possible; details leaking in from elsewhere; genre-inappropriate or system-specific language; duplicated or empty sections; and any unusual tool or fact introduced prominently in "The Score" that never affects play later (integrate it into an obstacle, or remove it).

Every primary objective has multiple viable approaches where appropriate — not merely multiple ways to reach it. Every complication changes play in a concrete way. The scenario remains playable at every alarm level.

Return the complete corrected heist as a valid JSON object in the exact same schema as before — "title", "summary", "content", "lore", "labels" — with every field present, not just the parts you changed. If nothing needs fixing, return what you wrote unchanged.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;
}

export function parseHeistResponse(
  text: string,
  resolved: ResolvedHeist,
  _rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
  if (
    !data ||
    typeof data.content !== "string" ||
    typeof data.lore !== "string"
  ) {
    throw new Error("Heist response must contain content and lore strings.");
  }
  const seenHeadings = new Set<string>();
  const content = dedupeSections(data.content || "", seenHeadings);
  const lore = dedupeSections(data.lore || "", seenHeadings);
  const rawLabels = Array.isArray(data.labels) ? data.labels : [];
  const labels = rawLabels.filter(
    (label: unknown): label is string =>
      typeof label === "string" && KNOWN_LABELS.includes(label),
  );
  if (!labels.includes("heist")) labels.unshift("heist");
  for (const label of canonicalOptionLabels(resolved)) {
    if (!labels.includes(label)) labels.push(label);
  }
  return {
    type: "event",
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : resolved.title,
    summary:
      typeof data.summary === "string" && data.summary.trim()
        ? data.summary
        : content
            .split("### The Score")[1]
            ?.split(/\n### /)[0]
            ?.trim() || resolved.title,
    content,
    // Missing sections remain visible to review. Generic backfills can invent
    // security responses or flashbacks that contradict the actual scenario.
    lore,
    labels,
    status: "active",
  };
}

export function generateHeistLocal(
  options: HeistGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveHeist(options, rng);
  const state = heistLocalState(resolved.heistType);
  const capitalise = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;
  const site = `${generateName(rng)} ${resolved.targetType}`;
  const prize =
    resolved.prize ||
    heistConfig.defaultPrizes[resolved.heistType] ||
    `the ${resolved.targetType.toLowerCase()}'s single most closely held asset`;
  const complicationDetail = resolved.prizeComplication.split(" — ")[1];
  const fill = (template: string) =>
    template
      .replace(/\{prize\}/g, prize)
      .replace(/\{Prize\}/g, capitalise(prize))
      .replace(/\{site\}/g, site);

  const defaultComplication = pickFrom(heistConfig.complications, rng);
  const otherComplications = heistConfig.complications.filter(
    (c) => c !== defaultComplication,
  );
  const secondComplication = pickFrom(otherComplications, rng);
  const thirdComplication = pickFrom(
    otherComplications.filter((c) => c !== secondComplication),
    rng,
  );

  const flashbacks = [...heistConfig.flashbackSeeds];
  const chosenFlashbacks: string[] = [];
  for (let i = 0; i < 5 && flashbacks.length > 0; i += 1) {
    const seed = pickFrom(flashbacks, rng);
    chosenFlashbacks.push(seed);
    flashbacks.splice(flashbacks.indexOf(seed), 1);
  }

  // Campaign context is a sentence inside The Score, not a section of its own:
  // the AI schema declares `content` holds exactly Score/Prize/Casing, and a
  // fallback that invents a fourth heading would make the two paths
  // structurally different for no reader benefit.
  const content = `### The Score
${resolved.heistType} at the ${site}, a ${resolved.targetScale.toLowerCase()}-scale ${resolved.targetType.toLowerCase()}: ${fill(resolved.objectiveCopy.score)}.${resolved.campaignContext ? ` This score ties into ${resolved.campaignContext}.` : ""}

### ${resolved.objectiveHeading}
${fill(resolved.objectiveCopy.lead)}
- **Where**: ${fill(resolved.objectiveCopy.where)}
- **Window**: ${state.window}
- **Protection**: ${fill(resolved.objectiveCopy.protection)}
- **Methods**: ${state.methods}
- **Once it is done**: Escape still matters; witnesses or active tracing can expose the crew before the scheduled check.
- **The catch**: ${resolved.prizeComplicationLabel} — ${complicationDetail ?? "it will not travel quietly"}.
- **Pressure**: ${resolved.pressure}

### Casing the Target
- **Entry vector**: A service route staff use daily stays open throughout this shift; its covered alcove is out of sight of the outer patrol.
- **Known obstacle**: The credential check between the public floor and the secured floor is watched, not merely locked.
- **The objective**: ${fill(resolved.objectiveCopy.casingLine)}`;

  const lore = `### GM Quick Reference
- **Objective**: ${resolved.heistType} — ${fill(resolved.objectiveCopy.score)}.
- **Primary obstacle**: Three layers — patrols outside, a watched credential check, and the ${resolved.innerRingLabel.toLowerCase()}.
- **Hidden factor**: A relief guard now rests in the service alcove; their lantern is visible before entry.
- **Point of no return**: ${resolved.objectiveCopy.moment} begins the escape; discovery depends on the method and inspection timing.
- **Pressure**: ${resolved.pressureSummary}
- **Default complication**: ${defaultComplication}
- **Escape problem**: The service entrance is blocked five minutes after an alarm, leaving time to race back.

### The Hidden Factor
A relief guard rests in the service alcove this shift, although the crew's briefing called it empty. Their lantern is visible from outside: wait for them to leave on an errand, draw them away, or enter openly with a credible delivery.

### Security Rings
- **Perimeter**: Patrols circle the ${site}. Pass by timing a gap between rounds, by arriving with expected staff, or by crossing the unwatched yard wall.
- **Access**: A veteran keeper checks credentials at the secured floor. Pass by borrowing a credential, by arranging a staff escort, or by posing as a worker called to fix the door.
- **${resolved.innerRingLabel}**: A watched door protects ${resolved.objectiveProtects}. Borrow the key, arrange an escorted visit, or remove the hinge pins while the keeper is away; the objective's catch still applies.

### Alarm Track
- **0 — Quiet**: Routine holds. Patrols on schedule, staff bored, nobody looking for anyone.
- **1 — Suspicion**: One guard breaks routine to check what bothered them. Patrol timings stop being predictable.
- **2 — Alert**: A witness reports an intrusion or the scheduled check finds unexplained evidence. Exits are watched and reinforcements called; they reach the service entrance in five minutes.
- **3 — Lockdown**: Five minutes after Alert, reinforcements block the service entrance and bar the public doors. The drains remain open; a forged evacuation order or distracting the entrance guards can still get people out.
- **4 — Lethal Response**: Whatever the target keeps for this is loose and hunting to kill. It covers the exits — but it can be drawn off, bargained with, or given something it wants more than the crew.

### Complications
- **Likely (default)**: ${defaultComplication}
- **Alternative**: ${secondComplication}
- **Alternative**: ${thirdComplication}

### ${resolved.momentHeading}
${state.transition} ${HEIST_LOCAL_RESPONSE}

### The Getaway
${HEIST_LOCAL_ESCAPE}
- **Race back**: Retrace the service route in three minutes, plus any delay imposed by the catch; after it is blocked, lure the guards away or negotiate passage.
- **Public departure**: Walk out with the departing staff before Lockdown; afterwards, a forged evacuation order can persuade the door guards, at the cost of a face-to-face challenge.
- **Drain route**: The yard drain reaches beyond the wall in fifteen minutes; its narrow bend only admits cargo that fits intact or can safely be dismantled, and injured passengers need support. Otherwise use a full-width exit.
**Pursuit**: Guards follow only if a witness identifies the crew's exit or an active trace reveals their location; breaking that trail lets the crew escape unseen.

### Flashback Opportunities
Offer these; never assume the players used them.
${chosenFlashbacks.map((f) => `- ${f}`).join("\n")}`;

  return {
    type: "event",
    title: resolved.title,
    summary: `${resolved.heistType}: ${fill(resolved.objectiveCopy.score)}.`,
    content,
    lore,
    labels: ["heist", "heist-generator", ...canonicalOptionLabels(resolved)],
    status: "active",
  };
}

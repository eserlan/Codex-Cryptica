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
 * state that actually changes the fiction, and a getaway whose original plan
 * is already broken before the players reach it.
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
      "It frets whenever it is moved and panics outright at each alarm tick — advance the distress clock every time the crew relocates it, and when it fills it makes a noise someone hears.",
    Cursed:
      "Every ten minutes it is carried, the bearer loses something small and permanent. Handing it on does not undo what is already gone.",
    Traceable:
      "Every ten minutes, whoever is hunting it learns roughly where it is — and moves.",
    Volatile:
      "It grows less stable the longer it is handled — advance the instability clock at every obstacle the crew carries it through, and any fall or hurried climb risks setting it off outright.",
    Anchored:
      "Freeing it takes three stages of several minutes each. Advance the house clock after every stage; on the third advance the dawn staff begin arriving.",
    Unwilling:
      "Every time it changes hands they argue, stall, or call out — once per handover, without fail.",
    Injured:
      "Two of the crew are supporting them, so every stretch of ground takes twice as long — and the patrol cycle does not slow down to match.",
    Watched:
      "The next look-in is already scheduled. Advance the check clock at every obstacle; when it fills, someone opens that door.",
    Deniable:
      "Every person who sees the crew is one more thread back to the patron. Advance the investigation clock at each sighting; when it fills, the patron is named.",
    Delayed:
      "The delay has to be set before the shift ends, and the mechanism is looked over at the change — advance the shift clock after each stage of the work.",
    Precise:
      "Finding the one part that matters costs time — advance the work clock at each stage of tracing it, and when it fills an attendant comes to check. Anything broken beside it fails loudly and at once.",
    Witnessed:
      "The witness has to be in position first and will not wait past the next patrol — advance the patrol clock each time the crew is delayed.",
    Distinctive:
      "It cannot be pocketed — advance the exposure clock every time the crew passes someone, and when it fills a staff member remembers what they saw.",
    Perishable:
      "It reads as fresh for a few hours only — advance the decay clock at every obstacle, and when it fills the plant will convince nobody.",
    Sourced:
      "Every hand it passes through adds a name to the trail — advance the trace clock at each handover, and when it fills the supplier can be identified.",
    Sealed:
      "It cannot be read in place — advance the exposure clock at each stage of moving it somewhere it can be, and when it fills someone sees the gap on the shelf.",
    Encrypted:
      "Every attempt at the key costs minutes the crew can hear passing — advance the work clock at each attempt, and when it fills the reading hour ends.",
    Voluminous:
      "Copying runs at a fixed rate — advance the copy clock every few minutes, and the crew must decide how much is enough before it fills.",
    Registered:
      "Every reading writes a line in the register — advance the audit clock each time the crew opens it, and when it fills the next reader sees their entry.",
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
    Alive: "Distress clock; when it fills, it makes a noise.",
    Cursed: "A permanent loss every ten minutes carried.",
    Traceable: "The hunt relocates every ten minutes.",
    Volatile: "Instability clock rises at every obstacle.",
    Anchored: "Three stages to free; dawn staff arrive on the third.",
    Unwilling: "They stall at every handover.",
    Injured: "Twice as long over every stretch of ground.",
    Watched: "Check clock; when it fills, that door opens.",
    Deniable: "Investigation clock; when it fills, the patron is named.",
    Delayed: "Shift clock; the mechanism is looked over at the change.",
    Precise: "Work clock; when it fills, an attendant comes to check.",
    Witnessed: "Patrol clock; the witness will not wait past it.",
    Distinctive: "Exposure clock at every person passed.",
    Perishable: "Decay clock; when it fills, nobody believes it.",
    Sourced: "Trace clock; when it fills, the supplier is named.",
    Sealed: "Exposure clock while it is moved to be read.",
    Encrypted: "Work clock per attempt; the reading hour ends when it fills.",
    Voluminous: "Copy clock; how much is enough is the crew's call.",
    Registered: "Audit clock; the next reader sees their entry.",
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
export const HEIST_WORD_BUDGET = 1100;

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

  const userMessage = `Generate a table-ready RPG heist scenario in JSON format. This is a playable situation with interacting parts — an objective, intel, layered security, escalating consequences, and a compromised escape — not an adventure synopsis and not long-form prose. Every detail you write must either create a decision, reveal usable information, or change how the heist can play. Cut anything that only sets a mood.
Options:
- Genre: ${resolved.genre}
- Heist Type: ${resolved.heistType}
- Target Scale: ${resolved.targetScale}
- Target: ${resolved.targetType}
- Starting position: ${resolved.objectiveStartsWith}
- What the security protects: ${resolved.objectiveProtects}
- The action that completes the job: ${resolved.objectiveCompletion}
- What starts the escape: ${resolved.objectiveEscapeCause}
- Objective Complication (the objective MUST have this practical problem): ${resolved.prizeComplication}
- Pressure (what that complication costs during play, and when it bites): ${resolved.pressure}
${resolved.prize ? `- Requested Prize / Objective: ${resolved.prize}\n` : ""}${formatCampaignContextBlock(resolved.campaignContext)}

You must return a valid JSON object matching the following structure exactly:
{
  "title": "A single evocative name for this score (3-6 words)",
  "content": "Player-facing material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### The Score' (ONE sentence naming the prize, the place, and the deadline — e.g. \\"Steal the Glass Testament from beneath the Cathedral of Saint Orla before its contents are read aloud at dawn\\" — plus at most one more sentence of context), '### ${resolved.objectiveHeading}' (at most four sentences covering ${resolved.objectiveFields}, then two bullets: '- **The catch**: ' restating the practical complication given in the options as a concrete physical problem, and '- **Pressure**: ' stating what that costs and the exact trigger that makes it cost. Use something the GM can see fire during one infiltration: an obstacle cleared, an alarm tick, a handover, or a short in-scene interval of minutes. Never a long wall-clock cadence such as once an hour, once a day, or once a week, and never a vague \\"over time\\"), '### Casing the Target' (exactly three '- **Label**: detail' bullets, one sentence each, covering ${resolved.objectiveCasing}).",
  "lore": "GM-only material (markdown formatted) with EXACTLY these sections, in this order, and no others: '### GM Quick Reference' (seven one-line bullets and nothing else — '- **Objective**:', '- **Primary obstacle**:', '- **Hidden factor**:', '- **Point of no return**:', '- **Pressure**:', '- **Default complication**:', '- **Escape problem**:' — each a single short sentence summarising what the section below says, so a GM understands the whole heist in under thirty seconds. Summarise; never copy a sentence verbatim from the section it stands for), '### The Hidden Factor' (at most two sentences: one thing the crew's intel gets wrong, and when it becomes obvious at the table. It must complicate the plan, never invalidate every approach at once), '### Security Rings' (three bullets, '- **Perimeter**: ', '- **Access**: ', '- **${resolved.innerRingLabel}**: ', TWO TO FOUR SENTENCES EACH. These rings protect ${resolved.objectiveProtects} — describe what protects each layer, then two or three genuinely different ways past it. Draw those from stealth, deception, social leverage, stolen credentials, magic or technology, physical infiltration, bribery, prior preparation, exploiting a schedule, or environmental access — not three variations on fighting, and never one intended solution), '### Alarm Track' (exactly five bullets, '- **0 — Quiet**:' through '- **4 — Lethal Response**:', ONE OR TWO SENTENCES EACH, using the labels Quiet, Suspicion, Alert, Lockdown, Lethal Response. Each level must change what the opposition does, close or complicate some options, and still leave the crew a real choice. Level 4 is extremely dangerous but still interactive — no automatic death, and no state where every exit is simply impossible; if something seals the building, name the obvious but costly way to answer it), '### Complications' (exactly three '- **Label**: detail' bullets, one sentence each, one marked '(default)' after its label. They should threaten ${resolved.objectiveComplicationFocus}. Build them from people, factions, or facts already established elsewhere in this scenario wherever you can, rather than introducing new ones), '### ${resolved.momentHeading}' (at most two sentences: the single concrete event that fires the instant the crew completes ${resolved.objectiveCompletion}, and what it changes — alarm escalation, a route closing, a guardian waking, a curse starting, the crew being identified. This is the moment the job turns from infiltration into escape — it fires on ${resolved.objectiveEscapeCause}, and \\"The Getaway\\" must follow from it), '### The Getaway' (one sentence on why the planned route is gone, which must be the consequence named in \\"${resolved.momentHeading}\\", then two or three '- **Label**: detail' bullets, one sentence each, for genuinely different alternate routes — fast but exposed, covert but socially risky, environmentally dangerous, one that costs the crew their equipment, one that needs an NPC's help — then a final '**Pursuit**: ' line naming one threat that follows them out), '### Flashback Opportunities' (four to six '- ' bullets, one line each, naming preparations the players COULD establish. Each must attach to an obstacle actually described above, and none may do something the security rules established above say is impossible. Offer them; never state that the players used them).",
  "labels": ["heist", "heist-generator"]
}
Every heading above appears exactly ONCE in the whole result. "content" and "lore" must share no heading between them, neither may repeat one of its own, and you must never emit a heading with nothing written under it. Do not restate a section you have already written.
Density matters as much as content. The entire result — "content" and "lore" together — must come in under ${HEIST_WORD_TARGET} words; a GM has to be able to scan it at the table. Short paragraphs and bullets only. Do not restate the same fact in "The Prize", "Security Rings", "Alarm Track", "The Getaway", and "Flashback Opportunities" — state it once, in the section that owns it, and let the others rely on it.
Keep every effect system-neutral: describe what happens in the fiction, never in one game's mechanics. Do not use rounds, turns, saving throws, DCs, checks, advantage/disadvantage, hit points, damage numbers, or any named condition from a specific system. Write "the tuning fork can briefly immobilise whoever it is aimed at", not "the tuning fork freezes the bearer for one round". This generator only produces the idea — a GM converts it to their system of choice at the table.
Do NOT merely rename theft concepts for the other heist types. The selected heist type determines the scenario's logic: what the crew begins with, what they must reach, what action completes the objective, and what triggers the escape phase. Take the starting position above literally — if the crew already carries the objective then it is NOT inside the target, there is no retrieval step to write, and the security exists to keep them away from where it must go; if the objective is a person, a system, or a record, the job is not a removal unless the starting position says it is. The selected heist type must materially shape the scenario, not just the wording of "The Score". "${resolved.objectiveHeading}" carries the actionable detail for a ${resolved.heistType} job, and the casing intel, security rings, complications and getaway must all engage with that objective rather than treating it as a container to be lifted. If "The Score" names a second objective as well — an object to take AND a person to kill, say — that objective gets its own section immediately after "${resolved.objectiveHeading}", written to the same depth, with its own location, window, protection and two or three ways to reach it.
Getting to the objective and accomplishing it are two different problems, and the scenario must solve both. The security rings answer "how do we reach it"; "${resolved.objectiveHeading}" must answer "and then what do we actually do", with more than one live option. A job whose only answer is a single prescribed action once the crew arrives has no objective for the players to solve.
If the objective has a special vulnerability, weakness, or single point that matters, say in one clause WHY it works — a ward anchored there, an old injury the wards never sealed, a maker's flaw. An unexplained weak point reads as an arbitrary game mechanic rather than something true about the fiction, and the players cannot reason about it.
Any clock you introduce must be runnable: name what advances it and how many advances fill it. "Advance the work clock" with no stated stages and no stated limit cannot be run at a table.
The "Pressure" must advance on its own during the job, not only when the crew fails. If the catch creates risk only on a bad outcome, pair it with something that moves regardless — a shift change, an inspection, a ritual, a tide — and say what happens when it runs out.
Set the score firmly within the ${resolved.genre} genre — the target, its security, the alarm flavour, and the pursuit should all feel native to that setting rather than a fantasy heist with the nouns swapped.
Scale the target to "${resolved.targetScale}": a Small score is a single building with a handful of staff, a Major score is a well-defended institution with a real security budget, and a Legendary score is a place that has never been successfully robbed and everyone knows it.
${NAME_BAN_PROMPT}
${sessionContext}
Write every section as scene-appropriate prose. Do not restate the wording of these instructions verbatim in the output, and never include prompt instructions, placeholder-name mapping notes, or any other meta-commentary about how the piece was generated — the output is the scenario itself, nothing about producing it.
Before returning, run a consistency pass and fix anything that fails it. Contradictions: nothing offered as a solution may be something an earlier rule declared impossible, unless the text explicitly explains how that rule is circumvented — if the ward only admits a living guild member, no later flashback or route may bypass it with a dead member's signet. Every access method obeys the rules established for that ring; every named person, faction, patron, or rival keeps one consistent role throughout; no alarm effect closes a route that a later section still offers; "The Hidden Factor" complicates the plan without invalidating every approach at once. Continuity: the prize in "The Score", "The Prize", and the "Casing the Target" bullet is the same object; the entry vector is a real way through the "Perimeter" ring; the route lost in "The Getaway" is the one "${resolved.momentHeading}" closes, and is the one the crew entered by; the "GM Quick Reference" lines match the sections they summarise. Ownership and location: confirm who holds the objective when the job begins, and keep it consistent everywhere. If the crew starts with it, no section may also describe it as already secured inside the target, and there must be no step spent retrieving it. If the target holds it, the crew must not already have it. Alarm reachability: every level of the alarm track must be a state that can plausibly be reached during play — a mandatory objective action may not jump the track straight to Lockdown or Lethal Response, since that skips the escalation the track exists to provide. Unless the scenario deliberately opens above Quiet, completing the objective should advance the alarm by a step or two, not to the top. Objective coverage: every objective named in "The Score" has its own section with its own location, window, protection and multiple ways in, and is engaged with by the casing intel, the rings, and the getaway — never introduce an objective in "The Score" and then ignore it for the rest of the scenario. Playability: each security ring names at least two genuinely different approaches; the five alarm states escalate without repeating each other and level 4 still leaves a costly option; exactly one complication is marked "(default)"; the pressure advances on a trigger the GM can actually see fire during one infiltration, on its own rather than only on a failure. Distinctness: if the alarm track already closes a route at some level, "When the Prize Is Taken" must not simply close it again — either name a different mechanism, or say explicitly that it makes the existing closure irreversible. No section repeats a heading used anywhere else, and no heading is left with nothing under it. Density: delete any sentence that does not create a decision, reveal usable information, or change how the heist plays.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;

  return {
    systemInstruction:
      "You are an assistant that generates detailed RPG campaign elements in JSON format.",
    userMessage,
    resolved,
  };
}

/**
 * Sections safe to reconstruct when the model omits one: both are written
 * from generic pools in the local fallback, so a backfilled copy cannot
 * contradict the fiction the model invented. The rest are deliberately not
 * backfilled — a Security Rings block naming a different building would be
 * worse than its absence.
 */
const BACKFILLABLE = ["Alarm Track", "Flashback Opportunities"] as const;

function loreHeadings(lore: string): string[] {
  return [...lore.matchAll(/^#{2,4}\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
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
 * Restore a required section the model skipped. Observed in a real sample:
 * one generation in ten ended cleanly after "The Getaway" and simply never
 * wrote "Flashback Opportunities". The prompt asks for every section, but
 * asking is not a guarantee — so the sections that can be rebuilt safely are
 * rebuilt here rather than silently missing from the reader's document.
 */
function backfillMissingSections(
  lore: string,
  resolved: ResolvedHeist,
  rng: Rng,
  alreadyPresent: ReadonlySet<string>,
): string {
  // Headings seen anywhere in the document, not just in `lore`. When the model
  // files a lore section under `content` instead, cross-field deduplication
  // drops the lore copy — and backfilling from the lore field alone would then
  // re-add it, manufacturing the duplicate this is meant to prevent.
  const present = new Set([
    ...alreadyPresent,
    ...loreHeadings(lore).map((h) => h.toLowerCase()),
  ]);
  const additions: string[] = [];
  for (const heading of BACKFILLABLE) {
    if (present.has(heading.toLowerCase())) continue;
    const local = generateHeistLocal(
      { genre: resolved.genre, heistType: resolved.heistType },
      rng,
    ).lore;
    const block = local
      .split(`### ${heading}`)[1]
      ?.split(/\n### /)[0]
      ?.trim();
    if (block) additions.push(`### ${heading}\n${block}`);
  }
  return additions.length ? [lore, ...additions].join("\n\n") : lore;
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
 * DESIGN NOTE (#2768): an earlier version of this prompt spelled every check
 * out as a numbered checklist (12 items, several with lettered sub-items). A
 * model handed that ends up satisfying it mechanically — working down the
 * list rather than reading the scenario — which is the opposite of what a
 * repair pass is for. The runtime prompt below is deliberately compact:
 * "spot contradictions, fix them, don't rewrite everything." The numbered
 * version remains useful as a design rubric (and is close to what
 * heist-validation.ts and scripts/heist-eval.ts check deterministically) —
 * see git history on this function for that fuller list — but it is not what
 * gets sent to the model.
 *
 * Two items were added after that redesign (still #2768), from a live sample
 * ("The Ledgered Prisoner") that the compact prompt let through: the GM Quick
 * Reference summarised the objective's own intermediate step (leaving the
 * counting floor) as if it were the mission's completion, rather than the
 * transition into the escape phase that it actually is; and a "collapsible
 * moonbridge" was introduced prominently in The Score and then never mattered
 * to a single obstacle.
 *
 * PRIORITY, NOT BREADTH (still #2768): two more live samples ("The Orchid
 * Ledger", "Payroll Under Red Dust") kept reproducing the exact same
 * completion-vs-detection conflation — the "moonbridge" fix above treated it
 * as one line among many, and a model reading twenty equally-weighted bullets
 * casually missed the one that actually mattered both times. So rather than
 * adding a ninth/tenth bullet to the same flat list, the three checks that
 * repeatedly caused real damage (completion-vs-detection, timeline
 * arithmetic, and cross-section propagation of that timing) are now called
 * out ahead of everything else as named invariants, with the rest of the
 * review demoted below them. Breadth was never the gap; priority was.
 *
 * A fourth live sample ("The Meteorite Job") — the first genuinely clean run,
 * 8.5+/10 on everything already checked — still found two more instances of
 * the same underlying pattern (a section quietly overriding a fact a *prior*
 * section established), just in forms specific enough that invariants 1-3
 * didn't catch them: a scenario that gave the crew a way to spoof a mass
 * sensor, then declared that same sensor fires "the instant" the prize
 * leaves its cradle regardless — nullifying the bypass it had just granted —
 * and a 1,200kg prize whose catch was respected inside the security rings
 * but ignored by the getaway (a roof-ladder escape, a folding handcart, a
 * pursuit assuming hand-carriage). Added as invariants 4 and 5 rather than
 * folded into 1-3, since "don't nullify an established bypass" and "a
 * physical constraint applies everywhere, not just where it was introduced"
 * are their own failure shapes, not restatements of completion-vs-detection.
 *
 * @param findings deterministic problems already detected, possibly empty —
 *   an empty list still leaves the semantic checks worth running, but the
 *   caller decides whether that is worth a second model call.
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

  return `You are the verification and repair pass for a generated tabletop RPG heist.

Do not generate a new heist. Preserve the scenario and make only the smallest edits needed to fix problems. Prefer changing one sentence over rewriting a section. Do not add substantial new content unless required to resolve a contradiction, and do not increase the overall length unless necessary.

This is a ${resolved.heistType} job in a ${resolved.genre} setting: the objective section is "${resolved.objectiveHeading}", the point of no return is "${resolved.momentHeading}", and the crew's starting position is: ${resolved.objectiveStartsWith}

${detected}Before anything else, verify these five invariants — they matter more than everything checked afterward.

1. Completion is not detection. Distinguish completing the objective, someone discovering that, raising the alarm, and beginning the escape — these may happen at different times. For Plant Evidence, Information, and Sabotage especially, successful covert completion should stay undiscovered until a believable later trigger, unless the scenario explicitly establishes an unavoidable detection mechanism. Never invent an automatic alarm merely because the scenario needs a getaway: if a convincing plant, covert read, or subtle sabotage would logically go unnoticed, preserve that and let the crew potentially leave through their original route.
2. The timeline must be executable. Reconstruct it before returning the result. Every deadline, inspection, handover, vulnerability window, clock, delayed discovery, and lockdown trigger referring to the same event must name the same time. Every clock must state exactly what advances it; avoid a vague trigger such as "each obstacle" unless those obstacles are explicitly defined.
3. Completion state must propagate consistently. Once you know when the objective is completed and when it is detected, check "${resolved.momentHeading}", "The Getaway", "GM Quick Reference", "Alarm Track", and "Complications" against those two facts — all must agree. The route must not seal immediately in one section and only on discovery in another. Remove any consequence that only fits a failed approach from the default successful path.
4. Preserve a successful bypass. If the scenario gives the crew a way to spoof, disable, or deceive a security or detection mechanism, a later section must not declare that same mechanism unavoidable regardless. A spoofed sensor stays spoofed; if detection should still be possible another way, say so explicitly and distinctly, rather than silently overriding the bypass you already granted.
5. Carry the prize's catch through to the end. The established catch — ${resolved.prizeComplication} — must still be true in "The Getaway", the flashbacks, and the pursuit, not only inside the security rings. A route, tool, or pursuer that ignores it (a roof escape or a hand-carried tool for something huge or fragile, a pursuit that assumes the crew is carrying it conventionally when the catch says otherwise) must be repaired or replaced with one that actually respects it.

After those five, do the normal pass: contradictions between sections; objectives in "The Score" left unsupported; wrong terminology for the heist type; inconsistent locations, ownership, NPC roles, or motivations; hidden factors that invalidate rather than complicate the plan; security approaches that turn out not to work; alarm levels that are skipped or insufficiently escalating; getaway routes contradicting earlier facts; generic flashbacks where scenario-specific ones are possible; details leaking in from elsewhere; genre-inappropriate or system-specific language; duplicated or empty sections; and any unusual tool or fact introduced prominently in "The Score" that never affects play later (integrate it into an obstacle, or remove it).

Also verify:
1. Every primary objective has multiple viable approaches where appropriate — not merely multiple ways to reach it.
2. Every pressure mechanic has a clear trigger and consequence.
3. Every complication changes play in a concrete way.
4. The scenario remains playable at every alarm level.
5. The final result can be run as written without the GM having to resolve obvious inconsistencies.

Return the complete corrected heist as a valid JSON object in the exact same schema as before — "title", "content", "lore", "labels" — with every field present, not just the parts you changed. If nothing needs fixing, return what you wrote unchanged.
Return only the JSON object. Do not include markdown code block formatting like \`\`\`json.`;
}

export function parseHeistResponse(
  text: string,
  resolved: ResolvedHeist,
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const data = parseFencedJson(text);
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
    title: data.title || resolved.title,
    summary: data.summary || "",
    content,
    lore: backfillMissingSections(lore, resolved, rng, seenHeadings),
    labels,
    status: "active",
  };
}

export function generateHeistLocal(
  options: HeistGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveHeist(options, rng);
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
  const trigger = pickFrom(heistConfig.triggers, rng);
  const routeClosure = pickFrom(heistConfig.routeClosures, rng);
  const pursuit = pickFrom(heistConfig.pursuits, rng);

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
- **Window**: ${fill(resolved.objectiveCopy.window)}
- **Protection**: ${fill(resolved.objectiveCopy.protection)}
- **Once it is done**: ${fill(resolved.objectiveCopy.aftermath)}
- **The catch**: ${resolved.prizeComplicationLabel} — ${complicationDetail ?? "it will not travel quietly"}.
- **Pressure**: ${resolved.pressure}

### Casing the Target
- **Entry vector**: A service route staff use daily and nobody watches closely — open only during working hours.
- **Known obstacle**: The credential check between the public floor and the secured floor is watched, not merely locked.
- **The objective**: ${fill(resolved.objectiveCopy.casingLine)}`;

  const lore = `### GM Quick Reference
- **Objective**: ${resolved.heistType} — ${fill(resolved.objectiveCopy.score)}.
- **Primary obstacle**: Three layers — patrols outside, a watched credential check, and the ${resolved.innerRingLabel.toLowerCase()}.
- **Hidden factor**: One thing the crew was told about the routine is out of date.
- **Point of no return**: ${resolved.objectiveCopy.moment} — ${trigger}.
- **Pressure**: ${resolved.pressureSummary}
- **Default complication**: ${defaultComplication}
- **Escape problem**: The way in closes behind them; every remaining exit costs something.

### The Hidden Factor
Whichever detail the crew leans on hardest in planning is the one that has changed — the service route is watched this week, or the handling routine moved yesterday. It costs them their best approach, not every approach; the other two rings are still solvable as briefed.

### Security Rings
- **Perimeter**: Patrols, watchers, and sightlines around the ${site}. Past it by timing the gap between rounds, by arriving as someone the staff already expect, or by an approach the patrol route simply does not cover.
- **Access**: The credential check onto the secured floor, staffed by someone who has done this a thousand times. Past it with a forged or borrowed credential, by being escorted through by staff who have a reason to vouch, or by making the check read as a maintenance fault rather than an intrusion.
- **${resolved.innerRingLabel}**: The last layer around ${resolved.objectiveProtects} — the part the target actually spent money on. Past it by defeating the mechanism, by getting someone with legitimate access to open it for their own reasons, or by taking the container and dealing with it elsewhere.

### Alarm Track
- **0 — Quiet**: Routine holds. Patrols on schedule, staff bored, nobody looking for anyone.
- **1 — Suspicion**: One guard breaks routine to check what bothered them. Patrol timings stop being predictable.
- **2 — Alert**: Staff know someone is inside. Exits are watched and reinforcements are called, but the building still works normally.
- **3 — Lockdown**: The public doors bar and the defences come online. Crossing between rings now costs noise, time, or a favour spent — but the service route is a staff route and stays as it was.
- **4 — Lethal Response**: Whatever the target keeps for this is loose and hunting to kill. It covers the exits — but it can be drawn off, bargained with, or given something it wants more than the crew.

### Complications
- **Likely (default)**: ${defaultComplication}
- **Alternative**: ${secondComplication}
- **Alternative**: ${thirdComplication}

### ${resolved.momentHeading}
${fill(resolved.objectiveCopy.momentBody)} ${trigger[0].toUpperCase()}${trigger.slice(1)}, the alarm steps up to **2 — Alert**, and the crew's way in closes behind them: ${routeClosure}.

### The Getaway
The service route from the casing is gone for exactly that reason. Every remaining exit costs something.
- **Fast but exposed**: Out through the public front — quick, and it spends the crew's anonymity for good.
- **Covert but slow**: The service tunnels or roofline — unseen, and slow enough for the pursuit to get ahead of them.
- **Hard route**: The way the catch makes awkward — passable, but it risks the job itself.
**Pursuit**: ${pursuit}.

### Flashback Opportunities
Offer these; never assume the players used them.
${chosenFlashbacks.map((f) => `- ${f}`).join("\n")}`;

  return {
    type: "event",
    title: resolved.title,
    summary: "",
    content,
    lore,
    labels: ["heist", "heist-generator", ...canonicalOptionLabels(resolved)],
    status: "active",
  };
}

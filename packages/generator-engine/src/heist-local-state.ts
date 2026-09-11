/** Concrete fallback schedules and objective methods; times are from entry. */
const objectives: Record<
  string,
  { window: string; transition: string; methods: string }
> = {
  Theft: {
    window:
      "The keeper inspects the shelf thirty minutes after entry; the next handling is then.",
    transition:
      "Taking the object does not itself sound an alarm. At the thirty-minute shelf inspection, a visible gap raises Alert; a convincing substitute delays discovery until the next handling, thirty minutes later.",
    methods:
      "Open the housing with its keeper's key, detach it carefully with tools, or arrange an authorised transfer through a bribed keeper.",
  },
  Rescue: {
    window:
      "The corridor is empty between reliefs; the next cell check is thirty minutes after entry.",
    transition:
      "The captive leaves the cell, but the rescue succeeds only once they are clear of the site. The next cell check, thirty minutes after entry, reveals the empty cell and raises Alert unless a convincing stand-in delays discovery to the following check thirty minutes later.",
    methods:
      "Open the cell with a borrowed key, remove the old hinge pins, or persuade the keeper that a medical transfer is authorised; moving the captive still requires addressing their catch.",
  },
  Extraction: {
    window:
      "The subject can leave their station during handover; roll call is thirty minutes after entry.",
    transition:
      "Leaving the custody floor starts the escape, not mission success. At roll call thirty minutes after entry, an unexplained absence raises Alert; a credible signed transfer keeps the subject accounted for until the destination checks the paperwork thirty minutes later.",
    methods:
      "Arrange a signed transfer, substitute another worker at the station, or guide the subject through an unwatched maintenance passage between rounds.",
  },
  Sabotage: {
    window:
      "A load test thirty minutes after entry will expose a broken component; until then the mechanism is accessible while running.",
    transition:
      "The component is sabotaged without any immediate outward failure. The load test thirty minutes after entry exposes the damage and raises Alert; a delay set for after that test keeps it working until the crew's chosen later activation time.",
    methods:
      "Disconnect the drive coupling, jam the pressure feed, or fit a timed release to the governor; each stops the mechanism because these parts jointly regulate its output.",
  },
  Information: {
    window:
      "The record is available for thirty minutes from entry, after which the keeper checks and refiles it.",
    transition:
      "Reading or copying the record does not itself raise the alarm unless its catch establishes a detection mechanism. The keeper's check thirty minutes after entry discovers a missing record or visible tampering; an authorised-looking read or undamaged copy can remain undiscovered.",
    methods:
      "Read it under a borrowed reader's identity, make an impression of its pages, or remove it in a signed bundle of records; copying or removal must respect the catch.",
  },
  "Plant Evidence": {
    window:
      "The destination will be inspected thirty minutes after entry; the package must be convincingly placed before then.",
    transition:
      "The package is planted and the crew can leave without an alarm. At the inspection thirty minutes after entry, convincing evidence incriminates the target; only signs of intrusion or a visibly false plant raise Alert against the crew.",
    methods:
      "Place it among matching belongings, persuade a servant to file it as an ordinary delivery, or create a credible receipt and lodge it with the target's records.",
  },
  Assassination: {
    window:
      "The mark is alone until an attendant returns thirty minutes after entry.",
    transition:
      "The target dies, but discovery is separate. The attendant returning thirty minutes after entry raises Alert on finding a suspicious death; a convincing natural cause avoids an immediate search for intruders.",
    methods:
      "Contaminate the mark's private drink, arrange a fatal failure of their balcony rail, or confront them while the attendant is away; the chosen method must respect the catch.",
  },
};

export function heistLocalState(heistType: string) {
  return (
    objectives[heistType] ?? {
      window: "The next routine inspection is thirty minutes after entry.",
      transition:
        "The objective action is complete. Discovery depends on visible signs at the inspection thirty minutes after entry; a covert success may remain unnoticed.",
      methods:
        "Use legitimate access, enlist the keeper's help, or exploit the gap between inspections to complete the requested action.",
    }
  );
}

export const HEIST_LOCAL_RESPONSE =
  "On discovery, raise **2 — Alert**. Reinforcements take five minutes to reach the service entrance; only then is it blocked.";
export const HEIST_LOCAL_ESCAPE =
  "The entry route remains usable until reinforcements reach it, five minutes after an alarm; a covert crew can leave before discovery.";
